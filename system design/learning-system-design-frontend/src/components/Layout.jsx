import { useCompany } from '../context/CompanyData';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation, useNavigationType } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import './Layout.css';

const Layout = ({ children }) => {
  const company = useCompany();
  const navigate = useNavigate();
  const location = useLocation();
  const navigationType = useNavigationType();
  const position = window.history.state?.idx || 0;
  const [historyEnd, setHistoryEnd] = useState(position);
  useEffect(() => { Promise.resolve().then(() => setHistoryEnd(end => navigationType === "PUSH" ? position : Math.max(end, position))); }, [location.key, navigationType, position]);
  const { logout, user } = useAuth();

  // ONE piece of navigation state: is the rail open?
  // CSS decides what "open" looks like per breakpoint (expanded labels on
  // desktop, off-canvas drawer on compact). Keeping the breakpoint in CSS only
  // means JS and CSS can never disagree about which mode we are in.
  // The rail is opened manually and stays open across navigation; it only
  // closes when closed manually (toggle, scrim, Escape, logout).
  const [isRailOpen, setIsRailOpen] = useState(false);

  const openRail = () => setIsRailOpen(true);
  const closeRail = useCallback(() => setIsRailOpen(false), []);
  const toggleRail = () => setIsRailOpen((current) => !current);

  useEffect(() => {
    if (!isRailOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeRail();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRailOpen, closeRail]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const toggleLabel = isRailOpen ? 'Collapse sidebar' : 'Expand sidebar';
  const toggleIcon = isRailOpen ? '◀' : '▶';

  const displayName = user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User';
  const nameParts = displayName.trim().split(/\s+/);
  const initials = (user?.firstName?.[0] || nameParts[0]?.[0] || '') +
    (user?.lastName?.[0] || nameParts[1]?.[0] || '');

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

  const visibleNavItems = navItems.filter((item) => {
    if (item.adminOnly) return user?.role === 'ADMIN';
    if (item.roles) return item.roles.includes(user?.role);
    return true;
  });

  const renderRailItem = (item) => (
    <button
      key={item.path}
      className={`rail-icon ${isActive(item.path) ? 'active' : ''}`}
      onClick={() => navigate(item.path)}
      title={!isRailOpen ? item.label : undefined}
      aria-label={item.label}
      aria-current={isActive(item.path) ? 'page' : undefined}
      type="button"
    >
      <span className="icon" aria-hidden="true">{item.icon}</span>
      <span className="label">{item.label}</span>
    </button>
  );

  return (
    <div className="app-layout">
      {/* Mobile drawer scrim — never interactive while the drawer is closed. */}
      <button
        type="button"
        className={`rail-backdrop ${isRailOpen ? 'open' : ''}`}
        onClick={closeRail}
        aria-label="Close navigation"
        tabIndex={isRailOpen ? 0 : -1}
        aria-hidden={!isRailOpen}
      />

      {/* Expandable icon rail / compact drawer */}
      <nav
        className={`rail ${isRailOpen ? 'open' : ''}`}
        aria-label="Main navigation"
      >
        <div className="rail-header">
          <div className="rail-mark" aria-hidden="true">{company.initials}</div>
          <div className="rail-title">{company.name}</div>
          <button
            className="rail-toggle"
            onClick={toggleRail}
            title={toggleLabel}
            aria-label={toggleLabel}
            aria-expanded={isRailOpen}
            aria-controls="rail-nav"
            type="button"
          >
            <span aria-hidden="true">{toggleIcon}</span>
          </button>
        </div>

        <div className="rail-scroll" id="rail-nav">
          {visibleNavItems.map(renderRailItem)}
        </div>

        <div className="rail-footer">
          {user?.role === 'ADMIN' && renderRailItem({ path: '/settings', icon: '⚙', label: 'Settings' })}
          <button
            className="rail-icon"
            onClick={handleLogout}
            title={!isRailOpen ? 'Logout' : undefined}
            aria-label="Logout"
            type="button"
          >
            <span className="icon" aria-hidden="true">⇥</span>
            <span className="label">Logout</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="main-content">
        {/* Top Navigation Bar */}
        <div className="app-topbar">
          <button
            type="button"
            className="topbar-menu-btn"
            onClick={openRail}
            aria-label="Open navigation"
            aria-expanded={isRailOpen}
            aria-controls="rail-nav"
          >
            <span aria-hidden="true">☰</span>
          </button>
          <div className="page-history" aria-label="Page history"><button type="button" className="btn btn-sm" onClick={() => navigate(-1)} disabled={position === 0} aria-label="Go back">← Back</button><button type="button" className="btn btn-sm" onClick={() => navigate(1)} disabled={position >= historyEnd} aria-label="Go forward">Forward →</button></div>
          <div className="topbar-spacer"></div>
          <div className="topbar-right">
            <NotificationBell />
            <div className="user-info">
              <div className="user-avatar">
                {(initials.toUpperCase() || 'AU')}
              </div>
              <div className="user-details">
                <div className="user-name">{displayName}</div>
                <div className="user-role">{user?.role}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content — the single scrolling region for every page */}
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;
