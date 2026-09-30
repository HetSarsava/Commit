import { useState, useEffect } from 'react';
import { activityLogsAPI } from '../api/activityLogs';
import { usersAPI } from '../api/users';
import './ActivityLogs.css';

const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    userId: '',
    entityType: '',
    action: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [logsData, usersData, statsData] = await Promise.all([
        activityLogsAPI.getAllLogs(filters),
        usersAPI.getAllUsers(),
        activityLogsAPI.getStats(),
      ]);
      setLogs(logsData.logs);
      setUsers(usersData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load activity logs:', error);
      alert('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    loadData();
  };

  const clearFilters = () => {
    setFilters({
      userId: '',
      entityType: '',
      action: '',
      startDate: '',
      endDate: '',
    });
    setTimeout(() => loadData(), 100);
  };

  const getActionBadgeClass = (action) => {
    const classes = {
      CREATE: 'action-create',
      UPDATE: 'action-update',
      DELETE: 'action-delete',
      VIEW: 'action-view',
    };
    return classes[action] || '';
  };

  const getEntityTypeColor = (type) => {
    const colors = {
      LEAD: '#3B82F6',
      QUOTATION: '#8B5CF6',
      ORDER: '#10B981',
      INVOICE: '#F59E0B',
      PAYMENT: '#06B6D4',
      PRODUCTION: '#EC4899',
      USER: '#6366F1',
      PRODUCT: '#14B8A6',
    };
    return colors[type] || '#6B7280';
  };

  const formatChanges = (changes) => {
    if (!changes) return null;

    if (changes.newData) {
      return (
        <div className="changes-detail">
          <span className="changes-label">Created:</span>
          <pre>{JSON.stringify(changes.newData, null, 2)}</pre>
        </div>
      );
    }

    if (changes.before && changes.after) {
      return (
        <div className="changes-detail">
          <div className="change-item">
            <span className="changes-label">Before:</span>
            <pre>{JSON.stringify(changes.before, null, 2)}</pre>
          </div>
          <div className="change-item">
            <span className="changes-label">After:</span>
            <pre>{JSON.stringify(changes.after, null, 2)}</pre>
          </div>
        </div>
      );
    }

    if (changes.deletedData) {
      return (
        <div className="changes-detail">
          <span className="changes-label">Deleted:</span>
          <pre>{JSON.stringify(changes.deletedData, null, 2)}</pre>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="activity-logs-page">
      {/* Top Bar */}
      <div className="topbar">
        <div>
          <h1>Activity Logs</h1>
          <div className="sub">Audit trail of all system activities</div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="stats-section">
          <div className="stat-card">
            <div className="stat-label">Total Activities</div>
            <div className="stat-value">{stats.totalActivities}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Creates</div>
            <div className="stat-value">{stats.byAction?.CREATE || 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Updates</div>
            <div className="stat-value">{stats.byAction?.UPDATE || 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Deletes</div>
            <div className="stat-value">{stats.byAction?.DELETE || 0}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label>User</label>
            <select name="userId" value={filters.userId} onChange={handleFilterChange}>
              <option value="">All Users</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Entity Type</label>
            <select name="entityType" value={filters.entityType} onChange={handleFilterChange}>
              <option value="">All Types</option>
              <option value="LEAD">Lead</option>
              <option value="QUOTATION">Quotation</option>
              <option value="ORDER">Order</option>
              <option value="INVOICE">Invoice</option>
              <option value="PAYMENT">Payment</option>
              <option value="PRODUCTION">Production</option>
              <option value="USER">User</option>
              <option value="PRODUCT">Product</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Action</label>
            <select name="action" value={filters.action} onChange={handleFilterChange}>
              <option value="">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="VIEW">View</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Start Date</label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
            />
          </div>

          <div className="filter-group">
            <label>End Date</label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
            />
          </div>

          <div className="filter-actions">
            <button className="btn btn-primary" onClick={applyFilters}>
              Apply Filters
            </button>
            <button className="btn btn-secondary" onClick={clearFilters}>
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="content">
        {loading ? (
          <div className="loading-state">Loading activity logs...</div>
        ) : (
          <div className="timeline-container">
            {logs.length === 0 ? (
              <div className="no-data">No activity logs found</div>
            ) : (
              <div className="timeline">
                {logs.map((log) => (
                  <div key={log.id} className="timeline-item">
                    <div
                      className="timeline-marker"
                      style={{ backgroundColor: getEntityTypeColor(log.entityType) }}
                    />
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <div className="timeline-info">
                          <span className={`action-badge ${getActionBadgeClass(log.action)}`}>
                            {log.action}
                          </span>
                          <span className="entity-type">{log.entityType}</span>
                          {log.entityName && (
                            <span className="entity-name">"{log.entityName}"</span>
                          )}
                        </div>
                        <div className="timeline-time">
                          {new Date(log.createdAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>

                      <div className="timeline-body">
                        <div className="timeline-user">
                          <span className="user-icon">👤</span>
                          <span className="user-name">
                            {log.user
                              ? `${log.user.firstName} ${log.user.lastName}`
                              : 'Unknown User'}
                          </span>
                          {log.user && <span className="user-role">({log.user.role})</span>}
                          {log.ipAddress && (
                            <span className="ip-address">from {log.ipAddress}</span>
                          )}
                        </div>

                        {log.changes && (
                          <details className="changes-accordion">
                            <summary>View Changes</summary>
                            {formatChanges(log.changes)}
                          </details>
                        )}

                        {log.metadata && (
                          <div className="metadata">
                            <strong>Metadata:</strong>{' '}
                            {typeof log.metadata === 'object'
                              ? JSON.stringify(log.metadata)
                              : log.metadata}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLogs;
