import { useState, useEffect, useCallback } from 'react';
import { purchaseAPI } from '../api/purchase';
import { inventoryAPI } from '../api/inventory';
import './PurchaseOrders.css';

const PurchaseOrders = () => {
  const [activeTab, setActiveTab] = useState('pos'); // pos, suppliers
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [summary, setSummary] = useState(null);
  const [showPOModal, setShowPOModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [saving,setSaving]=useState(false),[formError,setFormError]=useState('');

  const [supplierFormData, setSupplierFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    gstin: '',
    paymentTerms: 'Net 30',
    notes: '',
  });

  const [poFormData, setPOFormData] = useState({
    supplierId: '',
    expectedDeliveryDate: '',
    items: [{ materialId: '', quantity: '', rate: '' }],
    notes: '',
  });

  const [receiveFormData, setReceiveFormData] = useState({
    itemId: '',
    receivedQuantity: '',
    receivedDate: '',
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const [posData, suppliersData, materialsData, summaryData] = await Promise.all([
        purchaseAPI.getAllPurchaseOrders(params),
        purchaseAPI.getAllSuppliers(),
        inventoryAPI.getAllMaterials(),
        purchaseAPI.getPurchaseSummary(),
      ]);
      setPurchaseOrders(posData);
      setSuppliers(suppliersData);
      setMaterials(materialsData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to load purchase data:', error);
      alert('Failed to load purchase data');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    if(saving)return;
    setSaving(true);setFormError('');
    try {
      await purchaseAPI.createSupplier(supplierFormData);

      closeSupplierModal();
      loadData();
    } catch (error) {
      console.error('Failed to create supplier:', error);
      setFormError(error.response?.data?.error || 'Failed to create supplier');
    } finally {setSaving(false); }
  };

  const handleCreatePO = async (e) => {
    e.preventDefault();
    if(saving)return;
    setSaving(true);setFormError('');
    try {
      await purchaseAPI.createPurchaseOrder(poFormData);

      closePOModal();
      loadData();
    } catch (error) {
      console.error('Failed to create PO:', error);
      setFormError(error.response?.data?.error || 'Failed to create PO');
    } finally {setSaving(false); }
  };

  const handleReceiveMaterial = async (e) => {
    e.preventDefault();
    try {
      await purchaseAPI.recordMaterialReceived(selectedPO.id, receiveFormData);
      alert('Material receipt recorded successfully');
      closeReceiveModal();
      loadData();
    } catch (error) {
      console.error('Failed to record receipt:', error);
      alert(error.response?.data?.error || 'Failed to record receipt');
    }
  };

  const handleStatusChange = async (poId, status) => {
    try {
      await purchaseAPI.updatePOStatus(poId, status);
      alert(`PO status updated to ${status}`);
      loadData();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status');
    }
  };

  const openPOModal = () => {
    setFormError('');
    setPOFormData({
      supplierId: '',
      expectedDeliveryDate: '',
      items: [{ materialId: '', quantity: '', rate: '' }],
      notes: '',
    });
    setShowPOModal(true);
  };

  const closePOModal = () => {
    setShowPOModal(false);
  };

  const openSupplierModal = () => {
    setFormError('');
    setSupplierFormData({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      gstin: '',
      paymentTerms: 'Net 30',
      notes: '',
    });
    setShowSupplierModal(true);
  };

  const closeSupplierModal = () => {
    setShowSupplierModal(false);
  };

  const openReceiveModal = (po) => {
    setSelectedPO(po);
    setReceiveFormData({
      itemId: po.items[0]?.id || '',
      receivedQuantity: '',
      receivedDate: new Date().toISOString().split('T')[0],
    });
    setShowReceiveModal(true);
  };

  const closeReceiveModal = () => {
    setShowReceiveModal(false);
    setSelectedPO(null);
  };

  const addPOItem = () => {
    setPOFormData({
      ...poFormData,
      items: [...poFormData.items, { materialId: '', quantity: '', rate: '' }],
    });
  };

  const removePOItem = (index) => {
    const newItems = poFormData.items.filter((_, i) => i !== index);
    setPOFormData({ ...poFormData, items: newItems });
  };

  const updatePOItem = (index, field, value) => {
    const newItems = [...poFormData.items];
    newItems[index][field] = value;
    setPOFormData({ ...poFormData, items: newItems });
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      DRAFT: 'status-draft',
      SENT: 'status-sent',
      CONFIRMED: 'status-confirmed',
      PARTIAL_RECEIVED: 'status-partial',
      RECEIVED: 'status-received',
      CANCELLED: 'status-cancelled',
    };
    return statusClasses[status] || 'status-draft';
  };

  const getStatusText = (status) => {
    const statusText = {
      DRAFT: 'Draft',
      SENT: 'Sent',
      CONFIRMED: 'Confirmed',
      PARTIAL_RECEIVED: 'Partial Received',
      RECEIVED: 'Received',
      CANCELLED: 'Cancelled',
    };
    return statusText[status] || status;
  };

  return (
    <div className="purchase-page">
      {/* Top Bar */}
      <div className="topbar">
        <div>
          <h1>Purchase Management</h1>
          <div className="sub">Manage suppliers and purchase orders</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-secondary" onClick={openSupplierModal}>
            Add Supplier
          </button>
          <button className="btn" onClick={openPOModal}>
            Create Purchase Order
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && activeTab === 'pos' && (
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-value">₹{summary.totalPurchaseValue.toLocaleString('en-IN')}</div>
            <div className="summary-label">Total Purchase Value</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{summary.totalPOs}</div>
            <div className="summary-label">Total Purchase Orders</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{summary.byStatus?.SENT?.count || 0}</div>
            <div className="summary-label">Pending POs</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{summary.byStatus?.PARTIAL_RECEIVED?.count || 0}</div>
            <div className="summary-label">Partial Received</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'pos' ? 'active' : ''}`}
          onClick={() => setActiveTab('pos')}
        >
          Purchase Orders
        </button>
        <button
          className={`tab ${activeTab === 'suppliers' ? 'active' : ''}`}
          onClick={() => setActiveTab('suppliers')}
        >
          Suppliers
        </button>
      </div>

      {/* PO Status Filter */}
      {activeTab === 'pos' && (
        <div className="tabs">
          {['all', 'DRAFT', 'SENT', 'CONFIRMED', 'PARTIAL_RECEIVED', 'RECEIVED'].map((status) => (
            <button
              key={status}
              className={`tab ${filter === status ? 'active' : ''}`}
              onClick={() => setFilter(status)}
            >
              {status === 'all' ? 'All' : getStatusText(status)}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="content">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : activeTab === 'pos' ? (
          // Purchase Orders Table
          purchaseOrders.length === 0 ? (
            <div className="empty-state">
              <p>No purchase orders found</p>
            </div>
          ) : (
            <div className="po-list">
              {purchaseOrders.map((po) => (
                <div key={po.id} className="po-card">
                  <div className="po-header">
                    <div>
                      <h3>{po.poNumber}</h3>
                      <p className="po-supplier">{po.supplier?.name}</p>
                    </div>
                    <div className="po-header-right">
                      <span className={`status-badge ${getStatusBadge(po.status)}`}>
                        {getStatusText(po.status)}
                      </span>
                      <div className="po-amount">₹{po.total.toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                  <div className="po-body">
                    <div className="po-info">
                      <div className="po-info-item">
                        <span className="label">PO Date:</span>
                        <span>{new Date(po.poDate).toLocaleDateString('en-IN')}</span>
                      </div>
                      <div className="po-info-item">
                        <span className="label">Expected Delivery:</span>
                        <span>
                          {po.expectedDeliveryDate
                            ? new Date(po.expectedDeliveryDate).toLocaleDateString('en-IN')
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="po-info-item">
                        <span className="label">Items:</span>
                        <span>{po.items?.length || 0}</span>
                      </div>
                    </div>
                    <div className="po-items">
                      {po.items?.map((item) => (
                        <div key={item.id} className="po-item">
                          <div className="po-item-name">
                            {item.material?.name} ({item.material?.sku})
                          </div>
                          <div className="po-item-qty">
                            {item.receivedQuantity}/{item.quantity} {item.material?.unit}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="po-footer">
                    {po.status === 'DRAFT' && (
                      <button
                        className="btn-small"
                        onClick={() => handleStatusChange(po.id, 'SENT')}
                      >
                        Send to Supplier
                      </button>
                    )}
                    {po.status === 'SENT' && (
                      <button
                        className="btn-small"
                        onClick={() => handleStatusChange(po.id, 'CONFIRMED')}
                      >
                        Mark Confirmed
                      </button>
                    )}
                    {(po.status === 'SENT' ||
                      po.status === 'CONFIRMED' ||
                      po.status === 'PARTIAL_RECEIVED') && (
                      <button className="btn-small btn-primary" onClick={() => openReceiveModal(po)}>
                        Receive Material
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          // Suppliers Table
          suppliers.length === 0 ? (
            <div className="empty-state">
              <p>No suppliers found</p>
            </div>
          ) : (
            <div className="suppliers-grid">
              {suppliers.map((supplier) => (
                <div key={supplier.id} className="supplier-card">
                  <h3>{supplier.name}</h3>
                  <div className="supplier-info">
                    <div className="supplier-info-item">
                      <span className="label">Contact:</span>
                      <span>{supplier.contactPerson}</span>
                    </div>
                    <div className="supplier-info-item">
                      <span className="label">Phone:</span>
                      <span>{supplier.phone}</span>
                    </div>
                    <div className="supplier-info-item">
                      <span className="label">Email:</span>
                      <span>{supplier.email}</span>
                    </div>
                    <div className="supplier-info-item">
                      <span className="label">Location:</span>
                      <span>{supplier.city}, {supplier.state}</span>
                    </div>
                    <div className="supplier-info-item">
                      <span className="label">GSTIN:</span>
                      <span className="mono">{supplier.gstin}</span>
                    </div>
                    <div className="supplier-info-item">
                      <span className="label">Payment Terms:</span>
                      <span>{supplier.paymentTerms}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Create PO Modal */}
      {showPOModal && (
        <div className="modal-overlay" onClick={closePOModal}>
          <div role="dialog" aria-modal="true" aria-label="Create Purchase Order" className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Purchase Order</h2>
              <button className="modal-close" onClick={closePOModal}>×</button>
            </div>
            <form onSubmit={handleCreatePO}>
              {formError && <p className="form-error" role="alert">{formError}</p>}
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="purchase-field-1">Supplier *</label>
                    <select id="purchase-field-1"
                      value={poFormData.supplierId}
                      onChange={(e) => setPOFormData({ ...poFormData, supplierId: e.target.value })}
                      required
                    >
                      <option value="">Select supplier...</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="purchase-field-2">Expected Delivery Date</label>
                    <input id="purchase-field-2"
                      type="date"
                      value={poFormData.expectedDeliveryDate}
                      onChange={(e) =>
                        setPOFormData({ ...poFormData, expectedDeliveryDate: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-section-header">
                    <h3>Items</h3>
                    <button type="button" className="btn-small" onClick={addPOItem}>
                      + Add Item
                    </button>
                  </div>
                  {poFormData.items.map((item, index) => (
                    <div key={index} className="po-item-form">
                      <div className="form-grid">
                        <div className="form-group">
                          <label htmlFor="purchase-field-3">Material *</label>
                          <select id="purchase-field-3"
                            value={item.materialId}
                            onChange={(e) => updatePOItem(index, 'materialId', e.target.value)}
                            required
                          >
                            <option value="">Select material...</option>
                            {materials.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.sku} - {m.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label htmlFor="purchase-field-4">Quantity *</label>
                          <input id="purchase-field-4"
                            type="number"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => updatePOItem(index, 'quantity', e.target.value)}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="purchase-field-5">Rate *</label>
                          <input id="purchase-field-5"
                            type="number"
                            step="0.01"
                            value={item.rate}
                            onChange={(e) => updatePOItem(index, 'rate', e.target.value)}
                            required
                          />
                        </div>
                        {poFormData.items.length > 1 && (
                          <button
                            type="button"
                            className="btn-remove"
                            onClick={() => removePOItem(index)}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="form-group">
                  <label htmlFor="purchase-field-6">Notes</label>
                  <textarea id="purchase-field-6"
                    value={poFormData.notes}
                    onChange={(e) => setPOFormData({ ...poFormData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closePOModal}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={saving}>
                  Create PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Supplier Modal */}
      {showSupplierModal && (
        <div className="modal-overlay" onClick={closeSupplierModal}>
          <div role="dialog" aria-modal="true" aria-label="Add Supplier" className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Supplier</h2>
              <button className="modal-close" onClick={closeSupplierModal}>×</button>
            </div>
            <form onSubmit={handleCreateSupplier}>
              {formError && <p className="form-error" role="alert">{formError}</p>}
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="purchase-field-7">Supplier Name *</label>
                    <input id="purchase-field-7"
                      type="text"
                      value={supplierFormData.name}
                      onChange={(e) =>
                        setSupplierFormData({ ...supplierFormData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="purchase-field-8">Contact Person</label>
                    <input id="purchase-field-8"
                      type="text"
                      value={supplierFormData.contactPerson}
                      onChange={(e) =>
                        setSupplierFormData({ ...supplierFormData, contactPerson: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="purchase-field-9">Phone *</label>
                    <input id="purchase-field-9"
                      type="tel"
                      value={supplierFormData.phone}
                      onChange={(e) =>
                        setSupplierFormData({ ...supplierFormData, phone: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="purchase-field-10">Email</label>
                    <input id="purchase-field-10"
                      type="email"
                      value={supplierFormData.email}
                      onChange={(e) =>
                        setSupplierFormData({ ...supplierFormData, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group full-width">
                    <label htmlFor="purchase-field-11">Address</label>
                    <input id="purchase-field-11"
                      type="text"
                      value={supplierFormData.address}
                      onChange={(e) =>
                        setSupplierFormData({ ...supplierFormData, address: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="purchase-field-12">City</label>
                    <input id="purchase-field-12"
                      type="text"
                      value={supplierFormData.city}
                      onChange={(e) =>
                        setSupplierFormData({ ...supplierFormData, city: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="purchase-field-13">State</label>
                    <input id="purchase-field-13"
                      type="text"
                      value={supplierFormData.state}
                      onChange={(e) =>
                        setSupplierFormData({ ...supplierFormData, state: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="purchase-field-14">GSTIN</label>
                    <input id="purchase-field-14"
                      type="text"
                      value={supplierFormData.gstin}
                      onChange={(e) =>
                        setSupplierFormData({ ...supplierFormData, gstin: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="purchase-field-15">Payment Terms</label>
                    <select id="purchase-field-15"
                      value={supplierFormData.paymentTerms}
                      onChange={(e) =>
                        setSupplierFormData({ ...supplierFormData, paymentTerms: e.target.value })
                      }
                    >
                      <option value="Net 15">Net 15</option>
                      <option value="Net 30">Net 30</option>
                      <option value="Net 45">Net 45</option>
                      <option value="Net 60">Net 60</option>
                      <option value="COD">COD</option>
                    </select>
                  </div>
                  <div className="form-group full-width">
                    <label htmlFor="purchase-field-16">Notes</label>
                    <textarea id="purchase-field-16"
                      value={supplierFormData.notes}
                      onChange={(e) =>
                        setSupplierFormData({ ...supplierFormData, notes: e.target.value })
                      }
                      rows={3}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeSupplierModal}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={saving}>
                  Add Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Material Modal */}
      {showReceiveModal && selectedPO && (
        <div className="modal-overlay" onClick={closeReceiveModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Receive Material - {selectedPO.poNumber}</h2>
              <button className="modal-close" onClick={closeReceiveModal}>×</button>
            </div>
            <form onSubmit={handleReceiveMaterial}>
              {formError && <p className="form-error" role="alert">{formError}</p>}
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label htmlFor="purchase-field-17">Item *</label>
                    <select id="purchase-field-17"
                      value={receiveFormData.itemId}
                      onChange={(e) =>
                        setReceiveFormData({ ...receiveFormData, itemId: e.target.value })
                      }
                      required
                    >
                      {selectedPO.items?.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.material?.name} - Pending: {item.quantity - item.receivedQuantity}{' '}
                          {item.material?.unit}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="purchase-field-18">Received Quantity *</label>
                    <input id="purchase-field-18"
                      type="number"
                      step="0.01"
                      value={receiveFormData.receivedQuantity}
                      onChange={(e) =>
                        setReceiveFormData({ ...receiveFormData, receivedQuantity: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="purchase-field-19">Received Date</label>
                    <input id="purchase-field-19"
                      type="date"
                      value={receiveFormData.receivedDate}
                      onChange={(e) =>
                        setReceiveFormData({ ...receiveFormData, receivedDate: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeReceiveModal}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={saving}>
                  Record Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrders;
