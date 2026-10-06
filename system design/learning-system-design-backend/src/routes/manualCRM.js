const router = require("express").Router();
const { auth, requireRole } = require("../middleware/auth");
const { prisma } = require("../config/database");
const { randomUUID } = require("node:crypto");
router.use(auth);
router.use((req, res, next) =>
  process.env.USE_MOCK_DB === "false"
    ? res.status(503).json({
        error:
          "This simplified pilot uses its own local database. PostgreSQL support is not enabled.",
      })
    : next(),
);
const wrap = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (e) {
    if (e.code === "P2002")
      return res.status(409).json({ error: "This record already exists" });
    if (e.status) return res.status(e.status).json({ error: e.message });
    next(e);
  }
};
const fail = (message) => {
  throw Object.assign(new Error(message), { status: 400 });
};
const text = (value, max = 2000) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
function amount(value, name, max = 1e9) {
  const n = Number(value);
  if (
    !["string", "number"].includes(typeof value) ||
    value === null ||
    value === "" ||
    !Number.isFinite(n) ||
    n < 0 ||
    n > max
  )
    fail("Enter a valid " + name);
  return n;
}
function date(value, required = false) {
  if (!value && !required) return null;
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 10) !== value
  )
    fail("Enter a valid date");
  return new Date(value);
}
const round = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const orderStates = [
  "PENDING",
  "CONFIRMED",
  "IN_PRODUCTION",
  "READY",
  "DISPATCHED",
  "COMPLETED",
  "CANCELLED",
];
async function accessOrder(id, user) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: { customer: true, items: { include: { product: true } } },
  });
  if (!order)
    throw Object.assign(new Error("Order not found"), { status: 404 });
  if (user.role === "SALES" && order.salesPersonId !== user.id)
    throw Object.assign(new Error("Access denied"), { status: 403 });
  return order;
}
async function document(body, user, kind) {
  const customer = await prisma.customer.findUnique({
    where: { id: body.customerId },
  });
  if (!customer) fail("Choose an existing customer");
  if (
    user.role === "SALES" &&
    customer.salesPersonId &&
    customer.salesPersonId !== user.id
  )
    throw Object.assign(new Error("Access denied"), { status: 403 });
  if (
    !Array.isArray(body.items) ||
    !body.items.length ||
    body.items.length > 50
  )
    fail("Add between 1 and 50 items");
  if (
    kind === "orders" &&
    body.status !== undefined &&
    !orderStates.includes(body.status)
  )
    fail("Choose a valid order status");
  const items = body.items.map((item) => {
    if (!item || !text(item.description, 250))
      fail("Every item needs a description");
    const quantity = amount(item.quantity, "quantity", 1e6),
      unitPrice = amount(item.unitPrice, "price", 1e7);
    if (quantity <= 0) fail("Quantity must be greater than zero");
    const discount = amount(
      item.discount ?? 0,
      "item discount",
      round(quantity * unitPrice),
    );
    return {
      productId: null,
      description: text(item.description, 250),
      quantity,
      unitPrice,
      discount,
      total: round(quantity * unitPrice - discount),
      customization: text(item.customization),
    };
  });
  const subtotal = round(items.reduce((sum, item) => sum + item.total, 0));
  const taxPercent = amount(body.taxPercent ?? 18, "tax percentage", 100),
    discountAmount = amount(body.discountAmount ?? 0, "discount", subtotal);
  const taxAmount = round(((subtotal - discountAmount) * taxPercent) / 100),
    total = round(subtotal - discountAmount + taxAmount);
  return {
    customerId: customer.id,
    items: { create: items },
    subtotal,
    discountPercent: 0,
    discountAmount,
    taxAmount,
    total,
    taxPercent,
    notes: text(body.notes),
    termsConditions: text(body.termsConditions),
    ...(kind === "orders"
      ? {
          poNumber: text(body.poNumber, 100),
          deliveryDate: date(body.deliveryDate),
          advanceAmount: amount(
            body.advanceAmount ?? 0,
            "advance payment",
            total,
          ),
          status: orderStates.includes(body.status) ? body.status : "PENDING",
        }
      : { validUntil: date(body.validUntil), status: "DRAFT" }),
  };
}
router.get(
  "/customers",
  requireRole(["ADMIN", "SALES", "ACCOUNTANT", "MARKETING"]),
  wrap(async (req, res) => {
    const rows = await prisma.customer.findMany({});
    res.json(
      rows.filter(
        (c) =>
          req.user.role !== "SALES" ||
          !c.salesPersonId ||
          c.salesPersonId === req.user.id,
      ),
    );
  }),
);
for (const kind of ["orders", "quotations"]) {
  router.post(
    "/" + kind,
    requireRole(["ADMIN", "SALES"]),
    wrap(async (req, res) => {
      const data = await document(req.body, req.user, kind);
      const model = kind === "orders" ? prisma.order : prisma.quotation;
      const key = kind === "orders" ? "orderNumber" : "quotationNumber";
      data[key] =
        (kind === "orders" ? "ORD" : "QT") +
        "-" +
        new Date().toISOString().slice(0, 10).replaceAll("-", "") +
        "-" +
        randomUUID().slice(0, 8);
      data.salesPersonId = req.user.id;
      const saved = await model.create({
        data,
        include: { customer: true, items: { include: { product: true } } },
      });
      res
        .status(201)
        .json(kind === "orders" ? { order: saved } : { quotation: saved });
    }),
  );
  router.put(
    "/" + kind + "/:id",
    requireRole(["ADMIN", "SALES"]),
    wrap(async (req, res) => {
      const model = kind === "orders" ? prisma.order : prisma.quotation;
      const existing = await model.findUnique({ where: { id: req.params.id } });
      if (!existing)
        throw Object.assign(new Error("Record not found"), { status: 404 });
      if (req.user.role === "SALES" && existing.salesPersonId !== req.user.id)
        throw Object.assign(new Error("Access denied"), { status: 403 });
      if (kind === "quotations" && existing.status !== "DRAFT")
        fail("Only draft quotations can be edited");
      if (kind === "orders") {
        const invoice = await prisma.invoice.findFirst({
          where: { orderId: existing.id },
        });
        if (invoice && Number(invoice.amountPaid) > 0)
          fail(
            "An invoice with payments needs an accountant-reviewed correction",
          );
        if (
          ["DISPATCHED", "COMPLETED"].includes(existing.status) &&
          req.body.customerId !== existing.customerId
        )
          fail("A shipped order cannot change customer");
      }
      const data = await document(req.body, req.user, kind);
      data.items.deleteMany = {};
      const saved = await model.update({
        where: { id: existing.id },
        data,
        include: { customer: true, items: { include: { product: true } } },
      });
      res.json(kind === "orders" ? { order: saved } : { quotation: saved });
    }),
  );
}
router.get(
  "/dispatches",
  requireRole(["ADMIN", "SALES", "PRODUCTION", "ACCOUNTANT"]),
  wrap(async (req, res) => {
    let rows = await prisma.dispatch.findMany({
      include: { customer: true, order: true },
      orderBy: { createdAt: "desc" },
    });
    if (req.user.role === "SALES")
      rows = rows.filter((d) => d.order?.salesPersonId === req.user.id);
    res.json(rows);
  }),
);
router.post(
  "/dispatches",
  requireRole(["ADMIN", "SALES", "PRODUCTION"]),
  wrap(async (req, res) => {
    const order = await accessOrder(req.body.orderId, req.user);
    if (!["CONFIRMED", "IN_PRODUCTION", "READY"].includes(order.status))
      fail("Choose a confirmed, in progress or ready order");
    const courierName = text(req.body.courierName, 120),
      trackingNumber = text(req.body.trackingNumber, 120),
      address = text(req.body.address);
    if (!courierName || !trackingNumber || !address)
      fail("Enter courier, tracking number and delivery address");
    const dispatchDate = date(req.body.dispatchDate, true),
      expectedDeliveryDate = date(req.body.expectedDeliveryDate);
    if (expectedDeliveryDate && expectedDeliveryDate < dispatchDate)
      fail("Expected delivery cannot be before dispatch");
    if (await prisma.dispatch.findFirst({ where: { orderId: order.id } }))
      throw Object.assign(new Error("This order already has a dispatch"), {
        status: 409,
      });
    const saved = await prisma.dispatch.create({
      data: {
        dispatchNumber: "DSP-" + randomUUID().slice(0, 8),
        orderId: order.id,
        customerId: order.customerId,
        productionId: "manual:" + order.id,
        courierName,
        trackingNumber,
        dispatchDate,
        expectedDeliveryDate,
        deliveryAddress: { street: address },
        status: "DISPATCHED",
        notes: text(req.body.notes),
        createdBy: req.user.id,
        items: order.items.map((i) => ({
          productName: i.description || i.product?.name || "Item",
          quantity: i.quantity,
        })),
      },
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "DISPATCHED" },
    });
    res.status(201).json(saved);
  }),
);
router.put(
  "/dispatches/:id",
  requireRole(["ADMIN", "SALES", "PRODUCTION"]),
  wrap(async (req, res) => {
    const existing = await prisma.dispatch.findUnique({
      where: { id: req.params.id },
    });
    if (!existing)
      throw Object.assign(new Error("Dispatch not found"), { status: 404 });
    await accessOrder(existing.orderId, req.user);
    if (!["DISPATCHED", "IN_TRANSIT", "DELIVERED"].includes(req.body.status))
      fail("Choose a valid delivery status");
    const actualDeliveryDate = date(
      req.body.actualDeliveryDate,
      req.body.status === "DELIVERED",
    );
    if (
      actualDeliveryDate &&
      actualDeliveryDate < new Date(existing.dispatchDate)
    )
      fail("Delivery cannot be before dispatch");
    const courierName = text(req.body.courierName, 120),
      trackingNumber = text(req.body.trackingNumber, 120),
      address = text(req.body.address);
    if (!courierName || !trackingNumber || !address)
      fail("Enter courier, tracking number and delivery address");
    const saved = await prisma.dispatch.update({
      where: { id: existing.id },
      data: {
        status: req.body.status,
        courierName,
        trackingNumber,
        deliveryAddress: { street: address },
        actualDeliveryDate,
        notes: text(req.body.notes),
        updatedBy: req.user.id,
      },
    });
    await prisma.order.update({
      where: { id: existing.orderId },
      data: {
        status: saved.status === "DELIVERED" ? "COMPLETED" : "DISPATCHED",
      },
    });
    res.json(saved);
  }),
);
router.get(
  "/marketing",
  requireRole(["ADMIN", "SALES", "MARKETING"]),
  wrap(async (req, res) => {
    res.json(
      await prisma.campaign.findMany({ orderBy: { createdAt: "desc" } }),
    );
  }),
);
for (const method of ["post", "put"])
  router[method](
    "/marketing" + (method === "put" ? "/:id" : ""),
    requireRole(["ADMIN", "MARKETING"]),
    wrap(async (req, res) => {
      if (
        method === "put" &&
        !(await prisma.campaign.findUnique({ where: { id: req.params.id } }))
      )
        throw Object.assign(new Error("Campaign not found"), { status: 404 });
      const name = text(req.body.name, 150);
      if (!name) fail("Enter a campaign name");
      const manualLeads = amount(req.body.manualLeads ?? 0, "lead count", 1e7);
      if (!Number.isInteger(manualLeads))
        fail("Lead count must be a whole number");
      if (!["ACTIVE", "PAUSED", "COMPLETED"].includes(req.body.status))
        fail("Choose a campaign status");
      const startDate = date(req.body.startDate, true),
        endDate = date(req.body.endDate);
      if (endDate && endDate < startDate)
        fail("End date cannot be before start");
      const data = {
        name,
        platform: text(req.body.platform, 100),
        budget: amount(req.body.budget ?? 0, "budget"),
        spent: amount(req.body.spent ?? 0, "spend"),
        manualLeads,
        manualRevenue: amount(req.body.manualRevenue ?? 0, "order value"),
        startDate,
        endDate,
        status: req.body.status,
        description: text(req.body.description),
      };
      const saved =
        method === "post"
          ? await prisma.campaign.create({
              data: {
                ...data,
                campaignCode: "CAM-" + randomUUID().slice(0, 8),
                createdBy: req.user.id,
                type: "MANUAL",
              },
            })
          : await prisma.campaign.update({
              where: { id: req.params.id },
              data,
            });
      res.status(method === "post" ? 201 : 200).json(saved);
    }),
  );
router.use(require("./manualCustomers"));
module.exports = router;
