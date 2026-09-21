'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProductForm, ProductFormValues } from '../../../../components/ProductForm';
import { Button, Card, DetailRow, ErrorState, LoadingState, Modal, StatusBadge, Toast } from '../../../../components/ui';
import { ApiError, get, patch } from '../../../../lib/api';
import { Product, formatMoney } from '../../../../lib/types';

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { setProduct(await get<Product>(`/products/${params.id}`)); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load product'); } finally { setLoading(false); } }, [params.id]);
  useEffect(() => { void load(); }, [load]);
  const updateProduct = async (values: ProductFormValues) => { setSaving(true); setFormError(''); try { await patch(`/products/${params.id}`, values); setEditing(false); setToast('Product updated successfully'); await load(); } catch (reason) { setFormError(reason instanceof ApiError ? reason.message : 'Unable to update product'); } finally { setSaving(false); } };
  if (loading) return <LoadingState label="Loading product detail…" />;
  if (error || !product) return <ErrorState message={error || 'Product not found'} onRetry={() => void load()} />;
  return <><div className="content-area"><Link href="/catalogue" className="back-link">← Back to catalogue</Link><div className="detail-header"><div className="detail-title"><div><h1>{product.name}</h1><p>{product.sku} · {product.category}</p></div><StatusBadge value={product.active ? 'ACTIVE' : 'INACTIVE'} /></div><div className="detail-actions"><Button variant="quiet" onClick={() => { setFormError(''); setEditing(true); }}>Edit product</Button><Link className="btn btn-primary" href="/quotations/new">Use in quotation</Link></div></div><div className="detail-layout"><div className="detail-main"><Card><div className="card-head"><h2>Product details</h2></div><div className="form-grid"><DetailRow label="SKU" value={product.sku} /><DetailRow label="Category" value={product.category} /><DetailRow label="Fabric" value={product.fabric} /><DetailRow label="Price" value={formatMoney(product.price)} /><DetailRow label="Minimum order quantity" value={product.moq} /><div className="full"><DetailRow label="Description" value={product.description} /></div></div></Card><Card><div className="card-head"><div><h2>Catalogue use</h2><p>This product can be selected in every new quotation.</p></div></div><Link className="btn btn-success" href="/quotations/new">Create quotation with catalogue products</Link></Card></div><aside className="detail-side"><Card><h3 className="detail-section-title">Record</h3><DetailRow label="Created" value={new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(product.createdAt))} /><DetailRow label="Updated" value={new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(product.updatedAt))} /></Card></aside></div></div>{editing && <Modal title="Edit product" onClose={() => setEditing(false)}><ProductForm product={product} onSubmit={updateProduct} onCancel={() => setEditing(false)} saving={saving} error={formError} /></Modal>}{toast && <Toast message={toast} onClose={() => setToast('')} />}</>;
}
