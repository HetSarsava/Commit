import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ordersAPI } from '../api/orders';
import { invoicesAPI } from '../api/invoices';
import { whatsappAPI } from '../api/whatsapp';
import './OrderDetail.css';

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchOrder();
    }
  }, [id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const data = await ordersAPI.getOrder(id);
      setOrder(data.order);
    } catch (error) {
      console.error('Failed to fetch order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      await ordersAPI.updateOrder(id, { status: newStatus });
      fetchOrder();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update order status');
    }
  };

  const handleGenerateInvoice = async () => {
    if (!window.confirm('Generate tax invoice for this order?')) return;

    try {
      const response = await invoicesAPI.createInvoiceFromOrder(id);
      alert(`Invoice ${response.invoice.invoiceNumber} generated successfully!`);
      navigate(`/invoices/${response.invoice.id}`);
    } catch (error) {
      console.error('Failed to generate invoice:', error);
      alert(error.response?.data?.error || 'Failed to generate invoice');
    }
  };

  const handleUpdateInvoice = async () => {
    if (!window.confirm('Update this unpaid invoice from the current order?')) return;
    try { await invoicesAPI.syncFromOrder(order.invoice.id); fetchOrder(); } catch(e) { alert(e.response?.data?.error || 'Could not update invoice'); }
  };
  const handleSendWhatsApp = async () => {
    if (!order.customer?.whatsapp) {
      alert('Customer WhatsApp number not available');
      return;
    }

    if (!window.confirm(`Send order confirmation to ${order.customer.companyName} via WhatsApp?`)) return;

    try {
      await whatsappAPI.sendOrderConfirmation(id);
      alert('Order confirmation sent via WhatsApp successfully!');
    } catch (error) {
      console.error('Failed to send WhatsApp:', error);
      alert(error.response?.data?.error || 'Failed to send WhatsApp message');
    }
  };

  const handleEditSourceQuotation = () => {
    if (!order.quotation?.id) {
      alert('This order has no source quotation to edit.');
      return;
    }
    navigate(`/quotations/${order.quotation.id}`);
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'PENDING': return 'Pending confirmation';
      case 'CONFIRMED': return 'Order confirmed';
      case 'IN_PRODUCTION': return 'In production';
      case 'COMPLETED': return 'Completed';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  };

  const getStepStatus = (stepIndex) => {
    const statusMap = {
      'PENDING': 0,
      'CONFIRMED': 2,
      'IN_PRODUCTION': 3,
      'COMPLETED': 5,
      'CANCELLED': 0,
    };
    const currentStep = statusMap[order?.status] || 0;
    if (stepIndex < currentStep) return 'done';
    if (stepIndex === currentStep) return 'current';
    return '';
  };

  const calculatePaymentProgress = () => {
    if (!order || !order.total) return 0;
    const paid = order.advanceAmount || 0;
    return (paid / order.total) * 100;
  };

  if (loading) {
    return (
      <div className="order-detail">
        <div className="loading-container">
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="order-detail">
        <div className="loading-container">
          <div>Order not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="order-detail">
      {/* Top Bar */}
      <div className="topbar">
        <div>
          <div className="crumbs">
            {order.customer?.companyName} / <b>Sales Order {order.orderNumber}</b>
          </div>
          <h1>
            Sales Order
            <span className="status-pill">{getStatusLabel(order.status)}</span>
          </h1>
        </div>
        <div className="topbar-actions">
          <button className="btn" onClick={handleDownloadPdf}>Print / Save PDF</button>
          <button className="btn" onClick={handleEditSourceQuotation} disabled={!order.quotation?.id}>Edit source quotation</button>
          {order.customer?.whatsapp && (
            <button className="btn btn-whatsapp" onClick={handleSendWhatsApp}>
              📱 Send Update
            </button>
          )}
          {order.invoice ? <><button className="btn" onClick={() => navigate('/invoices/' + order.invoice.id)}>View Invoice</button>{order.invoice.needsUpdate && <button className="btn" disabled={order.invoice.hasPayments} title={order.invoice.hasPayments ? "An invoice with payments needs an accountant-reviewed correction" : "Update the existing unpaid invoice"} onClick={handleUpdateInvoice}>Update Invoice from Order</button>}</> : <button className="btn btn-convert" onClick={handleGenerateInvoice}>Generate Tax Invoice</button>}
        </div>
      </div>

      {/* Workflow Stepper */}
      <div className="stepper">
        <div className={`step ${getStepStatus(0)}`}>
          <div className="step-num">{getStepStatus(0) === 'done' ? '✓' : '1'}</div>
          Quotation
        </div>
        <div className={`step ${getStepStatus(1)}`}>
          <div className="step-num">{getStepStatus(1) === 'done' ? '✓' : '2'}</div>
          Proforma Invoice
        </div>
        <div className={`step ${getStepStatus(2)}`}>
          <div className="step-num">{getStepStatus(2) === 'done' ? '✓' : '3'}</div>
          Order confirmed
        </div>
        <div className={`step ${getStepStatus(3)}`}>
          <div className="step-num">{getStepStatus(3) === 'done' ? '✓' : '4'}</div>
          Production
        </div>
        <div className={`step ${getStepStatus(4)}`}>
          <div className="step-num">{getStepStatus(4) === 'done' ? '✓' : '5'}</div>
          Billing & Dispatch
        </div>
      </div>

      {/* Content: Two Column Layout */}
      <div className="content-layout">
        {/* Document Column */}
        <div className="doc-col">
          {/* Order Summary */}
          <div className="card">
            <div className="card-head">
              <h3>Order summary</h3>
            </div>
            <div className="info-grid">
              <div className="info-item">
                <div className="k">Order date</div>
                <div className="v">{formatDate(order.createdAt)}</div>
              </div>
              <div className="info-item">
                <div className="k">Delivery due</div>
                <div className="v">{formatDate(order.deliveryDate)}</div>
              </div>
              <div className="info-item">
                <div className="k">Order value</div>
                <div className="v">₹{order.total.toLocaleString('en-IN')}</div>
              </div>
            </div>
            {order.poNumber && (
              <div className="info-grid" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
                <div className="info-item">
                  <div className="k">PO Number</div>
                  <div className="v">{order.poNumber}</div>
                </div>
                <div className="info-item">
                  <div className="k">Payment terms</div>
                  <div className="v">{order.advanceAmount ? '50% advance' : 'Net 30'}</div>
                </div>
                <div className="info-item">
                  <div className="k">Items count</div>
                  <div className="v">{order.items?.length || 0} items</div>
                </div>
              </div>
            )}
          </div>

          {/* Items Ordered */}
          <div className="card">
            <div className="card-head">
              <h3>Items ordered</h3>
            </div>
            <table className="items">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="num">Qty</th>
                  <th className="num">Rate</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="item-name">{item.product?.name}</div>
                      <div className="item-sub">
                        SKU: {item.product?.sku}
                        {item.customization && ` • ${item.customization}`}
                      </div>
                    </td>
                    <td className="num">{item.quantity}</td>
                    <td className="num">₹{item.unitPrice.toLocaleString('en-IN')}</td>
                    <td className="num">₹{item.total.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Production Mini-Tracker */}
            {order.status === 'IN_PRODUCTION' && (
              <>
                <div className="mini-track">
                  <div className="mt-seg filled"></div>
                  <div className="mt-seg filled"></div>
                  <div className="mt-seg filled"></div>
                  <div className="mt-seg filled"></div>
                  <div className="mt-seg"></div>
                  <div className="mt-seg"></div>
                  <div className="mt-seg"></div>
                </div>
                <div className="mt-labels">
                  <span>Material</span>
                  <span>Cutting</span>
                  <span>Stitching</span>
                  <span>Finishing</span>
                  <span>QC</span>
                  <span>Packing</span>
                  <span>Dispatch</span>
                </div>
              </>
            )}
          </div>

          {/* Order Activity Timeline */}
          <div className="card">
            <div className="card-head">
              <h3>Order activity</h3>
            </div>
            <div className="timeline">
              {order.status === 'IN_PRODUCTION' && (
                <div className="tl-item now">
                  <div className="tl-dot"></div>
                  <div className="tl-body">
                    <div className="tl-title">Production in progress</div>
                    <div className="tl-time">Current status</div>
                  </div>
                </div>
              )}
              {order.confirmedAt && (
                <div className="tl-item">
                  <div className="tl-dot"></div>
                  <div className="tl-body">
                    <div className="tl-title">Order confirmed</div>
                    <div className="tl-time">{formatDate(order.confirmedAt)}</div>
                  </div>
                </div>
              )}
              {order.advanceAmount && (
                <div className="tl-item">
                  <div className="tl-dot"></div>
                  <div className="tl-body">
                    <div className="tl-title">Advance payment received — ₹{order.advanceAmount.toLocaleString('en-IN')}</div>
                    <div className="tl-time">{formatDate(order.createdAt)}</div>
                  </div>
                </div>
              )}
              <div className="tl-item">
                <div className="tl-dot"></div>
                <div className="tl-body">
                  <div className="tl-title">Order created{order.quotation ? ` from Quotation ${order.quotation.quotationNumber}` : ''}</div>
                  <div className="tl-time">{formatDate(order.createdAt)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Side Column */}
        <div className="side-col">
          {/* Customer Info */}
          <div className="card side-card">
            <h3>Customer</h3>
            <div className="side-row">
              <span className="k">Company</span>
              <span className="v">{order.customer?.companyName}</span>
            </div>
            <div className="side-row">
              <span className="k">Contact</span>
              <span className="v">{order.customer?.contactPerson}</span>
            </div>
            <div className="side-row">
              <span className="k">Salesperson</span>
              <span className="v">{order.salesPerson?.name}</span>
            </div>
          </div>

          {/* Payment Status */}
          <div className="card side-card">
            <h3>Payment status</h3>
            <div className="payment-bar">
              <div className="fill" style={{ width: `${calculatePaymentProgress()}%` }}></div>
            </div>
            <div className="payment-note">
              ₹{(order.advanceAmount || 0).toLocaleString('en-IN')} received of ₹{order.total.toLocaleString('en-IN')}
            </div>
            <div className="side-row" style={{ marginTop: '8px' }}>
              <span className="k">Balance due</span>
              <span className="v">₹{(order.balanceAmount || order.total - (order.advanceAmount || 0)).toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Status Updates */}
          <div className="card side-card">
            <h3>Update status</h3>
            <div className="action-list">
              {order.status === 'PENDING' && (
                <button type="button" className="action-btn primary" onClick={() => handleUpdateStatus('CONFIRMED')}>
                  Confirm order
                </button>
              )}
              {order.status === 'CONFIRMED' && (
                <button type="button" className="action-btn primary" onClick={() => handleUpdateStatus('IN_PRODUCTION')}>
                  Start production
                </button>
              )}
              {order.status === 'IN_PRODUCTION' && (
                <button type="button" className="action-btn primary" onClick={() => handleUpdateStatus('COMPLETED')}>
                  Mark as completed
                </button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="card side-card">
            <h3>Actions</h3>
            <div className="action-list">
              <button type="button" className="action-btn wa" disabled title="Dispatch updates are managed from the Dispatch screen">Send dispatch update</button>
              <button type="button" className="action-btn" disabled title="Partial dispatch logging is not configured">Log partial dispatch</button>
              {order.quotation && (
                <button type="button" className="action-btn" onClick={() => navigate(`/quotations/${order.quotation.id}`)}>
                  View linked quotation
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
