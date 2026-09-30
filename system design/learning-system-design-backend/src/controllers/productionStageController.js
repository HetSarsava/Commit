const { prisma } = require('../config/database');

// Get all production stages for an order
exports.getProductionStages = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const stages = await prisma.productionStage.findMany({
      where: { productionId: orderId },
      orderBy: { stageOrder: 'asc' },
    });

    res.json(stages);
  } catch (error) {
    next(error);
  }
};

// Initialize production stages for an order
exports.initializeStages = async (req, res, next) => {
  try {
    const { productionId, orderId, quantity } = req.body;

    if (!productionId || !orderId || !quantity) {
      return res.status(400).json({
        error: 'Production ID, Order ID, and quantity are required',
      });
    }

    // Define all production stages
    const stageDefinitions = [
      {
        stageName: 'MATERIAL_REQUISITION',
        stageOrder: 1,
        description: 'Material requisition and allocation',
        estimatedDuration: 1, // days
      },
      {
        stageName: 'CUTTING',
        stageOrder: 2,
        description: 'Fabric cutting as per pattern',
        estimatedDuration: 2,
      },
      {
        stageName: 'STITCHING',
        stageOrder: 3,
        description: 'Stitching and assembly',
        estimatedDuration: 5,
      },
      {
        stageName: 'FINISHING',
        stageOrder: 4,
        description: 'Finishing touches and embellishments',
        estimatedDuration: 2,
      },
      {
        stageName: 'QUALITY_CHECK',
        stageOrder: 5,
        description: 'Quality inspection and testing',
        estimatedDuration: 1,
      },
      {
        stageName: 'PACKING',
        stageOrder: 6,
        description: 'Packing and labeling',
        estimatedDuration: 1,
      },
    ];

    // Create stages
    const createdStages = [];
    for (const stageDef of stageDefinitions) {
      const stage = await prisma.productionStage.create({
        data: {
          productionId,
          orderId,
          stageName: stageDef.stageName,
          stageOrder: stageDef.stageOrder,
          description: stageDef.description,
          status: stageDef.stageOrder === 1 ? 'IN_PROGRESS' : 'PENDING',
          targetQuantity: quantity,
          completedQuantity: 0,
          rejectedQuantity: 0,
          estimatedDuration: stageDef.estimatedDuration,
          startedAt: stageDef.stageOrder === 1 ? new Date() : null,
          completedAt: null,
          assignedTo: null,
          notes: null,
        },
      });
      createdStages.push(stage);
    }

    res.status(201).json({
      message: 'Production stages initialized successfully',
      stages: createdStages,
    });
  } catch (error) {
    next(error);
  }
};

// Update stage progress
exports.updateStageProgress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { completedQuantity, rejectedQuantity, notes } = req.body;

    const stage = await prisma.productionStage.findUnique({ where: { id } });
    if (!stage) {
      return res.status(404).json({ error: 'Production stage not found' });
    }

    // Calculate new quantities
    const newCompletedQty = completedQuantity !== undefined
      ? parseFloat(completedQuantity)
      : stage.completedQuantity;
    const newRejectedQty = rejectedQuantity !== undefined
      ? parseFloat(rejectedQuantity)
      : stage.rejectedQuantity;

    // Check if stage is completed
    const isCompleted = newCompletedQty >= stage.targetQuantity;

    const updated = await prisma.productionStage.update({
      where: { id },
      data: {
        completedQuantity: newCompletedQty,
        rejectedQuantity: newRejectedQty,
        status: isCompleted ? 'COMPLETED' : 'IN_PROGRESS',
        completedAt: isCompleted ? new Date() : stage.completedAt,
        notes: notes || stage.notes,
        updatedAt: new Date(),
      },
    });

    // If this stage is completed, start the next stage
    if (isCompleted && !stage.completedAt) {
      const nextStage = await prisma.productionStage.findFirst({
        where: {
          productionId: stage.productionId,
          stageOrder: stage.stageOrder + 1,
        },
      });

      if (nextStage && nextStage.status === 'PENDING') {
        await prisma.productionStage.update({
          where: { id: nextStage.id },
          data: {
            status: 'IN_PROGRESS',
            startedAt: new Date(),
          },
        });
      }
    }

    res.json({
      message: 'Stage progress updated successfully',
      stage: updated,
    });
  } catch (error) {
    next(error);
  }
};

// Start a stage manually
exports.startStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;

    const stage = await prisma.productionStage.findUnique({ where: { id } });
    if (!stage) {
      return res.status(404).json({ error: 'Production stage not found' });
    }

    if (stage.status !== 'PENDING') {
      return res.status(400).json({ error: 'Stage is not pending' });
    }

    const updated = await prisma.productionStage.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        assignedTo: assignedTo || null,
        updatedAt: new Date(),
      },
    });

    res.json({
      message: 'Stage started successfully',
      stage: updated,
    });
  } catch (error) {
    next(error);
  }
};

// Complete a stage
exports.completeStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { completedQuantity, rejectedQuantity, notes } = req.body;

    const stage = await prisma.productionStage.findUnique({ where: { id } });
    if (!stage) {
      return res.status(404).json({ error: 'Production stage not found' });
    }

    if (stage.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Stage already completed' });
    }

    const finalCompletedQty = completedQuantity !== undefined
      ? parseFloat(completedQuantity)
      : stage.targetQuantity;
    const finalRejectedQty = rejectedQuantity !== undefined
      ? parseFloat(rejectedQuantity)
      : stage.rejectedQuantity;

    const updated = await prisma.productionStage.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedQuantity: finalCompletedQty,
        rejectedQuantity: finalRejectedQty,
        completedAt: new Date(),
        notes: notes || stage.notes,
        updatedAt: new Date(),
      },
    });

    // Start next stage
    const nextStage = await prisma.productionStage.findFirst({
      where: {
        productionId: stage.productionId,
        stageOrder: stage.stageOrder + 1,
      },
    });

    if (nextStage && nextStage.status === 'PENDING') {
      await prisma.productionStage.update({
        where: { id: nextStage.id },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date(),
        },
      });
    }

    // If this was the last stage, update production status
    if (!nextStage) {
      await prisma.production.update({
        where: { id: stage.productionId },
        data: {
          status: 'COMPLETED',
          completedDate: new Date(),
        },
      });
    }

    res.json({
      message: 'Stage completed successfully',
      stage: updated,
    });
  } catch (error) {
    next(error);
  }
};

// Record material consumption for a stage
exports.recordMaterialConsumption = async (req, res, next) => {
  try {
    const { stageId, materialId, quantity, notes } = req.body;

    if (!stageId || !materialId || !quantity) {
      return res.status(400).json({
        error: 'Stage ID, Material ID, and quantity are required',
      });
    }

    // Get material
    const material = await prisma.material.findUnique({
      where: { id: materialId },
    });

    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }

    // Check sufficient stock
    if (material.currentStock < quantity) {
      return res.status(400).json({
        error: 'Insufficient stock',
        available: material.currentStock,
        required: quantity,
      });
    }

    // Record consumption
    const consumption = await prisma.materialConsumption.create({
      data: {
        stageId,
        materialId,
        quantity: parseFloat(quantity),
        notes: notes || null,
      },
    });

    // Update material stock (Stock OUT)
    await prisma.stockMovement.create({
      data: {
        materialId,
        type: 'OUT',
        quantity: parseFloat(quantity),
        balanceAfter: material.currentStock - parseFloat(quantity),
        reference: 'Production Stage',
        referenceId: stageId,
        notes: notes || `Consumed in production stage`,
        date: new Date(),
        createdBy: req.user.userId,
      },
    });

    await prisma.material.update({
      where: { id: materialId },
      data: {
        currentStock: material.currentStock - parseFloat(quantity),
      },
    });

    res.status(201).json({
      message: 'Material consumption recorded successfully',
      consumption,
    });
  } catch (error) {
    next(error);
  }
};

// Get production timeline
exports.getProductionTimeline = async (req, res, next) => {
  try {
    const { productionId } = req.params;

    const stages = await prisma.productionStage.findMany({
      where: { productionId },
      orderBy: { stageOrder: 'asc' },
    });

    // Calculate timeline metrics
    const timeline = {
      totalStages: stages.length,
      completedStages: stages.filter(s => s.status === 'COMPLETED').length,
      currentStage: stages.find(s => s.status === 'IN_PROGRESS'),
      estimatedCompletionDays: stages.reduce((sum, s) => sum + s.estimatedDuration, 0),
      actualDaysElapsed: 0,
      stages: stages.map(stage => ({
        ...stage,
        progress: stage.targetQuantity > 0
          ? Math.round((stage.completedQuantity / stage.targetQuantity) * 100)
          : 0,
        daysSpent: stage.startedAt && stage.completedAt
          ? Math.ceil((new Date(stage.completedAt) - new Date(stage.startedAt)) / (1000 * 60 * 60 * 24))
          : stage.startedAt
          ? Math.ceil((new Date() - new Date(stage.startedAt)) / (1000 * 60 * 60 * 24))
          : 0,
      })),
    };

    res.json(timeline);
  } catch (error) {
    next(error);
  }
};
