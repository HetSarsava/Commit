const { prisma } = require('../config/database');
const { getCompany } = require('../services/companyProfile');
const { service, store } = require('../services/whatsapp');
const { WhatsAppError } = require('../services/whatsapp/metaProvider');
const { parseHistoryQuery } = require('../services/whatsapp/validation');

// Message templates
const templates = {
  quotation: (data) => `
🏭 *${data.company.name}*

Dear ${data.customerName},

Thank you for your interest! We're pleased to share our quotation:

📋 *Quotation: ${data.quotationNumber}*
📅 Valid until: ${data.validUntil}

💰 *Amount: ₹${data.total.toLocaleString('en-IN')}*
(Including GST)

📦 *Items:*
${data.items.map((item, i) => `${i + 1}. ${item.name} - ${item.quantity} units @ ₹${item.price}`).join('\n')}

✅ To proceed with the order, please reply to this message or call us.

📞 Contact: ${data.company.phone}
📧 Email: ${data.company.email}

_This is an automated message from ${data.company.name}._
  `.trim(),

  orderConfirmation: (data) => `
🏭 *${data.company.name}*

Dear ${data.customerName},

✅ Your order has been confirmed!

📋 *Order Number: ${data.orderNumber}*
📅 Order Date: ${data.orderDate}
📦 Delivery Date: ${data.deliveryDate}

💰 *Total Amount: ₹${data.total.toLocaleString('en-IN')}*

${data.advancePaid ? `✅ Advance Received: ₹${data.advancePaid.toLocaleString('en-IN')}` : ''}
${data.balanceDue ? `⏳ Balance Due: ₹${data.balanceDue.toLocaleString('en-IN')}` : ''}

📦 *Items:*
${data.items.map((item, i) => `${i + 1}. ${item.name} - ${item.quantity} units`).join('\n')}

Your order is now in production. We'll keep you updated on the progress!

📞 For queries: ${data.company.phone}

_This is an automated message from ${data.company.name}._
  `.trim(),

  productionUpdate: (data) => `
🏭 *${data.company.name}* - Production Update

Dear ${data.customerName},

📋 Order: *${data.orderNumber}*

${data.stage === 'IN_PRODUCTION' ? '⚙️ Your order is now in production!' : ''}
${data.stage === 'QC' ? '🔍 Quality check in progress' : ''}
${data.stage === 'PACKING' ? '📦 Your order is being packed' : ''}
${data.stage === 'DISPATCH' ? '🚚 Your order has been dispatched!' : ''}

${data.estimatedCompletion ? `📅 Expected completion: ${data.estimatedCompletion}` : ''}

We'll notify you once ready for delivery.

📞 Contact: ${data.company.phone}

_This is an automated message from ${data.company.name}._
  `.trim(),

  paymentReminder: (data) => `
🏭 *${data.company.name}* - Payment Reminder

Dear ${data.customerName},

📋 *Invoice: ${data.invoiceNumber}*
📅 Due Date: ${data.dueDate}

💰 *Amount Due: ₹${data.balanceDue.toLocaleString('en-IN')}*

${data.isOverdue ? '⚠️ This payment is overdue. Please settle at the earliest.' : 'Kindly arrange payment by the due date.'}

Please share payment confirmation once done.

📞 For queries: ${data.company.phone}

_This is an automated message from ${data.company.name}._
  `.trim(),

  paymentReceived: (data) => `
🏭 *${data.company.name}* - Payment Confirmation

Dear ${data.customerName},

✅ Payment received successfully!

📋 *Invoice: ${data.invoiceNumber}*
💰 *Amount Received: ₹${data.amount.toLocaleString('en-IN')}*
📅 Payment Date: ${data.paymentDate}
🔖 Reference: ${data.referenceNumber}

${data.balanceRemaining > 0
  ? `⏳ Balance Due: ₹${data.balanceRemaining.toLocaleString('en-IN')}`
  : '✅ Invoice fully paid. Thank you!'}

Thank you for your payment!

📞 Contact: ${data.company.phone}

_This is an automated message from ${data.company.name}._
  `.trim(),
};

// Send quotation via WhatsApp
exports.sendQuotation = async (req, res, next) => {
  try {
    const { quotationId } = req.body;

    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        customer: true,
        items: {
          include: { product: true },
        },
      },
    });

    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    if (!quotation.customer.whatsapp) {
      return res.status(400).json({ error: 'Customer WhatsApp number not found' });
    }

    const validUntil = quotation.validUntil ? new Date(quotation.validUntil) : new Date(new Date(quotation.createdAt).getTime() + 30 * 86400000);

    const messageData = {
      company: await getCompany(prisma),
      customerName: quotation.customer.contactPerson || quotation.customer.companyName,
      quotationNumber: quotation.quotationNumber,
      validUntil: validUntil.toLocaleDateString('en-IN'),
      total: Number(quotation.total),
      items: quotation.items.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        price: Number(item.unitPrice).toLocaleString('en-IN'),
      })),
    };

    const message = templates.quotation(messageData);
    const result = await service.send({ to: quotation.customer.whatsapp, message, sentBy: req.user.id, idempotencyKey: req.get?.('Idempotency-Key'), relatedId: quotationId, messageType: 'QUOTATION' });


    res.json({
      message: 'Quotation accepted by Meta; delivery status will update from webhooks',
      result,
    });
  } catch (error) {
    next(error);
  }
};

// Send order confirmation
exports.sendOrderConfirmation = async (req, res, next) => {
  try {
    const { orderId } = req.body;

    const order = await (prisma.salesOrder || prisma.order).findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        items: {
          include: { product: true },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!order.customer.whatsapp) {
      return res.status(400).json({ error: 'Customer WhatsApp number not found' });
    }

    const messageData = {
      company: await getCompany(prisma),
      customerName: order.customer.contactPerson || order.customer.companyName,
      orderNumber: order.orderNumber,
      orderDate: new Date(order.createdAt).toLocaleDateString('en-IN'),
      deliveryDate: order.expectedDelivery || order.deliveryDate ? new Date(order.expectedDelivery || order.deliveryDate).toLocaleDateString('en-IN') : 'TBD',
      total: Number(order.total),
      advancePaid: order.advanceAmount,
      balanceDue: order.balanceAmount,
      items: order.items.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
      })),
    };

    const message = templates.orderConfirmation(messageData);
    const result = await service.send({ to: order.customer.whatsapp, message, sentBy: req.user.id, idempotencyKey: req.get?.('Idempotency-Key'), relatedId: orderId, messageType: 'ORDER_CONFIRMATION' });


    res.json({
      message: 'Order confirmation accepted by Meta; delivery status will update from webhooks',
      result,
    });
  } catch (error) {
    next(error);
  }
};

// Send payment reminder
exports.sendPaymentReminder = async (req, res, next) => {
  try {
    const { invoiceId } = req.body;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (!invoice.customer.whatsapp) {
      return res.status(400).json({ error: 'Customer WhatsApp number not found' });
    }

    if (invoice.balanceDue <= 0) {
      return res.status(400).json({ error: 'Invoice is already paid' });
    }

    const dueDate = new Date(invoice.dueDate);
    const isOverdue = dueDate < new Date();

    const messageData = {
      company: await getCompany(prisma),
      customerName: invoice.customer.contactPerson || invoice.customer.companyName,
      invoiceNumber: invoice.invoiceNumber,
      dueDate: dueDate.toLocaleDateString('en-IN'),
      balanceDue: Number(invoice.balanceDue),
      isOverdue,
    };

    const message = templates.paymentReminder(messageData);
    const result = await service.send({ to: invoice.customer.whatsapp, message, sentBy: req.user.id, idempotencyKey: req.get?.('Idempotency-Key'), relatedId: invoiceId, messageType: 'PAYMENT_REMINDER' });


    res.json({
      message: 'Payment reminder accepted by Meta; delivery status will update from webhooks',
      result,
    });
  } catch (error) {
    next(error);
  }
};


// Keep all Meta-specific logic in the provider/service, not CRM controllers.
const handler = fn => async (req, res, next) => {
  try { res.json(await fn(req)); }
  catch (error) {
    if (error instanceof WhatsAppError) return res.status(error.status).json({ error: error.message, code: error.metaCode || null, uncertain: !!error.uncertain });
    next(error);
  }
};
exports.getConversations = handler(async () => Promise.all((await store.conversations()).map(async c => {
  const legacy = c.lastMessage.match(/^\[Template: (\w+) \(([\w_]+)\)\]$/);
  const lastMessage = legacy ? await service.templatePreview({ name: legacy[1], language: { code: legacy[2] } }) || 'Template message' : c.lastMessage;
  return { ...c, lastMessage, automationStatus: 'PAUSED', needsHuman: true, leadStage: c.leadId ? 'Contacted' : 'New contact', salesperson: 'Unassigned' };
})));
exports.getMessages = handler(async req => {
  if (!await store.getConversation(req.params.conversationId)) throw new WhatsAppError('Conversation not found.', 404);
  return Promise.all((await store.messages(req.params.conversationId)).map(message => service.displayMessage(message)));
});
exports.createConversation = handler(req => service.createConversation(req.body.phoneNumber || req.body.to));
exports.markAsRead = handler(async req => {
  if (!await store.getConversation(req.params.conversationId)) throw new WhatsAppError('Conversation not found.', 404);
  return store.transaction(s => s.updateConversation(req.params.conversationId, { unreadCount: 0 }));
});
exports.sendMessage = handler(req => service.send({ to: req.body.to, message: req.body.message, conversationId: req.body.conversationId, sentBy: req.user.id, idempotencyKey: req.get?.('Idempotency-Key') }));
exports.sendTemplate = handler(req => service.send({ to: req.body.to, conversationId: req.body.conversationId, sentBy: req.user.id, idempotencyKey: req.get?.('Idempotency-Key'), messageType: 'TEMPLATE', template: { name: req.body.templateName, language: { code: req.body.language || 'en_US' }, ...(req.body.components ? { components: req.body.components } : {}) } }));
exports.getTemplates = handler(async () => {
  const templates = await service.provider.templates();
  const messages = await store.messages();
  return templates.map(t => {
    const sent = messages.filter(m => m.metadata?.template?.name === t.name && m.metadata?.template?.language?.code === t.language);
    return { ...t, sentCount: sent.filter(m => ['ACCEPTED','SENT','DELIVERED','READ'].includes(m.status)).length, deliveredCount: sent.filter(m => ['DELIVERED','READ'].includes(m.status)).length, readCount: sent.filter(m => m.status === 'READ').length };
  });
});
// The previous automation catalogue was only a mock, with no execution engine.
exports.getAutomations = handler(async () => []);
exports.toggleAutomation = handler(async () => { throw new WhatsAppError('Automatic WhatsApp workflows are not configured.', 409); });
exports.getMessageHistory = handler(async req => {
  const { limit, page, phone, type } = parseHistoryQuery(req.query);
  let messages = await store.messages();
  if (type) messages = messages.filter(m => m.messageType === type);
  if (phone) {
    const conversation = (await store.conversations()).find(c => c.phoneNumber === phone);
    messages = messages.filter(m => m.conversationId === conversation?.id);
  }
  return { messages: messages.reverse().slice((page-1)*limit,page*limit), pagination: { page, limit, total: messages.length, totalPages: Math.ceil(messages.length/limit) } };
});
exports.getAnalytics = handler(async () => {
  const conversations = await store.conversations();
  const messages = await store.messages();
  const outgoing = messages.filter(m => m.direction === 'OUTGOING');
  const accepted = outgoing.filter(m => ['ACCEPTED','SENT','DELIVERED','READ'].includes(m.status));
  const delivered = outgoing.filter(m => ['DELIVERED','READ'].includes(m.status));
  return { totalConversations: conversations.length, messagesSent: accepted.length, messagesReceived: messages.length-outgoing.length, deliveryRate: accepted.length ? 100*delivered.length/accepted.length : 0, readRate: accepted.length ? 100*outgoing.filter(m=>m.status==='READ').length/accepted.length : 0, unreadMessages: conversations.reduce((n,c)=>n+c.unreadCount,0), manualMessages: outgoing.length, automatedMessages: 0, activeConversations: conversations.filter(c=>c.lastInboundAt && Date.now()-new Date(c.lastInboundAt)<86400000).length, leadsGenerated: 0, avgResponseTime: 'Not available', newConversationsToday: 0, quotationsSent: outgoing.filter(m=>m.messageType==='QUOTATION').length, orderConfirmations: outgoing.filter(m=>m.messageType==='ORDER_CONFIRMATION').length, paymentReminders: outgoing.filter(m=>m.messageType==='PAYMENT_REMINDER').length, conversionRate: 0, topKeywords: [], messagesByHour: [], messagesByDay: [], automationPerformance: [], responseTimeDistribution: {} };
});
exports.sendProductionUpdate = handler(async req => {
  const order = await (prisma.salesOrder || prisma.order).findUnique({ where: { id: req.body.orderId }, include: { customer: true } });
  if (!order) throw new WhatsAppError('Order not found.', 404);
  if (typeof req.body.stage !== 'string' || !['IN_PRODUCTION','QC','PACKING','DISPATCH'].includes(req.body.stage)) throw new WhatsAppError('Invalid production stage.');
  const message = templates.productionUpdate({ company: await getCompany(prisma), customerName: order.customer.contactPerson || order.customer.companyName, orderNumber: order.orderNumber, stage: req.body.stage });
  return service.send({ to: order.customer.whatsapp || order.customer.mobile, message, sentBy: req.user.id, idempotencyKey: req.get?.('Idempotency-Key'), messageType: 'PRODUCTION_UPDATE', relatedId: order.id });
});
