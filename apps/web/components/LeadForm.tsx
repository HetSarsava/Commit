'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Button, Field } from './ui';
import { Lead, User } from '../lib/types';

export type LeadFormValues = {
  name: string; companyName: string; phone: string; email: string; source: string; requirement: string; quantity?: number; status: Lead['status']; assignedUserId?: string;
};

const emptyLead: LeadFormValues = { name: '', companyName: '', phone: '', email: '', source: 'Website', requirement: '', quantity: undefined, status: 'NEW', assignedUserId: '' };

export function LeadForm({ lead, users, onSubmit, onCancel, saving = false, error = '' }: { lead?: Lead | null; users: User[]; onSubmit: (values: LeadFormValues) => void; onCancel: () => void; saving?: boolean; error?: string }) {
  const [values, setValues] = useState<LeadFormValues>(emptyLead);
  useEffect(() => {
    setValues(lead ? { name: lead.name, companyName: lead.companyName, phone: lead.phone, email: lead.email, source: lead.source, requirement: lead.requirement, quantity: lead.quantity ?? undefined, status: lead.status, assignedUserId: lead.assignedUserId ?? '' } : { ...emptyLead, assignedUserId: users[0]?.id || '' });
  }, [lead, users]);
  const update = (key: keyof LeadFormValues, value: string | number | undefined) => setValues((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onSubmit({ ...values, quantity: values.quantity ? Number(values.quantity) : undefined, assignedUserId: values.assignedUserId || undefined }); };
  return <form onSubmit={submit}>
    {error && <div className="form-error">{error}</div>}
    <div className="form-grid">
      <Field label="Contact name" required><input value={values.name} onChange={(event) => update('name', event.target.value)} required /></Field>
      <Field label="Company" required><input value={values.companyName} onChange={(event) => update('companyName', event.target.value)} required /></Field>
      <Field label="Phone" required><input value={values.phone} onChange={(event) => update('phone', event.target.value)} required /></Field>
      <Field label="Email" required><input type="email" value={values.email} onChange={(event) => update('email', event.target.value)} required /></Field>
      <Field label="Source" required><input value={values.source} onChange={(event) => update('source', event.target.value)} required /></Field>
      <Field label="Requirement" required><input value={values.requirement} onChange={(event) => update('requirement', event.target.value)} required /></Field>
      <Field label="Quantity"><input type="number" min="1" value={values.quantity ?? ''} onChange={(event) => update('quantity', event.target.value ? Number(event.target.value) : undefined)} /></Field>
      <Field label="Status"><select value={values.status} onChange={(event) => update('status', event.target.value)}>{['NEW', 'CONTACTED', 'QUALIFIED', 'QUOTATION', 'WON', 'LOST'].map((status) => <option key={status}>{status}</option>)}</select></Field>
      <Field label="Assigned salesperson"><select value={values.assignedUserId || ''} onChange={(event) => update('assignedUserId', event.target.value)}><option value="">Unassigned</option>{users.map((user) => <option value={user.id} key={user.id}>{user.name} · {user.role}</option>)}</select></Field>
    </div>
    <div className="form-actions"><Button variant="quiet" onClick={onCancel}>Cancel</Button><Button variant="primary" type="submit" disabled={saving}>{saving ? 'Saving…' : lead ? 'Save changes' : 'Create lead'}</Button></div>
  </form>;
}
