const { prisma } = require('../config/database');
const { exportToExcel, exportToCSV, exportToPDF, formatDataForExport, cleanDataForExport } = require('../utils/exportUtils');

// Sales Report
exports.getSalesReport = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1)); // First day of month
    const end = endDate ? new Date(endDate) : new Date();

    // Get all orders in date range
    const orders = await prisma.order.findMany({
      where: {},
      include: {
        customer: true,
        items: {
          include: { product: true },
        },
      },
    });

    const filteredOrders = orders.filter(
      (o) => new Date(o.createdAt) >= start && new Date(o.createdAt) <= end
    );

    // Calculate totals
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = filteredOrders.length;
    const totalQuantity = filteredOrders.reduce(
      (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0),
      0
    );

    // Group by date
    const salesByDate = {};
    filteredOrders.forEach((order) => {
      const date = new Date(order.createdAt);
      let key;

      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (groupBy === 'month') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else if (groupBy === 'year') {
        key = date.getFullYear().toString();
      }

      if (!salesByDate[key]) {
        salesByDate[key] = {
          date: key,
          revenue: 0,
          orders: 0,
          quantity: 0,
        };
      }

      salesByDate[key].revenue += order.total;
      salesByDate[key].orders += 1;
      salesByDate[key].quantity += order.items.reduce((s, i) => s + i.quantity, 0);
    });

    res.json({
      summary: {
        startDate: start,
        endDate: end,
        totalRevenue,
        totalOrders,
        totalQuantity,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      },
      salesByDate: Object.values(salesByDate).sort((a, b) => a.date.localeCompare(b.date)),
      orders: filteredOrders.map((o) => ({
        orderNumber: o.orderNumber,
        date: o.createdAt,
        customer: o.customer?.companyName,
        status: o.status,
        items: o.items.length,
        subtotal: o.subtotal,
        tax: o.taxAmount,
        total: o.total,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// Product Performance Report
exports.getProductReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 3));
    const end = endDate ? new Date(endDate) : new Date();

    const orders = await prisma.order.findMany({
      where: {},
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    const filteredOrders = orders.filter(
      (o) => new Date(o.createdAt) >= start && new Date(o.createdAt) <= end
    );

    // Aggregate by product
    const productStats = {};

    filteredOrders.forEach((order) => {
      order.items.forEach((item) => {
        const productId = item.productId;

        if (!productStats[productId]) {
          productStats[productId] = {
            productId,
            productName: item.product?.name,
            sku: item.product?.sku,
            category: item.product?.category,
            totalQuantity: 0,
            totalRevenue: 0,
            orderCount: 0,
            averagePrice: 0,
          };
        }

        productStats[productId].totalQuantity += item.quantity;
        productStats[productId].totalRevenue += item.total;
        productStats[productId].orderCount += 1;
      });
    });

    // Calculate averages
    Object.values(productStats).forEach((stat) => {
      stat.averagePrice = stat.totalRevenue / stat.totalQuantity;
    });

    const products = Object.values(productStats).sort((a, b) => b.totalRevenue - a.totalRevenue);

    res.json({
      summary: {
        startDate: start,
        endDate: end,
        totalProducts: products.length,
        totalRevenue: products.reduce((sum, p) => sum + p.totalRevenue, 0),
        totalQuantitySold: products.reduce((sum, p) => sum + p.totalQuantity, 0),
      },
      products,
    });
  } catch (error) {
    next(error);
  }
};

// Customer Report
exports.getCustomerReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 6));
    const end = endDate ? new Date(endDate) : new Date();

    const orders = await prisma.order.findMany({
      where: {},
      include: { customer: true },
    });

    const invoices = await prisma.invoice.findMany({
      where: {},
      include: { customer: true },
    });

    const filteredOrders = orders.filter(
      (o) => new Date(o.createdAt) >= start && new Date(o.createdAt) <= end
    );

    // Aggregate by customer
    const customerStats = {};

    filteredOrders.forEach((order) => {
      const customerId = order.customerId;

      if (!customerStats[customerId]) {
        customerStats[customerId] = {
          customerId,
          customerName: order.customer?.companyName || order.customer?.contactPerson,
          contactPerson: order.customer?.contactPerson,
          city: order.customer?.city,
          totalOrders: 0,
          totalRevenue: 0,
          lastOrderDate: null,
          averageOrderValue: 0,
          outstandingAmount: 0,
        };
      }

      customerStats[customerId].totalOrders += 1;
      customerStats[customerId].totalRevenue += order.total;

      if (
        !customerStats[customerId].lastOrderDate ||
        new Date(order.createdAt) > new Date(customerStats[customerId].lastOrderDate)
      ) {
        customerStats[customerId].lastOrderDate = order.createdAt;
      }
    });

    // Calculate outstanding amounts
    invoices.forEach((invoice) => {
      if (customerStats[invoice.customerId]) {
        customerStats[invoice.customerId].outstandingAmount += invoice.balanceDue || 0;
      }
    });

    // Calculate averages
    Object.values(customerStats).forEach((stat) => {
      stat.averageOrderValue = stat.totalRevenue / stat.totalOrders;
    });

    const customers = Object.values(customerStats).sort((a, b) => b.totalRevenue - a.totalRevenue);

    res.json({
      summary: {
        startDate: start,
        endDate: end,
        totalCustomers: customers.length,
        totalRevenue: customers.reduce((sum, c) => sum + c.totalRevenue, 0),
        totalOutstanding: customers.reduce((sum, c) => sum + c.outstandingAmount, 0),
      },
      customers,
    });
  } catch (error) {
    next(error);
  }
};

// GST Report
exports.getGSTReport = async (req, res, next) => {
  try {
    const { month, year } = req.query;

    const selectedMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const selectedYear = year ? parseInt(year) : new Date().getFullYear();

    const startDate = new Date(selectedYear, selectedMonth - 1, 1);
    const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);

    const invoices = await prisma.invoice.findMany({
      where: {},
      include: {
        customer: true,
        items: {
          include: { product: true },
        },
      },
    });

    const filteredInvoices = invoices.filter(
      (inv) =>
        new Date(inv.invoiceDate) >= startDate && new Date(inv.invoiceDate) <= endDate
    );

    // Calculate GST summary
    const totalTaxableValue = filteredInvoices.reduce((sum, inv) => sum + (inv.subtotal - inv.discountAmount), 0);
    const totalCGST = filteredInvoices.reduce((sum, inv) => sum + inv.cgst, 0);
    const totalSGST = filteredInvoices.reduce((sum, inv) => sum + inv.sgst, 0);
    const totalIGST = filteredInvoices.reduce((sum, inv) => sum + inv.igst, 0);
    const totalInvoiceValue = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);

    // Group by tax rate (assuming 18% GST)
    const gstByRate = {
      '18%': {
        taxableValue: totalTaxableValue,
        cgst: totalCGST,
        sgst: totalSGST,
        igst: totalIGST,
        totalTax: totalCGST + totalSGST + totalIGST,
      },
    };

    // GSTR-1 format data
    const gstr1Data = filteredInvoices.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      customerName: inv.customer?.companyName,
      gstin: inv.customer?.gstin || 'N/A',
      placeOfSupply: inv.customer?.state || 'Gujarat',
      taxableValue: inv.subtotal - inv.discountAmount,
      cgst: inv.cgst,
      sgst: inv.sgst,
      igst: inv.igst,
      invoiceValue: inv.total,
    }));

    res.json({
      summary: {
        month: selectedMonth,
        year: selectedYear,
        period: `${startDate.toLocaleDateString('en-IN')} to ${endDate.toLocaleDateString('en-IN')}`,
        totalInvoices: filteredInvoices.length,
        totalTaxableValue,
        totalCGST,
        totalSGST,
        totalIGST,
        totalTax: totalCGST + totalSGST + totalIGST,
        totalInvoiceValue,
      },
      gstByRate,
      gstr1Data,
    });
  } catch (error) {
    next(error);
  }
};

// Payment Collection Report
exports.getPaymentReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();

    const payments = await prisma.payment.findMany({
      where: {},
      include: {
        invoice: true,
        customer: true,
      },
    });

    const invoices = await prisma.invoice.findMany({
      where: {},
      include: { customer: true },
    });

    const filteredPayments = payments.filter(
      (p) => new Date(p.paymentDate) >= start && new Date(p.paymentDate) <= end
    );

    // Calculate totals
    const totalCollected = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.balanceDue, 0);

    // Group by payment method
    const byMethod = {};
    filteredPayments.forEach((payment) => {
      if (!byMethod[payment.method]) {
        byMethod[payment.method] = {
          method: payment.method,
          count: 0,
          amount: 0,
        };
      }
      byMethod[payment.method].count += 1;
      byMethod[payment.method].amount += payment.amount;
    });

    // Outstanding by customer
    const outstandingByCustomer = invoices
      .filter((inv) => inv.balanceDue > 0)
      .map((inv) => ({
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customer?.companyName,
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        total: inv.total,
        paid: inv.amountPaid,
        outstanding: inv.balanceDue,
        status: inv.status,
        daysOverdue:
          new Date(inv.dueDate) < new Date()
            ? Math.floor((new Date() - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24))
            : 0,
      }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    res.json({
      summary: {
        startDate: start,
        endDate: end,
        totalCollected,
        totalPayments: filteredPayments.length,
        totalOutstanding,
        collectionEfficiency: totalOutstanding > 0 ? (totalCollected / (totalCollected + totalOutstanding)) * 100 : 100,
      },
      byMethod: Object.values(byMethod),
      payments: filteredPayments.map((p) => ({
        referenceNumber: p.referenceNumber,
        date: p.paymentDate,
        customer: p.customer?.companyName,
        invoiceNumber: p.invoice?.invoiceNumber,
        amount: p.amount,
        method: p.method,
        transactionId: p.transactionId,
      })),
      outstandingByCustomer,
    });
  } catch (error) {
    next(error);
  }
};

// ==================== EXPORT FUNCTIONS ====================

/**
 * Export Sales Report
 */
exports.exportSalesReport = async (req, res, next) => {
  try {
    const { format = 'excel', startDate, endDate } = req.query;

    // Get sales report data
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();

    const orders = await prisma.order.findMany({
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    });

    const filteredOrders = orders.filter(
      (o) => new Date(o.createdAt) >= start && new Date(o.createdAt) <= end
    );

    // Prepare export data
    const exportData = filteredOrders.map(order => ({
      'Order Number': order.orderNumber,
      'Date': new Date(order.createdAt).toLocaleDateString(),
      'Customer': order.customer?.companyName || 'N/A',
      'Status': order.status,
      'Items': order.items.length,
      'Subtotal': order.subtotal,
      'Tax': order.taxAmount,
      'Discount': order.discountAmount,
      'Total': order.total,
      'Payment Status': order.balanceAmount > 0 ? 'Pending' : 'Paid',
    }));

    const filename = `Sales_Report_${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}`;

    // Export based on format
    let buffer, contentType, fileExtension;

    if (format === 'excel') {
      buffer = await exportToExcel(exportData, filename, 'Sales Report');
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      fileExtension = 'xlsx';
    } else if (format === 'csv') {
      buffer = await exportToCSV(exportData, filename);
      contentType = 'text/csv';
      fileExtension = 'csv';
    } else if (format === 'pdf') {
      buffer = await exportToPDF(exportData, 'Sales Report', filename);
      contentType = 'application/pdf';
      fileExtension = 'pdf';
    } else {
      return res.status(400).json({ error: 'Invalid format. Use excel, csv, or pdf.' });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.${fileExtension}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Export Leads Report
 */
exports.exportLeadsReport = async (req, res, next) => {
  try {
    const { format = 'excel', status, source } = req.query;

    let leads = await prisma.lead.findMany({
      include: { salesPerson: true },
    });

    if (status) leads = leads.filter(l => l.status === status);
    if (source) leads = leads.filter(l => l.source === source);

    const exportData = leads.map(lead => ({
      'Company': lead.companyName,
      'Contact Person': lead.contactPerson,
      'Mobile': lead.mobile,
      'Email': lead.email,
      'City': lead.city,
      'State': lead.state,
      'Industry': lead.industry,
      'Source': lead.source,
      'Status': lead.status,
      'Priority': lead.priority,
      'Budget': lead.budget || 0,
      'Quantity': lead.quantity || 0,
      'Salesperson': lead.salesPerson ? `${lead.salesPerson.firstName} ${lead.salesPerson.lastName}` : 'N/A',
      'Created Date': new Date(lead.createdAt).toLocaleDateString(),
      'Follow-up Date': lead.followUpDate ? new Date(lead.followUpDate).toLocaleDateString() : 'N/A',
    }));

    const filename = `Leads_Report_${new Date().toISOString().split('T')[0]}`;

    let buffer, contentType, fileExtension;

    if (format === 'excel') {
      buffer = await exportToExcel(exportData, filename, 'Leads Report');
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      fileExtension = 'xlsx';
    } else if (format === 'csv') {
      buffer = await exportToCSV(exportData, filename);
      contentType = 'text/csv';
      fileExtension = 'csv';
    } else if (format === 'pdf') {
      buffer = await exportToPDF(exportData, 'Leads Report', filename);
      contentType = 'application/pdf';
      fileExtension = 'pdf';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.${fileExtension}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Export Inventory Report
 */
exports.exportInventoryReport = async (req, res, next) => {
  try {
    const { format = 'excel' } = req.query;

    const materials = await prisma.material.findMany({
      include: {
        category: true,
      },
    });

    const exportData = materials.map(material => ({
      'Material Name': material.name,
      'SKU': material.sku,
      'Category': material.category?.name || 'N/A',
      'Unit': material.unit,
      'Current Stock': material.currentStock,
      'Reserved': material.reservedStock,
      'Available': material.currentStock - material.reservedStock,
      'Minimum Stock': material.minimumStock,
      'Status': material.currentStock <= material.minimumStock ? 'LOW STOCK' : 'OK',
      'Unit Price': material.unitPrice,
      'Stock Value': material.currentStock * material.unitPrice,
    }));

    const filename = `Inventory_Report_${new Date().toISOString().split('T')[0]}`;

    let buffer, contentType, fileExtension;

    if (format === 'excel') {
      buffer = await exportToExcel(exportData, filename, 'Inventory Report');
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      fileExtension = 'xlsx';
    } else if (format === 'csv') {
      buffer = await exportToCSV(exportData, filename);
      contentType = 'text/csv';
      fileExtension = 'csv';
    } else if (format === 'pdf') {
      buffer = await exportToPDF(exportData, 'Inventory Report', filename);
      contentType = 'application/pdf';
      fileExtension = 'pdf';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.${fileExtension}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Export Production Report
 */
exports.exportProductionReport = async (req, res, next) => {
  try {
    const { format = 'excel' } = req.query;

    const productionItems = await prisma.productionTracking.findMany({
      include: {
        orderItem: {
          include: {
            product: true,
            order: {
              include: { customer: true },
            },
          },
        },
        assignedWorker: true,
      },
    });

    const exportData = productionItems.map(item => ({
      'Order Number': item.orderItem?.order?.orderNumber || 'N/A',
      'Customer': item.orderItem?.order?.customer?.companyName || 'N/A',
      'Product': item.orderItem?.product?.name || 'N/A',
      'Quantity': item.orderItem?.quantity || 0,
      'Stage': item.stage,
      'Assigned Worker': item.assignedWorker ? `${item.assignedWorker.firstName} ${item.assignedWorker.lastName}` : 'Unassigned',
      'Started Date': new Date(item.startedAt).toLocaleDateString(),
      'Expected Completion': item.estimatedCompletion ? new Date(item.estimatedCompletion).toLocaleDateString() : 'N/A',
      'Notes': item.notes || '',
    }));

    const filename = `Production_Report_${new Date().toISOString().split('T')[0]}`;

    let buffer, contentType, fileExtension;

    if (format === 'excel') {
      buffer = await exportToExcel(exportData, filename, 'Production Report');
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      fileExtension = 'xlsx';
    } else if (format === 'csv') {
      buffer = await exportToCSV(exportData, filename);
      contentType = 'text/csv';
      fileExtension = 'csv';
    } else if (format === 'pdf') {
      buffer = await exportToPDF(exportData, 'Production Report', filename);
      contentType = 'application/pdf';
      fileExtension = 'pdf';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.${fileExtension}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Export Marketing Report
 */
exports.exportMarketingReport = async (req, res, next) => {
  try {
    const { format = 'excel' } = req.query;

    const campaigns = await prisma.campaign.findMany({
      include: {
        createdByUser: true,
      },
    });

    const leads = await prisma.lead.findMany({});

    const exportData = campaigns.map(campaign => {
      const campaignLeads = leads.filter(l => l.campaignId === campaign.id);
      const convertedLeads = campaignLeads.filter(l => l.status === 'COMPLETED');
      const revenue = convertedLeads.reduce((sum, l) => sum + (l.budget || 0), 0);
      const roi = campaign.spent > 0 ? ((revenue - campaign.spent) / campaign.spent) * 100 : 0;
      const cpl = campaignLeads.length > 0 ? campaign.spent / campaignLeads.length : 0;

      return {
        'Campaign Code': campaign.campaignCode,
        'Name': campaign.name,
        'Platform': campaign.platform,
        'Status': campaign.status,
        'Budget': campaign.budget,
        'Spent': campaign.spent,
        'Leads': campaignLeads.length,
        'Converted': convertedLeads.length,
        'Revenue': revenue,
        'ROI %': roi.toFixed(2),
        'CPL': cpl.toFixed(2),
        'Start Date': new Date(campaign.startDate).toLocaleDateString(),
        'End Date': campaign.endDate ? new Date(campaign.endDate).toLocaleDateString() : 'Ongoing',
      };
    });

    const filename = `Marketing_Report_${new Date().toISOString().split('T')[0]}`;

    let buffer, contentType, fileExtension;

    if (format === 'excel') {
      buffer = await exportToExcel(exportData, filename, 'Marketing Report');
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      fileExtension = 'xlsx';
    } else if (format === 'csv') {
      buffer = await exportToCSV(exportData, filename);
      contentType = 'text/csv';
      fileExtension = 'csv';
    } else if (format === 'pdf') {
      buffer = await exportToPDF(exportData, 'Marketing Report', filename);
      contentType = 'application/pdf';
      fileExtension = 'pdf';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.${fileExtension}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};
