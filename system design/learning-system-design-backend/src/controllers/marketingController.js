const { prisma } = require('../config/database');
const { attribution } = require('../services/marketingMetrics');
async function dataRows() { return Promise.all([prisma.lead.findMany({}), (prisma.order || prisma.salesOrder).findMany({}), prisma.customer.findMany({}), prisma.quotation.findMany({})]); }


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

    if (typeof name !== 'string' || !name.trim() || !Number.isFinite(Number(budget)) || Number(budget) < 0 || !Number.isFinite(new Date(startDate).getTime())) return res.status(400).json({error:'Enter a campaign name, valid budget and start date'});
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
exports.getAllCampaigns = async (req,res,next) => { try { const where = {}; for(const key of ['status','platform','type']) if(req.query[key]) where[key]=req.query[key]; const [campaigns, rows] = await Promise.all([prisma.campaign.findMany({where}),dataRows()]); res.json(campaigns.map(c=>({...c,metrics:attribution(c,...rows).metrics}))); } catch(e){next(e);} };

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

    res.json({...campaign,...attribution(campaign,...await dataRows())});
  } catch (error) {
    next(error);
  }
};

// Update campaign
exports.updateCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = Object.fromEntries(Object.entries(req.body).filter(([key])=>['name','type','platform','budget','startDate','endDate','targetAudience','description','status'].includes(key)));
    if (updateData.budget !== undefined && (!Number.isFinite(Number(updateData.budget)) || Number(updateData.budget) < 0)) return res.status(400).json({error:'Budget must be a non-negative amount'});

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
exports.getMarketingDashboard = async (req,res,next) => { try {
 const [campaigns,rows] = await Promise.all([prisma.campaign.findMany({}),dataRows()]);
 const results = campaigns.map(c=>({...c,...attribution(c,...rows)}));
 const totalBudget=results.reduce((s,c)=>s+Number(c.budget||0),0), totalSpent=results.reduce((s,c)=>s+Number(c.spent||0),0), totalRevenue=results.reduce((s,c)=>s+c.metrics.revenue,0), totalLeads=results.reduce((s,c)=>s+c.metrics.totalLeads,0), completedLeads=results.reduce((s,c)=>s+c.metrics.completed,0);
 const platforms={}; for(const c of results) { const p=platforms[c.platform] ||= {platform:c.platform,campaigns:0,spent:0,leads:0,revenue:0}; p.campaigns++;p.spent+=Number(c.spent||0);p.leads+=c.metrics.totalLeads;p.revenue+=c.metrics.revenue; }
 const platformStats=Object.values(platforms).map(p=>({...p,cpl:p.leads?Math.round(p.spent/p.leads):0,roi:p.spent?Math.round((p.revenue-p.spent)/p.spent*1000)/10:null}));
 res.json({summary:{totalCampaigns:results.length,activeCampaigns:results.filter(c=>c.status==='ACTIVE').length,totalBudget,totalSpent,totalRevenue,totalLeads,completedLeads,budgetUtilization:totalBudget?Math.round(totalSpent/totalBudget*100):0,overallCPL:totalLeads?Math.round(totalSpent/totalLeads):0,overallROI:totalSpent?Math.round((totalRevenue-totalSpent)/totalSpent*1000)/10:null,overallConversion:totalLeads?Math.round(completedLeads/totalLeads*1000)/10:0},platformStats,topCampaigns:results.map(c=>({id:c.id,name:c.name,platform:c.platform,spent:c.spent,leads:c.metrics.totalLeads,revenue:c.metrics.revenue,roi:c.metrics.roi})).sort((a,b)=>(b.roi||0)-(a.roi||0)).slice(0,5)});
 } catch(e){next(e);} };

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

    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) return res.status(400).json({error:'Enter a positive spend amount.'});
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
