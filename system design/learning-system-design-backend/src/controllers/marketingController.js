const { prisma } = require('../config/database');

// Create marketing campaign
exports.createCampaign = async (req, res, next) => {
  try {
    const {
      name,
      type,
      platform,
      budget,
      startDate,
      endDate,
      targetAudience,
      description,
      status,
    } = req.body;

    // Generate campaign code
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const count = await prisma.campaign.count();
    const campaignCode = `CAM-${year}${month}-${(count + 1).toString().padStart(4, '0')}`;

    const campaign = await prisma.campaign.create({
      data: {
        campaignCode,
        name,
        type,
        platform,
        budget: parseFloat(budget),
        spent: 0,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        targetAudience,
        description,
        status: status || 'ACTIVE',
        createdBy: req.user.id,
      },
      include: {
        createdByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    res.status(201).json({ message: 'Campaign created successfully', campaign });
  } catch (error) {
    next(error);
  }
};

// Get all campaigns
exports.getAllCampaigns = async (req, res, next) => {
  try {
    const { status, platform, type } = req.query;

    const where = {};
    if (status) where.status = status;
    if (platform) where.platform = platform;
    if (type) where.type = type;

    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        createdByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: {
          select: { leads: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate metrics for each campaign
    const campaignsWithMetrics = await Promise.all(
      campaigns.map(async (campaign) => {
        const leads = await prisma.lead.findMany({
          where: { campaignId: campaign.id },
        });

        const totalLeads = leads.length;
        const quotations = leads.filter((l) => ['QUOTATION', 'NEGOTIATION', 'SAMPLE', 'ORDER', 'PRODUCTION', 'DISPATCH', 'COMPLETED'].includes(l.status)).length;
        const orders = leads.filter((l) => ['ORDER', 'PRODUCTION', 'DISPATCH', 'COMPLETED'].includes(l.status)).length;
        const completed = leads.filter((l) => l.status === 'COMPLETED').length;

        const revenue = leads
          .filter((l) => l.status === 'COMPLETED')
          .reduce((sum, l) => sum + (l.budget || 0), 0);

        const cpl = totalLeads > 0 ? campaign.spent / totalLeads : 0;
        const roi = campaign.spent > 0 ? ((revenue - campaign.spent) / campaign.spent) * 100 : 0;
        const conversionRate = totalLeads > 0 ? (completed / totalLeads) * 100 : 0;

        return {
          ...campaign,
          metrics: {
            totalLeads,
            quotations,
            orders,
            completed,
            revenue,
            cpl: Math.round(cpl),
            roi: Math.round(roi * 10) / 10,
            conversionRate: Math.round(conversionRate * 10) / 10,
          },
        };
      })
    );

    res.json(campaignsWithMetrics);
  } catch (error) {
    next(error);
  }
};

// Get campaign by ID
exports.getCampaignById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        createdByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        leads: {
          include: {
            salesPerson: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json(campaign);
  } catch (error) {
    next(error);
  }
};

// Update campaign
exports.updateCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Convert dates if provided
    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate) {
      updateData.endDate = new Date(updateData.endDate);
    }
    if (updateData.budget) {
      updateData.budget = parseFloat(updateData.budget);
    }
    if (updateData.spent) {
      updateData.spent = parseFloat(updateData.spent);
    }

    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: updateData,
      include: {
        createdByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    res.json({
      message: 'Campaign updated successfully',
      campaign: updatedCampaign,
    });
  } catch (error) {
    next(error);
  }
};

// Delete campaign
exports.deleteCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { _count: { select: { leads: true } } },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Prevent deletion if campaign has leads
    if (campaign._count.leads > 0) {
      return res.status(400).json({
        error: `Cannot delete campaign with ${campaign._count.leads} associated leads. Archive it instead.`,
      });
    }

    await prisma.campaign.delete({ where: { id } });

    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Get marketing dashboard/summary
exports.getMarketingDashboard = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const [
      totalCampaigns,
      activeCampaigns,
      campaigns,
      allLeads,
    ] = await Promise.all([
      prisma.campaign.count(),
      prisma.campaign.count({ where: { status: 'ACTIVE' } }),
      prisma.campaign.findMany({
        include: {
          leads: true,
        },
      }),
      prisma.lead.findMany({
        where: { campaignId: { not: null } },
      }),
    ]);

    // Calculate overall metrics
    const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0);
    const totalSpent = campaigns.reduce((sum, c) => sum + c.spent, 0);
    const totalLeads = allLeads.length;
    const completedLeads = allLeads.filter((l) => l.status === 'COMPLETED').length;
    const totalRevenue = allLeads
      .filter((l) => l.status === 'COMPLETED')
      .reduce((sum, l) => sum + (l.budget || 0), 0);

    const overallCPL = totalLeads > 0 ? totalSpent / totalLeads : 0;
    const overallROI = totalSpent > 0 ? ((totalRevenue - totalSpent) / totalSpent) * 100 : 0;
    const overallConversion = totalLeads > 0 ? (completedLeads / totalLeads) * 100 : 0;

    // Platform breakdown
    const platformBreakdown = campaigns.reduce((acc, campaign) => {
      if (!acc[campaign.platform]) {
        acc[campaign.platform] = {
          platform: campaign.platform,
          campaigns: 0,
          spent: 0,
          leads: 0,
          revenue: 0,
        };
      }

      acc[campaign.platform].campaigns++;
      acc[campaign.platform].spent += campaign.spent;

      const campaignLeads = allLeads.filter((l) => l.campaignId === campaign.id);
      acc[campaign.platform].leads += campaignLeads.length;
      acc[campaign.platform].revenue += campaignLeads
        .filter((l) => l.status === 'COMPLETED')
        .reduce((sum, l) => sum + (l.budget || 0), 0);

      return acc;
    }, {});

    const platformStats = Object.values(platformBreakdown).map((p) => ({
      ...p,
      cpl: p.leads > 0 ? Math.round(p.spent / p.leads) : 0,
      roi: p.spent > 0 ? Math.round(((p.revenue - p.spent) / p.spent) * 100 * 10) / 10 : 0,
    }));

    // Best performing campaigns (top 5 by ROI)
    const campaignsWithROI = campaigns.map((c) => {
      const campaignLeads = allLeads.filter((l) => l.campaignId === c.id);
      const revenue = campaignLeads
        .filter((l) => l.status === 'COMPLETED')
        .reduce((sum, l) => sum + (l.budget || 0), 0);
      const roi = c.spent > 0 ? ((revenue - c.spent) / c.spent) * 100 : 0;

      return {
        id: c.id,
        name: c.name,
        platform: c.platform,
        spent: c.spent,
        leads: campaignLeads.length,
        revenue,
        roi: Math.round(roi * 10) / 10,
      };
    });

    const topCampaigns = campaignsWithROI
      .sort((a, b) => b.roi - a.roi)
      .slice(0, 5);

    res.json({
      summary: {
        totalCampaigns,
        activeCampaigns,
        totalBudget: Math.round(totalBudget),
        totalSpent: Math.round(totalSpent),
        budgetUtilization: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
        totalLeads,
        completedLeads,
        totalRevenue: Math.round(totalRevenue),
        overallCPL: Math.round(overallCPL),
        overallROI: Math.round(overallROI * 10) / 10,
        overallConversion: Math.round(overallConversion * 10) / 10,
      },
      platformStats,
      topCampaigns,
    });
  } catch (error) {
    next(error);
  }
};

// Record campaign spend
exports.recordSpend = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, description, date } = req.body;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Update campaign spent
    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: {
        spent: campaign.spent + parseFloat(amount),
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'CAMPAIGN_SPEND',
        description: `₹${amount} spent on ${campaign.name}: ${description}`,
        userId: req.user.id,
      },
    });

    res.json({
      message: 'Spend recorded successfully',
      campaign: updatedCampaign,
    });
  } catch (error) {
    next(error);
  }
};
