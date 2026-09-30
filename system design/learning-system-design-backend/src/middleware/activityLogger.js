const { prisma } = require('../config/database');

/**
 * Activity Logger Middleware
 * Logs user activities for audit trail
 */

// Helper function to create activity log
const createActivityLog = async ({
  userId,
  action,
  entityType,
  entityId,
  entityName,
  changes = null,
  metadata = null,
  ipAddress = null,
}) => {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        entityName,
        changes,
        metadata,
        ipAddress,
        createdAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Failed to create activity log:', error);
    // Don't throw error - logging failure shouldn't break the main operation
  }
};

/**
 * Log activity with manual call
 * Usage: await logActivity(req, 'CREATE', 'LEAD', lead.id, lead.companyName, { newData: lead })
 */
const logActivity = async (req, action, entityType, entityId, entityName, changes = null) => {
  if (!req.user) return; // No user context, skip logging

  const ipAddress = req.ip || req.connection?.remoteAddress || null;

  await createActivityLog({
    userId: req.user.userId || req.user.id,
    action,
    entityType,
    entityId,
    entityName,
    changes,
    ipAddress,
  });
};

/**
 * Middleware to automatically log activities
 * Attach this after operations complete
 */
const activityLogger = (action, entityType) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to log after successful response
    res.json = function (data) {
      // Only log on successful operations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Extract entity info from response data
        let entityId = null;
        let entityName = null;

        // Try to extract entity info from different response structures
        if (data.id) {
          entityId = data.id;
          entityName = data.name || data.companyName || data.productName || data.quotationNumber || data.orderNumber || data.invoiceNumber || null;
        } else if (data.lead) {
          entityId = data.lead.id;
          entityName = data.lead.companyName;
        } else if (data.product) {
          entityId = data.product.id;
          entityName = data.product.name;
        } else if (data.quotation) {
          entityId = data.quotation.id;
          entityName = data.quotation.quotationNumber;
        } else if (data.order) {
          entityId = data.order.id;
          entityName = data.order.orderNumber;
        } else if (data.invoice) {
          entityId = data.invoice.id;
          entityName = data.invoice.invoiceNumber;
        } else if (data.payment) {
          entityId = data.payment.id;
          entityName = data.payment.referenceNumber;
        } else if (data.user) {
          entityId = data.user.id;
          entityName = `${data.user.firstName} ${data.user.lastName}`;
        }

        // Log the activity asynchronously (don't wait)
        if (req.user && entityId) {
          logActivity(req, action, entityType, entityId, entityName, { response: data })
            .catch(err => console.error('Activity logging error:', err));
        }
      }

      // Call original json method
      return originalJson(data);
    };

    next();
  };
};

module.exports = {
  logActivity,
  activityLogger,
};
