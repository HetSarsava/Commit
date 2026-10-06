const router = require("express").Router();
const { prisma } = require("../config/database");
const { requireRole } = require("../middleware/auth");
const { normalizePhone } = require("../services/whatsapp/metaProvider");
const clean = (v, max = 500) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
const phone = (v) => {
  try {
    return normalizePhone(v);
  } catch {
    return null;
  }
};
const denied = () => Object.assign(new Error("Access denied"), { status: 403 });
const bad = (message) => Object.assign(new Error(message), { status: 400 });
const own = (c, u) =>
  u.role !== "SALES" || !c.salesPersonId || c.salesPersonId === u.id;
const wrap = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    if (e.code === "P2002")
      return res
        .status(409)
        .json({
          error:
            "This customer already exists. Please use the existing record.",
        });
    next(e);
  }
};
// Serialize duplicate checks and conversion in the single-process demo adapter.
let tail = Promise.resolve();
const mutation = (fn) => {
  const run = tail.then(fn);
  tail = run.catch(() => {});
  return run;
};
router.post(
  "/customers",
  requireRole(["ADMIN", "SALES"]),
  wrap(async (req, res) => {
    const customer = await mutation(() => saveCustomer(req.body, req.user));
    res.status(201).json({ customer });
  }),
);
function fields(body) {
  const companyName = clean(body.companyName, 150),
    contactPerson = clean(body.contactPerson, 150),
    mobile = phone(body.mobile),
    whatsapp = phone(body.whatsapp || body.mobile),
    email = clean(body.email, 254).toLowerCase();
  if (!companyName || !contactPerson || !mobile || !whatsapp)
    throw bad(
      "Enter company name, contact name and valid phone numbers, including country code.",
    );
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw bad("Enter a valid email address.");
  return {
    companyName,
    contactPerson,
    mobile: "+" + mobile,
    whatsapp: "+" + whatsapp,
    email: email || null,
    address: clean(body.address, 2000) || null,
    city: clean(body.city, 100) || null,
    state: clean(body.state, 100) || null,
  };
}
async function saveCustomer(body, user, lead = null) {
  const data = fields(body),
    rows = await prisma.customer.findMany({});
  const existing = rows.find((c) =>
    [c.mobile, c.whatsapp].some((v) =>
      [phone(data.mobile), phone(data.whatsapp)].includes(phone(v)),
    ),
  );
  if (existing) {
    if (!lead)
      throw Object.assign(
        new Error(
          "A customer already uses this phone number. Please use the existing customer.",
        ),
        { status: 409 },
      );
    if (!own(existing, user)) throw denied();
    if (existing.leadId && existing.leadId !== lead.id)
      throw Object.assign(
        new Error(
          "This phone belongs to a customer linked to another lead. Review the existing customer.",
        ),
        { status: 409 },
      );
    return prisma.customer.update({
      where: { id: existing.id },
      data: { leadId: lead.id },
    });
  }
  return prisma.customer.create({
    data: {
      ...data,
      leadId: lead?.id || null,
      salesPersonId: lead?.salesPersonId || user.id,
    },
  });
}
router.post(
  "/leads/:id/customer",
  requireRole(["ADMIN", "SALES"]),
  wrap(async (req, res) => {
    const result = await mutation(async () => {
      const lead = await prisma.lead.findUnique({
        where: { id: req.params.id },
      });
      if (!lead)
        throw Object.assign(new Error("Lead not found"), { status: 404 });
      if (!own(lead, req.user)) throw denied();
      const linked = (await prisma.customer.findMany({})).find(
        (c) => c.leadId === lead.id,
      );
      if (linked && !own(linked, req.user)) throw denied();
      const customer =
        linked ||
        (await saveCustomer({ ...lead, ...req.body }, req.user, lead));
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: "COMPLETED",
          convertedAt: lead.convertedAt || new Date(),
        },
      });
      return { customer, alreadyCustomer: Boolean(linked) };
    });
    res.json(result);
  }),
);
async function directory(user) {
  const { store } = require("../services/whatsapp");
  const [customers, conversations, messages] = await Promise.all([
    prisma.customer.findMany({}),
    store.conversations(),
    store.messages(),
  ]);
  const [quotations, orders, invoices] = await Promise.all([
    prisma.quotation.findMany({}),
    prisma.order.findMany({}),
    prisma.invoice.findMany({}),
  ]);
  const related = (c, r) =>
    r.customerId === c.id ||
    (c.leadId && (r.customerId === c.leadId || r.leadId === c.leadId));
  return customers
    .filter((c) => own(c, user))
    .map((c) => {
      const docs = {
        quotations: quotations.filter((r) => related(c, r)),
        orders: orders.filter((r) => related(c, r)),
        invoices: invoices.filter((r) => related(c, r)),
      };
      const phones = [phone(c.mobile), phone(c.whatsapp)].filter(Boolean);
      const chats = conversations.filter(
        (r) =>
          r.customerId === c.id ||
          (c.leadId && r.leadId === c.leadId) ||
          (!r.customerId && !r.leadId && phones.includes(phone(r.phoneNumber))),
      );
      const ids = new Set(chats.map((r) => r.id)),
        docIds = new Set(
          Object.values(docs)
            .flat()
            .map((r) => r.id),
        );
      const recent = messages.filter((m) => ids.has(m.conversationId));
      return {
        ...c,
        documentCounts: Object.fromEntries(
          Object.entries(docs).map(([k, v]) => [k, v.length]),
        ),
        hasDocumentMessages: recent.some(
          (m) =>
            m.direction === "OUTGOING" &&
            m.messageId &&
            docIds.has(m.relatedId),
        ),
        documents: docs,
        chats,
        messages: recent,
      };
    });
}
router.get(
  "/customer-directory",
  requireRole(["ADMIN", "SALES", "MARKETING", "ACCOUNTANT"]),
  wrap(async (req, res) => {
    const rows = await directory(req.user);
    res.json(rows.map(({ documents, chats, messages, ...c }) => c));
  }),
);
router.get(
  "/customers/:id/history",
  requireRole(["ADMIN", "SALES", "MARKETING", "ACCOUNTANT"]),
  wrap(async (req, res) => {
    const c = (await directory(req.user)).find((c) => c.id === req.params.id);
    if (!c)
      throw Object.assign(new Error("Customer not found or unavailable"), {
        status: 404,
      });
    const { store } = require("../services/whatsapp");
    const messages = (
      await Promise.all(c.chats.map((chat) => store.messages(chat.id)))
    )
      .flat()
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    // Return summaries, rather than unrelated document/customer fields or private transport metadata.
    res.json({
      customer: {
        id: c.id,
        companyName: c.companyName,
        contactPerson: c.contactPerson,
        mobile: c.mobile,
        whatsapp: c.whatsapp,
        email: c.email,
        address: c.address,
        leadId: c.leadId,
      },
      documents: Object.fromEntries(
        Object.entries(c.documents).map(([k, rows]) => [
          k,
          rows.map((r) => ({
            id: r.id,
            number: r.quotationNumber || r.orderNumber || r.invoiceNumber,
            status: r.status,
            total: r.total,
            createdAt: r.createdAt,
          })),
        ]),
      ),
      messages: messages.map((m) => ({
        id: m.id,
        message: m.message,
        timestamp: m.timestamp,
        status: m.status,
        direction: m.direction,
        messageType: m.messageType,
        relatedId: m.relatedId,
      })),
      historyLimit: 500,
    });
  }),
);
module.exports = router;
