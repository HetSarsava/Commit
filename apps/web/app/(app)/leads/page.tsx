'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { LeadForm, LeadFormValues } from '../../../components/LeadForm';
import { Button, EmptyState, ErrorState, LoadingState, Modal, PageHeader, SearchBox, StatusBadge, Toast } from '../../../components/ui';
import { ApiError, get, post } from '../../../lib/api';
import { Lead, User } from '../../../lib/types';
import { useAuth } from '../../../lib/auth-context';

export default function LeadsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      const [nextLeads, team] = await Promise.all([get<Lead[]>(`/leads${params.size ? `?${params.toString()}` : ''}`), get<User[]>('/users')]);
      setLeads(nextLeads);
      setUsers(team);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load leads'); }
  }, [search, status]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 180); return () => window.clearTimeout(timer); }, [load]);

  const createLead = async (values: LeadFormValues) => {
    setSaving(true); setFormError('');
    try { await post('/leads', values); setShowCreate(false); setToast('Lead created successfully'); await load(); }
    catch (reason) { setFormError(reason instanceof ApiError ? reason.message : 'Unable to create lead'); }
    finally { setSaving(false); }
  };

  return <>
    <PageHeader title="Leads" subtitle={`${leads?.length ?? '…'} visible pipeline records`} actions={<Button variant="primary" onClick={() => { setFormError(''); setShowCreate(true); }}>＋ Add lead</Button>} />
    <div className="toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Search name, company, requirement…" /><select className="filter-select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Status: All</option>{['NEW', 'CONTACTED', 'QUALIFIED', 'QUOTATION', 'WON', 'LOST'].map((item) => <option value={item} key={item}>{item}</option>)}</select></div>
    <div className="content-area">
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : leads === null ? <LoadingState label="Loading leads from PostgreSQL…" /> : leads.length === 0 ? <EmptyState title="No leads yet" description="Create your first lead to start the workflow." action={<Button variant="primary" onClick={() => setShowCreate(true)}>Create lead</Button>} /> : <div className="card table-card"><div className="table-scroll"><table className="data-table"><thead><tr><th>Lead</th><th>Company</th><th>Contact</th><th>Source</th><th>Requirement</th><th>Status</th><th>Assigned</th><th>Created</th></tr></thead><tbody>{leads.map((lead) => <tr key={lead.id} className="row-click" onClick={() => { window.location.href = `/leads/${lead.id}`; }}><td><div className="primary-cell">{lead.name}</div><div className="secondary-cell">{lead.email}</div></td><td><div className="primary-cell">{lead.companyName}</div><div className="secondary-cell">{lead.customer ? 'Customer linked' : 'No customer yet'}</div></td><td><span className="mono">{lead.phone}</span></td><td><span className="mono muted">{lead.source}</span></td><td><div>{lead.requirement}</div>{lead.quantity && <div className="secondary-cell">Qty {lead.quantity}</div>}</td><td><StatusBadge value={lead.status} /></td><td>{lead.assignedUser?.name || 'Unassigned'}</td><td className="muted">{new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(new Date(lead.createdAt))}</td></tr>)}</tbody></table></div></div>}
    </div>
    {showCreate && <Modal title="Create lead" onClose={() => setShowCreate(false)}><LeadForm users={users} onSubmit={createLead} onCancel={() => setShowCreate(false)} saving={saving} error={formError} /></Modal>}
    {toast && <Toast message={toast} onClose={() => setToast('')} />}
  </>;
}
