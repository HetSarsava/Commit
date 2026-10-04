const { prisma } = require('../config/database');

// Get all products
exports.getProducts = async (req, res, next) => {
  try {
    const {
      category,
      isActive,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    // Build filters
    const where = {};

    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    // Search across multiple fields
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Get products with pagination
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take,
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      products,
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

// Get single product
exports.getProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ product });
  } catch (error) {
    next(error);
  }
};

// Create product
exports.createProduct = async (req, res, next) => {
  try {


    const {
      sku,
      name,
      description,
      category,
      fabric,
      colors,
      sizes,
      moq,
      basePrice,
      stockQuantity,
      lowStockAlert,
      customizable,
      customizationOptions,
      thumbnail,
      images,
      isActive,
    } = req.body;

    // Validate required fields
    if (typeof sku !== "string" || !sku.trim()) {
      return res.status(400).json({ error: 'SKU is required' });
    }
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: 'Product name is required' });
    }
    if (!Number.isInteger(Number(moq)) || Number(moq) <= 0) {
      return res.status(400).json({ error: 'MOQ must be greater than 0' });
    }
    if (!Number.isFinite(Number(basePrice)) || Number(basePrice) <= 0) {
      return res.status(400).json({ error: 'Price must be greater than 0' });
    }

    // Check if SKU already exists
    const existingProduct = await prisma.product.findUnique({
      where: { sku:sku.trim() },
    });

    if (existingProduct) {
      return res.status(400).json({ error: 'SKU already exists' });
    }

    // Ensure arrays are properly formatted
    const colorsArray = Array.isArray(colors) ? colors : [];
    const sizesArray = Array.isArray(sizes) ? sizes : [];
    const imagesArray = Array.isArray(images) ? images : [];

    // Create product
    const product = await prisma.product.create({
      data: {
        sku: sku.trim(),
        name: name.trim(),
        description: description || '',
        category,
        fabric: fabric || '',
        colors: colorsArray,
        sizes: sizesArray,
        moq: parseInt(moq),
        basePrice: parseFloat(basePrice),
        stockQuantity: parseInt(stockQuantity) || 0,
        lowStockAlert: parseInt(lowStockAlert) || 10,
        customizable: customizable || false,
        customizationOptions: customizationOptions || '',
        thumbnail: thumbnail || '',
        images: imagesArray,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    res.status(201).json({
      message: 'Product created successfully',
      product,
    });
  } catch (error) {
    console.error('Create product error:', error);
    next(error);
  }
};

// Update product
exports.updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // If SKU is being changed, check for duplicates
    if (updateData.sku && updateData.sku !== existingProduct.sku) {
      const skuExists = await prisma.product.findUnique({
        where: { sku: updateData.sku },
      });

      if (skuExists) {
        return res.status(400).json({ error: 'SKU already exists' });
      }
    }

    // Convert numeric fields
    if (updateData.moq) updateData.moq = parseInt(updateData.moq);
    if (updateData.basePrice) updateData.basePrice = parseFloat(updateData.basePrice);
    if (updateData.stockQuantity !== undefined) updateData.stockQuantity = parseInt(updateData.stockQuantity);
    if (updateData.lowStockAlert) updateData.lowStockAlert = parseInt(updateData.lowStockAlert);

    // Update product
    const product = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    res.json({
      message: 'Product updated successfully',
      product,
    });
  } catch (error) {
    next(error);
  }
};

// Delete product
exports.deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Only admin can delete
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can delete products' });
    }

    await prisma.product.delete({
      where: { id },
    });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Get product statistics
exports.getProductStats = async (req, res, next) => {
  try {
    const [
      totalProducts,
      activeProducts,
      lowStockProducts,
      byCategory,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({
        where: {
          stockQuantity: { lte: prisma.product.fields.lowStockAlert },
        },
      }),
      prisma.product.groupBy({
        by: ['category'],
        _count: true,
      }),
    ]);

    res.json({
      totalProducts,
      activeProducts,
      lowStockProducts,
      byCategory,
    });
  } catch (error) {
    next(error);
  }
};
