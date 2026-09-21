'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button, EmptyState, ErrorState, LoadingState, PageHeader, SearchBox, StatusBadge } from '../../../components/ui';
import { get } from '../../../lib/api';
import { SalesOrder, formatDate, formatMoney } from '../../../lib/types';

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState<SalesOrder[] | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(async () => { setError(''); try { setOrders(await get<SalesOrder[]>(`/sales-orders${search ? `?search=${encodeURIComponent(search)}` : ''}`)); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load sales orders'); } }, [search]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 180); return () => window.clearTimeout(timer); }, [load]);
  return <><PageHeader title="Sales Orders" subtitle={`${orders?.length ?? '…'} confirmed and historical orders`} actions={<span className="filter-chip active">Created from accepted quotations</span>} /><div className="toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Search order, customer, quotation…" /></div><div className="content-area">{error ? <ErrorState message={error} onRetry={() => void load()} /> : orders === null ? <LoadingState label="Loading sales orders from PostgreSQL…" /> : orders.length === 0 ? <EmptyState title="No sales orders yet" description="Accept a quotation to create the first sales order." action={<Link className="btn btn-primary" href="/quotations">View quotations</Link>} /> : <div className="card table-card"><div className="table-scroll"><table className="data-table"><thead><tr><th>Order</th><th>Customer</th><th>Quotation</th><th>Items</th><th className="numeric">Subtotal</th><th className="numeric">Total</th><th>Status</th><th>Created</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id} className="row-click" onClick={() => { window.location.href = `/sales-orders/${order.id}`; }}><td><div className="primary-cell mono">{order.orderNumber}</div></td><td>{order.customer?.companyName || '—'}</td><td>{order.quotation ? <span className="mono">{order.quotation.quotationNumber}</span> : '—'}</td><td className="numeric">{order.items?.length || 0}</td><td className="numeric">{formatMoney(order.subtotal)}</td><td className="numeric">{formatMoney(order.total)}</td><td><StatusBadge value={order.status} /></td><td className="muted">{formatDate(order.createdAt)}</td></tr>)}</tbody></table></div></div>}</div></>;
}
