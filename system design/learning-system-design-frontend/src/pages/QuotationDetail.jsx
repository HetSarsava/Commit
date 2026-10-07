import { useCompany } from '../context/CompanyData';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { quotationsAPI } from '../api/quotations';
import { ordersAPI } from '../api/orders';
import { whatsappAPI } from '../api/whatsapp';
import QuotationBuilder from '../components/QuotationBuilder';
import BusinessFlow from '../components/BusinessFlow';
import { useAuth } from '../context/AuthContext';
import './QuotationDetail.css';

const QuotationDetail = () => {
  const company = useCompany();
  const { user } = useAuth();
  const [flow, setFlow] = useState(null), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false), [showDocument, setShowDocument] = useState(false);

  const fetchQuotation = useCallback(async () => {
    try {
      setLoading(true);
      const data = await quotationsAPI.getQuotation(id);
      setQuotation(data.quotation);
    } catch (error) {
      console.error('Failed to fetch quotation:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { let active = true; Promise.resolve().then(() => { if (active) void fetchQuotation(); }); return () => { active = false; }; }, [fetchQuotation]);

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
    if (busy || !flow) return;
    if (flow.order) { navigate('/orders/' + flow.order.id); return; }
    setBusy(true); setNotice('');

    try {
      const response = await ordersAPI.createOrderFromQuotation(id);
      navigate(`/orders/${response.order.id}`);
    } catch (error) {
      console.error('Failed to convert:', error);
      setNotice(error.response?.data?.error || 'Could not create order.');
    } finally { setBusy(false); }
  };

  const handleSendWhatsApp = async () => {
    if (busy) return;
    if (!quotation.customer?.whatsapp) {
      alert('Customer WhatsApp number not available');
      return;
    }

    if (!window.confirm(`Send quotation to ${quotation.customer.companyName} via WhatsApp?`)) return;
    setBusy(true);

    try {
      await whatsappAPI.sendQuotation(id);
      setNotice('Message submitted. Open WhatsApp to check delivery.');
    } catch (error) {
      console.error('Failed to send WhatsApp:', error);
      setNotice(error.response?.data?.error || 'Message was not sent.');
    } finally { setBusy(false); }
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
          </h1><p className="document-value">Total INR {Number(quotation.total).toLocaleString('en-IN')}</p>
        </div>
        <div className="topbar-actions">
          <button className="btn" onClick={() => setShowDocument(s => !s)}>{showDocument ? 'Hide quotation' : 'View quotation'}</button>
          <button className="btn btn-ghost" onClick={handleDownloadPdf}>Print / Save PDF</button>
          {['ADMIN', 'SALES'].includes(user.role) && quotation.status === 'DRAFT' && <button className="btn" onClick={handleEdit}>Edit</button>}
          {quotation.customer?.whatsapp && (
            <button className="btn btn-whatsapp" disabled={busy} onClick={handleSendWhatsApp}>
               Send via WhatsApp
            </button>
          )}
          {['ADMIN', 'SALES'].includes(user.role) && <button className="btn btn-primary" disabled={busy || !flow || (!flow.order && ['REJECTED', 'EXPIRED'].includes(quotation.status))} onClick={handleConvertToOrder}>
            {flow?.order ? 'Open order' : busy ? 'Working…' : 'Create order'}
          </button>}
        </div>
      </div>

      {/* Workflow Stepper */}
      {notice && <p role="status" className="workflow-notice">{notice}</p>}
      <BusinessFlow kind="quotations" id={id} revision={quotation.updatedAt} onLoaded={setFlow} />

      {/* Content: Two Column Layout */}
      <div className="content-layout" style={{display: showDocument ? "flex" : "none"}}>
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
            <h3>Customer details</h3>
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

          {/* Actions */}
          <div className="card side-card">
            <h3>Actions</h3>
            <div className="action-list">
              <button type="button" className="action-btn wa" disabled={busy} onClick={handleSendWhatsApp}> Send on WhatsApp</button>


              <button type="button" className="action-btn" disabled={quotation.status !== "DRAFT" || !["ADMIN", "SALES"].includes(user.role)} onClick={handleEdit}> Edit quotation</button>
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
