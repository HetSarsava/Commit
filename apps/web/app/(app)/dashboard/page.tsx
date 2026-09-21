'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { get } from '../../../lib/api';
import { DashboardSummary, labelize } from '../../../lib/types';
import { Card, ErrorState, LoadingState, PageHeader } from '../../../components/ui';

const pipelineOrder = ['NEW', 'CONTACTED', 'QUALIFIED', 'QUOTATION', 'WON', 'LOST'];

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try { setSummary(await get<DashboardSummary>('/dashboard')); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load dashboard'); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (error) return <><PageHeader title="Dashboard" subtitle="A real-time view of your Commit workspace" /><ErrorState message={error} onRetry={() => void load()} /></>;
  if (!summary) return <><PageHeader title="Dashboard" subtitle="A real-time view of your Commit workspace" /><LoadingState label="Loading live workspace metrics…" /></>;

  const largest = Math.max(...pipelineOrder.map((stage) => summary.pipeline[stage] || 0), 1);
  const cards = [
    { label: 'Total leads', value: summary.leads, note: 'Persisted pipeline records', accent: true },
    { label: 'Customers', value: summary.customers, note: 'Active customer records' },
    { label: 'Active quotations', value: summary.activeQuotations, note: 'Draft or sent' },
    { label: 'Confirmed sales orders', value: summary.confirmedSalesOrders, note: 'Ready for next operations' },
  ];

  return <>
    <PageHeader title="Dashboard" subtitle="Good morning — your live Commit workspace" actions={<span className="filter-chip active">Demo organization · This workspace</span>} />
    <div className="content-area">
      <div className="kpi-grid">{cards.map((card) => <div className={`kpi ${card.accent ? 'accent' : ''}`} key={card.label}><div className="kpi-label">{card.label}</div><div className="kpi-value">{card.value}</div><div className="kpi-note">{card.note}</div></div>)}</div>
      <div className="dashboard-grid">
        <Card><div className="card-head"><div><h2>Lead pipeline</h2><p>Counts from PostgreSQL, grouped by current status</p></div><Link href="/leads" className="card-link">View leads →</Link></div><div className="pipeline">{pipelineOrder.map((stage, index) => { const count = summary.pipeline[stage] || 0; return <div className="pipeline-row" key={stage}><span className="pipeline-label">{labelize(stage)}</span><div className="pipeline-track"><div className={`pipeline-fill ${index === 0 ? 'highlight' : ''}`} style={{ width: `${Math.max((count / largest) * 100, count ? 8 : 0)}%` }}>{count > 0 && count}</div></div><span className="pipeline-total">{count}</span></div>; })}</div></Card>
        <Card className="insight-card"><div className="card-head"><h2>Workspace health <span className="beta">LIVE</span></h2></div><div className="insight">The dashboard is connected to the same organization-scoped records used by Leads, Quotations and Sales Orders.</div><div className="insight"><b>{summary.productCount}</b> active products are available for new quotations.</div><div className="insight">Use the lead detail action to move an existing requirement into a customer and quotation.</div></Card>
        <Card><div className="card-head"><div><h2>Milestone path</h2><p>The first real Commit slice</p></div></div><div className="mini-list"><div className="mini-list-row"><div><strong>Lead → Customer</strong><span>Associate a customer from lead detail</span></div><span className="status-badge status-won">Ready</span></div><div className="mini-list-row"><div><strong>Catalogue → Quotation</strong><span>Select products and set prices</span></div><span className="status-badge status-won">Ready</span></div><div className="mini-list-row"><div><strong>Quotation → Sales Order</strong><span>Accept, then convert once</span></div><span className="status-badge status-won">Ready</span></div></div></Card>
        <Card><div className="card-head"><div><h2>Later modules</h2><p>Existing prototype screens remain available to Admin</p></div></div><div className="mini-list"><div className="mini-list-row"><div><strong>Payments & production</strong><span>Prototype navigation preserved</span></div><span className="status-badge status-draft">Later</span></div><div className="mini-list-row"><div><strong>WhatsApp & marketing</strong><span>No external integrations are claimed</span></div><span className="status-badge status-draft">Later</span></div><div className="mini-list-row"><div><strong>Reports & workflows</strong><span>Screen shells retained for growth</span></div><span className="status-badge status-draft">Later</span></div></div></Card>
      </div>
    </div>
  </>;
}
