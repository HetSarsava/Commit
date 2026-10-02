import { useState } from 'react';
import { paymentsAPI } from '../api/payments';
import './PaymentModal.css';

const PaymentModal = ({ invoice, onClose, onPaymentRecorded }) => {
  const [formData, setFormData] = useState({
    amount: '',
    method: 'BANK_TRANSFER',
    transactionId: '',
    notes: '',
    paymentDate: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (parseFloat(formData.amount) > invoice.balanceDue) {
      setError(`Amount cannot exceed balance due: ₹${invoice.balanceDue.toLocaleString('en-IN')}`);
      return;
    }

    try {
      setLoading(true);
      await paymentsAPI.recordPayment({
        invoiceId: invoice.id,
        amount: parseFloat(formData.amount),
        method: formData.method,
        transactionId: formData.transactionId || null,
        notes: formData.notes || null,
        paymentDate: formData.paymentDate,
      });

      if (onPaymentRecorded) {
        onPaymentRecorded();
      }
    } catch (err) {
      console.error('Failed to record payment:', err);
      setError(err.response?.data?.error || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const setQuickAmount = (percentage) => {
    const amount = (invoice.balanceDue * percentage) / 100;
    setFormData((prev) => ({
      ...prev,
      amount: amount.toFixed(2),
    }));
  };

  return (
    <div className="payment-modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Record Payment</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="invoice-summary">
            <div className="summary-row">
              <span>Invoice:</span>
              <strong>{invoice.invoiceNumber}</strong>
            </div>
            <div className="summary-row">
              <span>Total Amount:</span>
              <strong>₹{invoice.total.toLocaleString('en-IN')}</strong>
            </div>
            <div className="summary-row">
              <span>Already Paid:</span>
              <strong>₹{invoice.amountPaid.toLocaleString('en-IN')}</strong>
            </div>
            <div className="summary-row balance">
              <span>Balance Due:</span>
              <strong>₹{invoice.balanceDue.toLocaleString('en-IN')}</strong>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Payment Amount *</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="Enter amount"
                step="0.01"
                min="0.01"
                max={invoice.balanceDue}
                required
              />
              <div className="quick-amounts">
                <button
                  type="button"
                  className="quick-btn"
                  onClick={() => setQuickAmount(25)}
                >
                  25%
                </button>
                <button
                  type="button"
                  className="quick-btn"
                  onClick={() => setQuickAmount(50)}
                >
                  50%
                </button>
                <button
                  type="button"
                  className="quick-btn"
                  onClick={() => setQuickAmount(100)}
                >
                  Full Amount
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Payment Method *</label>
              <select
                name="method"
                value={formData.method}
                onChange={handleChange}
                required
              >
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CASH">Cash</option>
                <option value="CHEQUE">Cheque</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
              </select>
            </div>

            <div className="form-group">
              <label>Transaction ID / Reference</label>
              <input
                type="text"
                name="transactionId"
                value={formData.transactionId}
                onChange={handleChange}
                placeholder="Enter transaction ID or reference number"
              />
            </div>

            <div className="form-group">
              <label>Payment Date *</label>
              <input
                type="date"
                name="paymentDate"
                value={formData.paymentDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Add any notes about this payment"
                rows="3"
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
