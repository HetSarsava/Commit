import { useState, useEffect } from 'react';
import { cataloguesAPI } from '../api/catalogues';
import apiClient from '../api/client';
import { productsAPI } from '../api/products';
import './Catalogues.css';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';

const Catalogues = () => {
  const location = useLocation();
  const {user}=useAuth();
  const [editingId,setEditingId]=useState(null),[search,setSearch]=useState(''),[pageError,setPageError]=useState(''),[saving,setSaving]=useState(false);
  const editCatalogue=c=>{setEditingId(c.id);setFormData({customerId:c.customerId,title:c.title,description:c.description||'',notes:c.notes||'',validUntil:c.validUntil?.slice?.(0,10)||'',products:c.items.map(i=>({productId:i.productId,notes:i.notes||''}))});setShowModal(true);};
  const downloadPdf=async c=>{try{const {data}=await apiClient.post('/catalogues/pdf',{productIds:c.items.map(i=>i.productId)},{responseType:'blob'});const url=URL.createObjectURL(data),a=document.createElement('a');a.href=url;a.download='catalogue.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}catch{setPageError('Could not download catalogue PDF');}};
  const [catalogues, setCatalogues] = useState([]);
  const [leads, setLeads] = useState([]);
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [showModal, setShowModal] = useState(Boolean(location.state?.selectedProducts || location.state?.customerId));
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [selectedCatalogue, setSelectedCatalogue] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const [formData, setFormData] = useState({
    customerId: location.state?.customerId || '',
    title: location.state?.selectedProducts ? 'Uniform catalogue' : '',
    description: '',
    products: location.state?.selectedProducts?.map(productId => ({ productId, notes: '' })) || [{ productId: '', notes: '' }],
    validUntil: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};

      setPageError('');
      // Load data with individual error handling
      const cataloguesData = await cataloguesAPI.getAllCatalogues(params).catch(_err => {
        setPageError('Could not load catalogues. Please retry.');
        return [];
      });

      const leadsDataResponse = await apiClient.get("/catalogues/contacts").then(response => ({ leads: response.data })).catch(_err => {
        setPageError('Could not load customers. Retry before saving.');
        return { leads: [] };
      });
      const leadsData = leadsDataResponse.leads || leadsDataResponse;

      const productsData = await productsAPI.getAllProducts().catch(_err => {
        setPageError('Could not load products. Retry before saving.');
        return [];
      });

      const summaryData = await cataloguesAPI.getCatalogueSummary().catch(_err => {
        console.error('Failed to load summary:', _err);
        return { totalCatalogues: 0, totalViews: 0, totalEnquiries: 0 };
      });

      setCatalogues(Array.isArray(cataloguesData) ? cataloguesData : []);
      setLeads(Array.isArray(leadsData) ? leadsData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to load catalogues page:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(saving) return;
    setSaving(true);
    try {
      if(editingId) await apiClient.put('/catalogues/'+editingId,formData); else await cataloguesAPI.createCatalogue(formData);
      setPageError('');
      closeModal();
      loadData();
    } catch (error) {
      console.error('Failed to create catalogue:', error);
      setPageError(error.response?.data?.error || 'Failed to save catalogue');
    } finally {setSaving(false);}
  };

  const handleStatusChange = async (catalogueId, newStatus) => {
    try {
      await cataloguesAPI.updateCatalogueStatus(catalogueId, newStatus);
      alert(`Catalogue status updated to ${newStatus}`);
      loadData();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert(error.response?.data?.error || 'Failed to update status');
    }
  };

  const handleViewAnalytics = async (catalogue) => {
    try {
      const analyticsData = await cataloguesAPI.getCatalogueAnalytics(catalogue.id);
      setSelectedCatalogue(catalogue);
      setAnalytics(analyticsData);
      setShowAnalyticsModal(true);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      alert('Failed to load analytics');
    }
  };

  const handleCopyLink = async (shareLink) => {
    const fullLink = `${window.location.origin}/catalogue/${shareLink}`;
    try { await navigator.clipboard.writeText(fullLink); } catch { alert("Could not copy the link. You can open it here: " + fullLink); return; }
    alert('Link copied to clipboard!');
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this catalogue?')) return;

    try {
      await cataloguesAPI.deleteCatalogue(id);
      alert('Catalogue deleted successfully');
      loadData();
    } catch (error) {
      console.error('Failed to delete catalogue:', error);
      alert('Failed to delete catalogue');
    }
  };

  const openModal = () => {
    setEditingId(null);setPageError('');
    setFormData({
      customerId: '',
      title: '',
      description: '',
      products: [{ productId: '', notes: '' }],
      validUntil: '',
      notes: '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const closeAnalyticsModal = () => {
    setShowAnalyticsModal(false);
    setSelectedCatalogue(null);
    setAnalytics(null);
  };

  const addProduct = () => {
    setFormData({
      ...formData,
      products: [...formData.products, { productId: '', notes: '' }],
    });
  };

  const removeProduct = (index) => {
    const newProducts = formData.products.filter((_, i) => i !== index);
    setFormData({ ...formData, products: newProducts });
  };

  const updateProduct = (index, field, value) => {
    const newProducts = [...formData.products];
    newProducts[index][field] = value;
    setFormData({ ...formData, products: newProducts });
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      DRAFT: 'status-draft',
      SHARED: 'status-shared',
      VIEWED: 'status-viewed',
      EXPIRED: 'status-expired',
      CONVERTED: 'status-converted',
    };
    return statusClasses[status] || 'status-draft';
  };

  const getStatusText = (status) => {
    const statusText = {
      DRAFT: 'Draft',
      SHARED: 'Shared',
      VIEWED: 'Viewed',
      EXPIRED: 'Expired',
      CONVERTED: 'Converted',
    };
    return statusText[status] || status;
  };

  return (
    <div className="catalogues-page">
      {/* Top Bar */}
      <div className="topbar">
        <div>
          <h1>Catalogues</h1>
          <div className="sub">Smart customer-specific catalogues with analytics</div>
        </div>
        <div className="topbar-actions">
          <button className="btn" onClick={openModal}>
            Create Catalogue
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-value">{summary.totalCatalogues}</div>
            <div className="summary-label">Total Catalogues</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{summary.totalViews}</div>
            <div className="summary-label">Total Views</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{summary.byStatus?.SHARED?.count || 0}</div>
            <div className="summary-label">Shared</div>
          </div>
          <div className="summary-card success">
            <div className="summary-value">{summary.byStatus?.CONVERTED?.count || 0}</div>
            <div className="summary-label">Converted</div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="tabs">
        {['all', 'DRAFT', 'SHARED', 'VIEWED', 'CONVERTED', 'EXPIRED'].map((status) => (
          <button
            key={status}
            className={`tab ${filter === status ? 'active' : ''}`}
            onClick={() => setFilter(status)}
          >
            {status === 'all' ? 'All' : getStatusText(status)}
          </button>
        ))}
      </div>

      <input className="catalogue-search" aria-label="Search catalogues" placeholder="Search catalogue or customer" value={search} onChange={e=>setSearch(e.target.value)}/>
      {pageError && <p role="alert">{pageError} <button className="btn-small" onClick={loadData}>Retry</button></p>}
      {/* Content */}
      <div className="content">
        {loading ? (
          <div className="loading">Loading catalogues...</div>
        ) : catalogues.length === 0 ? (
          <div className="empty-state">
            <p>No catalogues found</p>
          </div>
        ) : (
          <div className="catalogue-list">
            {catalogues.filter(c=>[c.title,c.customer?.companyName].join(' ').toLowerCase().includes(search.toLowerCase())).map((catalogue) => (
              <div key={catalogue.id} className="catalogue-card">
                <div className="catalogue-header">
                  <div>
                    <h3>{catalogue.title}</h3>
                    <p className="catalogue-customer">
                      {catalogue.customer?.companyName || catalogue.customer?.contactPerson}
                    </p>
                  </div>
                  <div className="catalogue-header-right">
                    <span className={`status-badge ${getStatusBadge(catalogue.status)}`}>
                      {getStatusText(catalogue.status)}
                    </span>
                  </div>
                </div>

                <div className="catalogue-body">
                  {catalogue.description && (
                    <p className="catalogue-description">{catalogue.description}</p>
                  )}

                  <div className="catalogue-info">
                    <div className="catalogue-info-item">
                      <span className="label">Products:</span>
                      <span>{catalogue.items?.length || 0}</span>
                    </div>
                    <div className="catalogue-info-item">
                      <span className="label">Views:</span>
                      <span>{catalogue.viewCount}</span>
                    </div>
                    <div className="catalogue-info-item">
                      <span className="label">Created:</span>
                      <span>{new Date(catalogue.createdAt).toLocaleDateString('en-IN')}</span>
                    </div>
                    {catalogue.validUntil && (
                      <div className="catalogue-info-item">
                        <span className="label">Valid Until:</span>
                        <span>{new Date(catalogue.validUntil).toLocaleDateString('en-IN')}</span>
                      </div>
                    )}
                  </div>

                  {catalogue.items && catalogue.items.length > 0 && (
                    <div className="catalogue-products">
                      {catalogue.items.slice(0, 3).map((item) => (
                        <div key={item.id} className="product-chip">
                          {item.product?.name}
                        </div>
                      ))}
                      {catalogue.items.length > 3 && (
                        <div className="product-chip more">
                          +{catalogue.items.length - 3} more
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="catalogue-footer">
                  <button className="btn-small" onClick={()=>window.open('/catalogue/'+catalogue.shareLink,'_blank','noopener,noreferrer')}>Preview</button>
                  <button className="btn-small" onClick={()=>downloadPdf(catalogue)}>Download PDF</button>
                  <button className="btn-small" onClick={()=>handleCopyLink(catalogue.shareLink)}>Copy viewing link</button>
                  <button className="btn-small" onClick={()=>handleViewAnalytics(catalogue)}>Analytics</button>
                  {catalogue.status==='DRAFT' && <button className="btn-small" onClick={()=>editCatalogue(catalogue)}>Edit draft</button>}
                  {catalogue.status!=='EXPIRED' && <button className="btn-small" onClick={()=>handleStatusChange(catalogue.id,'EXPIRED')}>Expire link</button>}
                  {catalogue.status === 'DRAFT' && (
                    <button
                      className="btn-small"
                      onClick={() => handleStatusChange(catalogue.id, 'SHARED')}
                    >
                      Mark as shared
                    </button>
                  )}

                  {catalogue.status === 'VIEWED' && (
                    <button
                      className="btn-small btn-success"
                      onClick={() => handleStatusChange(catalogue.id, 'CONVERTED')}
                    >
                      Mark Converted
                    </button>
                  )}

                  {user?.role === 'ADMIN' && <button
                    className="btn-small btn-danger"
                    onClick={() => handleDelete(catalogue.id)}
                  >
                    Delete
                  </button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Catalogue Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? "Edit Catalogue" : "Create New Catalogue"}</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            {pageError && <p role="alert" style={{padding:16}}>{pageError}</p>}
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Customer/Lead *</label>
                    <select
                      value={formData.customerId}
                      onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                      required
                    >
                      <option value="">Select customer...</option>
                      {leads.map((lead) => (
                        <option key={lead.id} value={lead.id}>
                          {lead.companyName} - {lead.contactPerson}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Valid Until</label>
                    <input
                      type="date"
                      value={formData.validUntil}
                      onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Catalogue Title *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      placeholder="e.g., Hospital Uniform Catalogue"
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2}
                      placeholder="Brief description of this catalogue"
                    />
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-section-header">
                    <h3>Products</h3>
                    <button type="button" className="btn-small" onClick={addProduct}>
                      + Add Product
                    </button>
                  </div>
                  {formData.products.map((product, index) => (
                    <div key={index} className="product-form">
                      <div className="form-grid">
                        <div className="form-group">
                          <label>Product *</label>
                          <select
                            value={product.productId}
                            onChange={(e) => updateProduct(index, 'productId', e.target.value)}
                            required
                          >
                            <option value="">Select product...</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.sku})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Notes</label>
                          <input
                            type="text"
                            value={product.notes}
                            onChange={(e) => updateProduct(index, 'notes', e.target.value)}
                            placeholder="e.g., Available in all sizes"
                          />
                        </div>
                        {formData.products.length > 1 && (
                          <button
                            type="button"
                            className="btn-remove"
                            onClick={() => removeProduct(index)}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="form-group">
                  <label>Internal Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    placeholder="Internal notes (not visible to customer)"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={saving}>
                  {saving ? "Saving…" : editingId ? "Save Catalogue" : "Create Catalogue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      {showAnalyticsModal && selectedCatalogue && analytics && (
        <div className="modal-overlay" onClick={closeAnalyticsModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Catalogue Analytics</h2>
              <button className="modal-close" onClick={closeAnalyticsModal}>×</button>
            </div>
            <div className="modal-body">
              <h3 className="analytics-title">{selectedCatalogue.title}</h3>

              <div className="analytics-summary">
                <div className="analytics-card">
                  <div className="analytics-value">{analytics.summary.totalOpens}</div>
                  <div className="analytics-label">Total Opens</div>
                </div>
                <div className="analytics-card">
                  <div className="analytics-value">{analytics.summary.totalProductClicks}</div>
                  <div className="analytics-label">Product Clicks</div>
                </div>
                <div className="analytics-card">
                  <div className="analytics-value">{analytics.summary.totalEnquiryClicks}</div>
                  <div className="analytics-label">Enquiry Clicks</div>
                </div>
                <div className="analytics-card">
                  <div className="analytics-value">{analytics.summary.uniqueVisitors}</div>
                  <div className="analytics-label">Unique Visitors</div>
                </div>
              </div>

              {Object.keys(analytics.summary.productClickBreakdown).length > 0 && (
                <div className="product-clicks">
                  <h4>Product Click Breakdown</h4>
                  {Object.entries(analytics.summary.productClickBreakdown).map(([productId, clicks]) => {
                    const product = selectedCatalogue.items?.find(i => i.product?.id === productId)?.product;
                    return (
                      <div key={productId} className="product-click-row">
                        <span>{product?.name || productId}</span>
                        <span className="click-count">{clicks} clicks</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="share-link-section">
                <h4>Shareable Link</h4>
                <div className="link-box">
                  <input
                    type="text"
                    value={`${window.location.origin}/catalogue/${selectedCatalogue.shareLink}`}
                    readOnly
                    aria-label="Shareable catalogue link"
                  />
                  <button
                    className="btn-small"
                    onClick={() => handleCopyLink(selectedCatalogue.shareLink)}
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={closeAnalyticsModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Catalogues;
