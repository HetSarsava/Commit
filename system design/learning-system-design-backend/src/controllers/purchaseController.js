const { prisma } = require('../config/database');

// Get all suppliers
exports.getAllSuppliers = async (req, res, next) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' },
    });

    res.json(suppliers);
  } catch (error) {
    next(error);
  }
};

// Create supplier
exports.createSupplier = async (req, res, next) => {
  try {
    const {
      name,
      contactPerson,
      phone,
      email,
      address,
      city,
      state,
      gstin,
      paymentTerms,
      notes,
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        error: 'Supplier name and phone are required',
      });
    }

    const supplier = await prisma.supplier.create({
      data: {
        name,
        contactPerson: contactPerson || null,
        phone,
        email: email || null,
        address: address || null,
        city: city || null,
        state: state || null,
        gstin: gstin || null,
        paymentTerms: paymentTerms || 'Net 30',
        notes: notes || null,
      },
    });

    res.status(201).json({
      message: 'Supplier created successfully',
      supplier,
    });
  } catch (error) {
    next(error);
  }
};

// Update supplier
exports.updateSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...req.body,
        updatedAt: new Date(),
      },
    });

    res.json({
      message: 'Supplier updated successfully',
      supplier,
    });
  } catch (error) {
    next(error);
  }
};

// Get all purchase orders
exports.getAllPurchaseOrders = async (req, res, next) => {
  try {
    const { status, supplierId } = req.query;

    const where = {};
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            contactPerson: true,
            phone: true,
          },
        },
        items: {
          include: {
            material: {
              select: {
                id: true,
                sku: true,
                name: true,
                unit: true,
              },
            },
          },
        },
      },
      orderBy: { poDate: 'desc' },
    });

    res.json(purchaseOrders);
  } catch (error) {
    next(error);
  }
};

// Get single purchase order
exports.getPurchaseOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: {
            material: true,
          },
        },
      },
    });

    if (!po) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    res.json(po);
  } catch (error) {
    next(error);
  }
};

// Create purchase order
exports.createPurchaseOrder = async (req, res, next) => {
  try {
    const {
      supplierId,
      poDate,
      expectedDeliveryDate,
      items,
      notes,
    } = req.body;

    // Validation
    if (!supplierId || !items || items.length === 0) {
      return res.status(400).json({
        error: 'Supplier and at least one item are required',
      });
    }

    // Verify supplier exists
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    // Generate PO number
    const count = await prisma.purchaseOrder.count({});
    const poNumber = `PO-${new Date().getFullYear()}${(new Date().getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${(count + 1).toString().padStart(4, '0')}`;

    // Calculate total
    let subtotal = 0;
    for (const item of items) {
      subtotal += item.quantity * item.rate;
    }

    const gstAmount = subtotal * 0.18; // 18% GST
    const total = subtotal + gstAmount;

    // Create PO
    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId,
        poDate: poDate ? new Date(poDate) : new Date(),
        expectedDeliveryDate: expectedDeliveryDate
          ? new Date(expectedDeliveryDate)
          : null,
        status: 'DRAFT',
        subtotal,
        gstAmount,
        total,
        notes: notes || null,
        createdBy: req.user.id,
      },
    });

    // Create PO items
    for (const item of items) {
      await prisma.purchaseOrderItem.create({
        data: {
          purchaseOrderId: po.id,
          materialId: item.materialId,
          quantity: parseFloat(item.quantity),
          rate: parseFloat(item.rate),
          amount: parseFloat(item.quantity) * parseFloat(item.rate),
          receivedQuantity: 0,
        },
      });
    }

    // Fetch complete PO with relations
    const completePO = await prisma.purchaseOrder.findUnique({
      where: { id: po.id },
      include: {
        supplier: true,
        items: {
          include: {
            material: true,
          },
        },
      },
    });

    res.status(201).json({
      message: 'Purchase order created successfully',
      purchaseOrder: completePO,
    });
  } catch (error) {
    next(error);
  }
};

// Update PO status
exports.updatePurchaseOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['DRAFT', 'SENT', 'CONFIRMED', 'PARTIAL_RECEIVED', 'RECEIVED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const po = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    res.json({
      message: 'Purchase order status updated',
      purchaseOrder: updated,
    });
  } catch (error) {
    next(error);
  }
};

// Record material received
exports.recordMaterialReceived = async (req, res, next) => {
  try {
    const { id } = req.params; // PO ID
    const { itemId, receivedQuantity, receivedDate } = req.body;

    if (!itemId || !receivedQuantity) {
      return res.status(400).json({
        error: 'Item ID and received quantity are required',
      });
    }

    // Get PO item
    const item = await prisma.purchaseOrderItem.findUnique({
      where: { id: itemId },
      include: {
        material: true,
      },
    });

    if (!item) {
      return res.status(404).json({ error: 'PO item not found' });
    }

    const qty = parseFloat(receivedQuantity);

    // Check if receiving more than ordered
    if (item.receivedQuantity + qty > item.quantity) {
      return res.status(400).json({
        error: 'Cannot receive more than ordered quantity',
      });
    }

    // Update PO item
    await prisma.purchaseOrderItem.update({
      where: { id: itemId },
      data: {
        receivedQuantity: item.receivedQuantity + qty,
      },
    });

    // Add stock to inventory (Stock IN)
    await prisma.stockMovement.create({
      data: {
        materialId: item.materialId,
        type: 'IN',
        quantity: qty,
        balanceAfter: item.material.currentStock + qty,
        reference: 'PO',
        referenceId: id,
        notes: `Received from PO ${id}`,
        date: receivedDate ? new Date(receivedDate) : new Date(),
        createdBy: req.user.id,
      },
    });

    // Update material stock
    await prisma.material.update({
      where: { id: item.materialId },
      data: {
        currentStock: item.material.currentStock + qty,
        updatedAt: new Date(),
      },
    });

    // Check if all items received - update PO status
    const allItems = await prisma.purchaseOrderItem.findMany({
      where: { purchaseOrderId: id },
    });

    const allReceived = allItems.every(i => i.receivedQuantity >= i.quantity);
    const someReceived = allItems.some(i => i.receivedQuantity > 0);

    let newStatus = 'SENT';
    if (allReceived) {
      newStatus = 'RECEIVED';
    } else if (someReceived) {
      newStatus = 'PARTIAL_RECEIVED';
    }

    await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
    });

    res.json({
      message: 'Material received successfully',
      receivedQuantity: qty,
      poStatus: newStatus,
    });
  } catch (error) {
    next(error);
  }
};

// Get purchase summary
exports.getPurchaseSummary = async (req, res, next) => {
  try {
    const purchaseOrders = await prisma.purchaseOrder.findMany({});

    const summary = {
      totalPOs: purchaseOrders.length,
      totalPurchaseValue: purchaseOrders.reduce((sum, po) => sum + po.total, 0),
      byStatus: {},
    };

    // Count by status
    purchaseOrders.forEach(po => {
      if (!summary.byStatus[po.status]) {
        summary.byStatus[po.status] = {
          count: 0,
          value: 0,
        };
      }
      summary.byStatus[po.status].count += 1;
      summary.byStatus[po.status].value += po.total;
    });

    res.json(summary);
  } catch (error) {
    next(error);
  }
};
