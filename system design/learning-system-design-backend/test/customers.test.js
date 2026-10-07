const { test } = require("node:test");
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path");
process.env.USE_MOCK_DB = "true";
process.env.JWT_SECRET = require("node:crypto").randomBytes(32).toString("hex");
process.env.WHATSAPP_DB_PATH = path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), "commit-customers-")),
  "demo.sqlite",
);
const { prisma } = require("../src/config/database");
test("customers can be added or converted once, keep source documents, show honest send history and survive restart", async (t) => {
  const express = require("express"),
    app = express();
  app.use(express.json());
  app.use("/api/manual", require("../src/routes/manualCRM"));
  app.use(require("../src/middleware/errorHandler"));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  t.after(() => new Promise((r) => server.close(r)));
  const users = await prisma.user.findMany({}),
    admin = users.find((u) => u.role === "ADMIN");
  const call = async (method, p, body, role = "ADMIN") => {
    const u = users.find((u) => u.role === role);
    const token = require("jsonwebtoken").sign(
      { userId: u.id },
      process.env.JWT_SECRET,
    );
    const r = await fetch(
      "http://127.0.0.1:" + server.address().port + "/api/manual" + p,
      {
        method,
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      },
    );
    return { status: r.status, data: await r.json() };
  };
  const input = {
    companyName: "Customer persistence test",
    contactPerson: "Demo contact",
    mobile: "+91 98765 43299",
    email: "demo@example.com",
  };
  assert.equal(
    (await call("POST", "/customers", input, "MARKETING")).status,
    403,
  );
  assert.equal(
    (await call("POST", "/customers", { ...input, mobile: "123" })).status,
    400,
  );
  assert.equal(
    (await call("POST", "/customers", { ...input, email: "wrong" })).status,
    400,
  );
  const made = await call("POST", "/customers", input);
  assert.equal(made.status, 201);
  assert.equal(made.data.customer.whatsapp, "+919876543299");
  assert.equal(
    (await call("POST", "/customers", { ...input, mobile: "919876543299" }))
      .status,
    409,
  );
  const matchingLead = await prisma.lead.create({
    data: {
      companyName: "Source alias",
      contactPerson: "Source buyer",
      mobile: input.mobile,
      salesPersonId: admin.id,
      status: "NEW",
    },
  });
  const reused = await call(
    "POST",
    "/leads/" + matchingLead.id + "/customer",
    {},
  );
  assert.equal(reused.status, 200);
  assert.equal(reused.data.customer.id, made.data.customer.id);
  assert.equal(reused.data.customer.companyName, input.companyName);
  const lead = await prisma.lead.create({
    data: {
      companyName: "Conversion test",
      contactPerson: "Demo buyer",
      mobile: "+919876543298",
      salesPersonId: admin.id,
      status: "NEW",
    },
  });
  assert.equal(
    (await call("POST", "/leads/" + lead.id + "/customer", {}, "SALES")).status,
    403,
  );
  const quote = await prisma.quotation.create({
    data: {
      customerId: lead.id,
      quotationNumber: "QT-CONVERT-TEST",
      status: "SENT",
      total: 100,
      items: { create: [] },
    },
  });
  const converted = await Promise.all([
    call("POST", "/leads/" + lead.id + "/customer", {}),
    call("POST", "/leads/" + lead.id + "/customer", {}),
  ]);
  assert.ok(converted.every((r) => r.status === 200));
  assert.equal(converted[0].data.customer.id, converted[1].data.customer.id);
  const customer = converted[0].data.customer;
  assert.equal(
    (await prisma.customer.findMany({})).filter((c) => c.leadId === lead.id)
      .length,
    1,
  );
  assert.equal(
    (await prisma.lead.findUnique({ where: { id: lead.id } })).status,
    "COMPLETED",
  );
  let history = await call("GET", "/customers/" + customer.id + "/history");
  assert.equal(history.status, 200);
  assert.equal(history.data.documents.quotations[0].id, quote.id);
  assert.equal(history.data.messages.length, 0);
  assert.equal(
    (await call("GET", "/customer-directory")).data.find(
      (c) => c.id === customer.id,
    ).hasDocumentMessages,
    false,
  );
  const { store } = require("../src/services/whatsapp");
  const chat = await store.transaction((s) =>
    s.conversation("919876543298", { leadId: lead.id }),
  );
  await store.transaction((s) =>
    s.createMessage({
      conversationId: chat.id,
      message: "Quote test",
      direction: "OUTGOING",
      status: "READ",
      messageType: "QUOTATION",
      relatedId: quote.id,
      messageId: "wamid.customer-test",
      metadata: { credential: "hidden" },
    }),
  );
  history = await call("GET", "/customers/" + customer.id + "/history");
  assert.equal(history.data.messages[0].status, "READ");
  assert.equal(history.data.messages[0].relatedId, quote.id);
  assert.equal(history.data.messages[0].metadata, undefined);
  const listing = await call("GET", "/customer-directory");
  assert.equal(
    listing.data.find((c) => c.id === customer.id).hasDocumentMessages,
    true,
  );
  const context =
    await require("../src/services/whatsapp/crmContext").crmContext(
      require("../src/services/whatsapp").service,
      chat.id,
    );
  assert.equal(context.customer.id, customer.id);
  assert.equal(context.quotations[0].id, quote.id);
  assert.equal(
    (
      await call(
        "GET",
        "/customers/" + customer.id + "/history",
        undefined,
        "SALES",
      )
    ).status,
    404,
  );
  assert.equal(
    (await call("GET", "/customer-directory", undefined, "SALES")).data.some(
      (c) => c.id === customer.id,
    ),
    false,
  );
  const order = await call("POST", "/orders", {
    customerId: made.data.customer.id,
    items: [
      { description: "Manual customer item", quantity: 1, unitPrice: 100 },
    ],
    status: "CONFIRMED",
  });
  assert.equal(order.status, 201);
  require("node:child_process").execFileSync(
    process.execPath,
    [
      "-e",
      "const {prisma}=require('./src/config/database');(async()=>{if(!(await prisma.customer.findMany({})).some(c=>c.companyName==='Customer persistence test'))process.exit(1);if(!(await prisma.customer.findMany({})).some(c=>c.leadId))process.exit(2);if(!(await prisma.lead.findMany({})).some(l=>l.companyName==='Conversion test'&&l.status==='COMPLETED'))process.exit(3)})()",
    ],
    { cwd: process.cwd(), env: process.env },
  );
});
