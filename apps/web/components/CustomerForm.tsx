'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Button, Field } from './ui';
import { Customer } from '../lib/types';

export type CustomerFormValues = { name: string; companyName: string; phone: string; email: string; address: string; city: string; state: string; gstNumber?: string; status: Customer['status'] };
const blank: CustomerFormValues = { name: '', companyName: '', phone: '', email: '', address: '', city: '', state: 'Gujarat', gstNumber: '', status: 'ACTIVE' };

export function CustomerForm({ customer, initialValues, onSubmit, onCancel, saving = false, error = '' }: { customer?: Customer | null; initialValues?: Partial<CustomerFormValues>; onSubmit: (values: CustomerFormValues) => void; onCancel: () => void; saving?: boolean; error?: string }) {
  const [values, setValues] = useState<CustomerFormValues>(blank);
  useEffect(() => { setValues(customer ? { name: customer.name, companyName: customer.companyName, phone: customer.phone, email: customer.email, address: customer.address, city: customer.city, state: customer.state, gstNumber: customer.gstNumber || '', status: customer.status } : { ...blank, ...initialValues }); }, [customer, initialValues]);
  const update = (key: keyof CustomerFormValues, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onSubmit(values); };
  return <form onSubmit={submit}>
    {error && <div className="form-error">{error}</div>}
    <div className="form-grid">
      <Field label="Primary contact" required><input value={values.name} onChange={(event) => update('name', event.target.value)} required /></Field>
      <Field label="Company" required><input value={values.companyName} onChange={(event) => update('companyName', event.target.value)} required /></Field>
      <Field label="Phone" required><input value={values.phone} onChange={(event) => update('phone', event.target.value)} required /></Field>
      <Field label="Email" required><input type="email" value={values.email} onChange={(event) => update('email', event.target.value)} required /></Field>
      <Field label="Address" required><input value={values.address} onChange={(event) => update('address', event.target.value)} required /></Field>
      <Field label="City" required><input value={values.city} onChange={(event) => update('city', event.target.value)} required /></Field>
      <Field label="State" required><input value={values.state} onChange={(event) => update('state', event.target.value)} required /></Field>
      <Field label="GST number"><input value={values.gstNumber || ''} onChange={(event) => update('gstNumber', event.target.value)} /></Field>
      <Field label="Status"><select value={values.status} onChange={(event) => update('status', event.target.value as Customer['status'])}><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option></select></Field>
    </div>
    <div className="form-actions"><Button variant="quiet" onClick={onCancel}>Cancel</Button><Button variant="primary" type="submit" disabled={saving}>{saving ? 'Saving…' : customer ? 'Save changes' : 'Create customer'}</Button></div>
  </form>;
}
