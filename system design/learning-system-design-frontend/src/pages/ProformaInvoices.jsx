import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { proformasAPI } from '../api/proformas';
import { quotationsAPI } from '../api/quotations';
import './ProformaInvoices.css';

const ProformaInvoices = () => {
  const navigate = useNavigate();
  const [proformas, setProformas] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};

      // Load data with individual error handling
      const proformasData = await proformasAPI.getAllProformas(params).catch(err => {
        console.error('Failed to load proformas:', err);
        return [];
      });

      const quotationsData = await quotationsAPI.getAllQuotations({ status: 'ACCEPTED' }).catch(err => {
        console.error('Failed to load quotations:', err);
        return [];
      });

      const summaryData = await proformasAPI.getProformaSummary().catch(err => {
        console.error('Failed to load summary:', err);
        return { totalProformas: 0, totalValue: 0, byStatus: {} };
      });

      setProformas(Array.isArray(proformasData) ? proformasData : []);
      setQuotations(Array.isArray(quotationsData) ? quotationsData : []);
      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to load proforma invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFromQuotation = async (e) => {
    e.preventDefault();
    if (!selectedQuotation) {
      alert('Please select a quotation');
      return;
    }

    try {
      await proformasAPI.createFromQuotation(selectedQuotation);
      alert('Proforma invoice created successfully');
      closeModal();
      loadData();
    } catch (error) {
      console.error('Failed to create proforma:', error);
      alert(error.response?.data?.error || 'Failed to create proforma invoice');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await proformasAPI.updateProformaStatus(id, newStatus);
      alert(`Proforma status updated to ${newStatus}`);
      loadData();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status');
    }
  };

  const handleConvertToOrder = async (id) => {
    if (!confirm('Convert this proforma invoice to a sales order?')) return;

    try {
      const response = await proformasAPI.convertToOrder(id);
      alert('Proforma converted to order successfully!');
      loadData();
      // Optionally navigate to order detail
      if (response.order) {
        navigate(`/orders/${response.order.id}`);
      }
    } catch (error) {
      console.error('Failed to convert to order:', error);
      alert(error.response?.data?.error || 'Failed to convert to order');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this proforma invoice?')) return;

    try {
      await proformasAPI.deleteProforma(id);
      alert('Proforma invoice deleted successfully');
      loadData();
    } catch (error) {
      console.error('Failed to delete proforma:', error);
      alert('Failed to delete proforma invoice');
    }
  };

  const openModal = () => {
    setSelectedQuotation('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      PENDING: 'status-pending',
      ACCEPTED: 'status-accepted',
      REJECTED: 'status-rejected',
      CONVERTED: 'status-converted',
    };
    return statusClasses[status] || 'status-pending';
  };

  const getStatusText = (status) => {
    const statusText = {
      PENDING: 'Pending',
      ACCEPTED: 'Accepted',
      REJECTED: 'Rejected',
      CONVERTED: 'Converted',
    };
    return statusText[status] || status;
  };

  return (
    <div className="proformas-page">
      {/* Top Bar */}
      <div className="topbar">
        <div>
          <h1>Proforma Invoices</h1>
          <div className="sub">Preliminary invoices before order confirmation</div>
        </div>
        <div className="topbar-actions">
          <button className="btn" onClick={openModal}>
            Create from Quotation
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-value">{summary.totalProformas}</div>
            <div className="summary-label">Total Proformas</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">₹{summary.totalValue.toLocaleString('en-IN')}</div>
            <div className="summary-label">Total Value</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{summary.byStatus?.PENDING?.count || 0}</div>
            <div className="summary-label">Pending</div>
          </div>
          <div className="summary-card success">
            <div className="summary-value">{summary.byStatus?.CONVERTED?.count || 0}</div>
            <div className="summary-label">Converted</div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="sub-filters">
        {['all', 'PENDING', 'ACCEPTED', 'CONVERTED', 'REJECTED'].map((status) => (
          <button
            key={status}
            className={`filter-chip ${filter === status ? 'active' : ''}`}
            onClick={() => setFilter(status)}
          >
            {status === 'all' ? 'All' : getStatusText(status)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="content">
        {loading ? (
          <div className="loading">Loading proforma invoices...</div>
        ) : proformas.length === 0 ? (
          <div className="empty-state">
            <p>No proforma invoices found</p>
          </div>
        ) : (
          <div className="proforma-list">
            {proformas.map((proforma) => (
              <div key={proforma.id} className="proforma-card">
                <div className="proforma-header">
                  <div>
                    <h3>{proforma.proformaNumber}</h3>
                    <p className="proforma-customer">
                      {proforma.customer?.companyName || proforma.customer?.contactPerson}
                    </p>
                  </div>
                  <div className="proforma-header-right">
                    <span className={`status-badge ${getStatusBadge(proforma.status)}`}>
                      {getStatusText(proforma.status)}
                    </span>
                    <div className="proforma-amount">₹{proforma.total.toLocaleString('en-IN')}</div>
                  </div>
                </div>

                <div className="proforma-body">
                  <div className="proforma-info">
                    <div className="proforma-info-item">
                      <span className="label">Issue Date:</span>
                      <span>{new Date(proforma.issueDate).toLocaleDateString('en-IN')}</span>
                    </div>
                    <div className="proforma-info-item">
                      <span className="label">Valid Until:</span>
                      <span>{new Date(proforma.validUntil).toLocaleDateString('en-IN')}</span>
                    </div>
                    <div className="proforma-info-item">
                      <span className="label">Items:</span>
                      <span>{proforma.items?.length || 0}</span>
                    </div>
                    <div className="proforma-info-item">
                      <span className="label">Discount:</span>
                      <span>{proforma.discount}%</span>
                    </div>
                  </div>

                  {proforma.items && proforma.items.length > 0 && (
                    <div className="proforma-items">
                      {proforma.items.slice(0, 3).map((item) => (
                        <div key={item.id} className="proforma-item">
                          <div className="proforma-item-name">{item.product?.name}</div>
                          <div className="proforma-item-qty">
                            {item.quantity} × ₹{item.rate} = ₹{item.amount.toLocaleString('en-IN')}
                          </div>
                        </div>
                      ))}
                      {proforma.items.length > 3 && (
                        <div className="proforma-item more">
                          +{proforma.items.length - 3} more items
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="proforma-footer">
                  {proforma.status === 'PENDING' && (
                    <>
                      <button
                        className="btn-small btn-success"
                        onClick={() => handleStatusChange(proforma.id, 'ACCEPTED')}
                      >
                        Accept
                      </button>
                      <button
                        className="btn-small btn-danger"
                        onClick={() => handleStatusChange(proforma.id, 'REJECTED')}
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {proforma.status === 'ACCEPTED' && (
                    <button
                      className="btn-small btn-primary"
                      onClick={() => handleConvertToOrder(proforma.id)}
                    >
                      Convert to Order
                    </button>
                  )}

                  {proforma.status === 'CONVERTED' && (
                    <div className="converted-badge">✓ Converted to Order</div>
                  )}

                  {proforma.status !== 'CONVERTED' && (
                    <button
                      className="btn-small btn-danger"
                      onClick={() => handleDelete(proforma.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Proforma Invoice from Quotation</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleCreateFromQuotation}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Select Accepted Quotation *</label>
                  <select
                    value={selectedQuotation}
                    onChange={(e) => setSelectedQuotation(e.target.value)}
                    required
                  >
                    <option value="">Choose quotation...</option>
                    {quotations.map((quot) => (
                      <option key={quot.id} value={quot.id}>
                        {quot.quotationNumber} - {quot.customer?.companyName} - ₹
                        {quot.total.toLocaleString('en-IN')}
                      </option>
                    ))}
                  </select>
                </div>
                {quotations.length === 0 && (
                  <div className="info-box">
                    <p>No accepted quotations found. Accept a quotation first to create a proforma invoice.</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={quotations.length === 0}>
                  Create Proforma
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProformaInvoices;
