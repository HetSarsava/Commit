const { test } = require("node:test");
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path");
process.env.USE_MOCK_DB = "true";
process.env.JWT_SECRET = require("node:crypto").randomBytes(32).toString("hex");
process.env.WHATSAPP_DB_PATH = path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), "commit-simple-")),
  "demo.sqlite",
);
const { prisma } = require("../src/config/database");
test("simplified manual workflows keep descriptions, links, validation, roles and restart persistence", async (t) => {
  const express = require("express"),
    app = express();
  app.use(express.json());
  app.use("/api/manual", require("../src/routes/manualCRM"));
  app.use("/api/orders", require("../src/routes/orderRoutes"));
  app.use("/api/invoices", require("../src/routes/invoiceRoutes"));
  app.use("/api/proformas", require("../src/routes/proformaRoutes"));
  app.use(require("../src/middleware/errorHandler"));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  t.after(() => new Promise((r) => server.close(r)));
  const call = async (method, p, body, role = "ADMIN") => {
    const u = (await prisma.user.findMany({})).find((u) => u.role === role);
    const token = require("jsonwebtoken").sign(
      { userId: u.id },
      process.env.JWT_SECRET,
    );
    const r = await fetch("http://127.0.0.1:" + server.address().port + p, {
      method,
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: r.status, data: await r.json() };
  };
  const customer = (await prisma.customer.findMany({}))[0];
  const doc = {
    customerId: customer.id,
    items: [
      { description: "Custom school shirts", quantity: 10, unitPrice: 100 },
    ],
    taxPercent: 18,
    discountAmount: 0,
    status: "CONFIRMED",
    deliveryDate: "2026-11-15",
  };
  assert.equal(
    (await call("POST", "/api/manual/orders", doc, "MARKETING")).status,
    403,
  );
  assert.equal(
    (
      await call("POST", "/api/manual/orders", {
        ...doc,
        items: [{ description: "", quantity: 1, unitPrice: 1 }],
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call("POST", "/api/manual/orders", {
        ...doc,
        items: [{ description: "x", quantity: -1, unitPrice: 1 }],
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call("POST", "/api/manual/orders", {
        ...doc,
        deliveryDate: "2026-02-30",
      })
    ).status,
    400,
  );
  assert.equal(
    (await call("POST", "/api/manual/orders", { ...doc, status: "INVALID" }))
      .status,
    400,
  );
  assert.equal(
    (
      await call("POST", "/api/manual/orders", {
        ...doc,
        items: [
          {
            description: "Discounted item",
            quantity: 2,
            unitPrice: 100,
            discount: 250,
          },
        ],
      })
    ).status,
    400,
  );
  const discounted = await call("POST", "/api/manual/orders", {
    ...doc,
    items: [
      {
        description: "Discounted item",
        quantity: 2,
        unitPrice: 100,
        discount: 20,
      },
    ],
  });
  assert.equal(discounted.status, 201);
  assert.equal(discounted.data.order.total, 212.4);
  assert.equal(discounted.data.order.items[0].discount, 20);
  const made = await call("POST", "/api/manual/orders", { ...doc, total: 1 });
  assert.equal(made.status, 201);
  const id = made.data.order.id;
  assert.equal(
    (await call("PUT", "/api/manual/orders/" + id, doc, "SALES")).status,
    403,
  );
  assert.equal(made.data.order.total, 1180);
  assert.equal(made.data.order.items[0].product.name, "Custom school shirts");
  assert.equal(made.data.order.items[0].productId, null);
  const invoice = await call("POST", "/api/invoices/from-order", {
    orderId: id,
  });
  assert.equal(invoice.status, 201);
  assert.equal(
    invoice.data.invoice.items[0].description,
    "Custom school shirts",
  );
  assert.equal(
    invoice.data.invoice.items[0].product.name,
    "Custom school shirts",
  );
  assert.notEqual(
    (await call("POST", "/api/invoices/from-order", { orderId: id })).status,
    201,
  );
  const revised = {
    ...doc,
    items: [
      { description: "Revised uniform shirts", quantity: 12, unitPrice: 100 },
    ],
  };
  assert.equal(
    (await call("PUT", "/api/manual/orders/" + id, revised)).status,
    200,
  );
  assert.equal(
    (await call("GET", "/api/orders/" + id)).data.order.items.length,
    1,
  );
  assert.equal(
    (
      await call(
        "POST",
        "/api/invoices/" + invoice.data.invoice.id + "/sync-order",
        {},
      )
    ).status,
    200,
  );
  assert.equal(
    (await call("GET", "/api/invoices/" + invoice.data.invoice.id)).data.invoice
      .items[0].product.name,
    "Revised uniform shirts",
  );
  const quote = await call("POST", "/api/manual/quotations", doc);
  assert.equal(quote.status, 201);
  assert.equal(
    (
      await call(
        "PUT",
        "/api/manual/quotations/" + quote.data.quotation.id,
        revised,
      )
    ).status,
    200,
  );
  const converted = await call("POST", "/api/orders/from-quotation", {
    quotationId: quote.data.quotation.id,
  });
  assert.equal(converted.status, 201);
  assert.equal(
    converted.data.order.items[0].description,
    "Revised uniform shirts",
  );
  const proformaQuote = await call("POST", "/api/manual/quotations", {
    ...doc,
    items: [
      {
        description: "Freeform proforma item",
        quantity: 2,
        unitPrice: 100,
        discount: 20,
      },
    ],
  });
  const pi = await call("POST", "/api/proformas/from-quotation", {
    quotationId: proformaQuote.data.quotation.id,
  });
  assert.equal(pi.status, 201);
  assert.equal(pi.data.proforma.items[0].rate, 100);
  assert.equal(pi.data.proforma.items[0].amount, 180);
  assert.equal(pi.data.proforma.cgst, 16.2);
  const fromPi = await call(
    "POST",
    "/api/proformas/" + pi.data.proforma.id + "/convert-to-order",
    {},
  );
  assert.equal(fromPi.status, 201);
  assert.equal(
    fromPi.data.order.items[0].description,
    "Freeform proforma item",
  );
  assert.equal(fromPi.data.order.items[0].unitPrice, 100);
  assert.equal(fromPi.data.order.items[0].total, 180);
  assert.equal(fromPi.data.order.items[0].discount, 20);
  assert.equal(fromPi.data.order.taxAmount, 32.4);
  const d = {
    orderId: id,
    courierName: "Demo courier",
    trackingNumber: "DEMO",
    address: "Demo address",
    dispatchDate: "2026-10-06",
    expectedDeliveryDate: "2026-10-08",
  };
  const ships = await Promise.all([
    call("POST", "/api/manual/dispatches", d),
    call("POST", "/api/manual/dispatches", d),
  ]);
  assert.equal(ships.filter((r) => r.status === 201).length, 1);
  const shipped = ships.find((r) => r.status === 201);
  assert.equal(shipped.data.items[0].productName, "Revised uniform shirts");
  assert.equal(
    (
      await call("PUT", "/api/manual/dispatches/" + shipped.data.id, {
        ...d,
        status: "DELIVERED",
        actualDeliveryDate: "2026-10-05",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call("PUT", "/api/manual/dispatches/" + shipped.data.id, {
        ...d,
        status: "DELIVERED",
        actualDeliveryDate: "2026-10-08",
      })
    ).status,
    200,
  );
  assert.equal(
    (await call("GET", "/api/orders/" + id)).data.order.status,
    "COMPLETED",
  );
  const campaign = {
    name: "Manual campaign test",
    platform: "Local event",
    budget: 1000,
    spent: 100,
    manualLeads: 4,
    manualRevenue: 450,
    startDate: "2026-10-06",
    status: "ACTIVE",
  };
  assert.equal(
    (await call("POST", "/api/manual/marketing", campaign, "SALES")).status,
    403,
  );
  assert.equal(
    (await call("POST", "/api/manual/marketing", { ...campaign, spent: -1 }))
      .status,
    400,
  );
  const m = await call("POST", "/api/manual/marketing", campaign);
  assert.equal(m.status, 201);
  assert.equal(m.data.manualRevenue, 450);
  const child = require("node:child_process").execFileSync(
    process.execPath,
    [
      "-e",
      "const {prisma}=require('./src/config/database');(async()=>{const rows=await prisma.order.findMany({include:{items:{include:{product:true}}}});if(!rows.some(o=>o.items.some(i=>i.description==='Revised uniform shirts')))process.exit(1);if(!(await prisma.campaign.findMany({})).some(c=>c.name==='Manual campaign test'&&c.manualRevenue===450))process.exit(2);if(!(await prisma.dispatch.findMany({})).some(d=>d.trackingNumber==='DEMO'&&d.status==='DELIVERED'))process.exit(3)})()",
    ],
    { cwd: process.cwd(), env: process.env },
  );
  assert.ok(child);
});
