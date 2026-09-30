const { prisma } = require('../config/database');

// Get all materials
exports.getAllMaterials = async (req, res, next) => {
  try {
    const { category, lowStock } = req.query;

    const where = {};
    if (category) where.category = category;

    const materials = await prisma.material.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    // Filter low stock if requested
    let filteredMaterials = materials;
    if (lowStock === 'true') {
      filteredMaterials = materials.filter(m => m.currentStock <= m.reorderLevel);
    }

    res.json(filteredMaterials);
  } catch (error) {
    next(error);
  }
};

// Get single material
exports.getMaterialById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const material = await prisma.material.findUnique({
      where: { id },
    });

    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }

    // Get stock movements
    const movements = await prisma.stockMovement.findMany({
      where: { materialId: id },
      orderBy: { date: 'desc' },
      take: 20,
    });

    res.json({
      material,
      recentMovements: movements,
    });
  } catch (error) {
    next(error);
  }
};

// Create material
exports.createMaterial = async (req, res, next) => {
  try {
    const {
      sku,
      name,
      category,
      unit,
      costPerUnit,
      currentStock,
      reorderLevel,
      reorderQuantity,
      supplierId,
      description,
    } = req.body;

    // Validation
    if (!sku || !name || !category || !unit) {
      return res.status(400).json({
        error: 'SKU, name, category, and unit are required',
      });
    }

    // Check duplicate SKU
    const existing = await prisma.material.findUnique({ where: { sku } });
    if (existing) {
      return res.status(400).json({ error: 'SKU already exists' });
    }

    const material = await prisma.material.create({
      data: {
        sku,
        name,
        category,
        unit,
        costPerUnit: parseFloat(costPerUnit) || 0,
        currentStock: parseFloat(currentStock) || 0,
        reorderLevel: parseFloat(reorderLevel) || 0,
        reorderQuantity: parseFloat(reorderQuantity) || 0,
        supplierId: supplierId || null,
        description: description || null,
      },
    });

    res.status(201).json({
      message: 'Material created successfully',
      material,
    });
  } catch (error) {
    next(error);
  }
};

// Update material
exports.updateMaterial = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      category,
      unit,
      costPerUnit,
      reorderLevel,
      reorderQuantity,
      supplierId,
      description,
    } = req.body;

    const existing = await prisma.material.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Material not found' });
    }

    const material = await prisma.material.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(category && { category }),
        ...(unit && { unit }),
        ...(costPerUnit !== undefined && { costPerUnit: parseFloat(costPerUnit) }),
        ...(reorderLevel !== undefined && { reorderLevel: parseFloat(reorderLevel) }),
        ...(reorderQuantity !== undefined && { reorderQuantity: parseFloat(reorderQuantity) }),
        ...(supplierId !== undefined && { supplierId }),
        ...(description !== undefined && { description }),
        updatedAt: new Date(),
      },
    });

    res.json({
      message: 'Material updated successfully',
      material,
    });
  } catch (error) {
    next(error);
  }
};

// Delete material
exports.deleteMaterial = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.material.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Material not found' });
    }

    await prisma.material.delete({ where: { id } });

    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Get all stock movements
exports.getStockMovements = async (req, res, next) => {
  try {
    const { materialId, type, startDate, endDate } = req.query;

    const where = {};
    if (materialId) where.materialId = materialId;
    if (type) where.type = type;

    const movements = await prisma.stockMovement.findMany({
      where,
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
      orderBy: { date: 'desc' },
      take: 100,
    });

    // Filter by date if provided
    let filteredMovements = movements;
    if (startDate || endDate) {
      filteredMovements = movements.filter(m => {
        const movementDate = new Date(m.date);
        if (startDate && movementDate < new Date(startDate)) return false;
        if (endDate && movementDate > new Date(endDate)) return false;
        return true;
      });
    }

    res.json(filteredMovements);
  } catch (error) {
    next(error);
  }
};

// Record stock movement
exports.recordStockMovement = async (req, res, next) => {
  try {
    const {
      materialId,
      type,
      quantity,
      reference,
      referenceId,
      notes,
      date,
    } = req.body;

    // Validation
    if (!materialId || !type || !quantity) {
      return res.status(400).json({
        error: 'Material ID, type, and quantity are required',
      });
    }

    const validTypes = ['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    // Get material
    const material = await prisma.material.findUnique({
      where: { id: materialId },
    });

    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }

    // Calculate new stock
    let newStock = material.currentStock;
    const qty = parseFloat(quantity);

    if (type === 'IN') {
      newStock += qty;
    } else if (type === 'OUT') {
      newStock -= qty;
      if (newStock < 0) {
        return res.status(400).json({
          error: 'Insufficient stock. Cannot reduce below zero.',
        });
      }
    } else if (type === 'ADJUSTMENT') {
      // Adjustment can be + or -
      newStock = qty;
    }

    // Create stock movement
    const movement = await prisma.stockMovement.create({
      data: {
        materialId,
        type,
        quantity: Math.abs(qty),
        balanceAfter: newStock,
        reference: reference || null,
        referenceId: referenceId || null,
        notes: notes || null,
        date: date ? new Date(date) : new Date(),
        createdBy: req.user.userId,
      },
    });

    // Update material stock
    await prisma.material.update({
      where: { id: materialId },
      data: {
        currentStock: newStock,
        updatedAt: new Date(),
      },
    });

    res.status(201).json({
      message: 'Stock movement recorded successfully',
      movement,
      newStock,
    });
  } catch (error) {
    next(error);
  }
};

// Get low stock materials
exports.getLowStock = async (req, res, next) => {
  try {
    const materials = await prisma.material.findMany({});

    const lowStockMaterials = materials.filter(
      m => m.currentStock <= m.reorderLevel
    );

    res.json({
      count: lowStockMaterials.length,
      materials: lowStockMaterials,
    });
  } catch (error) {
    next(error);
  }
};

// Get inventory summary
exports.getInventorySummary = async (req, res, next) => {
  try {
    const materials = await prisma.material.findMany({});

    const summary = {
      totalMaterials: materials.length,
      totalStockValue: materials.reduce(
        (sum, m) => sum + m.currentStock * m.costPerUnit,
        0
      ),
      lowStockCount: materials.filter(m => m.currentStock <= m.reorderLevel).length,
      outOfStockCount: materials.filter(m => m.currentStock === 0).length,
      byCategory: {},
    };

    // Group by category
    materials.forEach(m => {
      if (!summary.byCategory[m.category]) {
        summary.byCategory[m.category] = {
          count: 0,
          value: 0,
        };
      }
      summary.byCategory[m.category].count += 1;
      summary.byCategory[m.category].value += m.currentStock * m.costPerUnit;
    });

    res.json(summary);
  } catch (error) {
    next(error);
  }
};
