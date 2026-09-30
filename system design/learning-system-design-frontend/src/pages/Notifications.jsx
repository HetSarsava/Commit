import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsAPI } from '../api/notifications';
import './Notifications.css';

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, [filter]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const params = filter === 'unread' ? { unreadOnly: true } : { limit: 100 };
      const data = await notificationsAPI.getMyNotifications(params);

      let filtered = data.notifications;
      if (filter === 'read') {
        filtered = data.notifications.filter(n => n.isRead);
      }

      setNotifications(filtered);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      alert('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) {
        await notificationsAPI.markAsRead(notification.id);
      }
      if (notification.actionUrl) {
        navigate(notification.actionUrl);
      }
    } catch (error) {
      console.error('Failed to handle notification click:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      alert('All notifications marked as read');
      loadNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      alert('Failed to mark all as read');
    }
  };

  const handleClearRead = async () => {
    if (!confirm('Clear all read notifications?')) return;

    try {
      await notificationsAPI.clearRead();
      alert('Read notifications cleared');
      loadNotifications();
    } catch (error) {
      console.error('Failed to clear read notifications:', error);
      alert('Failed to clear notifications');
    }
  };

  const getPriorityClass = (priority) => {
    const classes = {
      URGENT: 'priority-urgent',
      HIGH: 'priority-high',
      NORMAL: 'priority-normal',
      LOW: 'priority-low',
    };
    return classes[priority] || 'priority-normal';
  };

  const getTypeIcon = (type) => {
    const icons = {
      ORDER_PLACED: '◫',
      ORDER_CONFIRMED: '✓',
      PAYMENT_RECEIVED: '₹',
      PRODUCTION_COMPLETED: '✓',
      PRODUCTION_DELAYED: '!',
      INVOICE_OVERDUE: '!',
      INVOICE_GENERATED: '▣',
      LEAD_ASSIGNED: '+',
      USER_CREATED: '◉',
      QUOTATION_SENT: '→',
    };
    return icons[type] || '◈';
  };

  const getTypeColor = (type) => {
    const colors = {
      ORDER_PLACED: '#3B82F6',
      ORDER_CONFIRMED: '#10B981',
      PAYMENT_RECEIVED: '#059669',
      PRODUCTION_COMPLETED: '#10B981',
      PRODUCTION_DELAYED: '#DC2626',
      INVOICE_OVERDUE: '#DC2626',
      INVOICE_GENERATED: '#8B5CF6',
      LEAD_ASSIGNED: '#0EA5E9',
      USER_CREATED: '#6366F1',
      QUOTATION_SENT: '#8B5CF6',
    };
    return colors[type] || '#6B7280';
  };

  const formatDateTime = (date) => {
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="notifications-page">
      {/* Top Bar */}
      <div className="topbar">
        <div>
          <h1>Notifications</h1>
          <div className="sub">All your notifications and alerts</div>
        </div>
        <div className="topbar-actions">
          <button className="btn" onClick={handleMarkAllAsRead}>
            Mark All as Read
          </button>
          <button className="btn btn-secondary" onClick={handleClearRead}>
            Clear Read
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`filter-tab ${filter === 'unread' ? 'active' : ''}`}
          onClick={() => setFilter('unread')}
        >
          Unread
        </button>
        <button
          className={`filter-tab ${filter === 'read' ? 'active' : ''}`}
          onClick={() => setFilter('read')}
        >
          Read
        </button>
      </div>

      {/* Notifications List */}
      <div className="content">
        {loading ? (
          <div className="loading-state">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <svg className="empty-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              <line x1="2" y1="2" x2="22" y2="22"></line>
            </svg>
            <h3>No notifications</h3>
            <p>You're all caught up!</p>
          </div>
        ) : (
          <div className="notifications-container">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-card ${
                  notification.isRead ? 'read' : 'unread'
                } ${getPriorityClass(notification.priority)}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div
                  className="notification-icon-large"
                  style={{
                    backgroundColor: `${getTypeColor(notification.type)}15`,
                    color: getTypeColor(notification.type)
                  }}
                >
                  {getTypeIcon(notification.type)}
                </div>
                <div className="notification-body">
                  <div className="notification-header-row">
                    <h3 className="notification-title">{notification.title}</h3>
                    {!notification.isRead && <div className="unread-badge">New</div>}
                  </div>
                  <p className="notification-message">{notification.message}</p>
                  <div className="notification-meta">
                    <span className="notification-time">
                      {formatDateTime(notification.createdAt)}
                    </span>
                    {notification.priority === 'URGENT' && (
                      <span className="priority-badge urgent">Urgent</span>
                    )}
                    {notification.priority === 'HIGH' && (
                      <span className="priority-badge high">High Priority</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
