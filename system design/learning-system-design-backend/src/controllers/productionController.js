const { prisma } = require('../config/database');

// Get production board (all order items in production)
exports.getProductionBoard = async (req, res, next) => {
  try {
    const { status } = req.query;

    // Get orders that are IN_PRODUCTION or CONFIRMED
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { status: 'IN_PRODUCTION' },
          { status: 'CONFIRMED' },
        ],
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
            productionTracking: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get all production tracking records
    const productionItems = await prisma.productionTracking.findMany({
      include: {
        orderItem: {
          include: {
            product: true,
            order: {
              include: {
                customer: true,
              },
            },
          },
        },
        assignedWorker: {
          select: { id: true, name: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Filter by stage if provided
    let filteredItems = productionItems;
    if (status) {
      filteredItems = productionItems.filter((item) => item.stage === status);
    }

    res.json({
      orders,
      productionItems: filteredItems,
      summary: {
        material: productionItems.filter((i) => i.stage === 'MATERIAL').length,
        cutting: productionItems.filter((i) => i.stage === 'CUTTING').length,
        stitching: productionItems.filter((i) => i.stage === 'STITCHING').length,
        finishing: productionItems.filter((i) => i.stage === 'FINISHING').length,
        qc: productionItems.filter((i) => i.stage === 'QC').length,
        packing: productionItems.filter((i) => i.stage === 'PACKING').length,
        dispatch: productionItems.filter((i) => i.stage === 'DISPATCH').length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Create production tracking for order item
exports.createProductionTracking = async (req, res, next) => {
  try {
    const { orderItemId, stage, assignedWorkerId, notes, estimatedCompletion } = req.body;

    // Check if tracking already exists
    const existing = await prisma.productionTracking.findFirst({
      where: { orderItemId },
    });

    if (existing) {
      return res.status(400).json({ error: 'Production tracking already exists for this order item' });
    }

    // Create tracking
    const tracking = await prisma.productionTracking.create({
      data: {
        orderItemId,
        stage: stage || 'MATERIAL',
        assignedWorkerId,
        notes,
        estimatedCompletion: estimatedCompletion ? new Date(estimatedCompletion) : null,
        startedAt: new Date(),
      },
      include: {
        orderItem: {
          include: {
            product: true,
            order: {
              include: {
                customer: true,
              },
            },
          },
        },
        assignedWorker: {
          select: { id: true, name: true },
        },
      },
    });

    res.status(201).json({
      message: 'Production tracking created',
      tracking,
    });
  } catch (error) {
    next(error);
  }
};

// Update production stage
exports.updateProductionStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stage, assignedWorkerId, notes } = req.body;

    const tracking = await prisma.productionTracking.findUnique({
      where: { id },
    });

    if (!tracking) {
      return res.status(404).json({ error: 'Production tracking not found' });
    }

    const updateData = {
      updatedAt: new Date(),
    };

    if (stage) {
      updateData.stage = stage;

      // If moving to DISPATCH, mark as completed
      if (stage === 'DISPATCH') {
        updateData.completedAt = new Date();
      }

      // If this is the first stage change, mark started
      if (!tracking.startedAt) {
        updateData.startedAt = new Date();
      }
    }

    if (assignedWorkerId !== undefined) {
      updateData.assignedWorkerId = assignedWorkerId;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const updated = await prisma.productionTracking.update({
      where: { id },
      data: updateData,
      include: {
        orderItem: {
          include: {
            product: true,
            order: {
              include: {
                customer: true,
              },
            },
          },
        },
        assignedWorker: {
          select: { id: true, name: true },
        },
      },
    });

    // Check if all items in the order are completed
    const orderItemId = tracking.orderItemId;
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { order: true },
    });

    if (orderItem && stage === 'DISPATCH') {
      const allOrderItems = await prisma.orderItem.findMany({
        where: { orderId: orderItem.orderId },
        include: { productionTracking: true },
      });

      const allCompleted = allOrderItems.every(
        (item) =>
          item.productionTracking &&
          item.productionTracking.stage === 'DISPATCH'
      );

      // If all items dispatched, update order status to COMPLETED
      if (allCompleted) {
        await prisma.order.update({
          where: { id: orderItem.orderId },
          data: { status: 'COMPLETED' },
        });
      }
    }

    res.json({
      message: 'Production stage updated',
      tracking: updated,
    });
  } catch (error) {
    next(error);
  }
};

// Bulk move items to next stage
exports.bulkMoveToNextStage = async (req, res, next) => {
  try {
    const { trackingIds } = req.body;

    if (!trackingIds || !Array.isArray(trackingIds)) {
      return res.status(400).json({ error: 'trackingIds array is required' });
    }

    const stageOrder = [
      'MATERIAL',
      'CUTTING',
      'STITCHING',
      'FINISHING',
      'QC',
      'PACKING',
      'DISPATCH',
    ];

    const updated = [];

    for (const id of trackingIds) {
      const tracking = await prisma.productionTracking.findUnique({
        where: { id },
      });

      if (tracking) {
        const currentIndex = stageOrder.indexOf(tracking.stage);
        const nextStage = stageOrder[currentIndex + 1];

        if (nextStage) {
          const updateData = {
            stage: nextStage,
            updatedAt: new Date(),
          };

          if (nextStage === 'DISPATCH') {
            updateData.completedAt = new Date();
          }

          const updatedTracking = await prisma.productionTracking.update({
            where: { id },
            data: updateData,
            include: {
              orderItem: {
                include: {
                  product: true,
                  order: {
                    include: {
                      customer: true,
                    },
                  },
                },
              },
            },
          });

          updated.push(updatedTracking);
        }
      }
    }

    res.json({
      message: `${updated.length} items moved to next stage`,
      updated,
    });
  } catch (error) {
    next(error);
  }
};

// Get production tracking for specific order
exports.getOrderProduction = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
            productionTracking: {
              include: {
                assignedWorker: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order });
  } catch (error) {
    next(error);
  }
};

// Delete production tracking
exports.deleteProductionTracking = async (req, res, next) => {
  try {
    const { id } = req.params;

    const tracking = await prisma.productionTracking.findUnique({
      where: { id },
    });

    if (!tracking) {
      return res.status(404).json({ error: 'Production tracking not found' });
    }

    await prisma.productionTracking.delete({
      where: { id },
    });

    res.json({ message: 'Production tracking deleted' });
  } catch (error) {
    next(error);
  }
};
