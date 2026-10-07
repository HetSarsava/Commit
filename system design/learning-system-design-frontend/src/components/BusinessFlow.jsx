import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import './ManualCRM.css';
export default function BusinessFlow({ kind, id, revision = '', onLoaded }) {
  const navigate = useNavigate();
  const [flow, setFlow] = useState(null), [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api.get('/manual/workflow/' + kind + '/' + id).then(({data}) => {
      if (active) { setFlow(data); setError(''); onLoaded?.(data); }
    }).catch(() => { if (active) setError('Could not load linked records. Refresh to try again.'); });
    return () => { active = false; };
  }, [kind, id, revision, onLoaded]);
  return <section className="business-flow no-print" aria-label="Linked business records">
    <div className="flow-links">
      {flow?.customer && <button className="btn" onClick={() => navigate('/whatsapp?tab=customers&customerId=' + flow.customer.id)}>{flow.customer.name}</button>}
      {['quotation', 'order', 'invoice'].map(key => <button key={key} className={'flow-step' + (kind === key + 's' ? ' current' : '')} disabled={!flow?.[key]} onClick={() => navigate('/' + key + 's/' + flow[key].id)}>
        <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span><small>{flow?.[key]?.number || 'Not created'}</small>
      </button>)}
    </div>
    {error && <p role="alert">{error}</p>}
    {flow?.invoice && <MoneySummary invoice={flow.invoice} />}
  </section>;
}
export function MoneySummary({ invoice }) {
  return <div className="money-summary" aria-label="Payment summary">{[['Invoice total', invoice.total], ['Received', invoice.amountPaid], ['Still due', invoice.balanceDue]].map(([label, amount]) => <div key={label}><small>{label}</small><strong>₹{Number(amount || 0).toLocaleString('en-IN', {maximumFractionDigits: 2})}</strong></div>)}</div>;
}
