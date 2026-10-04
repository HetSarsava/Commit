const { prisma } = require('../config/database');

// Get all activity logs with filters
exports.getAllLogs = async (req, res, next) => {
  try {
    const {
      userId,
      entityType,
      action,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = req.query;

    const where = {};
    if (!Number.isInteger(Number(limit)) || Number(limit)<1 || Number(limit)>200 || !Number.isInteger(Number(offset)) || Number(offset)<0) return res.status(400).json({error:'Invalid page size'});
    if (startDate || endDate) {
      where.createdAt={};
      if(startDate) where.createdAt.gte=new Date(startDate);
      if(endDate) where.createdAt.lte=new Date(endDate+'T23:59:59.999');
      if(Object.values(where.createdAt).some(date=>!Number.isFinite(date.getTime()))) return res.status(400).json({error:'Invalid date filter'});
    }

    // Apply filters
    if (userId) where.userId = userId;
    if (entityType) where.entityType = entityType;
    if (action) where.action = action;

    const logs = await prisma.activityLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    const filteredLogs = logs;

    const total = await prisma.activityLog.count({ where });

    res.json({
      logs: filteredLogs,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + parseInt(limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get logs for a specific entity
exports.getEntityLogs = async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params;

    const logs = await prisma.activityLog.findMany({
      where: {
        entityType,
        entityId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ logs });
  } catch (error) {
    next(error);
  }
};

// Get activity logs for a specific user
exports.getUserActivity = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const logs = await prisma.activityLog.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    const total = await prisma.activityLog.count({ where: { userId } });

    res.json({
      logs,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + parseInt(limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get activity statistics
exports.getActivityStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};

    const logs = await prisma.activityLog.findMany({ where });

    // Filter by date if provided
    let filteredLogs = logs;
    if (startDate || endDate) {
      filteredLogs = logs.filter((log) => {
        const logDate = new Date(log.createdAt);
        if (startDate && logDate < new Date(startDate)) return false;
        if (endDate && logDate > new Date(endDate)) return false;
        return true;
      });
    }

    // Calculate statistics
    const stats = {
      totalActivities: filteredLogs.length,
      byAction: {},
      byEntityType: {},
      byUser: {},
      recentActivity: [],
    };

    // Group by action
    filteredLogs.forEach((log) => {
      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
      stats.byEntityType[log.entityType] = (stats.byEntityType[log.entityType] || 0) + 1;

      if (!stats.byUser[log.userId]) {
        stats.byUser[log.userId] = {
          userId: log.userId,
          count: 0,
        };
      }
      stats.byUser[log.userId].count++;
    });

    // Get recent activity (last 10)
    stats.recentActivity = filteredLogs.slice(0, 10);

    res.json(stats);
  } catch (error) {
    next(error);
  }
};

// Delete old logs (cleanup, admin only)
exports.deleteOldLogs = async (req, res, next) => {
  try {
    const { days } = req.query;

    if (!days || parseInt(days) < 30) {
      return res.status(400).json({
        error: 'Days parameter required and must be at least 30',
      });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const logs = await prisma.activityLog.findMany({});
    const toDelete = logs.filter((log) => new Date(log.createdAt) < cutoffDate);

    for (const log of toDelete) {
      await prisma.activityLog.delete({ where: { id: log.id } });
    }

    res.json({
      message: `Deleted ${toDelete.length} logs older than ${days} days`,
      deletedCount: toDelete.length,
    });
  } catch (error) {
    next(error);
  }
};
