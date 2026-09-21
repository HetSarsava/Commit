'use client';

import { useCallback, useEffect, useState } from 'react';
import { CustomerForm, CustomerFormValues } from '../../../components/CustomerForm';
import { Button, EmptyState, ErrorState, LoadingState, Modal, PageHeader, SearchBox, StatusBadge, Toast } from '../../../components/ui';
import { ApiError, get, post } from '../../../lib/api';
import { Customer, formatDate, formatMoney } from '../../../lib/types';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const load = useCallback(async () => { setError(''); try { const query = search ? `?search=${encodeURIComponent(search)}` : ''; setCustomers(await get<Customer[]>(`/customers${query}`)); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load customers'); } }, [search]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 180); return () => window.clearTimeout(timer); }, [load]);
  const createCustomer = async (values: CustomerFormValues) => { setSaving(true); setFormError(''); try { await post('/customers', values); setShowCreate(false); setToast('Customer created successfully'); await load(); } catch (reason) { setFormError(reason instanceof ApiError ? reason.message : 'Unable to create customer'); } finally { setSaving(false); } };
  return <>
    <PageHeader title="Customers" subtitle={`${customers?.length ?? '…'} customer records`} actions={<Button variant="primary" onClick={() => { setFormError(''); setShowCreate(true); }}>＋ Add customer</Button>} />
    <div className="toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Search company, contact, GSTIN…" /></div>
    <div className="content-area">{error ? <ErrorState message={error} onRetry={() => void load()} /> : customers === null ? <LoadingState label="Loading customers from PostgreSQL…" /> : customers.length === 0 ? <EmptyState title="No customers yet" description="Create your first customer or convert one from a lead." action={<Button variant="primary" onClick={() => setShowCreate(true)}>Create customer</Button>} /> : <div className="card table-card"><div className="table-scroll"><table className="data-table"><thead><tr><th>Company</th><th>Primary contact</th><th>Location</th><th>Leads</th><th>Quotations</th><th>Orders</th><th>Status</th></tr></thead><tbody>{customers.map((customer) => <tr className="row-click" key={customer.id} onClick={() => { window.location.href = `/customers/${customer.id}`; }}><td><div className="primary-cell">{customer.companyName}</div><div className="secondary-cell">{customer.gstNumber || 'GST number not supplied'}</div></td><td><div className="primary-cell">{customer.name}</div><div className="secondary-cell">{customer.phone} · {customer.email}</div></td><td>{customer.city}, {customer.state}</td><td className="numeric">{customer._count?.leads ?? 0}</td><td className="numeric">{customer._count?.quotations ?? 0}</td><td className="numeric">{customer._count?.salesOrders ?? 0}</td><td><StatusBadge value={customer.status} /></td></tr>)}</tbody></table></div></div>}</div>
    {showCreate && <Modal title="Create customer" onClose={() => setShowCreate(false)}><CustomerForm onSubmit={createCustomer} onCancel={() => setShowCreate(false)} saving={saving} error={formError} /></Modal>}
    {toast && <Toast message={toast} onClose={() => setToast('')} />}
  </>;
}
