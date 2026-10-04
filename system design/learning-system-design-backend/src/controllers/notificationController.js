const { prisma } = require('../config/database');

// Get all notifications for current user
exports.getMyNotifications = async (req, res, next) => {
  try {
    const { limit = 50, unreadOnly = false } = req.query;

    const where = { userId: req.user.id };
    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: req.user.id,
        isRead: false,
      },
    });

    res.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
};

// Mark notification as read
exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Check ownership
    if (notification.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({
      message: 'Notification marked as read',
      notification: updated,
    });
  } catch (error) {
    next(error);
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.user.id,
        isRead: false,
      },
    });

    for (const notification of notifications) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    }

    res.json({
      message: `${notifications.length} notifications marked as read`,
      count: notifications.length,
    });
  } catch (error) {
    next(error);
  }
};

// Delete notification
exports.deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Check ownership
    if (notification.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.notification.delete({ where: { id } });

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Delete all read notifications
exports.clearRead = async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.user.id,
        isRead: true,
      },
    });

    for (const notification of notifications) {
      await prisma.notification.delete({ where: { id: notification.id } });
    }

    res.json({
      message: `${notifications.length} read notifications cleared`,
      count: notifications.length,
    });
  } catch (error) {
    next(error);
  }
};

// Get unread count
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await prisma.notification.count({
      where: {
        userId: req.user.id,
        isRead: false,
      },
    });

    res.json({ unreadCount: count });
  } catch (error) {
    next(error);
  }
};

// Helper function to create notification (used by other controllers)
exports.createNotification = async ({
  userId,
  type,
  title,
  message,
  entityType,
  entityId,
  actionUrl,
  priority = 'NORMAL',
}) => {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        entityType,
        entityId,
        actionUrl,
        priority,
        isRead: false,
        createdAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
    // Don't throw - notification failure shouldn't break main operation
  }
};
