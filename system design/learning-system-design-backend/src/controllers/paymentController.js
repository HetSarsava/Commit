const { prisma } = require('../config/database');

// Generate payment reference number
const generatePaymentReference = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `PAY-${year}${month}-${random}`;
};

// Get all payments
exports.getPayments = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      invoiceId,
      customerId,
      method,
      search,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};

    if (invoiceId) where.invoiceId = invoiceId;
    if (customerId) where.customerId = customerId;
    if (method) where.method = method;

    let payments = await prisma.payment.findMany({
      where,
      include: {
        invoice: {
          select: { id: true, invoiceNumber: true },
        },
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      payments = payments.filter(
        (p) =>
          p.referenceNumber.toLowerCase().includes(searchLower) ||
          p.customer?.companyName?.toLowerCase().includes(searchLower)
      );
    }

    // Check access
    if (req.user.role === 'SALES') {
      payments = payments.filter((p) => p.receivedBy === req.user.id);
    }

    const total = payments.length;
    const paginatedPayments = payments.slice(skip, skip + parseInt(limit));

    res.json({
      payments: paginatedPayments,
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

// Get single payment
exports.getPayment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        invoice: {
          select: { id: true, invoiceNumber: true, total: true },
        },
        customer: true,
        receivedByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Check access
    if (req.user.role === 'SALES' && payment.receivedBy !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ payment });
  } catch (error) {
    next(error);
  }
};

// Record new payment
exports.recordPayment = async (req, res, next) => {
  try {
    const {
      invoiceId,
      amount,
      method,
      referenceNumber: providedReference,
      transactionId,
      notes,
      paymentDate,
    } = req.body;

    if (!invoiceId || !amount || !method) {
      return res.status(400).json({ error: 'Invoice ID, amount, and payment method are required' });
    }

    // Get invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Validate payment amount
    if (parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Payment amount must be greater than zero' });
    }

    if (parseFloat(amount) > invoice.balanceDue) {
      return res.status(400).json({ error: 'Payment amount cannot exceed balance due' });
    }

    // Generate or use provided reference number
    const referenceNumber = providedReference || generatePaymentReference();

    // Create payment
    const payment = await prisma.payment.create({
      data: {
        referenceNumber,
        invoiceId,
        customerId: invoice.customerId,
        amount: parseFloat(amount),
        method,
        transactionId,
        notes,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        receivedBy: req.user.id,
      },
      include: {
        invoice: {
          select: { id: true, invoiceNumber: true },
        },
        customer: true,
      },
    });

    // Update invoice
    const newAmountPaid = invoice.amountPaid + parseFloat(amount);
    const newBalanceDue = invoice.total - newAmountPaid;
    let newStatus = invoice.status;

    if (newBalanceDue <= 0) {
      newStatus = 'PAID';
    } else if (newAmountPaid > 0) {
      newStatus = 'PARTIALLY_PAID';
    }

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        amountPaid: newAmountPaid,
        balanceDue: newBalanceDue,
        status: newStatus,
      },
    });

    res.status(201).json({
      message: 'Payment recorded successfully',
      payment,
    });
  } catch (error) {
    next(error);
  }
};

// Update payment
exports.updatePayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { method, transactionId, notes, paymentDate } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Check access
    if (req.user.role !== 'ADMIN' && payment.receivedBy !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updateData = {};

    if (method) updateData.method = method;
    if (transactionId !== undefined) updateData.transactionId = transactionId;
    if (notes !== undefined) updateData.notes = notes;
    if (paymentDate) updateData.paymentDate = new Date(paymentDate);

    const updatedPayment = await prisma.payment.update({
      where: { id },
      data: updateData,
      include: {
        invoice: {
          select: { id: true, invoiceNumber: true },
        },
        customer: true,
      },
    });

    res.json({
      message: 'Payment updated successfully',
      payment: updatedPayment,
    });
  } catch (error) {
    next(error);
  }
};

// Delete payment
exports.deletePayment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { invoice: true },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Check access - only admin can delete payments
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can delete payments' });
    }

    // Reverse the invoice amount
    const invoice = payment.invoice;
    const newAmountPaid = invoice.amountPaid - payment.amount;
    const newBalanceDue = invoice.total - newAmountPaid;
    let newStatus = invoice.status;

    if (newBalanceDue >= invoice.total) {
      newStatus = 'UNPAID';
    } else if (newBalanceDue > 0) {
      newStatus = 'PARTIALLY_PAID';
    } else {
      newStatus = 'PAID';
    }

    await prisma.invoice.update({
      where: { id: payment.invoiceId },
      data: {
        amountPaid: newAmountPaid,
        balanceDue: newBalanceDue,
        status: newStatus,
      },
    });

    await prisma.payment.delete({
      where: { id },
    });

    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Get payments for specific invoice
exports.getInvoicePayments = async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    const invoice = await prisma.invoice.findUnique({where: {id: invoiceId}});
    if (!invoice) return res.status(404).json({error: 'Invoice not found'});
    if (!['ADMIN', 'SALES', 'ACCOUNTANT'].includes(req.user.role) || (req.user.role === 'SALES' && invoice.salesPersonId !== req.user.id)) return res.status(403).json({error: 'Access denied'});

    const payments = await prisma.payment.findMany({
      where: { invoiceId },
      include: {
        receivedByUser: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ payments });
  } catch (error) {
    next(error);
  }
};
