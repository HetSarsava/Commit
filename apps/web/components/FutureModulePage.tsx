'use client';

import Link from 'next/link';
import { useAuth } from '../lib/auth-context';
import { Card, PageHeader } from './ui';

export function FutureModulePage({ title, subtitle, icon, legacyFile, adminOnly = true }: { title: string; subtitle: string; icon: string; legacyFile: string; adminOnly?: boolean }) {
  const { user } = useAuth();
  const restricted = adminOnly && user?.role !== 'Admin';
  return <><PageHeader title={title} subtitle={subtitle} /><div className="content-area"><Card className="prototype-panel"><div className="prototype-icon">{icon}</div>{restricted ? <><h2>Admin access required</h2><p>Your Sales role is scoped to the live lead-to-order slice. This module remains outside the current milestone.</p></> : <><h2>Prototype area retained</h2><p>This screen is preserved from the Commit product prototype and is ready for a later backend milestone. No external integration or fake live data is claimed here.</p><div className="prototype-list"><div><strong>Navigation preserved</strong><span>Move around the local prototype without dead ends.</span></div><div><strong>Scope is explicit</strong><span>Payments, production and integrations are not part of this slice.</span></div><div><strong>Next foundation</strong><span>Future domain modules can build on the persisted sales order.</span></div></div><p style={{ marginTop: 22, display: 'flex', gap: 9, justifyContent: 'center', flexWrap: 'wrap' }}><Link className="btn btn-primary" href={`/prototype/${legacyFile}`} target="_blank">Open original prototype</Link><Link className="btn btn-quiet" href="/dashboard">Return to dashboard</Link></p></>}</Card></div></>;
}
