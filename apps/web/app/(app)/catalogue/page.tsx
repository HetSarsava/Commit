'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ProductForm, ProductFormValues } from '../../../components/ProductForm';
import { Button, EmptyState, ErrorState, LoadingState, Modal, PageHeader, SearchBox, Toast } from '../../../components/ui';
import { ApiError, get, post } from '../../../lib/api';
import { Product, formatMoney } from '../../../lib/types';

const productSymbols = ['♢', '▱', '◈', '◇', '▦', '⬡', '♧', '▤'];

export default function CataloguePage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const load = useCallback(async () => { setError(''); try { const query = new URLSearchParams(); if (search) query.set('search', search); if (category) query.set('category', category); setProducts(await get<Product[]>(`/products${query.size ? `?${query.toString()}` : ''}`)); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load catalogue'); } }, [search, category]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 180); return () => window.clearTimeout(timer); }, [load]);
  const categories = useMemo(() => [...new Set((products || []).map((product) => product.category))].sort(), [products]);
  const createProduct = async (values: ProductFormValues) => { setSaving(true); setFormError(''); try { await post('/products', values); setShowCreate(false); setToast('Product created successfully'); await load(); } catch (reason) { setFormError(reason instanceof ApiError ? reason.message : 'Unable to create product'); } finally { setSaving(false); } };
  return <>
    <PageHeader title="Catalogue" subtitle={`${products?.length ?? '…'} products · Prices are demo catalogue values`} actions={<Button variant="primary" onClick={() => { setFormError(''); setShowCreate(true); }}>＋ Add product</Button>} />
    <div className="toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Search name, SKU, fabric…" /><select className="filter-select" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Category: All</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></div>
    <div className="content-area">{error ? <ErrorState message={error} onRetry={() => void load()} /> : products === null ? <LoadingState label="Loading product catalogue…" /> : products.length === 0 ? <EmptyState title="No products found" description="Add a product or clear the search filter." action={<Button variant="primary" onClick={() => setShowCreate(true)}>Add product</Button>} /> : <div className="product-grid">{products.map((product, index) => <Link href={`/catalogue/${product.id}`} className="product-card" key={product.id}><div className="product-visual">{productSymbols[index % productSymbols.length]}</div><div className="product-body"><div className="product-name">{product.name}</div><div className="product-sku">SKU: {product.sku}</div><div className="product-meta"><span className="product-price">{formatMoney(product.price)}</span><span className="product-moq">MOQ {product.moq}</span></div><span className="product-tag">{product.category}</span><span className="product-tag">{product.fabric}</span></div></Link>)}</div>}</div>
    {showCreate && <Modal title="Create product" onClose={() => setShowCreate(false)}><ProductForm onSubmit={createProduct} onCancel={() => setShowCreate(false)} saving={saving} error={formError} /></Modal>}
    {toast && <Toast message={toast} onClose={() => setToast('')} />}
  </>;
}
