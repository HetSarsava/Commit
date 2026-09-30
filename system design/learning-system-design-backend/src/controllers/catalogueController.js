const { prisma } = require('../config/database');

// Get all catalogues
exports.getAllCatalogues = async (req, res, next) => {
  try {
    const { customerId, status } = req.query;

    const where = {};
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;

    const catalogues = await prisma.catalogue.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true,
            mobile: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                category: true,
                basePrice: true,
                image: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(catalogues);
  } catch (error) {
    next(error);
  }
};

// Get single catalogue
exports.getCatalogueById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const catalogue = await prisma.catalogue.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
        analytics: true,
      },
    });

    if (!catalogue) {
      return res.status(404).json({ error: 'Catalogue not found' });
    }

    res.json(catalogue);
  } catch (error) {
    next(error);
  }
};

// Get catalogue by share link
exports.getCatalogueByLink = async (req, res, next) => {
  try {
    const { shareLink } = req.params;

    const catalogue = await prisma.catalogue.findUnique({
      where: { shareLink },
      include: {
        customer: {
          select: {
            companyName: true,
            contactPerson: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!catalogue) {
      return res.status(404).json({ error: 'Catalogue not found' });
    }

    // Record view analytics
    await prisma.catalogueAnalytics.create({
      data: {
        catalogueId: catalogue.id,
        eventType: 'OPEN',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    // Update view count
    await prisma.catalogue.update({
      where: { id: catalogue.id },
      data: {
        viewCount: catalogue.viewCount + 1,
        lastViewedAt: new Date(),
      },
    });

    res.json(catalogue);
  } catch (error) {
    next(error);
  }
};

// Create catalogue
exports.createCatalogue = async (req, res, next) => {
  try {
    const {
      customerId,
      title,
      description,
      products, // Array of { productId, notes }
      validUntil,
      notes,
    } = req.body;

    // Validation
    if (!customerId || !title || !products || products.length === 0) {
      return res.status(400).json({
        error: 'Customer, title, and at least one product are required',
      });
    }

    // Generate unique share link
    const shareLink = `CAT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    // Create catalogue
    const catalogue = await prisma.catalogue.create({
      data: {
        customerId,
        title,
        description: description || null,
        shareLink,
        validUntil: validUntil ? new Date(validUntil) : null,
        notes: notes || null,
        status: 'DRAFT',
        viewCount: 0,
        createdBy: req.user.userId,
      },
    });

    // Create catalogue items
    for (const item of products) {
      await prisma.catalogueItem.create({
        data: {
          catalogueId: catalogue.id,
          productId: item.productId,
          notes: item.notes || null,
        },
      });
    }

    // Fetch complete catalogue with relations
    const completeCatalogue = await prisma.catalogue.findUnique({
      where: { id: catalogue.id },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    res.status(201).json({
      message: 'Catalogue created successfully',
      catalogue: completeCatalogue,
    });
  } catch (error) {
    next(error);
  }
};

// Update catalogue status
exports.updateCatalogueStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['DRAFT', 'SHARED', 'VIEWED', 'EXPIRED', 'CONVERTED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const catalogue = await prisma.catalogue.findUnique({ where: { id } });
    if (!catalogue) {
      return res.status(404).json({ error: 'Catalogue not found' });
    }

    const updated = await prisma.catalogue.update({
      where: { id },
      data: {
        status,
        ...(status === 'SHARED' && { sharedAt: new Date() }),
        updatedAt: new Date(),
      },
    });

    res.json({
      message: 'Catalogue status updated',
      catalogue: updated,
    });
  } catch (error) {
    next(error);
  }
};

// Track product click in catalogue
exports.trackProductClick = async (req, res, next) => {
  try {
    const { catalogueId, productId } = req.body;

    if (!catalogueId || !productId) {
      return res.status(400).json({
        error: 'Catalogue ID and Product ID are required',
      });
    }

    // Record click analytics
    await prisma.catalogueAnalytics.create({
      data: {
        catalogueId,
        eventType: 'PRODUCT_CLICK',
        productId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    res.json({ message: 'Click tracked successfully' });
  } catch (error) {
    next(error);
  }
};

// Track enquiry click in catalogue
exports.trackEnquiryClick = async (req, res, next) => {
  try {
    const { catalogueId } = req.body;

    if (!catalogueId) {
      return res.status(400).json({
        error: 'Catalogue ID is required',
      });
    }

    // Record enquiry analytics
    await prisma.catalogueAnalytics.create({
      data: {
        catalogueId,
        eventType: 'ENQUIRY_CLICK',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    res.json({ message: 'Enquiry click tracked successfully' });
  } catch (error) {
    next(error);
  }
};

// Get catalogue analytics
exports.getCatalogueAnalytics = async (req, res, next) => {
  try {
    const { id } = req.params;

    const catalogue = await prisma.catalogue.findUnique({
      where: { id },
    });

    if (!catalogue) {
      return res.status(404).json({ error: 'Catalogue not found' });
    }

    // Get all analytics events
    const analytics = await prisma.catalogueAnalytics.findMany({
      where: { catalogueId: id },
      orderBy: { timestamp: 'desc' },
    });

    // Calculate summary
    const summary = {
      totalOpens: analytics.filter(a => a.eventType === 'OPEN').length,
      totalProductClicks: analytics.filter(a => a.eventType === 'PRODUCT_CLICK').length,
      totalEnquiryClicks: analytics.filter(a => a.eventType === 'ENQUIRY_CLICK').length,
      uniqueVisitors: [...new Set(analytics.map(a => a.ipAddress))].length,
      lastViewedAt: catalogue.lastViewedAt,
      productClickBreakdown: {},
    };

    // Product-wise click breakdown
    analytics
      .filter(a => a.eventType === 'PRODUCT_CLICK' && a.productId)
      .forEach(a => {
        if (!summary.productClickBreakdown[a.productId]) {
          summary.productClickBreakdown[a.productId] = 0;
        }
        summary.productClickBreakdown[a.productId]++;
      });

    res.json({
      summary,
      events: analytics,
    });
  } catch (error) {
    next(error);
  }
};

// Delete catalogue
exports.deleteCatalogue = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.catalogue.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Catalogue not found' });
    }

    await prisma.catalogue.delete({ where: { id } });

    res.json({ message: 'Catalogue deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Get catalogue summary
exports.getCatalogueSummary = async (req, res, next) => {
  try {
    const catalogues = await prisma.catalogue.findMany({});

    const summary = {
      totalCatalogues: catalogues.length,
      totalViews: catalogues.reduce((sum, c) => sum + c.viewCount, 0),
      byStatus: {},
    };

    // Count by status
    catalogues.forEach(c => {
      if (!summary.byStatus[c.status]) {
        summary.byStatus[c.status] = {
          count: 0,
          views: 0,
        };
      }
      summary.byStatus[c.status].count += 1;
      summary.byStatus[c.status].views += c.viewCount;
    });

    res.json(summary);
  } catch (error) {
    next(error);
  }
};
