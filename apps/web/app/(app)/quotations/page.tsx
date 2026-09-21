'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button, EmptyState, ErrorState, LoadingState, PageHeader, SearchBox, StatusBadge } from '../../../components/ui';
import { get } from '../../../lib/api';
import { Quotation, formatDate, formatMoney } from '../../../lib/types';

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[] | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(async () => { setError(''); try { const query = new URLSearchParams(); if (search) query.set('search', search); if (status) query.set('status', status); setQuotations(await get<Quotation[]>(`/quotations${query.size ? `?${query.toString()}` : ''}`)); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load quotations'); } }, [search, status]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 180); return () => window.clearTimeout(timer); }, [load]);
  return <><PageHeader title="Quotations" subtitle={`${quotations?.length ?? '…'} persisted quotations`} actions={<Link className="btn btn-primary" href="/quotations/new">＋ New quotation</Link>} /><div className="toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Search quotation, customer, lead…" /><select className="filter-select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Status: All</option>{['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'].map((item) => <option key={item}>{item}</option>)}</select></div><div className="content-area">{error ? <ErrorState message={error} onRetry={() => void load()} /> : quotations === null ? <LoadingState label="Loading quotations from PostgreSQL…" /> : quotations.length === 0 ? <EmptyState title="No quotations yet" description="Create a quotation from a lead or customer." action={<Link className="btn btn-primary" href="/quotations/new">Create quotation</Link>} /> : <div className="card table-card"><div className="table-scroll"><table className="data-table"><thead><tr><th>Quotation</th><th>Customer</th><th>Lead</th><th>Items</th><th className="numeric">Total</th><th>Status</th><th>Created</th><th>Order</th></tr></thead><tbody>{quotations.map((quotation) => <tr key={quotation.id} className="row-click" onClick={() => { window.location.href = `/quotations/${quotation.id}`; }}><td><div className="primary-cell mono">{quotation.quotationNumber}</div><div className="secondary-cell">Valid until {formatDate(quotation.validUntil)}</div></td><td>{quotation.customer?.companyName || '—'}</td><td>{quotation.lead?.companyName || 'Direct customer'}</td><td className="numeric">{quotation.items?.length || 0}</td><td className="numeric">{formatMoney(quotation.total)}</td><td><StatusBadge value={quotation.status} /></td><td className="muted">{formatDate(quotation.createdAt)}</td><td>{quotation.salesOrder ? <Link className="card-link" href={`/sales-orders/${quotation.salesOrder.id}`} onClick={(event) => event.stopPropagation()}>{quotation.salesOrder.orderNumber}</Link> : '—'}</td></tr>)}</tbody></table></div></div>}</div></>;
}
