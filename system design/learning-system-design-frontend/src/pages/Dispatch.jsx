import { useState, useEffect, useCallback } from 'react';
import { dispatchAPI } from '../api/dispatch';
import './Dispatch.css';

const Dispatch = () => {
  const [dispatches, setDispatches] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [readyOrders, setReadyOrders] = useState([]);
  const [selectedDispatch, setSelectedDispatch] = useState(null);
  const [formError,setFormError]=useState(''),[readyLoading,setReadyLoading]=useState(false),[saving,setSaving]=useState(false);

  const [createForm, setCreateForm] = useState({
    productionId: '',
    courierName: '',
    trackingNumber: '',
    dispatchDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: '',
    contactPerson: '',
    contactPhone: '',
    notes: '',
  });

  const [statusForm, setStatusForm] = useState({
    status: '',
    actualDeliveryDate: '',
    podReceivedBy: '',
    notes: '',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [dispatchesData, summaryData] = await Promise.all([
        dispatchAPI.getAllDispatches(),
        dispatchAPI.getDispatchSummary(),
      ]);
      setDispatches(dispatchesData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error fetching dispatch data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchReadyOrders = async () => {
    setShowCreateModal(true);setFormError('');setReadyOrders([]);setReadyLoading(true);
    try {
      const data = await dispatchAPI.getReadyToDispatch();
      setReadyOrders(data);
      setShowCreateModal(true);
    } catch (error) {
      setFormError(error.response?.data?.error || 'Could not load ready orders. Please retry.');
    } finally {setReadyLoading(false);}
  };

  const handleCreateDispatch = async (e) => {
    e.preventDefault();
    if(saving)return;setSaving(true);setFormError('');
    try {
      const selectedOrder = readyOrders.find(
        (o) => o.id === createForm.productionId
      );

      const deliveryAddress = {
        street: selectedOrder?.order?.customer?.address || '',
        city: selectedOrder?.order?.customer?.city || '',
        state: selectedOrder?.order?.customer?.state || '',
        pincode: selectedOrder?.order?.customer?.pincode || '',
      };

      await dispatchAPI.createDispatch({
        ...createForm,
        deliveryAddress,
      });

      setShowCreateModal(false);
      setCreateForm({
        productionId: '',
        courierName: '',
        trackingNumber: '',
        dispatchDate: new Date().toISOString().split('T')[0],
        expectedDeliveryDate: '',
        contactPerson: '',
        contactPhone: '',
        notes: '',
      });
      fetchData();
    } catch (error) {
      console.error('Error creating dispatch:', error);
      setFormError(error.response?.data?.error || 'Failed to create dispatch');
    } finally {setSaving(false); }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    try {
      await dispatchAPI.updateDispatchStatus(selectedDispatch.id, statusForm);
      setShowStatusModal(false);
      setSelectedDispatch(null);
      setStatusForm({
        status: '',
        actualDeliveryDate: '',
        podReceivedBy: '',
        notes: '',
      });
      fetchData();
    } catch (error) {
      console.error('Error updating dispatch status:', error);
      alert(error.response?.data?.error || 'Failed to update dispatch status');
    }
  };

  const openStatusModal = (dispatch) => {
    setSelectedDispatch(dispatch);
    setStatusForm({
      status: dispatch.status,
      actualDeliveryDate: dispatch.actualDeliveryDate
        ? new Date(dispatch.actualDeliveryDate).toISOString().split('T')[0]
        : '',
      podReceivedBy: dispatch.podReceivedBy || '',
      notes: dispatch.notes || '',
    });
    setShowStatusModal(true);
  };

  const getStatusBadge = (status) => {
    const styles = {
      PENDING: 'status-badge status-pending',
      DISPATCHED: 'status-badge status-dispatched',
      IN_TRANSIT: 'status-badge status-transit',
      DELIVERED: 'status-badge status-delivered',
      CANCELLED: 'status-badge status-cancelled',
    };
    return styles[status] || 'status-badge';
  };

  const filteredDispatches =
    selectedStatus === 'ALL'
      ? dispatches
      : dispatches.filter((d) => d.status === selectedStatus);

  if (loading) {
    return (
      <div className="dispatch-container">
        <div className="loading">Loading dispatch data...</div>
      </div>
    );
  }

  return (
    <div className="dispatch-container">
      <div className="dispatch-header">
        <div>
          <h1>Dispatch Management</h1>
          <p className="dispatch-subtitle">
            Track shipments from production to customer delivery
          </p>
        </div>
        <button className="btn-primary" onClick={fetchReadyOrders}>
          ✚ Create Dispatch
        </button>
      </div>

      {/* Metrics Dashboard */}
      {summary && (
        <div className="dispatch-metrics">
          <div className="metric-card">
            <div className="metric-label">Total Dispatches</div>
            <div className="metric-value">{summary.total}</div>
          </div>
          <div className="metric-card metric-pending">
            <div className="metric-label">Pending</div>
            <div className="metric-value">{summary.pending}</div>
          </div>
          <div className="metric-card metric-transit">
            <div className="metric-label">In Transit</div>
            <div className="metric-value">{summary.inTransit}</div>
          </div>
          <div className="metric-card metric-delivered">
            <div className="metric-label">Delivered</div>
            <div className="metric-value">{summary.delivered}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">On-Time Delivery</div>
            <div className="metric-value">
              {summary.delivered > 0
                ? Math.round((summary.onTime / summary.delivered) * 100)
                : 0}
              %
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Avg. Delivery Days</div>
            <div className="metric-value">{summary.avgDeliveryDays}</div>
          </div>
        </div>
      )}

      {/* Status Filter */}
      <div className="status-filter">
        {['ALL', 'PENDING', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED'].map(
          (status) => (
            <button
              key={status}
              className={`btn btn-secondary filter-btn ${
                selectedStatus === status ? 'active' : ''
              }`}
              onClick={() => setSelectedStatus(status)}
            >
              {status.replace('_', ' ')}
            </button>
          )
        )}
      </div>

      {/* Dispatch List */}
      <div className="dispatch-list">
        {filteredDispatches.length === 0 ? (
          <div className="empty-state">
            <p>No dispatches found</p>
          </div>
        ) : (
          filteredDispatches.map((dispatch) => (
            <div key={dispatch.id} className="dispatch-card">
              <div className="dispatch-card-header">
                <div>
                  <h3>{dispatch.dispatchNumber}</h3>
                  <p className="dispatch-customer">{dispatch.customerName}</p>
                </div>
                <span className={getStatusBadge(dispatch.status)}>
                  {dispatch.status.replace('_', ' ')}
                </span>
              </div>

              <div className="dispatch-details">
                <div className="detail-row">
                  <span className="detail-label">Courier:</span>
                  <span className="detail-value">{dispatch.courierName}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Tracking:</span>
                  <span className="detail-value tracking-number">
                    {dispatch.trackingNumber}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Dispatch Date:</span>
                  <span className="detail-value">
                    {new Date(dispatch.dispatchDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Expected Delivery:</span>
                  <span className="detail-value">
                    {new Date(dispatch.expectedDeliveryDate).toLocaleDateString()}
                  </span>
                </div>
                {dispatch.actualDeliveryDate && (
                  <div className="detail-row">
                    <span className="detail-label">Delivered On:</span>
                    <span className="detail-value delivered-date">
                      {new Date(dispatch.actualDeliveryDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label">Contact:</span>
                  <span className="detail-value">
                    {dispatch.contactPerson} ({dispatch.contactPhone})
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Address:</span>
                  <span className="detail-value">
                    {dispatch.deliveryAddress.street},{' '}
                    {dispatch.deliveryAddress.city},{' '}
                    {dispatch.deliveryAddress.state} -{' '}
                    {dispatch.deliveryAddress.pincode}
                  </span>
                </div>
              </div>

              {dispatch.items && dispatch.items.length > 0 && (
                <div className="dispatch-items">
                  <strong>Items:</strong>
                  {dispatch.items.map((item, idx) => (
                    <div key={idx} className="dispatch-item">
                      {item.productName} × {item.quantity}
                    </div>
                  ))}
                </div>
              )}

              {dispatch.notes && (
                <div className="dispatch-notes">
                  <strong>Notes:</strong> {dispatch.notes}
                </div>
              )}

              {dispatch.status !== 'DELIVERED' && dispatch.status !== 'CANCELLED' && (
                <div className="dispatch-actions">
                  <button
                    className="btn-secondary"
                    onClick={() => openStatusModal(dispatch)}
                  >
                    Update Status
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create Dispatch Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div role="dialog" aria-modal="true" aria-label="Create Dispatch" className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Dispatch</h2>
              <button
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDispatch}>
              {formError && <p role="alert" className="dispatch-form-notice">{formError} <button type="button" onClick={fetchReadyOrders}>Retry</button></p>}
              {readyLoading ? <p className="dispatch-form-notice">Loading ready orders…</p> : !readyOrders.length && !formError && <p className="dispatch-form-notice">No orders are ready. Move every item in an order to Dispatch on the Production Board first. Orders already dispatched are not listed.</p>}
              <div className="form-group">
                <label htmlFor="dispatch-field-1">Ready order *</label>
                <select id="dispatch-field-1"
                  value={createForm.productionId}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, productionId: e.target.value })
                  }
                  required
                >
                  <option value="">Select ready order</option>
                  {readyOrders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.productionNumber} - {order.order?.customer?.companyName} (
                      {order.order?.orderNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="dispatch-field-2">Courier Name *</label>
                  <input id="dispatch-field-2"
                    type="text"
                    value={createForm.courierName}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, courierName: e.target.value })
                    }
                    placeholder="Blue Dart, DTDC, etc."
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="dispatch-field-3">Tracking Number *</label>
                  <input id="dispatch-field-3"
                    type="text"
                    value={createForm.trackingNumber}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        trackingNumber: e.target.value,
                      })
                    }
                    placeholder="Enter tracking number"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="dispatch-field-4">Dispatch Date *</label>
                  <input id="dispatch-field-4"
                    type="date"
                    value={createForm.dispatchDate}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, dispatchDate: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="dispatch-field-5">Expected Delivery Date *</label>
                  <input id="dispatch-field-5"
                    type="date"
                    value={createForm.expectedDeliveryDate}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        expectedDeliveryDate: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="dispatch-field-6">Contact Person</label>
                  <input id="dispatch-field-6"
                    type="text"
                    value={createForm.contactPerson}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        contactPerson: e.target.value,
                      })
                    }
                    placeholder="Contact person name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="dispatch-field-7">Contact Phone</label>
                  <input id="dispatch-field-7"
                    type="tel"
                    value={createForm.contactPhone}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        contactPhone: e.target.value,
                      })
                    }
                    placeholder="Phone number"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="dispatch-field-8">Notes</label>
                <textarea id="dispatch-field-8"
                  value={createForm.notes}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, notes: e.target.value })
                  }
                  placeholder="Special instructions or notes"
                  rows="3"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving || readyLoading || !readyOrders.length}>
                  {saving ? 'Saving…' : 'Create Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {showStatusModal && selectedDispatch && (
        <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Update Dispatch Status</h2>
              <button
                className="modal-close"
                onClick={() => setShowStatusModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateStatus}>
              <div className="form-group">
                <label htmlFor="dispatch-field-9">Status *</label>
                <select id="dispatch-field-9"
                  value={statusForm.status}
                  onChange={(e) =>
                    setStatusForm({ ...statusForm, status: e.target.value })
                  }
                  required
                >
                  <option value="">Select Status</option>
                  {selectedDispatch.status === 'PENDING' && (
                    <>
                      <option value="DISPATCHED">Dispatched</option>
                      <option value="CANCELLED">Cancelled</option>
                    </>
                  )}
                  {selectedDispatch.status === 'DISPATCHED' && (
                    <>
                      <option value="IN_TRANSIT">In Transit</option>
                      <option value="DELIVERED">Delivered</option>
                      <option value="CANCELLED">Cancelled</option>
                    </>
                  )}
                  {selectedDispatch.status === 'IN_TRANSIT' && (
                    <>
                      <option value="DELIVERED">Delivered</option>
                      <option value="CANCELLED">Cancelled</option>
                    </>
                  )}
                </select>
              </div>

              {statusForm.status === 'DELIVERED' && (
                <>
                  <div className="form-group">
                    <label htmlFor="dispatch-field-10">Delivery Date *</label>
                    <input id="dispatch-field-10"
                      type="date"
                      value={statusForm.actualDeliveryDate}
                      onChange={(e) =>
                        setStatusForm({
                          ...statusForm,
                          actualDeliveryDate: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="dispatch-field-11">Received By</label>
                    <input id="dispatch-field-11"
                      type="text"
                      value={statusForm.podReceivedBy}
                      onChange={(e) =>
                        setStatusForm({
                          ...statusForm,
                          podReceivedBy: e.target.value,
                        })
                      }
                      placeholder="Name of person who received"
                    />
                  </div>
                </>
              )}

              <div className="form-group">
                <label htmlFor="dispatch-field-12">Notes</label>
                <textarea id="dispatch-field-12"
                  value={statusForm.notes}
                  onChange={(e) =>
                    setStatusForm({ ...statusForm, notes: e.target.value })
                  }
                  placeholder="Additional notes"
                  rows="3"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowStatusModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Update Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dispatch;
