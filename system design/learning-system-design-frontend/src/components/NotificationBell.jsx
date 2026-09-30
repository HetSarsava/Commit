import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsAPI } from '../api/notifications';
import './NotificationBell.css';

const NotificationBell = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    loadNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await notificationsAPI.getMyNotifications({ limit: 10 });
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      // Mark as read
      if (!notification.isRead) {
        await notificationsAPI.markAsRead(notification.id);
        await loadNotifications();
      }

      // Navigate to entity
      if (notification.actionUrl) {
        navigate(notification.actionUrl);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setLoading(true);
      await notificationsAPI.markAllAsRead();
      await loadNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      alert('Failed to mark all as read');
    } finally {
      setLoading(false);
    }
  };

  const handleClearRead = async () => {
    try {
      setLoading(true);
      await notificationsAPI.clearRead();
      await loadNotifications();
    } catch (error) {
      console.error('Failed to clear read notifications:', error);
      alert('Failed to clear notifications');
    } finally {
      setLoading(false);
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

  const formatTime = (date) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffMs = now - notifDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return notifDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button className="notification-bell" onClick={() => setIsOpen(!isOpen)}>
        <svg className="bell-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {unreadCount > 0 && <span className="badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button
                className="btn-link"
                onClick={handleMarkAllAsRead}
                disabled={loading}
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                <svg className="empty-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  <line x1="2" y1="2" x2="22" y2="22"></line>
                </svg>
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${
                    notification.isRead ? 'read' : 'unread'
                  } ${getPriorityClass(notification.priority)}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div
                    className="notification-icon"
                    style={{
                      backgroundColor: `${getTypeColor(notification.type)}15`,
                      color: getTypeColor(notification.type)
                    }}
                  >
                    {getTypeIcon(notification.type)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-message">{notification.message}</div>
                    <div className="notification-time">{formatTime(notification.createdAt)}</div>
                  </div>
                  {!notification.isRead && <div className="unread-dot" />}
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notification-footer">
              <button className="btn-footer" onClick={handleClearRead} disabled={loading}>
                Clear read
              </button>
              <button
                className="btn-footer"
                onClick={() => {
                  navigate('/notifications');
                  setIsOpen(false);
                }}
              >
                View all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
