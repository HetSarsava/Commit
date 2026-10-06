import { useCompany } from '../context/CompanyData';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { quotationsAPI } from '../api/quotations';
import { ordersAPI } from '../api/orders';
import { whatsappAPI } from '../api/whatsapp';
import QuotationBuilder from '../components/QuotationBuilder';
import './QuotationDetail.css';

const QuotationDetail = () => {
  const company = useCompany();
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchQuotation();
    }
  }, [id]);

  const fetchQuotation = async () => {
    try {
      setLoading(true);
      const data = await quotationsAPI.getQuotation(id);
      setQuotation(data.quotation);
    } catch (error) {
      console.error('Failed to fetch quotation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditorOpen(true);
  };

  const handleEditorSuccess = () => {
    setIsEditorOpen(false);
    fetchQuotation();
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this quotation?')) return;

    try {
      await quotationsAPI.deleteQuotation(id);
      navigate('/quotations');
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete quotation');
    }
  };

  const handleConvertToOrder = async () => {
    if (!window.confirm('Convert this quotation to a sales order?')) return;

    try {
      const response = await ordersAPI.createOrderFromQuotation(id);
      alert(`Order ${response.order.orderNumber} created successfully!`);
      navigate(`/orders/${response.order.id}`);
    } catch (error) {
      console.error('Failed to convert:', error);
      alert(error.response?.data?.error || 'Failed to convert to order');
    }
  };

  const handleSendWhatsApp = async () => {
    if (!quotation.customer?.whatsapp) {
      alert('Customer WhatsApp number not available');
      return;
    }

    if (!window.confirm(`Send quotation to ${quotation.customer.companyName} via WhatsApp?`)) return;

    try {
      await whatsappAPI.sendQuotation(id);
      alert('Quotation sent via WhatsApp successfully!');
    } catch (error) {
      console.error('Failed to send WhatsApp:', error);
      alert(error.response?.data?.error || 'Failed to send WhatsApp message');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="quotation-detail">
        <div className="loading-container">
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="quotation-detail">
        <div className="loading-container">
          <div>Quotation not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="quotation-detail">
      {/* Top Bar */}
      <div className="topbar">
        <div>
          <div className="crumbs">
            {quotation.customer?.companyName} / <b>Quotation {quotation.quotationNumber}</b>
          </div>
          <h1>
            Quotation
            <span className="status-pill">{quotation.status}</span>
          </h1>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-ghost" onClick={handleDownloadPdf}>Print / Save PDF</button>
          <button className="btn" onClick={handleEdit}>Edit</button>
          {quotation.customer?.whatsapp && (
            <button className="btn btn-whatsapp" onClick={handleSendWhatsApp}>
               Send via WhatsApp
            </button>
          )}
          <button className="btn btn-convert" onClick={handleConvertToOrder}>
            Convert → Sales Order
          </button>
        </div>
      </div>

      {/* Workflow Stepper */}
      <div className="stepper">
        <div className={`step ${quotation.status !== 'DRAFT' ? 'done' : 'current'}`}>
          <div className="step-num">{quotation.status !== 'DRAFT' ? '✓' : '1'}</div>
          Quotation sent
        </div>
        <div className="step">
          <div className="step-num">2</div>
          Proforma Invoice
        </div>
        <div className="step">
          <div className="step-num">3</div>
          Sales Order
        </div>
        <div className="step">
          <div className="step-num">4</div>
          Dispatch
        </div>
        <div className="step">
          <div className="step-num">5</div>
          Tax Invoice
        </div>
      </div>

      {/* Content: Two Column Layout */}
      <div className="content-layout">
        {/* Document Column */}
        <div className="doc-col">
          <div className="card">
            {/* Document Header */}
            <div className="doc-header">
              <div className="from">
                <b>{company.name}</b>
                {company.address}<br />
                GSTIN: {company.gstin || "Not added"}
              </div>
              <div className="doc-meta">
                <div className="qno">{quotation.quotationNumber}</div>
                Date: {formatDate(quotation.createdAt)}<br />
                Valid until: {formatDate(quotation.validUntil)}
              </div>
            </div>

            {/* Bill To */}
            <div className="bill-to">
              <h4>Bill to</h4>
              <div className="co">{quotation.customer?.companyName}</div>
              <div className="addr">
                {quotation.customer?.contactPerson}<br />
                {quotation.customer?.mobile} · {quotation.customer?.email}
              </div>
            </div>

            {/* Items Table */}
            <table className="items">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="num">Qty</th>
                  <th className="num">Rate</th>
                  <th className="num">Discount</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {quotation.items?.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="item-name">{item.description || item.product?.name}</div>
                      <div className="item-sub">
                        {item.product?.sku && `SKU: ${item.product.sku}`}
                        {item.customization && ` · ${item.customization}`}
                      </div>
                    </td>
                    <td className="num">{item.quantity}</td>
                    <td className="num">₹{item.unitPrice.toLocaleString('en-IN')}</td>
                    <td className="num">{item.discount ? `₹${item.discount.toLocaleString('en-IN')}` : '—'}</td>
                    <td className="num">₹{item.total.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="totals">
              <div className="row">
                <span>Subtotal</span>
                <span className="v">₹{quotation.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              {quotation.discountAmount > 0 && (
                <div className="row">
                  <span>Discount ({quotation.discountPercent}%)</span>
                  <span className="v">-₹{quotation.discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="row gst">
                <span>CGST (9%)</span>
                <span className="v">₹{(quotation.taxAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="row gst">
                <span>SGST (9%)</span>
                <span className="v">₹{(quotation.taxAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="row grand">
                <span>Total payable</span>
                <span className="v">₹{quotation.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Terms */}
            {quotation.termsConditions && (
              <div className="terms">
                <h4>Terms & conditions</h4>
                <div className="terms-text">{quotation.termsConditions}</div>
              </div>
            )}

            {/* Notes */}
            {quotation.notes && (
              <div className="notes">
                <h4>Notes</h4>
                <div className="notes-text">{quotation.notes}</div>
              </div>
            )}

            {/* Bank Details */}
            <div className="bank-strip">
              <span><b>Bank:</b> State Bank of India</span>
              <span><b>A/C No.:</b> 43377408488</span>
              <span><b>IFSC:</b> SBIN0011768</span>
              <span><b>Branch:</b> {company.address}</span>
            </div>
          </div>
        </div>

        {/* Side Column */}
        <div className="side-col">
          {/* Linked Lead */}
          <div className="card side-card">
            <h3>Linked lead</h3>
            <div className="side-row">
              <span className="k">Contact</span>
              <span className="v">{quotation.customer?.contactPerson}</span>
            </div>
            <div className="side-row">
              <span className="k">Source</span>
              <span className="v">{quotation.customer?.source || '-'}</span>
            </div>
            <div className="side-row">
              <span className="k">Salesperson</span>
              <span className="v">{quotation.salesPerson?.name}</span>
            </div>
            <div className="side-row">
              <span className="k">Status</span>
              <span className="v">{quotation.status}</span>
            </div>
          </div>

          {/* Payment Status */}
          <div className="card side-card">
            <h3>Payment status</h3>
            <div className="payment-bar">
              <div className="fill" style={{ width: '0%' }}></div>
            </div>
            <div className="payment-note">₹0 received of ₹{quotation.total.toLocaleString('en-IN')} due</div>
            <div className="side-row" style={{ marginTop: '8px' }}>
              <span className="k">Due date</span>
              <span className="v">On dispatch</span>
            </div>
          </div>

          {/* Actions */}
          <div className="card side-card">
            <h3>Actions</h3>
            <div className="action-list">
              <button type="button" className="action-btn wa" onClick={handleSendWhatsApp}> Send on WhatsApp</button>
              <button type="button" className="action-btn" disabled title="Email delivery is not configured"> Email PDF</button>
              <button type="button" className="action-btn" disabled title="Follow-up reminders are not configured"> Set follow-up reminder</button>
              <button type="button" className="action-btn" onClick={handleEdit}> Edit quotation</button>
              <button type="button" className="action-btn danger" onClick={handleDelete}> Delete quotation</button>
            </div>
          </div>
        </div>
      </div>
      {isEditorOpen && (
        <QuotationBuilder
          quotation={quotation}
          mode="edit"
          onClose={() => setIsEditorOpen(false)}
          onSuccess={handleEditorSuccess}
        />
      )}
    </div>
  );
};

export default QuotationDetail;
