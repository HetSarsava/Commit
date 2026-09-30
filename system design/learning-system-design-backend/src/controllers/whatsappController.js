const { prisma } = require('../config/database');

// Mock WhatsApp API - simulates sending messages
const sendWhatsAppMessage = async (to, message, mediaUrl = null) => {
  // In production, this would integrate with WhatsApp Business API
  // For demo purposes, we simulate successful sending
  console.log(`📱 WhatsApp Message Sent to ${to}:`);
  console.log(message);

  return {
    success: true,
    messageId: `wa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
  };
};

// Message templates
const templates = {
  quotation: (data) => `
🏭 *AMIT UNIFORM*

Dear ${data.customerName},

Thank you for your interest! We're pleased to share our quotation:

📋 *Quotation: ${data.quotationNumber}*
📅 Valid until: ${data.validUntil}

💰 *Amount: ₹${data.total.toLocaleString('en-IN')}*
(Including GST)

📦 *Items:*
${data.items.map((item, i) => `${i + 1}. ${item.name} - ${item.quantity} units @ ₹${item.price}`).join('\n')}

✅ To proceed with the order, please reply to this message or call us.

📞 Contact: +91 79 2765 4321
📧 Email: sales@amituniform.com

_This is an automated message from Amit Uniform CRM._
  `.trim(),

  orderConfirmation: (data) => `
🏭 *AMIT UNIFORM*

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

📞 For queries: +91 79 2765 4321

_This is an automated message from Amit Uniform CRM._
  `.trim(),

  productionUpdate: (data) => `
🏭 *AMIT UNIFORM* - Production Update

Dear ${data.customerName},

📋 Order: *${data.orderNumber}*

${data.stage === 'IN_PRODUCTION' ? '⚙️ Your order is now in production!' : ''}
${data.stage === 'QC' ? '🔍 Quality check in progress' : ''}
${data.stage === 'PACKING' ? '📦 Your order is being packed' : ''}
${data.stage === 'DISPATCH' ? '🚚 Your order has been dispatched!' : ''}

${data.estimatedCompletion ? `📅 Expected completion: ${data.estimatedCompletion}` : ''}

We'll notify you once ready for delivery.

📞 Contact: +91 79 2765 4321

_This is an automated message from Amit Uniform CRM._
  `.trim(),

  paymentReminder: (data) => `
🏭 *AMIT UNIFORM* - Payment Reminder

Dear ${data.customerName},

📋 *Invoice: ${data.invoiceNumber}*
📅 Due Date: ${data.dueDate}

💰 *Amount Due: ₹${data.balanceDue.toLocaleString('en-IN')}*

${data.isOverdue ? '⚠️ This payment is overdue. Please settle at the earliest.' : 'Kindly arrange payment by the due date.'}

*Bank Details:*
Bank: HDFC Bank
A/C: 50200012345678
IFSC: HDFC0001234
UPI: amituniform@hdfc

Please share payment confirmation once done.

📞 For queries: +91 79 2765 4321

_This is an automated message from Amit Uniform CRM._
  `.trim(),

  paymentReceived: (data) => `
🏭 *AMIT UNIFORM* - Payment Confirmation

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

📞 Contact: +91 79 2765 4321

_This is an automated message from Amit Uniform CRM._
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

    const validUntil = new Date(quotation.createdAt);
    validUntil.setDate(validUntil.getDate() + 30);

    const messageData = {
      customerName: quotation.customer.contactPerson || quotation.customer.companyName,
      quotationNumber: quotation.quotationNumber,
      validUntil: validUntil.toLocaleDateString('en-IN'),
      total: quotation.total,
      items: quotation.items.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.unitPrice.toLocaleString('en-IN'),
      })),
    };

    const message = templates.quotation(messageData);
    const result = await sendWhatsAppMessage(quotation.customer.whatsapp, message);

    // Log the message
    await prisma.whatsappMessage.create({
      data: {
        messageId: result.messageId,
        recipientPhone: quotation.customer.whatsapp,
        recipientName: quotation.customer.companyName,
        messageType: 'QUOTATION',
        content: message,
        status: 'SENT',
        relatedId: quotationId,
        sentBy: req.user.id,
      },
    });

    res.json({
      message: 'Quotation sent via WhatsApp successfully',
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

    const order = await prisma.order.findUnique({
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
      customerName: order.customer.contactPerson || order.customer.companyName,
      orderNumber: order.orderNumber,
      orderDate: new Date(order.createdAt).toLocaleDateString('en-IN'),
      deliveryDate: order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('en-IN') : 'TBD',
      total: order.total,
      advancePaid: order.advanceAmount,
      balanceDue: order.balanceAmount,
      items: order.items.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
      })),
    };

    const message = templates.orderConfirmation(messageData);
    const result = await sendWhatsAppMessage(order.customer.whatsapp, message);

    // Log the message
    await prisma.whatsappMessage.create({
      data: {
        messageId: result.messageId,
        recipientPhone: order.customer.whatsapp,
        recipientName: order.customer.companyName,
        messageType: 'ORDER_CONFIRMATION',
        content: message,
        status: 'SENT',
        relatedId: orderId,
        sentBy: req.user.id,
      },
    });

    res.json({
      message: 'Order confirmation sent via WhatsApp successfully',
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
      customerName: invoice.customer.contactPerson || invoice.customer.companyName,
      invoiceNumber: invoice.invoiceNumber,
      dueDate: dueDate.toLocaleDateString('en-IN'),
      balanceDue: invoice.balanceDue,
      isOverdue,
    };

    const message = templates.paymentReminder(messageData);
    const result = await sendWhatsAppMessage(invoice.customer.whatsapp, message);

    // Log the message
    await prisma.whatsappMessage.create({
      data: {
        messageId: result.messageId,
        recipientPhone: invoice.customer.whatsapp,
        recipientName: invoice.customer.companyName,
        messageType: 'PAYMENT_REMINDER',
        content: message,
        status: 'SENT',
        relatedId: invoiceId,
        sentBy: req.user.id,
      },
    });

    res.json({
      message: 'Payment reminder sent via WhatsApp successfully',
      result,
    });
  } catch (error) {
    next(error);
  }
};

// Get WhatsApp message history
exports.getMessageHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, type, phone } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (type) where.messageType = type;
    if (phone) where.recipientPhone = phone;

    const messages = await prisma.whatsappMessage.findMany({
      where,
      include: {
        sender: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    });

    const total = await prisma.whatsappMessage.count({ where });

    res.json({
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==================== NEW ENDPOINTS FOR WHATSAPP UI ====================

// Get all conversations
exports.getConversations = async (req, res, next) => {
  try {
    // Mock conversations data (in production, fetch from database)
    const conversations = [
      {
        id: 'conv-1',
        customerName: 'Hotel Paradise',
        phoneNumber: '+91 98765 43210',
        lastMessage: 'Thanks for the quotation! When can we finalize?',
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
        unreadCount: 2,
        automationStatus: 'PAUSED',
        needsHuman: true,
        leadStage: 'Quotation',
        salesperson: 'Ravi Shah',
        productInterest: 'Hotel staff uniforms',
        quantity: '50 pcs',
        budget: '₹45,000',
      },
      {
        id: 'conv-2',
        customerName: 'Mumbai Hospital',
        phoneNumber: '+91 98765 43211',
        lastMessage: 'When can you deliver 200 pieces?',
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        unreadCount: 0,
        automationStatus: 'ACTIVE',
        needsHuman: false,
        isAutomated: true,
        leadStage: 'Requirement',
        salesperson: 'Priya Mehta',
        productInterest: 'Nursing scrubs',
        quantity: '200 pcs',
        budget: '₹1,20,000',
      },
      {
        id: 'conv-3',
        customerName: 'Delhi School',
        phoneNumber: '+91 98765 43212',
        lastMessage: 'Can you send samples of shirts?',
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        unreadCount: 1,
        automationStatus: 'PAUSED',
        needsHuman: true,
        leadStage: 'Catalogue',
        salesperson: 'Amit Kumar',
        productInterest: 'School uniforms',
        quantity: '150 pcs',
        budget: '₹65,000',
      },
      {
        id: 'conv-4',
        customerName: 'Bangalore Tech Corp',
        phoneNumber: '+91 98765 43213',
        lastMessage: 'Order confirmed! Thanks',
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
        unreadCount: 0,
        automationStatus: 'ACTIVE',
        needsHuman: false,
        isAutomated: true,
        leadStage: 'Order',
        salesperson: 'Ravi Shah',
        productInterest: 'Corporate uniforms',
        quantity: '75 pcs',
        budget: '₹85,000',
      },
      {
        id: 'conv-5',
        customerName: 'Chennai Restaurant',
        phoneNumber: '+91 98765 43214',
        lastMessage: 'Need 50 chef uniforms urgently',
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
        unreadCount: 3,
        automationStatus: 'PAUSED',
        needsHuman: true,
        leadStage: 'New',
        salesperson: 'Unassigned',
        productInterest: 'Chef uniforms',
        quantity: '50 pcs',
        budget: 'Not specified',
      },
      {
        id: 'conv-6',
        customerName: 'Kolkata Security Services',
        phoneNumber: '+91 98765 43215',
        lastMessage: 'What is the price for bulk order?',
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 hours ago
        unreadCount: 0,
        automationStatus: 'ACTIVE',
        needsHuman: false,
        isAutomated: true,
        leadStage: 'Contacted',
        salesperson: 'Priya Mehta',
        productInterest: 'Security guard uniforms',
        quantity: '100 pcs',
        budget: '₹38,000',
      },
      {
        id: 'conv-7',
        customerName: 'Hyderabad Mall',
        phoneNumber: '+91 98765 43216',
        lastMessage: 'Can we customize the logo?',
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
        unreadCount: 0,
        automationStatus: 'ACTIVE',
        needsHuman: false,
        isAutomated: true,
        leadStage: 'Requirement',
        salesperson: 'Amit Kumar',
        productInterest: 'Retail staff uniforms',
        quantity: '85 pcs',
        budget: '₹72,000',
      },
      {
        id: 'conv-8',
        customerName: 'Pune Hotel Group',
        phoneNumber: '+91 98765 43217',
        lastMessage: 'Payment done! Please check',
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        unreadCount: 0,
        automationStatus: 'ACTIVE',
        needsHuman: false,
        isAutomated: true,
        leadStage: 'Order',
        salesperson: 'Ravi Shah',
        productInterest: 'Hotel uniforms',
        quantity: '120 pcs',
        budget: '₹95,000',
      },
      {
        id: 'conv-9',
        customerName: 'Jaipur Hospital',
        phoneNumber: '+91 98765 43218',
        lastMessage: 'When will the order be dispatched?',
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
        unreadCount: 1,
        automationStatus: 'PAUSED',
        needsHuman: true,
        leadStage: 'Production',
        salesperson: 'Priya Mehta',
        productInterest: 'Medical scrubs',
        quantity: '180 pcs',
        budget: '₹1,35,000',
      },
      {
        id: 'conv-10',
        customerName: 'Ahmedabad School',
        phoneNumber: '+91 98765 43219',
        lastMessage: 'Thanks! Received the samples',
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
        unreadCount: 0,
        automationStatus: 'ACTIVE',
        needsHuman: false,
        isAutomated: true,
        leadStage: 'Sample',
        salesperson: 'Amit Kumar',
        productInterest: 'School uniforms',
        quantity: '200 pcs',
        budget: '₹88,000',
      },
      {
        id: 'conv-11',
        customerName: 'Surat Factory',
        phoneNumber: '+91 98765 43220',
        lastMessage: 'Need worker uniforms for 100 people',
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4), // 4 days ago
        unreadCount: 0,
        automationStatus: 'ACTIVE',
        needsHuman: false,
        isAutomated: true,
        leadStage: 'Contacted',
        salesperson: 'Ravi Shah',
        productInterest: 'Industrial workwear',
        quantity: '100 pcs',
        budget: '₹42,000',
      },
      {
        id: 'conv-12',
        customerName: 'Lucknow Hospital',
        phoneNumber: '+91 98765 43221',
        lastMessage: 'Send me your complete catalogue',
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
        unreadCount: 0,
        automationStatus: 'ACTIVE',
        needsHuman: false,
        isAutomated: true,
        leadStage: 'Catalogue',
        salesperson: 'Priya Mehta',
        productInterest: 'Hospital uniforms',
        quantity: 'Not specified',
        budget: 'Not specified',
      },
      {
        id: 'conv-13',
        customerName: 'Indore Restaurant',
        phoneNumber: '+91 98765 43222',
        lastMessage: 'Do you have ready stock?',
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6), // 6 days ago
        unreadCount: 0,
        automationStatus: 'ACTIVE',
        needsHuman: false,
        isAutomated: true,
        leadStage: 'Contacted',
        salesperson: 'Amit Kumar',
        productInterest: 'Chef uniforms',
        quantity: '35 pcs',
        budget: '₹28,000',
      },
      {
        id: 'conv-14',
        customerName: 'Chandigarh Hotel',
        phoneNumber: '+91 98765 43223',
        lastMessage: 'Quality is excellent! Will order more',
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 7 days ago
        unreadCount: 0,
        automationStatus: 'ACTIVE',
        needsHuman: false,
        isAutomated: true,
        leadStage: 'Completed',
        salesperson: 'Ravi Shah',
        productInterest: 'Hotel uniforms',
        quantity: '95 pcs',
        budget: '₹78,000',
      },
      {
        id: 'conv-15',
        customerName: 'Patna School',
        phoneNumber: '+91 98765 43224',
        lastMessage: 'What is the MOQ?',
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10), // 10 days ago
        unreadCount: 0,
        automationStatus: 'ACTIVE',
        needsHuman: false,
        isAutomated: true,
        leadStage: 'New',
        salesperson: 'Unassigned',
        productInterest: 'School uniforms',
        quantity: 'Not specified',
        budget: 'Not specified',
      },
    ];

    res.json(conversations);
  } catch (error) {
    next(error);
  }
};

// Get messages for a conversation
exports.getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    // Mock messages data - different for each conversation
    const messagesByConversation = {
      'conv-1': [
        {
          id: 'msg-1-1',
          conversationId,
          message: 'Hello, I need uniforms for my hotel staff',
          direction: 'INCOMING',
          timestamp: new Date(Date.now() - 1000 * 60 * 120),
        },
        {
          id: 'msg-1-2',
          conversationId,
          message: 'Hello! We would be happy to help. How many uniforms do you need?',
          direction: 'OUTGOING',
          timestamp: new Date(Date.now() - 1000 * 60 * 115),
          isAutomated: true,
        },
        {
          id: 'msg-1-3',
          conversationId,
          message: 'Around 50 pieces for reception staff and housekeeping',
          direction: 'INCOMING',
          timestamp: new Date(Date.now() - 1000 * 60 * 110),
        },
        {
          id: 'msg-1-4',
          conversationId,
          message: 'Great! Can you share your requirements - colors, design preferences?',
          direction: 'OUTGOING',
          timestamp: new Date(Date.now() - 1000 * 60 * 105),
          isAutomated: false,
        },
        {
          id: 'msg-1-5',
          conversationId,
          message: 'Navy blue for reception, grey for housekeeping. Need formal look.',
          direction: 'INCOMING',
          timestamp: new Date(Date.now() - 1000 * 60 * 100),
        },
        {
          id: 'msg-1-6',
          conversationId,
          message: 'Perfect! I am sending you a quotation with our best prices.',
          direction: 'OUTGOING',
          timestamp: new Date(Date.now() - 1000 * 60 * 95),
          isAutomated: false,
        },
        {
          id: 'msg-1-7',
          conversationId,
          message: '🏭 AMIT UNIFORM\n\nQuotation: QUO-2024-001\nTotal: ₹45,000 (inc GST)\nValidity: 30 days',
          direction: 'OUTGOING',
          timestamp: new Date(Date.now() - 1000 * 60 * 90),
          isAutomated: true,
        },
        {
          id: 'msg-1-8',
          conversationId,
          message: 'Thanks for the quotation! When can we finalize?',
          direction: 'INCOMING',
          timestamp: new Date(Date.now() - 1000 * 60 * 5),
        },
      ],
      'conv-2': [
        {
          id: 'msg-2-1',
          conversationId,
          message: 'Hi, I need nurse uniforms for our hospital',
          direction: 'INCOMING',
          timestamp: new Date(Date.now() - 1000 * 60 * 180),
        },
        {
          id: 'msg-2-2',
          conversationId,
          message: 'Hello! How many pieces do you need?',
          direction: 'OUTGOING',
          timestamp: new Date(Date.now() - 1000 * 60 * 175),
        },
        {
          id: 'msg-2-3',
          conversationId,
          message: 'We need 200 pieces - white scrubs',
          direction: 'INCOMING',
          timestamp: new Date(Date.now() - 1000 * 60 * 170),
        },
        {
          id: 'msg-2-4',
          conversationId,
          message: 'Great! We have high-quality medical scrubs. Let me send you samples and pricing.',
          direction: 'OUTGOING',
          timestamp: new Date(Date.now() - 1000 * 60 * 165),
        },
        {
          id: 'msg-2-5',
          conversationId,
          message: 'When can you deliver 200 pieces?',
          direction: 'INCOMING',
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
        },
      ],
      'conv-3': [
        {
          id: 'msg-3-1',
          conversationId,
          message: 'Need school uniforms for 150 students',
          direction: 'INCOMING',
          timestamp: new Date(Date.now() - 1000 * 60 * 240),
        },
        {
          id: 'msg-3-2',
          conversationId,
          message: 'Hello! Which grade students - primary or secondary?',
          direction: 'OUTGOING',
          timestamp: new Date(Date.now() - 1000 * 60 * 235),
        },
        {
          id: 'msg-3-3',
          conversationId,
          message: 'Mix of both. Need shirts, trousers, and skirts',
          direction: 'INCOMING',
          timestamp: new Date(Date.now() - 1000 * 60 * 230),
        },
        {
          id: 'msg-3-4',
          conversationId,
          message: 'I will send you our school uniform catalogue with pricing.',
          direction: 'OUTGOING',
          timestamp: new Date(Date.now() - 1000 * 60 * 225),
        },
        {
          id: 'msg-3-5',
          conversationId,
          message: 'Can you send samples of shirts?',
          direction: 'INCOMING',
          timestamp: new Date(Date.now() - 1000 * 60 * 120),
        },
      ],
      'conv-4': [
        {
          id: 'msg-4-1',
          conversationId,
          message: 'Hi, we spoke yesterday about corporate uniforms',
          direction: 'INCOMING',
          timestamp: new Date(Date.now() - 1000 * 60 * 300),
        },
        {
          id: 'msg-4-2',
          conversationId,
          message: 'Yes! Have you reviewed our quotation?',
          direction: 'OUTGOING',
          timestamp: new Date(Date.now() - 1000 * 60 * 295),
        },
        {
          id: 'msg-4-3',
          conversationId,
          message: 'Yes, looks good. We want to proceed with the order.',
          direction: 'INCOMING',
          timestamp: new Date(Date.now() - 1000 * 60 * 290),
        },
        {
          id: 'msg-4-4',
          conversationId,
          message: 'Excellent! I will create the order. Please confirm the delivery address.',
          direction: 'OUTGOING',
          timestamp: new Date(Date.now() - 1000 * 60 * 285),
        },
        {
          id: 'msg-4-5',
          conversationId,
          message: 'Bangalore, Whitefield. Same as quotation.',
          direction: 'INCOMING',
          timestamp: new Date(Date.now() - 1000 * 60 * 280),
        },
        {
          id: 'msg-4-6',
          conversationId,
          message: '✅ Order confirmed! Order #ORD-2024-045. Expected delivery: 15 days.',
          direction: 'OUTGOING',
          timestamp: new Date(Date.now() - 1000 * 60 * 275),
        },
        {
          id: 'msg-4-7',
          conversationId,
          message: 'Order confirmed! Thanks',
          direction: 'INCOMING',
          timestamp: new Date(Date.now() - 1000 * 60 * 180),
        },
      ],
      'conv-5': [
        {
          id: 'msg-5-1',
          conversationId,
          message: 'Need 50 chef uniforms urgently',
          direction: 'INCOMING',
          timestamp: new Date(Date.now() - 1000 * 60 * 300),
        },
        {
          id: 'msg-5-2',
          conversationId,
          message: 'Hello! When do you need them by?',
          direction: 'OUTGOING',
          timestamp: new Date(Date.now() - 1000 * 60 * 295),
        },
        {
          id: 'msg-5-3',
          conversationId,
          message: 'Within 2 weeks. New restaurant opening.',
          direction: 'INCOMING',
          timestamp: new Date(Date.now() - 1000 * 60 * 290),
        },
        {
          id: 'msg-5-4',
          conversationId,
          message: 'We can deliver in 10 days. Let me send you chef uniform options.',
          direction: 'OUTGOING',
          timestamp: new Date(Date.now() - 1000 * 60 * 285),
        },
      ],
      'conv-6': [
        {
          id: 'msg-6-1',
          conversationId,
          message: 'Need security guard uniforms',
          direction: 'INCOMING',
          timestamp: new Date(Date.now() - 1000 * 60 * 480),
        },
        {
          id: 'msg-6-2',
          conversationId,
          message: 'How many pieces do you need?',
          direction: 'OUTGOING',
          timestamp: new Date(Date.now() - 1000 * 60 * 475),
        },
        {
          id: 'msg-6-3',
          conversationId,
          message: '100 pieces. What is the price for bulk order?',
          direction: 'INCOMING',
          timestamp: new Date(Date.now() - 1000 * 60 * 470),
        },
        {
          id: 'msg-6-4',
          conversationId,
          message: 'For 100+ pieces, we offer 15% discount. Base price ₹450 per piece.',
          direction: 'OUTGOING',
          timestamp: new Date(Date.now() - 1000 * 60 * 465),
        },
      ],
    };

    // Return messages for specific conversation, or default messages
    const messages = messagesByConversation[conversationId] || [
      {
        id: `msg-${conversationId}-1`,
        conversationId,
        message: 'Hello, I need information about your uniforms',
        direction: 'INCOMING',
        timestamp: new Date(Date.now() - 1000 * 60 * 60),
      },
      {
        id: `msg-${conversationId}-2`,
        conversationId,
        message: 'Hello! Thank you for contacting us. How can I help you today?',
        direction: 'OUTGOING',
        timestamp: new Date(Date.now() - 1000 * 60 * 55),
      },
    ];

    res.json(messages);
  } catch (error) {
    next(error);
  }
};

// Send a WhatsApp message
exports.sendMessage = async (req, res, next) => {
  try {
    const { conversationId, to, message } = req.body;

    const result = await sendWhatsAppMessage(to, message);

    // In production, save to database
    const newMessage = {
      id: `msg-${Date.now()}`,
      conversationId,
      message,
      direction: 'OUTGOING',
      timestamp: new Date(),
      status: 'SENT',
    };

    res.json(newMessage);
  } catch (error) {
    next(error);
  }
};

// Get message templates
exports.getTemplates = async (req, res, next) => {
  try {
    // Mock templates data
    const messageTemplates = [
      {
        id: 'template-1',
        name: 'Welcome Message',
        category: 'GREETING',
        content: '🏭 *AMIT UNIFORM*\n\nHello! Welcome to Amit Uniform. We specialize in high-quality uniforms for hotels, hospitals, schools, restaurants and corporate offices.\n\nHow can we help you today?',
        status: 'APPROVED',
        sentCount: 245,
        deliveredCount: 242,
        readCount: 238,
      },
      {
        id: 'template-2',
        name: 'Quotation Template',
        category: 'QUOTATION',
        content: '🏭 *AMIT UNIFORM*\n\nDear {{customer_name}},\n\nThank you for your interest! We\'re pleased to share our quotation:\n\n📋 *Quotation: {{quotation_number}}*\n📅 Valid until: {{valid_until}}\n💰 *Amount: ₹{{total}}* (Including GST)\n\n✅ To proceed with the order, please reply to this message.\n\n📞 Contact: +91 79 2765 4321',
        status: 'APPROVED',
        sentCount: 189,
        deliveredCount: 187,
        readCount: 182,
      },
      {
        id: 'template-3',
        name: 'Order Confirmation',
        category: 'ORDER',
        content: '🏭 *AMIT UNIFORM*\n\nDear {{customer_name}},\n\n✅ Your order has been confirmed!\n\n📋 Order: *{{order_number}}*\n📅 Delivery Date: {{delivery_date}}\n💰 Total: ₹{{total}}\n\nYour order is now in production. We\'ll keep you updated!\n\n📞 For queries: +91 79 2765 4321',
        status: 'APPROVED',
        sentCount: 167,
        deliveredCount: 165,
        readCount: 164,
      },
      {
        id: 'template-4',
        name: 'Payment Reminder',
        category: 'PAYMENT',
        content: '🏭 *AMIT UNIFORM* - Payment Reminder\n\nDear {{customer_name}},\n\n📋 Invoice: *{{invoice_number}}*\n📅 Due Date: {{due_date}}\n💰 Amount Due: *₹{{balance}}*\n\nKindly arrange payment by the due date.\n\n*Bank Details:*\nBank: HDFC Bank\nA/C: 50200012345678\nIFSC: HDFC0001234\nUPI: amituniform@hdfc',
        status: 'APPROVED',
        sentCount: 134,
        deliveredCount: 132,
        readCount: 128,
      },
      {
        id: 'template-5',
        name: 'Catalogue Request',
        category: 'MARKETING',
        content: '🏭 *AMIT UNIFORM*\n\nThank you for your interest! 📋\n\nHere is our latest catalogue featuring:\n✅ Hotel Uniforms\n✅ Hospital Scrubs\n✅ School Uniforms\n✅ Restaurant Chef Wear\n✅ Corporate Workwear\n✅ Security Uniforms\n\n📥 Download: {{catalogue_link}}\n\n📞 Contact: +91 79 2765 4321',
        status: 'APPROVED',
        sentCount: 312,
        deliveredCount: 310,
        readCount: 298,
      },
      {
        id: 'template-6',
        name: 'Production Started',
        category: 'ORDER',
        content: '🏭 *AMIT UNIFORM* - Production Update\n\nDear {{customer_name}},\n\n⚙️ Your order is now in production!\n\n📋 Order: *{{order_number}}*\n📅 Expected Completion: {{completion_date}}\n\nWe\'ll notify you once ready for dispatch.\n\n📞 Contact: +91 79 2765 4321',
        status: 'APPROVED',
        sentCount: 98,
        deliveredCount: 96,
        readCount: 94,
      },
      {
        id: 'template-7',
        name: 'Dispatch Notification',
        category: 'ORDER',
        content: '🏭 *AMIT UNIFORM* - Order Dispatched\n\nDear {{customer_name}},\n\n🚚 Your order has been dispatched!\n\n📋 Order: *{{order_number}}*\n📦 Courier: {{courier_name}}\n🔖 Tracking: {{tracking_number}}\n📅 Expected Delivery: {{delivery_date}}\n\nTrack: {{tracking_link}}\n\n📞 Contact: +91 79 2765 4321',
        status: 'APPROVED',
        sentCount: 156,
        deliveredCount: 154,
        readCount: 152,
      },
      {
        id: 'template-8',
        name: 'Payment Received',
        category: 'PAYMENT',
        content: '🏭 *AMIT UNIFORM* - Payment Confirmation\n\nDear {{customer_name}},\n\n✅ Payment received successfully!\n\n📋 Invoice: *{{invoice_number}}*\n💰 Amount: ₹{{amount}}\n📅 Payment Date: {{payment_date}}\n\nThank you for your payment!\n\n📞 Contact: +91 79 2765 4321',
        status: 'APPROVED',
        sentCount: 87,
        deliveredCount: 85,
        readCount: 83,
      },
      {
        id: 'template-9',
        name: 'Sample Request',
        category: 'MARKETING',
        content: '🏭 *AMIT UNIFORM*\n\nThank you for requesting samples!\n\nWe will courier samples to your address within 2-3 business days.\n\n📦 Items: {{sample_items}}\n📍 Address: {{delivery_address}}\n\nFor urgent requests, call us at +91 79 2765 4321',
        status: 'APPROVED',
        sentCount: 67,
        deliveredCount: 65,
        readCount: 62,
      },
      {
        id: 'template-10',
        name: 'Follow-up After Quotation',
        category: 'MARKETING',
        content: '🏭 *AMIT UNIFORM*\n\nDear {{customer_name}},\n\nWe shared a quotation with you on {{quotation_date}}.\n\nHave you had a chance to review it? We\'re happy to discuss any questions or customize the quote.\n\n📞 Call us: +91 79 2765 4321\n\nLooking forward to serving you!',
        status: 'APPROVED',
        sentCount: 123,
        deliveredCount: 121,
        readCount: 115,
      },
      {
        id: 'template-11',
        name: 'Bulk Order Discount',
        category: 'MARKETING',
        content: '🏭 *AMIT UNIFORM* - Special Offer!\n\n🎉 Bulk Order Discount:\n\n✅ 50-100 pcs: 10% OFF\n✅ 100-200 pcs: 15% OFF\n✅ 200+ pcs: 20% OFF\n\nValid till {{expiry_date}}\n\nReply now to get your custom quote!\n\n📞 +91 79 2765 4321',
        status: 'APPROVED',
        sentCount: 45,
        deliveredCount: 43,
        readCount: 40,
      },
      {
        id: 'template-12',
        name: 'Quality Check Completed',
        category: 'ORDER',
        content: '🏭 *AMIT UNIFORM* - Production Update\n\nDear {{customer_name}},\n\n🔍 Quality check completed for your order!\n\n📋 Order: *{{order_number}}*\n✅ Status: QC Passed\n📦 Next Step: Packing & Dispatch\n\nExpected dispatch: {{dispatch_date}}\n\n📞 Contact: +91 79 2765 4321',
        status: 'PENDING',
        sentCount: 0,
        deliveredCount: 0,
        readCount: 0,
      },
      {
        id: 'template-13',
        name: 'Order Delivered',
        category: 'ORDER',
        content: '🏭 *AMIT UNIFORM*\n\nDear {{customer_name}},\n\n✅ Your order has been delivered!\n\n📋 Order: *{{order_number}}*\n📅 Delivered on: {{delivery_date}}\n\nThank you for choosing Amit Uniform. We hope to serve you again!\n\n💬 Share your feedback: {{feedback_link}}\n\n📞 +91 79 2765 4321',
        status: 'PENDING',
        sentCount: 0,
        deliveredCount: 0,
        readCount: 0,
      },
      {
        id: 'template-14',
        name: 'Customization Available',
        category: 'MARKETING',
        content: '🏭 *AMIT UNIFORM*\n\nWe offer complete customization:\n\n✅ Logo Embroidery/Printing\n✅ Custom Colors\n✅ Size Modifications\n✅ Fabric Choices\n✅ Design Changes\n\nShare your requirements and we\'ll create a custom quote!\n\n📞 +91 79 2765 4321\n📧 custom@amituniform.com',
        status: 'REJECTED',
        sentCount: 0,
        deliveredCount: 0,
        readCount: 0,
      },
    ];

    res.json(messageTemplates);
  } catch (error) {
    next(error);
  }
};

// Get automations
exports.getAutomations = async (req, res, next) => {
  try {
    // Mock automations data
    const automations = [
      {
        id: 'auto-1',
        name: 'Welcome Message',
        description: 'Automatically send welcome message when a new customer sends their first message. Introduces company and offers help.',
        trigger: 'First message from new contact',
        enabled: true,
        executionCount: 245,
      },
      {
        id: 'auto-2',
        name: 'Quotation Follow-up (24 hours)',
        description: 'Send follow-up message 24 hours after quotation is sent if no response from customer',
        trigger: 'Quotation sent + 24 hours (no reply)',
        enabled: true,
        executionCount: 123,
      },
      {
        id: 'auto-3',
        name: 'Quotation Follow-up (3 days)',
        description: 'Send second follow-up 3 days after quotation if still no response. Offers to answer questions.',
        trigger: 'Quotation sent + 3 days (no reply)',
        enabled: true,
        executionCount: 67,
      },
      {
        id: 'auto-4',
        name: 'Payment Reminder (2 days before)',
        description: 'Send payment reminder 2 days before invoice due date to avoid delays',
        trigger: 'Invoice due date - 2 days',
        enabled: true,
        executionCount: 89,
      },
      {
        id: 'auto-5',
        name: 'Payment Reminder (Due date)',
        description: 'Send payment reminder on invoice due date with bank details and UPI',
        trigger: 'Invoice due date',
        enabled: true,
        executionCount: 134,
      },
      {
        id: 'auto-6',
        name: 'Payment Overdue Alert',
        description: 'Send urgent payment reminder for overdue invoices with escalation notice',
        trigger: 'Invoice overdue by 3 days',
        enabled: true,
        executionCount: 34,
      },
      {
        id: 'auto-7',
        name: 'Order Confirmation',
        description: 'Automatically send order confirmation when order is confirmed with delivery timeline',
        trigger: 'Order status = CONFIRMED',
        enabled: true,
        executionCount: 167,
      },
      {
        id: 'auto-8',
        name: 'Production Started',
        description: 'Notify customer when their order moves to production stage',
        trigger: 'Production stage = MATERIAL_ISSUED',
        enabled: true,
        executionCount: 98,
      },
      {
        id: 'auto-9',
        name: 'Quality Check Completed',
        description: 'Send update when quality check is completed and order is approved for packing',
        trigger: 'Production stage = QC_PASSED',
        enabled: false,
        executionCount: 12,
      },
      {
        id: 'auto-10',
        name: 'Dispatch Notification',
        description: 'Notify customer when order is dispatched with courier tracking number and expected delivery',
        trigger: 'Order dispatched',
        enabled: true,
        executionCount: 156,
      },
      {
        id: 'auto-11',
        name: 'Delivery Confirmation',
        description: 'Send delivery confirmation and request feedback when order is marked as delivered',
        trigger: 'Order status = DELIVERED',
        enabled: false,
        executionCount: 0,
      },
      {
        id: 'auto-12',
        name: 'Catalogue Auto-send',
        description: 'Automatically send catalogue when customer mentions keywords like "catalogue", "products", "price list"',
        trigger: 'Message contains catalogue keywords',
        enabled: true,
        executionCount: 312,
      },
      {
        id: 'auto-13',
        name: 'Sample Request Response',
        description: 'Auto-respond to sample requests with sample availability and process',
        trigger: 'Message contains "sample" keyword',
        enabled: true,
        executionCount: 67,
      },
      {
        id: 'auto-14',
        name: 'MOQ Information',
        description: 'Automatically provide minimum order quantity information when asked',
        trigger: 'Message contains "MOQ" or "minimum"',
        enabled: true,
        executionCount: 145,
      },
      {
        id: 'auto-15',
        name: 'Bulk Order Discount Offer',
        description: 'Send bulk discount information when customer mentions large quantities (50+)',
        trigger: 'Message contains quantity > 50',
        enabled: true,
        executionCount: 45,
      },
      {
        id: 'auto-16',
        name: 'Working Hours Auto-reply',
        description: 'Send auto-reply during non-working hours (after 7 PM or before 9 AM)',
        trigger: 'Message received outside working hours',
        enabled: false,
        executionCount: 0,
      },
      {
        id: 'auto-17',
        name: 'Weekend Auto-reply',
        description: 'Send auto-reply on weekends informing customer about Monday response',
        trigger: 'Message received on Saturday/Sunday',
        enabled: false,
        executionCount: 0,
      },
      {
        id: 'auto-18',
        name: 'Payment Received Thank You',
        description: 'Automatically send thank you message when payment is recorded in system',
        trigger: 'Payment status = PAID',
        enabled: true,
        executionCount: 87,
      },
    ];

    res.json(automations);
  } catch (error) {
    next(error);
  }
};

// Toggle automation
exports.toggleAutomation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    // In production, update database
    res.json({
      message: `Automation ${enabled ? 'enabled' : 'disabled'} successfully`,
      automation: { id, enabled },
    });
  } catch (error) {
    next(error);
  }
};

// Get WhatsApp analytics
exports.getAnalytics = async (req, res, next) => {
  try {
    // Mock analytics data with comprehensive metrics
    const analytics = {
      totalConversations: 327,
      messagesSent: 3245,
      messagesReceived: 2192,
      deliveryRate: 98.7,
      readRate: 89.3,
      leadsGenerated: 156,
      avgResponseTime: '2.3 min',
      automatedMessages: 1834,
      manualMessages: 1411,
      activeConversations: 23,
      newConversationsToday: 8,
      unreadMessages: 7,
      quotationsSent: 189,
      orderConfirmations: 167,
      paymentReminders: 223,
      conversionRate: 47.5,
      topKeywords: [
        { keyword: 'catalogue', count: 312 },
        { keyword: 'price', count: 289 },
        { keyword: 'sample', count: 156 },
        { keyword: 'delivery', count: 134 },
        { keyword: 'customization', count: 98 },
      ],
      messagesByHour: [
        { hour: 9, sent: 234, received: 156 },
        { hour: 10, sent: 312, received: 234 },
        { hour: 11, sent: 289, received: 198 },
        { hour: 12, sent: 267, received: 178 },
        { hour: 13, sent: 198, received: 134 },
        { hour: 14, sent: 234, received: 167 },
        { hour: 15, sent: 289, received: 198 },
        { hour: 16, sent: 312, received: 223 },
        { hour: 17, sent: 267, received: 189 },
        { hour: 18, sent: 198, received: 145 },
      ],
      messagesByDay: [
        { day: 'Mon', sent: 567, received: 389 },
        { day: 'Tue', sent: 612, received: 423 },
        { day: 'Wed', sent: 589, received: 398 },
        { day: 'Thu', sent: 634, received: 456 },
        { day: 'Fri', sent: 598, received: 412 },
        { day: 'Sat', sent: 123, received: 78 },
        { day: 'Sun', sent: 89, received: 36 },
      ],
      responseTimeDistribution: {
        under1min: 45,
        under5min: 78,
        under15min: 89,
        under1hour: 23,
        over1hour: 12,
      },
      automationPerformance: [
        { name: 'Welcome Message', executed: 245, successRate: 99.2 },
        { name: 'Quotation Follow-up', executed: 123, successRate: 97.6 },
        { name: 'Payment Reminder', executed: 223, successRate: 98.7 },
        { name: 'Order Confirmation', executed: 167, successRate: 100 },
        { name: 'Catalogue Auto-send', executed: 312, successRate: 99.4 },
      ],
    };

    res.json(analytics);
  } catch (error) {
    next(error);
  }
};
