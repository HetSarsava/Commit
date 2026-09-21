'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card, ErrorState, Field, LoadingState, PageHeader } from '../../../../components/ui';
import { ApiError, get, post } from '../../../../lib/api';
import { Customer, Lead, Product, formatMoney, moneyNumber } from '../../../../lib/types';

type DraftItem = { productId: string; quantity: number; unitPrice: string; taxRate: string };

export default function NewQuotationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedLeadId = searchParams.get('leadId') || '';
  const requestedCustomerId = searchParams.get('customerId') || '';
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [customerId, setCustomerId] = useState(requestedCustomerId);
  const [leadId] = useState(requestedLeadId);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [notes, setNotes] = useState('');
  const [validUntil, setValidUntil] = useState(() => { const date = new Date(); date.setDate(date.getDate() + 14); return date.toISOString().slice(0, 10); });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => { setLoading(true); setError(''); try { const results = await Promise.all([get<Customer[]>('/customers'), get<Product[]>('/products'), requestedLeadId ? get<Lead>(`/leads/${requestedLeadId}`) : Promise.resolve(null)]); setCustomers(results[0]); setProducts(results[1]); setLead(results[2]); if (results[2]?.customerId) setCustomerId(results[2].customerId); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load quotation options'); } finally { setLoading(false); } }, [requestedLeadId]);
  useEffect(() => { void load(); }, [load]);

  const selectedProducts = useMemo(() => new Map((products || []).map((product) => [product.id, product])), [products]);
  const subtotal = items.reduce((sum, item) => sum + moneyNumber(item.unitPrice) * item.quantity, 0);
  const tax = items.reduce((sum, item) => sum + (moneyNumber(item.unitPrice) * item.quantity * moneyNumber(item.taxRate)) / 100, 0);
  const total = subtotal + tax;
  const addItem = (productId: string) => { const product = selectedProducts.get(productId); if (!product || items.some((item) => item.productId === productId)) return; setItems((current) => [...current, { productId, quantity: 1, unitPrice: String(product.price), taxRate: '5' }]); };
  const updateItem = (productId: string, key: 'quantity' | 'unitPrice' | 'taxRate', value: string) => setItems((current) => current.map((item) => item.productId === productId ? { ...item, [key]: value } : item));
  const removeItem = (productId: string) => setItems((current) => current.filter((item) => item.productId !== productId));
  const save = async () => {
    setFormError('');
    if (!customerId) { setFormError('Select a customer before saving the quotation.'); return; }
    if (!items.length) { setFormError('Add at least one product to the quotation.'); return; }
    setSaving(true);
    try { const quotation = await post<{ id: string }>('/quotations', { customerId, leadId: leadId || undefined, items: items.map((item) => ({ productId: item.productId, quantity: Number(item.quantity), unitPrice: item.unitPrice, taxRate: item.taxRate })), validUntil: validUntil ? new Date(`${validUntil}T23:59:59`).toISOString() : undefined, notes: notes || undefined }); router.push(`/quotations/${quotation.id}`); }
    catch (reason) { setFormError(reason instanceof ApiError ? reason.message : 'Unable to save quotation'); }
    finally { setSaving(false); }
  };
  if (loading) return <LoadingState label="Loading customers and catalogue…" />;
  if (error || !customers || !products) return <ErrorState message={error || 'Quotation options are unavailable'} onRetry={() => void load()} />;
  const available = products.filter((product) => !items.some((item) => item.productId === product.id) && product.active);
  return <><PageHeader title="Create quotation" subtitle={lead ? `From lead · ${lead.companyName}` : 'Select a customer and catalogue products'} actions={<Link className="btn btn-quiet" href="/quotations">Cancel</Link>} /><div className="content-area"><div className="detail-layout"><div className="detail-main"><Card><div className="card-head"><div><h2>Quotation context</h2><p>Backend will recalculate and persist all totals.</p></div></div><div className="form-grid"><Field label="Customer" required><select value={customerId} onChange={(event) => setCustomerId(event.target.value)}><option value="">Select customer…</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.companyName} · {customer.name}</option>)}</select></Field><Field label="Linked lead"><input value={lead ? `${lead.companyName} · ${lead.name}` : 'Direct customer quotation'} readOnly /></Field><Field label="Valid until"><input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} /></Field><Field label="Notes"><input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional commercial notes" /></Field></div></Card><Card><div className="card-head"><div><h2>Line items</h2><p>Set quantities, unit prices and deterministic tax rates.</p></div><select className="filter-select" value="" onChange={(event) => { if (event.target.value) addItem(event.target.value); }}><option value="">＋ Add product</option>{available.map((product) => <option key={product.id} value={product.id}>{product.name} · {formatMoney(product.price)}</option>)}</select></div>{items.length === 0 ? <div className="state-card"><div className="empty-icon">◇</div><strong>No products selected</strong><span className="muted">Choose at least one active product above.</span></div> : <div>{items.map((item) => { const product = selectedProducts.get(item.productId); return <div className="selected-product" key={item.productId}><div><div className="primary-cell">{product?.name}</div><div className="secondary-cell">{product?.sku} · {product?.fabric}</div></div><Field label="Quantity"><input type="number" min="1" value={item.quantity} onChange={(event) => updateItem(item.productId, 'quantity', event.target.value)} /></Field><Field label="Unit price"><input type="number" min="0.01" step="0.01" value={item.unitPrice} onChange={(event) => updateItem(item.productId, 'unitPrice', event.target.value)} /></Field><button className="remove-item" onClick={() => removeItem(item.productId)} aria-label={`Remove ${product?.name}`}>×</button></div>; })}</div>}<div className="totals"><div className="total-row"><span>Subtotal</span><strong>{formatMoney(subtotal)}</strong></div><div className="total-row"><span>Tax</span><strong>{formatMoney(tax)}</strong></div><div className="total-row grand"><span>Total</span><strong>{formatMoney(total)}</strong></div></div></Card>{formError && <div className="form-error">{formError}</div>}<div className="form-actions"><Button variant="quiet" onClick={() => router.push('/quotations')}>Cancel</Button><Button variant="primary" onClick={() => void save()} disabled={saving}>{saving ? 'Saving quotation…' : 'Save quotation'}</Button></div></div><aside className="detail-side"><Card><h3 className="detail-section-title">Flow</h3><div className="timeline"><div className="timeline-item active"><span className="timeline-dot" /><div><div className="timeline-title">Lead / customer selected</div><div className="timeline-time">Ready</div></div></div><div className="timeline-item active"><span className="timeline-dot" /><div><div className="timeline-title">Catalogue items selected</div><div className="timeline-time">{items.length} item{items.length === 1 ? '' : 's'}</div></div></div><div className="timeline-item"><span className="timeline-dot" /><div><div className="timeline-title">Save draft quotation</div><div className="timeline-time">Next</div></div></div><div className="timeline-item"><span className="timeline-dot" /><div><div className="timeline-title">Accept → sales order</div><div className="timeline-time">After review</div></div></div></div></Card><Card><h3 className="detail-section-title">Calculation rule</h3><p className="muted" style={{ fontSize: '12px', lineHeight: 1.55, margin: 0 }}>Line total = quantity × unit price. Tax defaults to 5% per line. The API repeats this calculation using decimal arithmetic before saving.</p></Card></aside></div></div></>;
}
