'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CustomerForm, CustomerFormValues } from '../../../../components/CustomerForm';
import { Button, Card, DetailRow, ErrorState, LoadingState, Modal, StatusBadge, Toast } from '../../../../components/ui';
import { ApiError, get, patch } from '../../../../lib/api';
import { Customer, formatDate, formatMoney } from '../../../../lib/types';

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { setCustomer(await get<Customer>(`/customers/${params.id}`)); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load customer'); } finally { setLoading(false); } }, [params.id]);
  useEffect(() => { void load(); }, [load]);
  const updateCustomer = async (values: CustomerFormValues) => { setSaving(true); setFormError(''); try { await patch(`/customers/${params.id}`, values); setEditing(false); setToast('Customer updated successfully'); await load(); } catch (reason) { setFormError(reason instanceof ApiError ? reason.message : 'Unable to update customer'); } finally { setSaving(false); } };
  if (loading) return <LoadingState label="Loading customer detail…" />;
  if (error || !customer) return <ErrorState message={error || 'Customer not found'} onRetry={() => void load()} />;
  return <>
    <div className="content-area"><Link href="/customers" className="back-link">← Back to customers</Link><div className="detail-header"><div className="detail-title"><div><h1>{customer.companyName}</h1><p>{customer.city}, {customer.state} · Customer since {formatDate(customer.createdAt)}</p></div><StatusBadge value={customer.status} /></div><div className="detail-actions"><Button variant="quiet" onClick={() => { setFormError(''); setEditing(true); }}>Edit customer</Button><Link className="btn btn-primary" href={`/quotations/new?customerId=${customer.id}`}>＋ Create quotation</Link></div></div>
      <div className="detail-layout"><div className="detail-main"><Card><div className="card-head"><div><h2>Customer profile</h2><p>Contact details and persisted relationships</p></div></div><div className="form-grid"><DetailRow label="Primary contact" value={customer.name} /><DetailRow label="Phone" value={customer.phone} /><DetailRow label="Email" value={customer.email} /><DetailRow label="GST number" value={customer.gstNumber} /><div className="full"><DetailRow label="Address" value={`${customer.address}, ${customer.city}, ${customer.state}`} /></div></div></Card><Card><div className="card-head"><div><h2>Related leads</h2><p>Actual leads associated with this customer</p></div></div>{customer.leads?.length ? <div className="mini-list">{customer.leads.map((lead) => <Link className="mini-list-row" href={`/leads/${lead.id}`} key={lead.id}><div><strong>{lead.companyName}</strong><span>{lead.name} · {lead.requirement}</span></div><StatusBadge value={lead.status} /></Link>)}</div> : <div className="muted">No leads are associated with this customer.</div>}</Card><Card><div className="card-head"><div><h2>Quotations</h2><p>Quotes for this customer</p></div></div>{customer.quotations?.length ? <div className="mini-list">{customer.quotations.map((quotation) => <Link className="mini-list-row" href={`/quotations/${quotation.id}`} key={quotation.id}><div><strong>{quotation.quotationNumber}</strong><span>{quotation.items?.length || 0} items · {formatMoney(quotation.total)}</span></div><StatusBadge value={quotation.status} /></Link>)}</div> : <div className="muted">No quotations yet.</div>}</Card><Card><div className="card-head"><div><h2>Sales orders</h2><p>Orders copied from accepted quotations</p></div></div>{customer.salesOrders?.length ? <div className="mini-list">{customer.salesOrders.map((order) => <Link className="mini-list-row" href={`/sales-orders/${order.id}`} key={order.id}><div><strong>{order.orderNumber}</strong><span>{formatDate(order.createdAt)} · {formatMoney(order.total)}</span></div><StatusBadge value={order.status} /></Link>)}</div> : <div className="muted">No sales orders yet.</div>}</Card></div><aside className="detail-side"><Card><h3 className="detail-section-title">Relationship summary</h3><DetailRow label="Leads" value={customer.leads?.length ?? 0} /><DetailRow label="Quotations" value={customer.quotations?.length ?? 0} /><DetailRow label="Sales orders" value={customer.salesOrders?.length ?? 0} /></Card><Card><h3 className="detail-section-title">Actions</h3><div className="action-stack"><Link className="btn btn-primary" href={`/quotations/new?customerId=${customer.id}`}>Create quotation</Link><Button variant="quiet" onClick={() => { setFormError(''); setEditing(true); }}>Edit details</Button></div></Card></aside></div></div>
    {editing && <Modal title="Edit customer" onClose={() => setEditing(false)}><CustomerForm customer={customer} onSubmit={updateCustomer} onCancel={() => setEditing(false)} saving={saving} error={formError} /></Modal>}
    {toast && <Toast message={toast} onClose={() => setToast('')} />}
  </>;
}
