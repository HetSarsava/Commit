'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '../lib/auth-context';

type NavItem = { href: string; label: string; icon: string; roles?: string[] };

const navGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Core',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: '⌂' },
      { href: '/leads', label: 'Leads', icon: '◌' },
      { href: '/customers', label: 'Customers', icon: '♧' },
      { href: '/catalogue', label: 'Catalogue', icon: '◇' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/whatsapp', label: 'WhatsApp', icon: '◫', roles: ['Admin'] },
      { href: '/quotations', label: 'Quotations', icon: '▤' },
      { href: '/sales-orders', label: 'Sales Orders', icon: '◈' },
      { href: '/payments', label: 'Payments', icon: '₹', roles: ['Admin'] },
      { href: '/production', label: 'Production / Inventory', icon: '▦', roles: ['Admin'] },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { href: '/marketing', label: 'Digital Marketing', icon: '◎', roles: ['Admin'] },
      { href: '/reports', label: 'Reports', icon: '▥', roles: ['Admin'] },
      { href: '/workflows', label: 'Workflow Builder', icon: '⌘', roles: ['Admin'] },
      { href: '/settings', label: 'Settings', icon: '⚙', roles: ['Admin'] },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const navigation = (
    <>
      <div className="sidebar-brand">
        <div className="brand-mark">AU</div>
        <div>
          <div className="brand-name">AMIT UNIFORM</div>
          <div className="brand-caption">COMMIT OPERATING SYSTEM</div>
        </div>
      </div>
      <div className="sidebar-scroll">
        {navGroups.map((group) => (
          <div className="nav-group" key={group.label}>
            <div className="nav-group-label">{group.label}</div>
            {group.items.map((item) => {
              const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
              const allowed = !item.roles || item.roles.includes(user?.role || '');
              return allowed ? (
                <Link className={`nav-item ${active ? 'active' : ''}`} href={item.href} key={item.href} onClick={() => setMobileOpen(false)}>
                  <span className="nav-icon">{item.icon}</span><span>{item.label}</span>
                </Link>
              ) : (
                <span className="nav-item nav-disabled" key={item.href} title="Admin access required">
                  <span className="nav-icon">{item.icon}</span><span>{item.label}</span>
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <div className="sidebar-user">
        <div className="avatar">{initials(user?.name || 'User')}</div>
        <div className="sidebar-user-copy"><strong>{user?.name}</strong><span>{user?.role} · Demo</span></div>
        <button className="icon-button sidebar-logout" onClick={handleLogout} aria-label="Log out" title="Log out">↪</button>
      </div>
    </>
  );

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        {navigation}
      </aside>
      {mobileOpen && <button className="mobile-scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
      <main className="main-shell">
        <header className="mobile-topbar">
          <button className="menu-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation">☰</button>
          <div className="mobile-title">COMMIT</div>
          <div className="avatar small">{initials(user?.name || 'User')}</div>
        </header>
        <div className="page-shell">{children}</div>
      </main>
    </div>
  );
}

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}
