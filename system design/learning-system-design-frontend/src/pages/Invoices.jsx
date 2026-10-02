import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoicesAPI } from '../api/invoices';
import './Invoices.css';

const Invoices = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchInvoices();
  }, [filterStatus, searchQuery]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await invoicesAPI.getInvoices({
        status: filterStatus === 'ALL' ? undefined : filterStatus,
        search: searchQuery || undefined,
        limit: 100,
      });
      setInvoices(data.invoices);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (invoice) => {
    navigate(`/invoices/${invoice.id}`);
  };

  const handleCardKeyDown = (event, invoice) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleView(invoice);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PAID':
        return 'status-paid';
      case 'PARTIALLY_PAID':
        return 'status-partial';
      case 'UNPAID':
        return 'status-unpaid';
      case 'OVERDUE':
        return 'status-overdue';
      default:
        return '';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="invoices-page">
      {/* Top Bar */}
      <div className="topbar">
        <div>
          <h1>Tax Invoices</h1>
          <div className="sub">{invoices.length} invoices</div>
        </div>
        <div className="topbar-actions">
          <button className="btn" disabled title="Invoice export is not configured">Export</button>
          <button className="btn btn-primary" onClick={() => navigate('/orders')}>
            + New Invoice (from Order)
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search">
          <input
            placeholder="Search by invoice number, company…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search invoices by invoice number or company"
          />
        </div>
        <div className="tabs">
          <button
            type="button"
            className={`tab ${filterStatus === 'ALL' ? 'active' : ''}`}
            aria-pressed={filterStatus === 'ALL'}
            onClick={() => setFilterStatus('ALL')}
          >
            All
          </button>
          <button
            type="button"
            className={`tab ${filterStatus === 'UNPAID' ? 'active' : ''}`}
            aria-pressed={filterStatus === 'UNPAID'}
            onClick={() => setFilterStatus('UNPAID')}
          >
            Unpaid
          </button>
          <button
            type="button"
            className={`tab ${filterStatus === 'PARTIALLY_PAID' ? 'active' : ''}`}
            aria-pressed={filterStatus === 'PARTIALLY_PAID'}
            onClick={() => setFilterStatus('PARTIALLY_PAID')}
          >
            Partial
          </button>
          <button
            type="button"
            className={`tab ${filterStatus === 'PAID' ? 'active' : ''}`}
            aria-pressed={filterStatus === 'PAID'}
            onClick={() => setFilterStatus('PAID')}
          >
            Paid
          </button>
        </div>
      </div>

      {/* Invoices List */}
      <div className="content-area">
        {loading ? (
          <div className="loading-state">Loading...</div>
        ) : invoices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">▣</div>
            <h3>No invoices yet</h3>
            <p>Generate invoices from confirmed orders</p>
            <button className="btn btn-primary" onClick={() => navigate('/orders')}>
              View Orders
            </button>
          </div>
        ) : (
          <div className="invoices-list">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="invoice-card"
                role="button"
                tabIndex={0}
                aria-label={`View invoice ${invoice.invoiceNumber}`}
                onClick={() => handleView(invoice)}
                onKeyDown={(event) => handleCardKeyDown(event, invoice)}
              >
                <div className="invoice-header">
                  <div className="invoice-number">{invoice.invoiceNumber}</div>
                  <div className={`status-badge ${getStatusColor(invoice.status)}`}>
                    {invoice.status.replace('_', ' ')}
                  </div>
                </div>

                <div className="invoice-body">
                  <div className="invoice-customer">
                    <strong>{invoice.customer?.companyName}</strong>
                    <div className="invoice-contact">{invoice.customer?.contactPerson}</div>
                  </div>

                  <div className="invoice-details">
                    <div className="invoice-meta">
                      <span className="label">Invoice Date:</span>
                      <span className="value">{formatDate(invoice.invoiceDate)}</span>
                    </div>
                    <div className="invoice-meta">
                      <span className="label">Due Date:</span>
                      <span className="value">{formatDate(invoice.dueDate)}</span>
                    </div>
                    {invoice.order && (
                      <div className="invoice-meta">
                        <span className="label">Order:</span>
                        <span className="value">{invoice.order.orderNumber}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="invoice-footer">
                  <div className="invoice-amount">
                    <span className="label">Total:</span>
                    <span className="amount">₹{Number(invoice.total).toLocaleString('en-IN')}</span>
                  </div>
                  {invoice.balanceDue > 0 && (
                    <div className="payment-status">
                      <span className="balance-due">
                        ₹{Number(invoice.balanceDue).toLocaleString('en-IN')} due
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Invoices;
