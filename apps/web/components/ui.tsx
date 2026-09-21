'use client';

import { useEffect } from 'react';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return <div className="page-header"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{actions && <div className="header-actions">{actions}</div>}</div>;
}

export function Button({ children, variant = 'default', type = 'button', disabled, onClick, className = '' }: { children: React.ReactNode; variant?: 'default' | 'primary' | 'success' | 'danger' | 'quiet'; type?: 'button' | 'submit' | 'reset'; disabled?: boolean; onClick?: () => void; className?: string }) {
  return <button type={type} className={`btn btn-${variant} ${className}`} disabled={disabled} onClick={onClick}>{children}</button>;
}

export function StatusBadge({ value }: { value: string }) {
  return <span className={`status-badge status-${value.toLowerCase().replaceAll('_', '-')}`}><span className="status-dot" />{value.replaceAll('_', ' ')}</span>;
}

export function SearchBox({ value, onChange, placeholder = 'Search…' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="search-box"><span>⌕</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return <div className="state-card"><div className="spinner" />{label}</div>;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return <div className="state-card empty-state"><div className="empty-icon">◇</div><h3>{title}</h3>{description && <p>{description}</p>}{action}</div>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="state-card error-state"><strong>Something needs attention</strong><p>{message}</p>{onRetry && <Button variant="quiet" onClick={onRetry}>Try again</Button>}</div>;
}

export function Toast({ message, tone = 'success', onClose }: { message: string; tone?: 'success' | 'error'; onClose?: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onClose?.(), 4200);
    return () => window.clearTimeout(timer);
  }, [onClose]);
  return <div className={`toast toast-${tone}`} role="status"><span>{tone === 'success' ? '✓' : '!'}</span>{message}{onClose && <button onClick={onClose} aria-label="Dismiss">×</button>}</div>;
}

export function Modal({ title, children, onClose, width = '520px' }: { title: string; children: React.ReactNode; onClose: () => void; width?: string }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal" style={{ maxWidth: width }} role="dialog" aria-modal="true" aria-label={title}><div className="modal-head"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close">×</button></div>{children}</div></div>;
}

export function Field({ label, children, hint, required = false }: { label: string; children: React.ReactNode; hint?: string; required?: boolean }) {
  return <label className="field"><span className="field-label">{label}{required && <em> *</em>}</span>{children}{hint && <small>{hint}</small>}</label>;
}

export function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="detail-row"><span>{label}</span><strong>{value || '—'}</strong></div>;
}

export function ConfirmButton({ children, onConfirm, disabled = false }: { children: React.ReactNode; onConfirm: () => void; disabled?: boolean }) {
  return <Button variant="danger" disabled={disabled} onClick={() => { if (window.confirm('Are you sure?')) onConfirm(); }}>{children}</Button>;
}
