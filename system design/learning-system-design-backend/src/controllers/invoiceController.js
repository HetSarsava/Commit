const { prisma } = require('../config/database');

// Helper: Generate invoice number
const generateInvoiceNumber = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `INV-${year}${month}-${random}`;
};

// Get all invoices
exports.getInvoices = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      customerId,
      orderId,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};

    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (orderId) where.orderId = orderId;

    let invoices = await prisma.invoice.findMany({
      where,
      include: {
        customer: true,
        order: {
          select: { id: true, orderNumber: true },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      invoices = invoices.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(searchLower) ||
          inv.customer?.companyName?.toLowerCase().includes(searchLower)
      );
    }

    // Check access
    if (req.user.role === 'SALES') {
      invoices = invoices.filter((inv) => inv.salesPersonId === req.user.id);
    }

    const total = invoices.length;
    const paginatedInvoices = invoices.slice(skip, skip + parseInt(limit));

    res.json({
      invoices: paginatedInvoices,
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

// Get single invoice
exports.getInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        order: {
          select: { id: true, orderNumber: true },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Check access
    if (req.user.role === 'SALES' && invoice.salesPersonId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ invoice });
  } catch (error) {
    next(error);
  }
};

// Create invoice from order
exports.createInvoiceFromOrder = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    if (typeof orderId !== 'string' || !orderId) return res.status(400).json({error:'Choose an existing order'});

    // Get order with items
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (req.user.role === 'SALES' && order.salesPersonId !== req.user.id) return res.status(403).json({error:'Access denied'});
    // Check if invoice already exists for this order
    const existingInvoice = await prisma.invoice.findFirst({
      where: { orderId },
    });

    if (existingInvoice) {
      return res.json({message:'Existing invoice returned', invoice: existingInvoice});
    }

    // Generate invoice number
    const invoiceNumber = generateInvoiceNumber();

    // Determine tax type based on state (for demo, assume intra-state)
    const isIntraState = true; // In real app, compare customer state with company state
    const cgst = isIntraState ? order.taxAmount / 2 : 0;
    const sgst = isIntraState ? order.taxAmount / 2 : 0;
    const igst = isIntraState ? 0 : order.taxAmount;

    // Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        orderId,
        customerId: order.customerId,
        salesPersonId: order.salesPersonId,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: 'UNPAID',
        subtotal: order.subtotal,
        discountPercent: order.discountPercent || 0,
        discountAmount: order.discountAmount || 0,
        cgst,
        sgst,
        igst,
        taxAmount: order.taxAmount,
        total: order.total,
        amountPaid: order.advanceAmount || 0,
        balanceDue: order.balanceAmount || order.total - (order.advanceAmount || 0),
        notes: order.notes,
        termsConditions: order.termsConditions || 'Payment terms: Net 30 days\nBank details: [Bank Name], A/C: XXXXXXXXXX',
        items: {
          create: order.items.map((item) => ({
            productId: item.productId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount || 0,
            total: item.total,
            customization: item.customization,
          })),
        },
      },
      include: {
        customer: true,
        order: {
          select: { id: true, orderNumber: true },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    res.status(201).json({
      message: 'Invoice created successfully',
      invoice,
    });
  } catch (error) {
    if (error.code === 'P2002') { const existing = await prisma.invoice.findFirst({where:{orderId:req.body.orderId}}); if (existing) return res.json({message:'Existing invoice returned',invoice:existing}); }
    next(error);
  }
};

// Update invoice
exports.updateInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, amountPaid, paymentDate, paymentMethod, notes } = req.body;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Check access
    if (req.user.role === 'SALES' && invoice.salesPersonId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updateData = {};

    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    // Handle payment recording
    if (amountPaid !== undefined) {
      const newAmountPaid = invoice.amountPaid + parseFloat(amountPaid);
      const newBalanceDue = invoice.total - newAmountPaid;

      updateData.amountPaid = newAmountPaid;
      updateData.balanceDue = newBalanceDue;

      if (newBalanceDue <= 0) {
        updateData.status = 'PAID';
      } else if (newAmountPaid > 0) {
        updateData.status = 'PARTIALLY_PAID';
      }
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        order: {
          select: { id: true, orderNumber: true },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    res.json({
      message: 'Invoice updated successfully',
      invoice: updatedInvoice,
    });
  } catch (error) {
    next(error);
  }
};

// Delete invoice
exports.deleteInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Check access
    if (req.user.role === 'SALES') {
      return res.status(403).json({ error: 'Only admins can delete invoices' });
    }

    await prisma.invoice.delete({
      where: { id },
    });

    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.syncFromOrder = async (req,res,next) => {
  try {
    const invoice = await prisma.invoice.findUnique({where:{id:req.params.id},include:{items:true}});
    if (!invoice) return res.status(404).json({error:'Invoice not found'});
    if (req.user.role === 'SALES' && invoice.salesPersonId !== req.user.id) return res.status(403).json({error:'Access denied'});
    if (Number(invoice.amountPaid || 0) > 0 || invoice.status === 'PAID') return res.status(409).json({error:'This invoice has payments. Review a correction with your accountant instead of replacing it.'});
    const order = await prisma.order.findUnique({where:{id:invoice.orderId},include:{items:true}});
    if (!order) return res.status(404).json({error:'Order not found'});
    const updated = await prisma.invoice.update({where:{id:invoice.id},data:require('../services/invoiceSnapshot').invoiceData(order,invoice),include:{items:{include:{product:true}}}});
    res.json({invoice:updated,message:'Invoice updated from order'});
  } catch(e) { next(e); }
};
