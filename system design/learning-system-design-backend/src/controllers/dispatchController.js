const { prisma } = require('../config/database');
const dispatchProduction=require('../services/dispatchProduction');

// Get all dispatches with filters
exports.getAllDispatches = async (req, res) => {
  try {
    const { status, customerId, fromDate, toDate, courierName } = req.query;

    let dispatches = await prisma.dispatch.findMany({
      include: {
        customer: true,
        order: true,
        production: true,
        createdByUser: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Apply filters
    if (status) {
      dispatches = dispatches.filter((d) => d.status === status);
    }
    if (customerId) {
      dispatches = dispatches.filter((d) => d.customerId === customerId);
    }
    if (courierName) {
      dispatches = dispatches.filter(
        (d) => d.courierName.toLowerCase().includes(courierName.toLowerCase())
      );
    }
    if (fromDate) {
      dispatches = dispatches.filter(
        (d) => new Date(d.dispatchDate) >= new Date(fromDate)
      );
    }
    if (toDate) {
      dispatches = dispatches.filter(
        (d) => new Date(d.dispatchDate) <= new Date(toDate)
      );
    }

    res.json(dispatches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get dispatch by ID
exports.getDispatchById = async (req, res) => {
  try {
    const { id } = req.params;

    const dispatch = await prisma.dispatch.findUnique({
      where: { id },
      include: {
        customer: true,
        order: true,
        production: true,
        createdByUser: true,
        updatedByUser: true,
      },
    });

    if (!dispatch) {
      return res.status(404).json({ error: 'Dispatch not found' });
    }

    res.json(dispatch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create dispatch from production order
exports.createDispatch = async (req, res) => {
  try {
    const {
      productionId,
      courierName,
      trackingNumber,
      dispatchDate,
      expectedDeliveryDate,
      contactPerson,
      contactPhone,
      deliveryAddress,
      notes,
    } = req.body;

    if(typeof productionId!=='string'||typeof courierName!=='string'||!courierName.trim()||typeof trackingNumber!=='string'||!trackingNumber.trim()) return res.status(400).json({error:'Choose a ready order and enter courier and tracking details.'});
    if(!dispatchDate||!expectedDeliveryDate||!Number.isFinite(Date.parse(dispatchDate))||!Number.isFinite(Date.parse(expectedDeliveryDate))||new Date(expectedDeliveryDate)<new Date(dispatchDate)) return res.status(400).json({error:'Delivery date must be on or after a valid dispatch date.'});
    // Validate production order exists and is in PACKED status
    const production = await dispatchProduction.find(productionId);

    if (!production) {
      return res.status(404).json({ error: 'Production order not found' });
    }

    if (production.status !== 'PACKED') {
      return res.status(400).json({
        error: 'Production order must be in PACKED status to create dispatch',
      });
    }

    // Check if dispatch already exists for this production
    const existingDispatch = await prisma.dispatch.findFirst({
      where: { productionId },
    });

    if (existingDispatch) {
      return res.status(400).json({
        error: 'Dispatch already exists for this production order',
      });
    }

    // Generate dispatch number
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const count = await prisma.dispatch.count();
    const dispatchNumber = `DSP-${year}${month}-${(count + 1)
      .toString()
      .padStart(4, '0')}`;

    // Prepare dispatch items from order items
    const items = production.order.items.map((item) => ({
      productId: item.productId,
      productName: item.productName || item.product?.name || 'Product',
      quantity: item.quantity,
      packedQuantity: item.quantity,
    }));

    // Create dispatch
    const dispatch = await prisma.dispatch.create({
      data: {
        dispatchNumber,
        productionId,
        orderId: production.orderId,
        customerId: production.order.customerId,
        customerName: production.order.customer.companyName,
        courierName,
        trackingNumber,
        dispatchDate: dispatchDate || new Date().toISOString(),
        expectedDeliveryDate,
        status: 'DISPATCHED',
        items,
        contactPerson,
        contactPhone,
        deliveryAddress,
        notes,
        createdBy: req.user.id,
      },
    });

    // Update production status to DISPATCHED
    await dispatchProduction.markDispatched(production);

    // Fetch complete dispatch with relations
    const completeDispatch = await prisma.dispatch.findUnique({
      where: { id: dispatch.id },
      include: {
        customer: true,
        order: true,
        production: true,
        createdByUser: true,
      },
    });

    res.status(201).json(completeDispatch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update dispatch status
exports.updateDispatchStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, actualDeliveryDate, podReceivedBy, podDocument, notes } =
      req.body;

    const dispatch = await prisma.dispatch.findUnique({
      where: { id },
    });

    if (!dispatch) {
      return res.status(404).json({ error: 'Dispatch not found' });
    }

    // Validate status transitions
    const validTransitions = {
      PENDING: ['DISPATCHED', 'CANCELLED'],
      DISPATCHED: ['IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
      IN_TRANSIT: ['DELIVERED', 'CANCELLED'],
      DELIVERED: [],
      CANCELLED: [],
    };

    if (
      status &&
      !validTransitions[dispatch.status].includes(status)
    ) {
      return res.status(400).json({
        error: `Invalid status transition from ${dispatch.status} to ${status}`,
      });
    }

    // Update dispatch
    const updateData = {
      updatedBy: req.user.id,
    };

    if (status) updateData.status = status;
    if (actualDeliveryDate) updateData.actualDeliveryDate = actualDeliveryDate;
    if (podReceivedBy) updateData.podReceivedBy = podReceivedBy;
    if (podDocument) updateData.podDocument = podDocument;
    if (notes !== undefined) updateData.notes = notes;

    // Auto-set delivery date if status is DELIVERED
    if (status === 'DELIVERED' && !actualDeliveryDate) {
      updateData.actualDeliveryDate = new Date().toISOString();
    }

    const updatedDispatch = await prisma.dispatch.update({
      where: { id },
      data: updateData,
    });

    // If delivered, update production status
    if (status === 'DELIVERED') {
      await prisma.production.update({
        where: { id: dispatch.productionId },
        data: { status: 'DELIVERED' },
      });
    }

    // Fetch complete dispatch
    const completeDispatch = await prisma.dispatch.findUnique({
      where: { id: updatedDispatch.id },
      include: {
        customer: true,
        order: true,
        production: true,
        createdByUser: true,
        updatedByUser: true,
      },
    });

    res.json(completeDispatch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get dispatches by customer
exports.getCustomerDispatches = async (req, res) => {
  try {
    const { customerId } = req.params;

    const dispatches = await prisma.dispatch.findMany({
      where: { customerId },
      include: {
        order: true,
        production: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(dispatches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get dispatch summary/metrics
exports.getDispatchSummary = async (req, res) => {
  try {
    const dispatches = await prisma.dispatch.findMany({});

    const summary = {
      total: dispatches.length,
      pending: dispatches.filter((d) => d.status === 'PENDING').length,
      dispatched: dispatches.filter((d) => d.status === 'DISPATCHED').length,
      inTransit: dispatches.filter((d) => d.status === 'IN_TRANSIT').length,
      delivered: dispatches.filter((d) => d.status === 'DELIVERED').length,
      cancelled: dispatches.filter((d) => d.status === 'CANCELLED').length,
      onTime: 0,
      delayed: 0,
      avgDeliveryDays: 0,
    };

    // Calculate on-time vs delayed
    const deliveredDispatches = dispatches.filter(
      (d) => d.status === 'DELIVERED' && d.actualDeliveryDate
    );

    deliveredDispatches.forEach((d) => {
      const expected = new Date(d.expectedDeliveryDate);
      const actual = new Date(d.actualDeliveryDate);

      if (actual <= expected) {
        summary.onTime++;
      } else {
        summary.delayed++;
      }
    });

    // Calculate average delivery days
    if (deliveredDispatches.length > 0) {
      const totalDays = deliveredDispatches.reduce((sum, d) => {
        const dispatch = new Date(d.dispatchDate);
        const delivery = new Date(d.actualDeliveryDate);
        const days = Math.ceil((delivery - dispatch) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0);
      summary.avgDeliveryDays = Math.round(totalDays / deliveredDispatches.length);
    }

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get ready-to-dispatch production orders
exports.getReadyToDispatch = async (req, res) => {
  try {
    // Get all PACKED production orders
    const productions = await dispatchProduction.candidates();

    // Filter out those that already have dispatch
    const dispatches = await prisma.dispatch.findMany({});
    const dispatchedProductionIds = dispatches.map((d) => d.productionId);

    const readyToDispatch = productions.filter(
      (p) => !dispatchedProductionIds.includes(p.id)
    );

    res.json(readyToDispatch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
