import { useRef, useState } from 'react';
import { paymentsAPI } from '../api/payments';
import { MoneySummary } from './BusinessFlow';
import './ManualCRM.css';
export default function PaymentModal({ invoice, onClose, onPaymentRecorded }) {
  const [form, setForm] = useState({ amount: '', method: 'UPI', paymentDate: new Date().toLocaleDateString('en-CA'), transactionId: '', notes: '' });
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const request = useRef(null), lock = useRef(false);
  const change = (key, value) => setForm(s => ({ ...s, [key]: value }));
  async function save(e) {
    e.preventDefault();
    if (lock.current) return;
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > invoice.balanceDue) { setError('Enter an amount between INR 0.01 and the amount still due.'); return; }
    lock.current = true; setBusy(true); setError('');
    const payload = { ...form, invoiceId: invoice.id, amount };
    const fingerprint = JSON.stringify(payload);
    if (request.current?.fingerprint !== fingerprint) request.current = {fingerprint, referenceNumber: 'PAY-' + crypto.randomUUID()};
    try {
      await paymentsAPI.recordPayment({ ...payload, referenceNumber: request.current.referenceNumber });
      onPaymentRecorded?.();
    } catch (e) { setError(e.response?.data?.error || 'Could not confirm saving. Keep this form open and retry with the same details.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <div className="manual-overlay"><section className="manual-dialog payment-dialog" role="dialog" aria-modal="true" aria-label="Record payment">
    <header><div><h2>Record payment</h2><p>{invoice.invoiceNumber}</p></div><button className="btn" onClick={onClose} disabled={busy}>Close</button></header>
    <form onSubmit={save}><div className="manual-body">
      <MoneySummary invoice={invoice} />
      <p>Record money you have already received. This does not charge the customer.</p>
      {error && <p className="manual-error" role="alert">{error}</p>}
      <fieldset disabled={busy}><div className="manual-grid">
        <label>Amount received (INR)<input autoFocus required type="number" min="0.01" max={invoice.balanceDue} step="0.01" value={form.amount} onChange={e => change('amount', e.target.value)} /></label>
        <label>Paid by<select value={form.method} onChange={e => change('method', e.target.value)}>{[['UPI','UPI'], ['BANK_TRANSFER','Bank transfer'], ['CASH','Cash'], ['CHEQUE','Cheque'], ['CARD','Card']].map(([v,label]) => <option key={v} value={v}>{label}</option>)}</select></label>
        <label>Received on<input required type="date" value={form.paymentDate} onChange={e => change('paymentDate',e.target.value)} /></label>
      </div>
      <div className="manual-actions"><button className="btn" type="button" onClick={() => change('amount', (invoice.balanceDue / 2).toFixed(2))}>Half the balance</button><button className="btn" type="button" onClick={() => change('amount', Number(invoice.balanceDue).toFixed(2))}>Full balance</button></div>
      <details className="workflow-details"><summary>Reference or note (optional)</summary><div className="manual-grid"><label>Payment reference<input maxLength={250} value={form.transactionId} onChange={e => change('transactionId',e.target.value)} /></label><label>Note<input maxLength={2000} value={form.notes} onChange={e => change('notes',e.target.value)} /></label></div></details>
      </fieldset>
    </div><footer><span>The invoice balance updates when you save.</span><button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save payment'}</button></footer></form>
  </section></div>;
}
