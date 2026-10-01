const { prisma } = require('../config/database');

// Enhanced dashboard with comprehensive analytics
exports.getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const thisWeekStart = new Date(today);
    const daysSinceMonday = (thisWeekStart.getDay() + 6) % 7;
    thisWeekStart.setDate(thisWeekStart.getDate() - daysSinceMonday);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch all data
    const [
      leads,
      quotations,
      orders,
      invoices,
      productionItems,
      dispatches,
      campaigns,
      payments,
      products,
      customers,
    ] = await Promise.all([
      prisma.lead.findMany({ include: { salesPerson: true } }),
      prisma.quotation.findMany({}),
      prisma.order.findMany({ include: { items: true, customer: true } }),
      prisma.invoice.findMany({ include: { customer: true } }),
      prisma.productionTracking.findMany({}),
      prisma.dispatch.findMany({}),
      prisma.campaign.findMany({}),
      prisma.payment.findMany({}),
      prisma.product.findMany({}),
      prisma.customer.findMany({}),
    ]);

    // ===== TODAY'S STATS =====
    const todayLeads = leads.filter(l => new Date(l.createdAt) >= today).length;
    const todayOrders = orders.filter(o => new Date(o.createdAt) >= today);
    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
    const todayDispatches = dispatches.filter(d => new Date(d.createdAt) >= today).length;

    // ===== REVENUE TRENDS (Last 30 days) =====
    const revenueTrends = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dateEnd = new Date(dateStart.getTime() + 24 * 60 * 60 * 1000);

      const dayOrders = orders.filter(o => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= dateStart && orderDate < dateEnd;
      });

      const dayRevenue = dayOrders.reduce((sum, o) => sum + o.total, 0);

      revenueTrends.push({
        date: dateStart.toISOString().split('T')[0],
        revenue: Math.round(dayRevenue),
        orders: dayOrders.length,
      });
    }

    // ===== LEAD CONVERSION FUNNEL =====
    const funnelStages = [
      'NEW', 'CONTACTED', 'REQUIREMENT', 'CATALOGUE', 'QUOTATION',
      'NEGOTIATION', 'SAMPLE', 'ORDER', 'PRODUCTION', 'DISPATCH', 'COMPLETED'
    ];

    const funnelData = funnelStages.map(stage => ({
      stage,
      count: leads.filter(l => l.status === stage).length,
    }));

    // ===== SALESPERSON PERFORMANCE =====
    const salespersonStats = {};
    leads.forEach(lead => {
      if (!lead.salesPersonId) return;

      if (!salespersonStats[lead.salesPersonId]) {
        salespersonStats[lead.salesPersonId] = {
          id: lead.salesPersonId,
          name: lead.salesPerson ? `${lead.salesPerson.firstName} ${lead.salesPerson.lastName}` : 'Unknown',
          totalLeads: 0,
          converted: 0,
          revenue: 0,
        };
      }

      salespersonStats[lead.salesPersonId].totalLeads++;

      if (lead.status === 'COMPLETED') {
        salespersonStats[lead.salesPersonId].converted++;
        salespersonStats[lead.salesPersonId].revenue += lead.budget || 0;
      }
    });

    const salespersonPerformance = Object.values(salespersonStats)
      .map(sp => ({
        ...sp,
        conversionRate: sp.totalLeads > 0 ? Math.round((sp.converted / sp.totalLeads) * 100) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // ===== LEAD SOURCE PERFORMANCE =====
    const sourceStats = {};
    leads.forEach(lead => {
      if (!sourceStats[lead.source]) {
        sourceStats[lead.source] = {
          source: lead.source,
          totalLeads: 0,
          converted: 0,
          revenue: 0,
        };
      }

      sourceStats[lead.source].totalLeads++;

      if (lead.status === 'COMPLETED') {
        sourceStats[lead.source].converted++;
        sourceStats[lead.source].revenue += lead.budget || 0;
      }
    });

    const sourcePerformance = Object.values(sourceStats)
      .map(s => ({
        ...s,
        conversionRate: s.totalLeads > 0 ? Math.round((s.converted / s.totalLeads) * 100) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // ===== TOP PRODUCTS BY REVENUE =====
    const productRevenue = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        if (!productRevenue[item.productId]) {
          productRevenue[item.productId] = {
            productId: item.productId,
            productName: item.productName,
            revenue: 0,
            quantity: 0,
            orders: 0,
          };
        }
        productRevenue[item.productId].revenue += item.total;
        productRevenue[item.productId].quantity += item.quantity;
        productRevenue[item.productId].orders++;
      });
    });

    const topProducts = Object.values(productRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // ===== OUTSTANDING PAYMENTS =====
    const outstandingByCustomer = {};
    invoices.forEach(invoice => {
      if (invoice.balanceDue > 0) {
        if (!outstandingByCustomer[invoice.customerId]) {
          outstandingByCustomer[invoice.customerId] = {
            customerId: invoice.customerId,
            customerName: invoice.customer?.companyName || 'Unknown',
            totalDue: 0,
            invoiceCount: 0,
          };
        }
        outstandingByCustomer[invoice.customerId].totalDue += invoice.balanceDue;
        outstandingByCustomer[invoice.customerId].invoiceCount++;
      }
    });

    const topOutstanding = Object.values(outstandingByCustomer)
      .sort((a, b) => b.totalDue - a.totalDue)
      .slice(0, 5);

    // ===== PRODUCTION STATUS =====
    const productionStats = {
      total: productionItems.length,
      material: productionItems.filter(p => p.stage === 'MATERIAL').length,
      cutting: productionItems.filter(p => p.stage === 'CUTTING').length,
      stitching: productionItems.filter(p => p.stage === 'STITCHING').length,
      finishing: productionItems.filter(p => p.stage === 'FINISHING').length,
      qc: productionItems.filter(p => p.stage === 'QC').length,
      packing: productionItems.filter(p => p.stage === 'PACKING').length,
      dispatch: productionItems.filter(p => p.stage === 'DISPATCH').length,
      // Legacy fields for backward compatibility
      pending: productionItems.filter(p => p.stage === 'MATERIAL').length,
      inProgress: productionItems.filter(p => p.stage === 'STITCHING').length,
      packed: productionItems.filter(p => p.stage === 'PACKING').length,
      dispatched: productionItems.filter(p => p.stage === 'DISPATCH').length,
      completed: 0,
    };

    // ===== MARKETING ROI =====
    const marketingStats = {
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter(c => c.status === 'ACTIVE').length,
      totalSpent: campaigns.reduce((sum, c) => sum + c.spent, 0),
      totalLeads: leads.filter(l => l.campaignId).length,
      revenue: leads
        .filter(l => l.campaignId && l.status === 'COMPLETED')
        .reduce((sum, l) => sum + (l.budget || 0), 0),
    };

    if (marketingStats.totalSpent > 0) {
      marketingStats.roi = Math.round(
        ((marketingStats.revenue - marketingStats.totalSpent) / marketingStats.totalSpent) * 100 * 10
      ) / 10;
      marketingStats.cpl = Math.round(
        marketingStats.totalLeads > 0 ? marketingStats.totalSpent / marketingStats.totalLeads : 0
      );
    } else {
      marketingStats.roi = 0;
      marketingStats.cpl = 0;
    }

    // ===== RECENT ACTIVITY =====
    const recentLeads = leads
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(l => ({
        id: l.id,
        companyName: l.companyName,
        status: l.status,
        source: l.source,
        budget: l.budget,
        createdAt: l.createdAt,
      }));

    const recentOrders = orders
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customer?.companyName || 'Unknown',
        total: o.total,
        status: o.status,
        createdAt: o.createdAt,
      }));

    const recentDispatches = dispatches
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(d => ({
        id: d.id,
        dispatchNumber: d.dispatchNumber,
        customerName: d.customerName,
        status: d.status,
        createdAt: d.createdAt,
      }));

    // ===== SUMMARY METRICS =====
    const thisMonthOrders = orders.filter(o => new Date(o.createdAt) >= thisMonthStart);
    const thisWeekOrders = orders.filter(o => new Date(o.createdAt) >= thisWeekStart);
    const lastMonthOrders = orders.filter(
      o => new Date(o.createdAt) >= lastMonthStart && new Date(o.createdAt) <= lastMonthEnd
    );

    const thisMonthRevenue = thisMonthOrders.reduce((sum, o) => sum + o.total, 0);
    const lastMonthRevenue = lastMonthOrders.reduce((sum, o) => sum + o.total, 0);

    const revenueGrowth = lastMonthRevenue > 0
      ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 * 10) / 10
      : 0;

    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const totalOutstanding = invoices.reduce((sum, i) => sum + (i.balanceDue || 0), 0);

    const overallConversionRate = leads.length > 0
      ? Math.round((leads.filter(l => l.status === 'COMPLETED').length / leads.length) * 100 * 10) / 10
      : 0;

    // ===== FOLLOW-UPS & REMINDERS =====
    const followupLeads = leads
      .filter(l => l.followUpDate && l.status !== 'COMPLETED')
      .map(l => {
        const isOverdue = new Date(l.followUpDate) < today;
        const isDueToday = new Date(l.followUpDate).toDateString() === today.toDateString();

        return {
          companyName: l.companyName,
          action: l.status === 'QUOTATION' ? 'Quotation follow-up call' :
                  l.status === 'NEGOTIATION' ? 'Price negotiation' :
                  l.status === 'SAMPLE' ? 'Confirm sample colours' :
                  'Follow-up call',
          date: l.followUpDate,
          isOverdue,
          isDueToday,
          status: l.status,
        };
      })
      .sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        return new Date(a.date) - new Date(b.date);
      });

    const followups = {
      dueToday: followupLeads.filter(f => f.isDueToday).length,
      overdue: followupLeads.filter(f => f.isOverdue).length,
      list: followupLeads.slice(0, 10),
    };

    // ===== RESPONSE =====
    res.json({
      today: {
        leads: todayLeads,
        orders: todayOrders.length,
        revenue: Math.round(todayRevenue),
        dispatches: todayDispatches,
      },
      summary: {
        totalRevenue: Math.round(totalRevenue),
        thisMonthRevenue: Math.round(thisMonthRevenue),
        revenueGrowth,
        totalLeads: leads.length,
        newLeads: leads.filter(l => l.status === 'NEW').length,
        totalOrders: orders.length,
        totalQuotations: quotations.length,
        sentQuotations: quotations.filter(q => q.status !== 'DRAFT').length,
        thisWeekOrders: thisWeekOrders.length,
        pendingOrders: orders.filter(o => o.status === 'PENDING').length,
        totalOutstanding: Math.round(totalOutstanding),
        overallConversionRate,
      },
      revenueTrends,
      funnelData,
      salespersonPerformance,
      sourcePerformance,
      topProducts,
      topOutstanding,
      productionStats,
      marketingStats,
      followups,
      recentActivity: {
        leads: recentLeads,
        orders: recentOrders,
        dispatches: recentDispatches,
      },
    });
  } catch (error) {
    next(error);
  }
};
