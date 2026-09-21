'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Button, Field } from './ui';
import { Product } from '../lib/types';

export type ProductFormValues = { name: string; sku: string; category: string; description: string; fabric: string; price: string; moq: number; active: boolean };
const blank: ProductFormValues = { name: '', sku: '', category: 'Hotel Uniform', description: '', fabric: '', price: '', moq: 1, active: true };

export function ProductForm({ product, onSubmit, onCancel, saving = false, error = '' }: { product?: Product | null; onSubmit: (values: ProductFormValues) => void; onCancel: () => void; saving?: boolean; error?: string }) {
  const [values, setValues] = useState<ProductFormValues>(blank);
  useEffect(() => { setValues(product ? { name: product.name, sku: product.sku, category: product.category, description: product.description, fabric: product.fabric, price: String(product.price), moq: product.moq, active: product.active } : blank); }, [product]);
  const update = (key: keyof ProductFormValues, value: string | number | boolean) => setValues((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onSubmit(values); };
  return <form onSubmit={submit}>
    {error && <div className="form-error">{error}</div>}
    <div className="form-grid">
      <Field label="Product name" required><input value={values.name} onChange={(event) => update('name', event.target.value)} required /></Field>
      <Field label="SKU" required><input value={values.sku} onChange={(event) => update('sku', event.target.value)} required /></Field>
      <Field label="Category" required><input value={values.category} onChange={(event) => update('category', event.target.value)} required /></Field>
      <Field label="Fabric" required><input value={values.fabric} onChange={(event) => update('fabric', event.target.value)} required /></Field>
      <Field label="Price (₹)" required><input type="number" min="0.01" step="0.01" value={values.price} onChange={(event) => update('price', event.target.value)} required /></Field>
      <Field label="MOQ" required><input type="number" min="1" value={values.moq} onChange={(event) => update('moq', Number(event.target.value))} required /></Field>
      <Field label="Description" required><textarea value={values.description} onChange={(event) => update('description', event.target.value)} required /></Field>
      <Field label="Availability"><select value={values.active ? 'true' : 'false'} onChange={(event) => update('active', event.target.value === 'true')}><option value="true">Active</option><option value="false">Inactive</option></select></Field>
    </div>
    <div className="form-actions"><Button variant="quiet" onClick={onCancel}>Cancel</Button><Button variant="primary" type="submit" disabled={saving}>{saving ? 'Saving…' : product ? 'Save changes' : 'Create product'}</Button></div>
  </form>;
}
