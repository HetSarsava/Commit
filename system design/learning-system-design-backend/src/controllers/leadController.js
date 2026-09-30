const { prisma } = require('../config/database');

// Create new lead
exports.createLead = async (req, res, next) => {
  try {
    const {
      companyName,
      contactPerson,
      mobile,
      whatsapp,
      email,
      city,
      state,
      industry,
      requirement,
      productInterest,
      quantity,
      budget,
      deliveryDate,
      source,
      priority,
      notes,
      salesPersonId,
      campaignId,
    } = req.body;

    const lead = await prisma.lead.create({
      data: {
        companyName,
        contactPerson,
        mobile,
        whatsapp,
        email,
        city,
        state,
        industry,
        requirement,
        productInterest,
        quantity: quantity ? parseInt(quantity) : null,
        budget: budget ? parseFloat(budget) : null,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        source,
        priority: priority || 'MEDIUM',
        notes,
        salesPersonId: salesPersonId || req.user.id,
        campaignId: campaignId || null,
        status: 'NEW',
      },
      include: {
        salesPerson: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'LEAD_CREATED',
        description: `Lead created: ${companyName}`,
        leadId: lead.id,
        userId: req.user.id,
      },
    });

    res.status(201).json({
      message: 'Lead created successfully',
      lead,
    });
  } catch (error) {
    next(error);
  }
};

// Get all leads
exports.getLeads = async (req, res, next) => {
  try {
    const {
      status,
      priority,
      source,
      salesPersonId,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    // Build filters
    const where = {};

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (source) where.source = source;
    if (salesPersonId) where.salesPersonId = salesPersonId;

    // Search across multiple fields
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Role-based filtering: Sales people see only their leads
    if (req.user.role === 'SALES') {
      where.salesPersonId = req.user.id;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Get leads with pagination
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          salesPerson: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take,
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({
      leads,
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

// Get single lead
exports.getLead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        salesPerson: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        quotations: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        activities: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 20,
        },
      },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Check access
    if (req.user.role === 'SALES' && lead.salesPersonId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ lead });
  } catch (error) {
    next(error);
  }
};

// Update lead
exports.updateLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if lead exists
    const existingLead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!existingLead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Check access
    if (req.user.role === 'SALES' && existingLead.salesPersonId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update lead
    const lead = await prisma.lead.update({
      where: { id },
      data: updateData,
      include: {
        salesPerson: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'LEAD_UPDATED',
        description: `Lead updated: ${lead.companyName}`,
        leadId: lead.id,
        userId: req.user.id,
      },
    });

    res.json({
      message: 'Lead updated successfully',
      lead,
    });
  } catch (error) {
    next(error);
  }
};

// Delete lead
exports.deleteLead = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if lead exists
    const lead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Only admin can delete
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can delete leads' });
    }

    await prisma.lead.delete({
      where: { id },
    });

    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Get lead statistics
exports.getLeadStats = async (req, res, next) => {
  try {
    const where = {};

    // Role-based filtering
    if (req.user.role === 'SALES') {
      where.salesPersonId = req.user.id;
    }

    const [
      totalLeads,
      newLeads,
      hotLeads,
      convertedLeads,
      byStatus,
      bySource,
    ] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.count({ where: { ...where, status: 'NEW' } }),
      prisma.lead.count({ where: { ...where, priority: 'HOT' } }),
      prisma.lead.count({
        where: { ...where, status: 'COMPLETED' },
      }),
      prisma.lead.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      prisma.lead.groupBy({
        by: ['source'],
        where,
        _count: true,
      }),
    ]);

    res.json({
      totalLeads,
      newLeads,
      hotLeads,
      convertedLeads,
      byStatus,
      bySource,
    });
  } catch (error) {
    next(error);
  }
};

// Get pipeline funnel (11-stage conversion)
exports.getPipelineFunnel = async (req, res, next) => {
  try {
    const where = {};

    // Role-based filtering
    if (req.user.role === 'SALES') {
      where.salesPersonId = req.user.id;
    }

    // 11 stages as per PDF
    const stages = [
      'NEW',
      'CONTACTED',
      'REQUIREMENT',
      'CATALOGUE',
      'QUOTATION',
      'NEGOTIATION',
      'SAMPLE',
      'ORDER',
      'PRODUCTION',
      'DISPATCH',
      'COMPLETED',
    ];

    const funnel = await Promise.all(
      stages.map(async (stage) => {
        const count = await prisma.lead.count({
          where: { ...where, status: stage },
        });
        return { stage, count };
      })
    );

    // Calculate conversion rates
    const total = funnel[0].count;
    const funnelWithRates = funnel.map((item, index) => ({
      ...item,
      conversionRate: total > 0 ? Math.round((item.count / total) * 100) : 0,
      dropOffFromPrevious:
        index > 0 && funnel[index - 1].count > 0
          ? Math.round(
              ((funnel[index - 1].count - item.count) /
                funnel[index - 1].count) *
                100
            )
          : 0,
    }));

    res.json({
      funnel: funnelWithRates,
      totalLeads: total,
      completedLeads: funnel[funnel.length - 1].count,
      overallConversionRate:
        total > 0
          ? Math.round((funnel[funnel.length - 1].count / total) * 100)
          : 0,
    });
  } catch (error) {
    next(error);
  }
};

// Get lead source performance
exports.getSourcePerformance = async (req, res, next) => {
  try {
    const where = {};

    // Role-based filtering
    if (req.user.role === 'SALES') {
      where.salesPersonId = req.user.id;
    }

    // Get all leads grouped by source
    const leadsBySource = await prisma.lead.groupBy({
      by: ['source'],
      where,
      _count: true,
    });

    // For each source, calculate conversion metrics
    const sourcePerformance = await Promise.all(
      leadsBySource.map(async (sourceGroup) => {
        const sourceWhere = { ...where, source: sourceGroup.source };

        const [
          total,
          contacted,
          quotations,
          orders,
          completed,
        ] = await Promise.all([
          prisma.lead.count({ where: sourceWhere }),
          prisma.lead.count({ where: { ...sourceWhere, status: 'CONTACTED' } }),
          prisma.lead.count({ where: { ...sourceWhere, status: 'QUOTATION' } }),
          prisma.lead.count({ where: { ...sourceWhere, status: 'ORDER' } }),
          prisma.lead.count({ where: { ...sourceWhere, status: 'COMPLETED' } }),
        ]);

        // Calculate revenue from completed leads
        const completedLeads = await prisma.lead.findMany({
          where: { ...sourceWhere, status: 'COMPLETED' },
          select: { budget: true },
        });

        const revenue = completedLeads.reduce(
          (sum, lead) => sum + (lead.budget || 0),
          0
        );

        return {
          source: sourceGroup.source,
          totalLeads: total,
          contacted,
          quotations,
          orders,
          completed,
          contactedRate: total > 0 ? Math.round((contacted / total) * 100) : 0,
          quotationRate: total > 0 ? Math.round((quotations / total) * 100) : 0,
          orderRate: total > 0 ? Math.round((orders / total) * 100) : 0,
          conversionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
          revenue,
          avgRevenuePerLead: total > 0 ? Math.round(revenue / total) : 0,
        };
      })
    );

    // Sort by conversion rate descending
    sourcePerformance.sort((a, b) => b.conversionRate - a.conversionRate);

    res.json({
      sourcePerformance,
      totalSources: sourcePerformance.length,
      bestSource:
        sourcePerformance.length > 0 ? sourcePerformance[0].source : null,
    });
  } catch (error) {
    next(error);
  }
};

// Get salesperson performance
exports.getSalespersonPerformance = async (req, res, next) => {
  try {
    // Only Admin can view all salesperson performance
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SALES') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const salespeople = await prisma.user.findMany({
      where: { role: 'SALES', isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    const performance = await Promise.all(
      salespeople.map(async (person) => {
        const [
          totalLeads,
          contacted,
          quotations,
          orders,
          completed,
        ] = await Promise.all([
          prisma.lead.count({ where: { salesPersonId: person.id } }),
          prisma.lead.count({
            where: { salesPersonId: person.id, status: 'CONTACTED' },
          }),
          prisma.lead.count({
            where: { salesPersonId: person.id, status: 'QUOTATION' },
          }),
          prisma.lead.count({
            where: { salesPersonId: person.id, status: 'ORDER' },
          }),
          prisma.lead.count({
            where: { salesPersonId: person.id, status: 'COMPLETED' },
          }),
        ]);

        // Calculate revenue
        const completedLeads = await prisma.lead.findMany({
          where: { salesPersonId: person.id, status: 'COMPLETED' },
          select: { budget: true },
        });

        const revenue = completedLeads.reduce(
          (sum, lead) => sum + (lead.budget || 0),
          0
        );

        return {
          id: person.id,
          name: `${person.firstName} ${person.lastName}`,
          email: person.email,
          totalLeads,
          contacted,
          quotations,
          orders,
          completed,
          conversionRate:
            totalLeads > 0 ? Math.round((completed / totalLeads) * 100) : 0,
          revenue,
          avgDealSize: completed > 0 ? Math.round(revenue / completed) : 0,
        };
      })
    );

    // Sort by revenue descending
    performance.sort((a, b) => b.revenue - a.revenue);

    res.json({
      performance,
      totalSalespeople: performance.length,
      topPerformer: performance.length > 0 ? performance[0].name : null,
    });
  } catch (error) {
    next(error);
  }
};
