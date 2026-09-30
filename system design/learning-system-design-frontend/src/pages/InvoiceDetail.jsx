import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoicesAPI } from '../api/invoices';
import { paymentsAPI } from '../api/payments';
import { whatsappAPI } from '../api/whatsapp';
import PaymentModal from '../components/PaymentModal';
import './InvoiceDetail.css';

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchInvoice();
    }
  }, [id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const data = await invoicesAPI.getInvoice(id);
      setInvoice(data.invoice);
      await fetchPayments();
    } catch (error) {
      console.error('Failed to fetch invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const data = await paymentsAPI.getInvoicePayments(id);
      setPayments(data.payments);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    }
  };

  const handlePaymentRecorded = () => {
    setShowPaymentModal(false);
    fetchInvoice(); // Refresh invoice and payments
    alert('Payment recorded successfully!');
  };

  const handleSendPaymentReminder = async () => {
    if (!invoice.customer?.whatsapp) {
      alert('Customer WhatsApp number not available');
      return;
    }

    if (invoice.balanceDue <= 0) {
      alert('Invoice is already fully paid');
      return;
    }

    if (!window.confirm(`Send payment reminder to ${invoice.customer.companyName} via WhatsApp?`)) return;

    try {
      await whatsappAPI.sendPaymentReminder(id);
      alert('Payment reminder sent via WhatsApp successfully!');
    } catch (error) {
      console.error('Failed to send WhatsApp:', error);
      alert(error.response?.data?.error || 'Failed to send WhatsApp message');
    }
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PAID': return 'status-paid';
      case 'PARTIALLY_PAID': return 'status-partial';
      case 'UNPAID': return 'status-unpaid';
      case 'OVERDUE': return 'status-overdue';
      default: return '';
    }
  };

  const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    if (num === 0) return 'Zero';

    const convertBelowThousand = (n) => {
      if (n === 0) return '';
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertBelowThousand(n % 100) : '');
    };

    if (num < 1000) return convertBelowThousand(num);
    if (num < 100000) return convertBelowThousand(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + convertBelowThousand(num % 1000) : '');
    if (num < 10000000) return convertBelowThousand(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + convertBelowThousand(num % 100000) : '');
    return convertBelowThousand(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + convertBelowThousand(num % 10000000) : '');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="loading-container">
        <div>Invoice not found</div>
      </div>
    );
  }

  return (
    <div className="invoice-detail">
      {/* Top Bar - Hidden in print */}
      <div className="topbar no-print">
        <div>
          <div className="crumbs">
            Invoices / <b>{invoice.invoiceNumber}</b>
          </div>
          <h1>
            Tax Invoice
            <span className={`status-pill ${getStatusColor(invoice.status)}`}>
              {invoice.status.replace('_', ' ')}
            </span>
          </h1>
        </div>
        <div className="topbar-actions">
          <button className="btn" onClick={() => navigate('/invoices')}>Back to Invoices</button>
          {invoice.balanceDue > 0 && (
            <button className="btn btn-primary" onClick={() => setShowPaymentModal(true)}>
              Record Payment
            </button>
          )}
          {invoice.customer?.whatsapp && invoice.balanceDue > 0 && (
            <button className="btn btn-whatsapp" onClick={handleSendPaymentReminder}>
              📱 Send Reminder
            </button>
          )}
          <button className="btn" onClick={handleDownloadPDF}>Download PDF</button>
          {invoice.order && (
            <button className="btn" onClick={() => navigate(`/orders/${invoice.order.id}`)}>
              View Order
            </button>
          )}
        </div>
      </div>

      {/* Invoice Document */}
      <div className="invoice-document">
        <div className="invoice-paper">
          {/* Header */}
          <div className="invoice-header">
            <div className="company-info">
              <h2>AMIT UNIFORM</h2>
              <p>I.O.C. Road, Chandkheda<br />Ahmedabad, Gujarat - 382424</p>
              <p>GSTIN: <strong>24XXXXX1234X1ZX</strong></p>
              <p>Email: info@amituniform.com | Phone: +91 79 2765 4321</p>
            </div>
            <div className="invoice-meta">
              <h1>TAX INVOICE</h1>
              <table className="meta-table">
                <tbody>
                  <tr>
                    <td>Invoice No:</td>
                    <td><strong>{invoice.invoiceNumber}</strong></td>
                  </tr>
                  <tr>
                    <td>Invoice Date:</td>
                    <td>{formatDate(invoice.invoiceDate)}</td>
                  </tr>
                  <tr>
                    <td>Due Date:</td>
                    <td>{formatDate(invoice.dueDate)}</td>
                  </tr>
                  {invoice.order && (
                    <tr>
                      <td>Order No:</td>
                      <td>{invoice.order.orderNumber}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bill To */}
          <div className="invoice-parties">
            <div className="party-box">
              <h3>Bill To:</h3>
              <p>
                <strong>{invoice.customer?.companyName}</strong><br />
                {invoice.customer?.contactPerson}<br />
                {invoice.customer?.address || 'Address on file'}<br />
                {invoice.customer?.city}, {invoice.customer?.state || 'Gujarat'}<br />
                Phone: {invoice.customer?.phone}<br />
                Email: {invoice.customer?.email}
              </p>
            </div>
            <div className="party-box">
              <h3>Ship To:</h3>
              <p>
                <strong>{invoice.customer?.companyName}</strong><br />
                {invoice.customer?.address || 'Address on file'}<br />
                {invoice.customer?.city}, {invoice.customer?.state || 'Gujarat'}
              </p>
            </div>
          </div>

          {/* Items Table */}
          <table className="invoice-items">
            <thead>
              <tr>
                <th>#</th>
                <th>Description</th>
                <th className="num">HSN/SAC</th>
                <th className="num">Qty</th>
                <th className="num">Rate</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>
                    <strong>{item.product?.name}</strong>
                    {item.customization && (
                      <><br /><span className="item-note">• {item.customization}</span></>
                    )}
                    {item.product?.fabric && (
                      <><br /><span className="item-note">Fabric: {item.product.fabric}</span></>
                    )}
                  </td>
                  <td className="num">6217</td>
                  <td className="num">{item.quantity}</td>
                  <td className="num">₹{item.unitPrice.toLocaleString('en-IN')}</td>
                  <td className="num">₹{item.total.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="invoice-totals-section">
            <div className="totals-left">
              <div className="amount-words">
                <strong>Amount in Words:</strong><br />
                {numberToWords(Math.round(invoice.total))} Rupees Only
              </div>

              {invoice.notes && (
                <div className="invoice-notes">
                  <strong>Notes:</strong><br />
                  {invoice.notes}
                </div>
              )}
            </div>

            <div className="totals-right">
              <table className="totals-table">
                <tbody>
                  <tr>
                    <td>Subtotal:</td>
                    <td>₹{invoice.subtotal.toLocaleString('en-IN')}</td>
                  </tr>
                  {invoice.discountAmount > 0 && (
                    <tr>
                      <td>Discount ({invoice.discountPercent}%):</td>
                      <td>- ₹{invoice.discountAmount.toLocaleString('en-IN')}</td>
                    </tr>
                  )}
                  <tr>
                    <td>Taxable Amount:</td>
                    <td>₹{(invoice.subtotal - invoice.discountAmount).toLocaleString('en-IN')}</td>
                  </tr>
                  {invoice.cgst > 0 && (
                    <>
                      <tr>
                        <td>CGST @ 9%:</td>
                        <td>₹{invoice.cgst.toLocaleString('en-IN')}</td>
                      </tr>
                      <tr>
                        <td>SGST @ 9%:</td>
                        <td>₹{invoice.sgst.toLocaleString('en-IN')}</td>
                      </tr>
                    </>
                  )}
                  {invoice.igst > 0 && (
                    <tr>
                      <td>IGST @ 18%:</td>
                      <td>₹{invoice.igst.toLocaleString('en-IN')}</td>
                    </tr>
                  )}
                  <tr className="total-row">
                    <td><strong>Total Amount:</strong></td>
                    <td><strong>₹{invoice.total.toLocaleString('en-IN')}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Status */}
          {invoice.amountPaid > 0 && (
            <div className="payment-status-box">
              <div className="payment-row">
                <span>Amount Paid:</span>
                <span>₹{invoice.amountPaid.toLocaleString('en-IN')}</span>
              </div>
              <div className="payment-row balance">
                <span><strong>Balance Due:</strong></span>
                <span><strong>₹{invoice.balanceDue.toLocaleString('en-IN')}</strong></span>
              </div>
            </div>
          )}

          {/* Payment History */}
          {payments.length > 0 && (
            <div className="payments-section">
              <h3>Payment History</h3>
              <table className="payments-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Date</th>
                    <th>Method</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="ref-num">{payment.referenceNumber}</td>
                      <td>{formatDate(payment.paymentDate)}</td>
                      <td>
                        <span className="payment-method">
                          {payment.method.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="amount">₹{payment.amount.toLocaleString('en-IN')}</td>
                      <td>
                        <span className="payment-status-badge">Received</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Terms & Bank Details */}
          <div className="invoice-footer">
            <div className="terms-box">
              <h3>Terms & Conditions:</h3>
              <pre>{invoice.termsConditions}</pre>
            </div>

            <div className="signature-box">
              <p>For <strong>AMIT UNIFORM</strong></p>
              <div className="signature-line"></div>
              <p>Authorized Signatory</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          invoice={invoice}
          onClose={() => setShowPaymentModal(false)}
          onPaymentRecorded={handlePaymentRecorded}
        />
      )}
    </div>
  );
};

export default InvoiceDetail;
