const { prisma } = require('../config/database');

// Generate order number (ORD-YYYYMM-XXXX)
const generateOrderNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${year}${month}-${random}`;
};

// Get all orders
exports.getOrders = async (req, res, next) => {
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
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { poNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Role-based filtering
    if (req.user.role === 'SALES') {
      where.salesPersonId = req.user.id;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
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
          quotation: {
            select: { id: true, quotationNumber: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      orders,
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

// Get single order
exports.getOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
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
        quotation: {
          select: { id: true, quotationNumber: true },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check access
    if (req.user.role === 'SALES' && order.salesPersonId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const invoice = await prisma.invoice.findFirst({where:{orderId:id}, include:{items:true}});
    res.json({ order: {...order, invoice: invoice ? {id:invoice.id, invoiceNumber:invoice.invoiceNumber, status:invoice.status, hasPayments:Number(invoice.amountPaid || 0)>0, needsUpdate:require('../services/invoiceSnapshot').snapshot(order) !== require('../services/invoiceSnapshot').snapshot(invoice)} : null} });
  } catch (error) {
    next(error);
  }
};

// Create order from quotation
exports.createOrderFromQuotation = async (req, res, next) => {
  try {
    const { quotationId } = req.body;

    // Get quotation with items
    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
      },
    });

    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    // Check if order already exists for this quotation
    const existingOrder = await prisma.order.findFirst({
      where: { quotationId },
    });

    if (existingOrder) {
      return res.status(400).json({ error: 'Order already exists for this quotation' });
    }

    // Generate order number
    const orderNumber = generateOrderNumber();

    // Create order with items
    const order = await prisma.order.create({
      data: {
        orderNumber,
        quotationId,
        customerId: quotation.customerId,
        salesPersonId: quotation.salesPersonId,
        status: 'PENDING',
        subtotal: quotation.subtotal,
        discountPercent: quotation.discountPercent,
        discountAmount: quotation.discountAmount,
        taxAmount: quotation.taxAmount,
        total: quotation.total,
        termsConditions: quotation.termsConditions,
        notes: quotation.notes,
        items: {
          create: quotation.items.map(item => ({
            productId: item.productId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            total: item.total,
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
        quotation: {
          select: { id: true, quotationNumber: true },
        },
      },
    });

    // Update quotation status
    await prisma.quotation.update({
      where: { id: quotationId },
      data: { status: 'ACCEPTED' },
    });

    res.status(201).json({
      message: 'Order created successfully',
      order,
    });
  } catch (error) {
    console.error('Create order error:', error);
    next(error);
  }
};

// Create manual order
exports.createOrder = async (req, res, next) => {
  try {
    const {
      customerId,
      items,
      poNumber,
      advanceAmount,
      deliveryDate,
      discountPercent,
      discountAmount,
      taxAmount,
      subtotal,
      total,
      termsConditions,
      notes,
    } = req.body;

    // Validate
    if (!customerId) {
      return res.status(400).json({ error: 'Customer is required' });
    }
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }

    // Generate order number
    const orderNumber = generateOrderNumber();

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId,
        salesPersonId: req.user.id,
        status: 'PENDING',
        poNumber,
        advanceAmount: advanceAmount ? parseFloat(advanceAmount) : null,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        subtotal: parseFloat(subtotal),
        discountPercent: discountPercent ? parseFloat(discountPercent) : null,
        discountAmount: discountAmount ? parseFloat(discountAmount) : null,
        taxAmount: parseFloat(taxAmount),
        total: parseFloat(total),
        termsConditions,
        notes,
        items: {
          create: items.map(item => ({
            productId: item.productId,
            description: item.description,
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
      message: 'Order created successfully',
      order,
    });
  } catch (error) {
    console.error('Create order error:', error);
    next(error);
  }
};

// Update order
exports.updateOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const existing = await prisma.order.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check access
    if (req.user.role === 'SALES' && existing.salesPersonId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Convert numeric fields
    if (updateData.advanceAmount) updateData.advanceAmount = parseFloat(updateData.advanceAmount);
    if (updateData.balanceAmount) updateData.balanceAmount = parseFloat(updateData.balanceAmount);
    if (updateData.deliveryDate) updateData.deliveryDate = new Date(updateData.deliveryDate);
    if (updateData.confirmedAt && !existing.confirmedAt) {
      updateData.confirmedAt = new Date();
    }

    const order = await prisma.order.update({
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
        quotation: {
          select: { id: true, quotationNumber: true },
        },
      },
    });

    res.json({
      message: 'Order updated successfully',
      order,
    });
  } catch (error) {
    console.error('Update order error:', error);
    next(error);
  }
};

// Delete order
exports.deleteOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check access
    if (req.user.role === 'SALES' && order.salesPersonId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only allow deletion of PENDING or CANCELLED orders
    if (!['PENDING', 'CANCELLED'].includes(order.status)) {
      return res.status(400).json({ error: 'Cannot delete confirmed or in-progress orders' });
    }

    await prisma.order.delete({
      where: { id },
    });

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Get order statistics
exports.getOrderStats = async (req, res, next) => {
  try {
    const where = {};

    // Role-based filtering
    if (req.user.role === 'SALES') {
      where.salesPersonId = req.user.id;
    }

    const [
      totalOrders,
      pendingOrders,
      confirmedOrders,
      inProductionOrders,
      completedOrders,
      byStatus,
    ] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.count({ where: { ...where, status: 'PENDING' } }),
      prisma.order.count({ where: { ...where, status: 'CONFIRMED' } }),
      prisma.order.count({ where: { ...where, status: 'IN_PRODUCTION' } }),
      prisma.order.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.order.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
    ]);

    const statusCounts = {};
    byStatus.forEach(item => {
      statusCounts[item.status] = item._count;
    });

    res.json({
      totalOrders,
      pendingOrders,
      confirmedOrders,
      inProductionOrders,
      completedOrders,
      byStatus: statusCounts,
    });
  } catch (error) {
    next(error);
  }
};
