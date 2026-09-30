import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import './Layout.css';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  const navItems = [
    { path: '/dashboard', icon: '◈', label: 'Dashboard' },
    { path: '/leads', icon: '☰', label: 'Leads' },
    { path: '/products', icon: '▤', label: 'Products' },
    { path: '/catalogues', icon: '◪', label: 'Catalogues', roles: ['ADMIN', 'SALES'] },
    { path: '/quotations', icon: '◫', label: 'Quotations' },
    { path: '/proformas', icon: '◬', label: 'Proforma', roles: ['ADMIN', 'SALES', 'ACCOUNTANT'] },
    { path: '/orders', icon: '⊞', label: 'Orders' },
    { path: '/invoices', icon: '▣', label: 'Invoices' },
    { path: '/production', icon: '◧', label: 'Production' },
    { path: '/dispatch', icon: '◭', label: 'Dispatch', roles: ['ADMIN', 'PRODUCTION', 'SALES'] },
    { path: '/inventory', icon: '▦', label: 'Inventory', roles: ['ADMIN', 'PURCHASE', 'PRODUCTION'] },
    { path: '/purchase', icon: '▨', label: 'Purchase', roles: ['ADMIN', 'PURCHASE'] },
    { path: '/marketing', icon: '◮', label: 'Marketing', roles: ['ADMIN', 'MARKETING', 'SALES'] },
    { path: '/reports', icon: '◩', label: 'Reports' },
    { path: '/users', icon: '◉', label: 'Users', adminOnly: true },
    { path: '/activity-logs', icon: '◎', label: 'Activity Logs', roles: ['ADMIN', 'ACCOUNTANT'] },
    { path: '/whatsapp', icon: '◐', label: 'WhatsApp', roles: ['ADMIN', 'SALES', 'MARKETING'] },
  ];

  return (
    <div className="app-layout">
      {/* Expandable Icon Rail */}
      <div className={`rail ${isExpanded ? 'expanded' : ''}`}>
        <div className="rail-header">
          <div className="rail-mark">AU</div>
          {isExpanded && <div className="rail-title">AMIT UNIFORM</div>}
        </div>

        {/* Toggle Button */}
        <button
          className="rail-toggle"
          onClick={toggleSidebar}
          title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isExpanded ? '◀' : '▶'}
        </button>

        {navItems
          .filter((item) => {
            if (item.adminOnly) return user?.role === 'ADMIN';
            if (item.roles) return item.roles.includes(user?.role);
            return true;
          })
          .map((item) => (
            <div
              key={item.path}
              className={`rail-icon ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
              title={!isExpanded ? item.label : ''}
            >
              <span className="icon">{item.icon}</span>
              {isExpanded && <span className="label">{item.label}</span>}
            </div>
          ))}

        <div style={{ flex: 1 }}></div>

        {user?.role === 'ADMIN' && (
          <div
            className={`rail-icon ${isActive('/settings') ? 'active' : ''}`}
            onClick={() => navigate('/settings')}
            title={!isExpanded ? 'Settings' : ''}
          >
            <span className="icon">⚙</span>
            {isExpanded && <span className="label">Settings</span>}
          </div>
        )}

        <div
          className="rail-icon"
          onClick={handleLogout}
          title={!isExpanded ? 'Logout' : ''}
        >
          <span className="icon">⇥</span>
          {isExpanded && <span className="label">Logout</span>}
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Top Navigation Bar */}
        <div className="app-topbar">
          <div className="topbar-spacer"></div>
          <div className="topbar-right">
            <NotificationBell />
            <div className="user-info">
              <div className="user-avatar">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div className="user-details">
                <div className="user-name">{user?.firstName} {user?.lastName}</div>
                <div className="user-role">{user?.role}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;
