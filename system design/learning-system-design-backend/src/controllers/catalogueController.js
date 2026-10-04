const { prisma } = require('../config/database');
const { getCompany } = require('../services/companyProfile');
const { cataloguePdf } = require('../services/cataloguePdf');
const effectiveStatus = c => c.validUntil && new Date(c.validUntil) < new Date() ? 'EXPIRED' : c.status;
exports.getContacts = async (req, res, next) => {
  try {
    const customers = await prisma.customer.findMany({});
    const leads = process.env.USE_MOCK_DB !== 'false' ? await prisma.lead.findMany({}) : [];
    res.json([...customers, ...leads].map(contact => ({ id: contact.id, companyName: contact.companyName, contactPerson: contact.contactPerson })));
  } catch (error) { next(error); }
};
exports.generatePdf = async (req, res, next) => {
  try {
    const ids = req.body.productIds;
    if (!Array.isArray(ids) || !ids.length || ids.length > 100 || ids.some(id => typeof id !== 'string' || id.length > 128)) return res.status(400).json({ error: 'Choose between 1 and 100 products.' });
    const products = await Promise.all([...new Set(ids)].map(id => prisma.product.findUnique({ where: { id } })));
    if (products.some(p => !p)) return res.status(404).json({ error: 'A selected product is no longer available.' });
    const pdf = await cataloguePdf(await getCompany(prisma), products);
    res.type('application/pdf').set('Content-Disposition', 'attachment; filename="product-catalogue.pdf"').send(pdf);
  } catch (error) { next(error); }
};

// Get all catalogues
exports.getAllCatalogues = async (req, res, next) => {
  try {
    const { customerId, status } = req.query;

    const where = {};
    if (customerId) where.customerId = customerId;


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

    res.json(catalogues.map(c=>({...c,status:effectiveStatus(c)})).filter(c=>!status || c.status===status));
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

    if (catalogue.status === "EXPIRED" || (catalogue.validUntil && new Date(catalogue.validUntil) < new Date())) return res.status(410).json({ error: "This catalogue has expired." });

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
        viewCount: {increment:1},
        ...(catalogue.status === 'SHARED' && {status:'VIEWED'}),
        lastViewedAt: new Date(),
      },
    });

    res.json({ title: catalogue.title, description: catalogue.description, companyName: (await getCompany(prisma)).name, companyEmail:(await getCompany(prisma)).email, items: catalogue.items.map(item => ({ id: item.id, product: { id:item.productId, name: item.product?.name, sku: item.product?.sku, basePrice: item.product?.basePrice } })) });
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
    if (typeof customerId !== 'string' || typeof title !== 'string' || !title.trim() || title.length > 200 || !Array.isArray(products) || products.length === 0 || products.length > 100) {
      return res.status(400).json({
        error: 'Customer, title, and at least one product are required',
      });
    }

    if ([description,notes].some(value=>value !== undefined && value !== null && (typeof value !== 'string' || value.length>10000))) return res.status(400).json({error:'Description and notes must be text, up to 10,000 characters'});
    if (!await prisma.customer.findUnique({ where: { id: customerId } })) return res.status(400).json({ error: 'Choose an existing customer.' });
    for (const item of products) {
      if (!item || typeof item.productId !== 'string' || !await prisma.product.findUnique({ where: { id: item.productId } })) return res.status(400).json({ error: 'Choose valid products for the catalogue.' });
    }
    if (new Set(products.map(item=>item.productId)).size !== products.length) return res.status(400).json({error:'Each product can appear only once.'});
    if (validUntil && (!Number.isFinite(new Date(validUntil).getTime()) || new Date(validUntil+'T23:59:59') < new Date())) return res.status(400).json({ error: 'Choose a valid expiry date.' });

    // Generate unique share link
    const shareLink = `CAT-${require('node:crypto').randomUUID()}`;

    // Create catalogue
    const catalogue = await prisma.catalogue.create({
      data: {
        customerId,
        title,
        description: description || null,
        shareLink,
        validUntil: validUntil ? new Date(validUntil + 'T23:59:59.999') : null,
        notes: notes || null,
        status: 'DRAFT',
        viewCount: 0,
        createdBy: req.user.id,
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
    const { shareLink, productId } = req.body;
    const catalogue = await prisma.catalogue.findUnique({where:{shareLink},include:{items:true}});
    if (!catalogue || catalogue.status === 'EXPIRED' || (catalogue.validUntil && new Date(catalogue.validUntil) < new Date())) return res.status(404).json({error:'Catalogue unavailable'});
    const catalogueId = catalogue.id;
    if (!catalogue.items.some(item=>item.productId === productId)) return res.status(400).json({error:'Product is not in this catalogue'});

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
    const catalogue = await prisma.catalogue.findUnique({where:{shareLink:req.body.shareLink}});
    if (!catalogue || catalogue.status === 'EXPIRED' || (catalogue.validUntil && new Date(catalogue.validUntil) < new Date())) return res.status(404).json({error:'Catalogue unavailable'});
    const catalogueId=catalogue.id;

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
    const catalogues = (await prisma.catalogue.findMany({})).map(c=>({...c,status:effectiveStatus(c)}));

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

exports.updateCatalogue = async (req,res,next) => {
 try {
  const catalogue=await prisma.catalogue.findUnique({where:{id:req.params.id}});
  if(!catalogue) return res.status(404).json({error:'Catalogue not found'});
  if(catalogue.status !== 'DRAFT') return res.status(409).json({error:'Only draft catalogues can be edited. Create a new catalogue for changes after sharing.'});
  const {title,customerId,products,description,notes,validUntil}=req.body;
  if(typeof title!=='string'||!title.trim()||title.length>200||!Array.isArray(products)||!products.length||products.length>100||!await prisma.customer.findUnique({where:{id:customerId}})) return res.status(400).json({error:'Choose a customer, title and products'});
  if(new Set(products.map(p=>p?.productId)).size!==products.length) return res.status(400).json({error:'Each product can appear only once'});
  for(const p of products) if(!p||typeof p.productId!=='string'||!await prisma.product.findUnique({where:{id:p.productId}})) return res.status(400).json({error:'Choose valid products'});
  if(validUntil && (!Number.isFinite(new Date(validUntil).getTime())||new Date(validUntil+'T23:59:59') < new Date())) return res.status(400).json({error:'Choose a future expiry date'});
  const updated=await prisma.catalogue.update({where:{id:catalogue.id},data:{title:title.trim(),customerId,description:description||'',notes:notes||'',validUntil:validUntil?new Date(validUntil + 'T23:59:59.999'):null,items:{deleteMany:{},create:products.map(p=>({productId:p.productId,notes:p.notes||''}))}}});
  res.json({catalogue:updated});
 }catch(e){next(e);}
};
