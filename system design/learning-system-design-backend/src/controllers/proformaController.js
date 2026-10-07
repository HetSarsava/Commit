const { prisma } = require('../config/database');

// Get all proforma invoices
exports.getAllProformas = async (req, res, next) => {
  try {
    const { customerId, status } = req.query;

    const where = {};
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;

    const proformas = await prisma.proformaInvoice.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true,
            mobile: true,
            email: true,
            city: true,
            state: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                category: true,
                basePrice: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(proformas);
  } catch (error) {
    next(error);
  }
};

// Get single proforma invoice
exports.getProformaById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const proforma = await prisma.proformaInvoice.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!proforma) {
      return res.status(404).json({ error: 'Proforma invoice not found' });
    }

    res.json(proforma);
  } catch (error) {
    next(error);
  }
};

// Create proforma invoice from quotation
exports.createFromQuotation = async (req, res, next) => {
  try {
    const { quotationId } = req.body;

    if (!quotationId) {
      return res.status(400).json({ error: 'Quotation ID is required' });
    }

    // Get quotation
    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    const existing = (await prisma.proformaInvoice.findMany({})).find(p=>p.quotationId === quotationId);
    if (existing) return res.json({message:'Existing proforma returned',proforma:existing});
    // Generate proforma number
    const count = await prisma.proformaInvoice.count({});
    const proformaNumber = `PI-${new Date().getFullYear()}${(new Date().getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${(count + 1).toString().padStart(4, '0')}`;

    // Create proforma invoice
    const proforma = await prisma.proformaInvoice.create({
      data: {
        proformaNumber,
        customerId: quotation.customerId,
        quotationId,
        issueDate: new Date(),
        validUntil: quotation.validUntil,
        subtotal: quotation.subtotal,
        discount: quotation.discountPercent ?? quotation.discount,
        discountAmount: quotation.discountAmount,
        taxableAmount: quotation.taxableAmount ?? Number(quotation.subtotal) - Number(quotation.discountAmount || 0),
        cgst: quotation.cgst ?? Number(quotation.taxAmount || 0) / 2,
        sgst: quotation.sgst ?? Number(quotation.taxAmount || 0) / 2,
        igst: quotation.igst || 0,
        total: quotation.total,
        terms: quotation.termsConditions || quotation.terms || 'Payment terms as agreed',
        notes: quotation.notes,
        status: 'PENDING',
        createdBy: req.user.id,
      },
    });

    // Create proforma items
    for (const item of quotation.items) {
      await prisma.proformaItem.create({
        data: {
          proformaInvoiceId: proforma.id,
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          rate: item.unitPrice ?? item.rate,
          amount: item.total ?? item.amount,
          customization: item.customization || null,
        },
      });
    }

    // Fetch complete proforma with relations
    const completeProforma = await prisma.proformaInvoice.findUnique({
      where: { id: proforma.id },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    res.status(201).json({
      message: 'Proforma invoice created successfully',
      proforma: completeProforma,
    });
  } catch (error) {
    next(error);
  }
};

// Create proforma invoice manually
exports.createProforma = async (req, res, next) => {
  try {
    const {
      customerId,
      items,
      discount,
      validUntil,
      terms,
      notes,
    } = req.body;

    // Validation
    if (!customerId || !items || items.length === 0) {
      return res.status(400).json({
        error: 'Customer and at least one item are required',
      });
    }

    // Calculate totals
    let subtotal = 0;
    for (const item of items) {
      subtotal += item.quantity * item.rate;
    }

    const discountPercent = parseFloat(discount) || 0;
    const discountAmount = (subtotal * discountPercent) / 100;
    const taxableAmount = subtotal - discountAmount;
    const cgst = taxableAmount * 0.09; // 9% CGST
    const sgst = taxableAmount * 0.09; // 9% SGST
    const igst = 0;
    const total = taxableAmount + cgst + sgst;

    // Generate proforma number
    const count = await prisma.proformaInvoice.count({});
    const proformaNumber = `PI-${new Date().getFullYear()}${(new Date().getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${(count + 1).toString().padStart(4, '0')}`;

    // Create proforma
    const proforma = await prisma.proformaInvoice.create({
      data: {
        proformaNumber,
        customerId,
        quotationId: null,
        issueDate: new Date(),
        validUntil: validUntil ? new Date(validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subtotal,
        discount: discountPercent,
        discountAmount,
        taxableAmount,
        cgst,
        sgst,
        igst,
        total,
        terms: terms || 'Payment terms as agreed',
        notes: notes || null,
        status: 'PENDING',
        createdBy: req.user.id,
      },
    });

    // Create items
    for (const item of items) {
      await prisma.proformaItem.create({
        data: {
          proformaInvoiceId: proforma.id,
          productId: item.productId,
          description: item.description || null,
          quantity: parseFloat(item.quantity),
          rate: parseFloat(item.rate),
          amount: parseFloat(item.quantity) * parseFloat(item.rate),
        },
      });
    }

    // Fetch complete proforma
    const completeProforma = await prisma.proformaInvoice.findUnique({
      where: { id: proforma.id },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    res.status(201).json({
      message: 'Proforma invoice created successfully',
      proforma: completeProforma,
    });
  } catch (error) {
    next(error);
  }
};

// Update proforma status
exports.updateProformaStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'ACCEPTED', 'REJECTED', 'CONVERTED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const proforma = await prisma.proformaInvoice.findUnique({ where: { id } });
    if (!proforma) {
      return res.status(404).json({ error: 'Proforma invoice not found' });
    }

    const updated = await prisma.proformaInvoice.update({
      where: { id },
      data: {
        status,
        ...(status === 'ACCEPTED' && { acceptedAt: new Date() }),
        ...(status === 'REJECTED' && { rejectedAt: new Date() }),
        ...(status === 'CONVERTED' && { convertedAt: new Date() }),
        updatedAt: new Date(),
      },
    });

    res.json({
      message: 'Proforma invoice status updated',
      proforma: updated,
    });
  } catch (error) {
    next(error);
  }
};

// Convert proforma to sales order
exports.convertToOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const proforma = await prisma.proformaInvoice.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!proforma) {
      return res.status(404).json({ error: 'Proforma invoice not found' });
    }

    if (proforma.status === 'CONVERTED') {
      return res.status(400).json({ error: 'Proforma already converted to order' });
    }

    if (proforma.quotationId) { const existingOrder = await prisma.order.findFirst({where:{quotationId:proforma.quotationId}}); if (existingOrder) return res.json({order:existingOrder,message:'Existing order returned'}); }
    // Generate order number
    const orderCount = await prisma.order.count({});
    const orderNumber = `ORD-${new Date().getFullYear()}${(new Date().getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${(orderCount + 1).toString().padStart(4, '0')}`;

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: proforma.customerId,
        quotationId: proforma.quotationId,
        orderDate: new Date(),
        expectedDeliveryDate: proforma.validUntil,
        deliveryDate: proforma.validUntil,
        salesPersonId: req.user.id,
        taxAmount: Number(proforma.cgst || 0) + Number(proforma.sgst || 0) + Number(proforma.igst || 0),
        discountPercent: proforma.discount || 0,
        subtotal: proforma.subtotal,
        discount: proforma.discount,
        discountAmount: proforma.discountAmount,
        taxableAmount: proforma.taxableAmount,
        cgst: proforma.cgst,
        sgst: proforma.sgst,
        igst: proforma.igst,
        total: proforma.total,
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        createdBy: req.user.id,
        items: { create: proforma.items.map(item => ({ productId:item.productId, description:item.description, quantity:item.quantity, unitPrice:item.rate, total:item.amount, discount:Math.max(0, Number(item.quantity)*Number(item.rate)-Number(item.amount)), customization:item.customization || null })) },
      },
    });

    // Update proforma status
    await prisma.proformaInvoice.update({
      where: { id },
      data: {
        status: 'CONVERTED',
        convertedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Fetch complete order
    const completeOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    res.status(201).json({
      message: 'Proforma invoice converted to order successfully',
      order: completeOrder,
    });
  } catch (error) {
    next(error);
  }
};

// Delete proforma invoice
exports.deleteProforma = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.proformaInvoice.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Proforma invoice not found' });
    }

    if (existing.status === 'CONVERTED') {
      return res.status(400).json({ error: 'Cannot delete converted proforma invoice' });
    }

    await prisma.proformaInvoice.delete({ where: { id } });

    res.json({ message: 'Proforma invoice deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Get proforma summary
exports.getProformaSummary = async (req, res, next) => {
  try {
    const proformas = await prisma.proformaInvoice.findMany({});

    const summary = {
      totalProformas: proformas.length,
      totalValue: proformas.reduce((sum, p) => sum + p.total, 0),
      byStatus: {},
    };

    // Count by status
    proformas.forEach(p => {
      if (!summary.byStatus[p.status]) {
        summary.byStatus[p.status] = {
          count: 0,
          value: 0,
        };
      }
      summary.byStatus[p.status].count += 1;
      summary.byStatus[p.status].value += p.total;
    });

    res.json(summary);
  } catch (error) {
    next(error);
  }
};
