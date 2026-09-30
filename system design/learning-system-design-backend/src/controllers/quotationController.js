const { prisma } = require('../config/database');

// Generate quotation number
const generateQuotationNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `QT-${year}${month}-${random}`;
};

// Get all quotations
exports.getQuotations = async (req, res, next) => {
  try {
    const {
      status,
      customerId,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const where = {};

    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    if (search) {
      where.OR = [
        { quotationNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Role-based filtering
    if (req.user.role === 'SALES') {
      where.salesPersonId = req.user.id;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [quotations, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        include: {
          customer: true,
          salesPerson: {
            select: { id: true, name: true, email: true },
          },
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.quotation.count({ where }),
    ]);

    res.json({
      quotations,
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

// Get single quotation
exports.getQuotation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        salesPerson: {
          select: { id: true, name: true, email: true },
        },
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

    // Check access
    if (req.user.role === 'SALES' && quotation.salesPersonId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ quotation });
  } catch (error) {
    next(error);
  }
};

// Create quotation
exports.createQuotation = async (req, res, next) => {
  try {
    const {
      customerId,
      items, // Array of { productId, quantity, unitPrice, discount, customization }
      discountPercent,
      discountAmount,
      taxAmount,
      subtotal,
      total,
      termsConditions,
      validUntil,
      notes,
    } = req.body;

    // Validate
    if (!customerId) {
      return res.status(400).json({ error: 'Customer is required' });
    }
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }

    // Generate quotation number
    const quotationNumber = generateQuotationNumber();

    // Create quotation with items
    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        customerId,
        salesPersonId: req.user.id,
        status: 'DRAFT',
        subtotal: parseFloat(subtotal),
        discountPercent: discountPercent ? parseFloat(discountPercent) : null,
        discountAmount: discountAmount ? parseFloat(discountAmount) : null,
        taxAmount: parseFloat(taxAmount),
        total: parseFloat(total),
        termsConditions,
        validUntil: validUntil ? new Date(validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
        notes,
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantity: parseInt(item.quantity),
            unitPrice: parseFloat(item.unitPrice),
            discount: item.discount ? parseFloat(item.discount) : null,
            total: parseFloat(item.total),
            customization: item.customization,
          })),
        },
      },
      include: {
        customer: true,
        salesPerson: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    res.status(201).json({
      message: 'Quotation created successfully',
      quotation,
    });
  } catch (error) {
    console.error('Create quotation error:', error);
    next(error);
  }
};

// Update quotation
exports.updateQuotation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { items, ...updateData } = req.body;

    const existing = await prisma.quotation.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    // Check access
    if (req.user.role === 'SALES' && existing.salesPersonId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Convert numeric fields
    if (updateData.subtotal) updateData.subtotal = parseFloat(updateData.subtotal);
    if (updateData.discountPercent) updateData.discountPercent = parseFloat(updateData.discountPercent);
    if (updateData.discountAmount) updateData.discountAmount = parseFloat(updateData.discountAmount);
    if (updateData.taxAmount) updateData.taxAmount = parseFloat(updateData.taxAmount);
    if (updateData.total) updateData.total = parseFloat(updateData.total);
    if (updateData.validUntil) updateData.validUntil = new Date(updateData.validUntil);

    // If items are provided, update them
    if (items && Array.isArray(items)) {
      // Delete existing items
      await prisma.quotationItem.deleteMany({
        where: { quotationId: id },
      });

      // Create new items
      updateData.items = {
        create: items.map(item => ({
          productId: item.productId,
          quantity: parseInt(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          discount: item.discount ? parseFloat(item.discount) : null,
          total: parseFloat(item.total),
          customization: item.customization,
        })),
      };
    }

    const quotation = await prisma.quotation.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        salesPerson: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    res.json({
      message: 'Quotation updated successfully',
      quotation,
    });
  } catch (error) {
    console.error('Update quotation error:', error);
    next(error);
  }
};

// Delete quotation
exports.deleteQuotation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const quotation = await prisma.quotation.findUnique({
      where: { id },
    });

    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    // Only admin can delete
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can delete quotations' });
    }

    await prisma.quotation.delete({
      where: { id },
    });

    res.json({ message: 'Quotation deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Get quotation statistics
exports.getQuotationStats = async (req, res, next) => {
  try {
    const where = {};

    if (req.user.role === 'SALES') {
      where.salesPersonId = req.user.id;
    }

    const [
      totalQuotations,
      draftQuotations,
      sentQuotations,
      acceptedQuotations,
      byStatus,
    ] = await Promise.all([
      prisma.quotation.count({ where }),
      prisma.quotation.count({ where: { ...where, status: 'DRAFT' } }),
      prisma.quotation.count({ where: { ...where, status: 'SENT' } }),
      prisma.quotation.count({ where: { ...where, status: 'ACCEPTED' } }),
      prisma.quotation.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
    ]);

    res.json({
      totalQuotations,
      draftQuotations,
      sentQuotations,
      acceptedQuotations,
      byStatus,
    });
  } catch (error) {
    next(error);
  }
};
