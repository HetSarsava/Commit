'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CustomerForm, CustomerFormValues } from '../../../../components/CustomerForm';
import { LeadForm, LeadFormValues } from '../../../../components/LeadForm';
import { Button, Card, DetailRow, ErrorState, LoadingState, Modal, StatusBadge, Toast } from '../../../../components/ui';
import { ApiError, get, patch, post } from '../../../../lib/api';
import { Customer, Lead, User, formatDate, formatMoney } from '../../../../lib/types';
import { useAuth } from '../../../../lib/auth-context';

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [lead, setLead] = useState<Lead | null>(null);
  const [team, setTeam] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'edit' | 'customer' | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const [nextLead, users] = await Promise.all([get<Lead>(`/leads/${params.id}`), get<User[]>('/users')]); setLead(nextLead); setTeam(users); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load lead'); }
    finally { setLoading(false); }
  }, [params.id]);
  useEffect(() => { void load(); }, [load]);

  const users = useMemo<User[]>(() => [...team, ...(user && !team.some((member) => member.id === user.id) ? [user] : [])], [team, user]);

  const editLead = async (values: LeadFormValues) => {
    setSaving(true); setFormError('');
    try { await patch(`/leads/${params.id}`, values); setModal(null); setToast('Lead updated successfully'); await load(); }
    catch (reason) { setFormError(reason instanceof ApiError ? reason.message : 'Unable to update lead'); }
    finally { setSaving(false); }
  };

  const createCustomer = async (values: CustomerFormValues) => {
    setSaving(true); setFormError('');
    try {
      const customer = await post<Customer>('/customers', values);
      await patch(`/leads/${params.id}`, { customerId: customer.id });
      setModal(null); setToast('Customer created and associated with this lead'); await load();
    } catch (reason) { setFormError(reason instanceof ApiError ? reason.message : 'Unable to create customer'); }
    finally { setSaving(false); }
  };

  const changeStatus = async (status: Lead['status']) => {
    try { await patch(`/leads/${params.id}`, { status }); setToast(`Lead moved to ${status.replaceAll('_', ' ')}`); await load(); }
    catch (reason) { setToast(reason instanceof Error ? reason.message : 'Unable to change status'); }
  };

  if (loading) return <LoadingState label="Loading lead detail…" />;
  if (error || !lead) return <ErrorState message={error || 'Lead not found'} onRetry={() => void load()} />;
  const customer = lead.customer;
  return <>
    <div className="content-area">
      <Link href="/leads" className="back-link">← Back to leads</Link>
      <div className="detail-header"><div className="detail-title"><div><h1>{lead.name}</h1><p>{lead.companyName} · Created {formatDate(lead.createdAt)}</p></div><StatusBadge value={lead.status} /></div><div className="detail-actions"><Button variant="quiet" onClick={() => { setFormError(''); setModal('edit'); }}>Edit lead</Button>{customer ? <Button variant="primary" onClick={() => router.push(`/quotations/new?leadId=${lead.id}`)}>Create quotation</Button> : <Button variant="success" onClick={() => { setFormError(''); setModal('customer'); }}>Create customer</Button>}</div></div>
      <div className="detail-layout">
        <div className="detail-main">
          <Card><div className="card-head"><div><h2>Lead information</h2><p>Persisted details and current relationship</p></div><select className="filter-select" value={lead.status} onChange={(event) => void changeStatus(event.target.value as Lead['status'])}>{['NEW', 'CONTACTED', 'QUALIFIED', 'QUOTATION', 'WON', 'LOST'].map((status) => <option key={status}>{status}</option>)}</select></div><div className="form-grid"><DetailRow label="Contact" value={lead.name} /><DetailRow label="Company" value={lead.companyName} /><DetailRow label="Phone" value={lead.phone} /><DetailRow label="Email" value={lead.email} /><DetailRow label="Source" value={lead.source} /><DetailRow label="Quantity" value={lead.quantity || 'Not specified'} /><div className="full"><DetailRow label="Requirement" value={lead.requirement} /></div></div></Card>
          <Card><div className="card-head"><div><h2>Quotation relationship</h2><p>Only real quotations linked to this lead appear here.</p></div></div>{lead.quotations?.length ? <div className="mini-list">{lead.quotations.map((quotation) => <Link href={`/quotations/${quotation.id}`} className="mini-list-row" key={quotation.id}><div><strong>{quotation.quotationNumber}</strong><span>{formatMoney(quotation.total)} · {formatDate(quotation.createdAt)}</span></div><StatusBadge value={quotation.status} /></Link>)}</div> : <div className="muted">No quotation has been created for this lead yet.</div>}</Card>
        </div>
        <aside className="detail-side">
          <Card><h3 className="detail-section-title">Customer relationship</h3>{customer ? <><DetailRow label="Company" value={<Link className="card-link" href={`/customers/${customer.id}`}>{customer.companyName}</Link>} /><DetailRow label="Contact" value={customer.name} /><DetailRow label="Phone" value={customer.phone} /></> : <><p className="muted" style={{ lineHeight: 1.5, fontSize: '12px' }}>This lead is not associated with a customer yet.</p><Button variant="success" onClick={() => { setFormError(''); setModal('customer'); }}>Create customer</Button></>}</Card>
          <Card><h3 className="detail-section-title">Next actions</h3><div className="action-stack">{customer && <Button variant="primary" onClick={() => router.push(`/quotations/new?leadId=${lead.id}`)}>＋ Create quotation</Button>}<Button variant="quiet" onClick={() => { setFormError(''); setModal('edit'); }}>Edit lead details</Button></div></Card>
        </aside>
      </div>
    </div>
    {modal === 'edit' && <Modal title="Edit lead" onClose={() => setModal(null)}><LeadForm lead={lead} users={users} onSubmit={editLead} onCancel={() => setModal(null)} saving={saving} error={formError} /></Modal>}
    {modal === 'customer' && <Modal title="Create customer from lead" onClose={() => setModal(null)}><CustomerForm initialValues={{ name: lead.name, companyName: lead.companyName, phone: lead.phone, email: lead.email, address: '', city: '', state: 'Gujarat' }} onSubmit={createCustomer} onCancel={() => setModal(null)} saving={saving} error={formError} /></Modal>}
    {toast && <Toast message={toast} tone={toast.includes('Unable') ? 'error' : 'success'} onClose={() => setToast('')} />}
  </>;
}
