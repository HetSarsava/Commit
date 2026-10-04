import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { quotationsAPI } from '../api/quotations';
import QuotationBuilder from '../components/QuotationBuilder';
import './Quotations.css';

const Quotations = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [builderMode, setBuilderMode] = useState('create');

  useEffect(() => {
    fetchQuotations();
  }, []);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const data = await quotationsAPI.getQuotations();
      setQuotations(data.quotations);
    } catch (error) {
      console.error('Failed to fetch quotations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuotationCreated = () => {
    setShowBuilder(false);
    setSelectedQuotation(null);
    fetchQuotations();
  };

  const handleCreate = () => {
    setBuilderMode('create');
    setSelectedQuotation(null);
    setShowBuilder(true);
  };

  const handleView = (quotation) => {
    navigate(`/quotations/${quotation.id}`);
  };

  const handleEdit = async (quotation) => {
    try {
      const data = await quotationsAPI.getQuotation(quotation.id);
      setSelectedQuotation(data.quotation);
      setBuilderMode('edit');
      setShowBuilder(true);
    } catch (error) {
      console.error('Failed to fetch quotation:', error);
      alert('Failed to load quotation details');
    }
  };

  const handleDelete = async (quotation) => {
    if (!window.confirm(`Delete quotation ${quotation.quotationNumber}?`)) {
      return;
    }

    try {
      await quotationsAPI.deleteQuotation(quotation.id);
      fetchQuotations();
    } catch (error) {
      console.error('Failed to delete quotation:', error);
      alert('Failed to delete quotation');
    }
  };

  return (
    <div className="quotations-page">
      <div className="quotations-header">
        <div>
          <h1>Quotations</h1>
          <div className="header-sub">Create and manage customer quotations</div>
        </div>
        <button className="btn-primary" onClick={handleCreate}>
          ➕ Create Quotation
        </button>
      </div>

      <input aria-label="Search quotations" placeholder="Search quotation number or customer" value={search} onChange={e => setSearch(e.target.value)} />
      {loading ? (
        <div className="loading-state">
          <div className="spinner">Loading...</div>
        </div>
      ) : quotations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💰</div>
          <h3>No quotations yet</h3>
          <p>Create your first quotation with products, pricing, and GST calculation.</p>
          <button className="btn-primary" onClick={handleCreate}>
            ➕ Create First Quotation
          </button>
        </div>
      ) : (
        <div className="quotations-list">
          {quotations.filter(q => [q.quotationNumber,q.customer?.companyName].join(' ').toLowerCase().includes(search.toLowerCase())).map(q => (
            <div key={q.id} className="quotation-card">
              <div className="quotation-number">{q.quotationNumber}</div>
              <div className="quotation-customer">{q.customer?.companyName}</div>
              <div className="quotation-total">₹{Number(q.total).toLocaleString('en-IN')}</div>
              <div className="quotation-status">
                <span className={`status-badge status-${q.status.toLowerCase()}`}>{q.status}</span>
              </div>
              <div className="quotation-actions">
                <button className="btn-action" onClick={() => handleView(q)} title="View">
                  👁️
                </button>
                <button className="btn-action" onClick={() => handleEdit(q)} title="Edit">
                  ✏️
                </button>
                <button className="btn-action btn-danger" onClick={() => handleDelete(q)} title="Delete">
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showBuilder && (
        <QuotationBuilder
          quotation={selectedQuotation}
          mode={builderMode}
          onClose={() => {
            setShowBuilder(false);
            setSelectedQuotation(null);
          }}
          onSuccess={handleQuotationCreated}
        />
      )}
    </div>
  );
};

export default Quotations;
