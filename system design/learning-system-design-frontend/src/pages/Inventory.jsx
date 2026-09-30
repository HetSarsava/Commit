import { useState, useEffect } from 'react';
import { inventoryAPI } from '../api/inventory';
import './Inventory.css';

const Inventory = () => {
  const [materials, setMaterials] = useState([]);
  const [summary, setSummary] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, lowStock
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: 'Fabric',
    unit: 'Meters',
    costPerUnit: '',
    currentStock: '',
    reorderLevel: '',
    reorderQuantity: '',
    description: '',
  });
  const [movementData, setMovementData] = useState({
    materialId: '',
    type: 'IN',
    quantity: '',
    reference: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = filter === 'lowStock' ? { lowStock: 'true' } : {};
      const [materialsData, summaryData] = await Promise.all([
        inventoryAPI.getAllMaterials(params),
        inventoryAPI.getInventorySummary(),
      ]);
      setMaterials(materialsData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to load inventory:', error);
      alert('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMaterial) {
        await inventoryAPI.updateMaterial(editingMaterial.id, formData);
        alert('Material updated successfully');
      } else {
        await inventoryAPI.createMaterial(formData);
        alert('Material created successfully');
      }
      closeModal();
      loadData();
    } catch (error) {
      console.error('Failed to save material:', error);
      alert(error.response?.data?.error || 'Failed to save material');
    }
  };

  const handleStockMovement = async (e) => {
    e.preventDefault();
    try {
      await inventoryAPI.recordStockMovement(movementData);
      alert('Stock movement recorded successfully');
      closeMovementModal();
      loadData();
    } catch (error) {
      console.error('Failed to record stock movement:', error);
      alert(error.response?.data?.error || 'Failed to record stock movement');
    }
  };

  const openModal = (material = null) => {
    if (material) {
      setEditingMaterial(material);
      setFormData({
        sku: material.sku,
        name: material.name,
        category: material.category,
        unit: material.unit,
        costPerUnit: material.costPerUnit,
        currentStock: material.currentStock,
        reorderLevel: material.reorderLevel,
        reorderQuantity: material.reorderQuantity,
        description: material.description || '',
      });
    } else {
      setEditingMaterial(null);
      setFormData({
        sku: '',
        name: '',
        category: 'Fabric',
        unit: 'Meters',
        costPerUnit: '',
        currentStock: '',
        reorderLevel: '',
        reorderQuantity: '',
        description: '',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingMaterial(null);
  };

  const openMovementModal = (material = null) => {
    setMovementData({
      materialId: material?.id || '',
      type: 'IN',
      quantity: '',
      reference: '',
      notes: '',
    });
    setShowMovementModal(true);
  };

  const closeMovementModal = () => {
    setShowMovementModal(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this material?')) return;

    try {
      await inventoryAPI.deleteMaterial(id);
      alert('Material deleted successfully');
      loadData();
    } catch (error) {
      console.error('Failed to delete material:', error);
      alert('Failed to delete material');
    }
  };

  const getLowStockClass = (material) => {
    if (material.currentStock === 0) return 'out-of-stock';
    if (material.currentStock <= material.reorderLevel) return 'low-stock';
    return '';
  };

  return (
    <div className="inventory-page">
      {/* Top Bar */}
      <div className="topbar">
        <div>
          <h1>Inventory & Materials</h1>
          <div className="sub">Manage raw materials and stock levels</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-secondary" onClick={() => openMovementModal()}>
            Record Movement
          </button>
          <button className="btn" onClick={() => openModal()}>
            Add Material
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-value">₹{summary.totalStockValue.toLocaleString('en-IN')}</div>
            <div className="summary-label">Total Stock Value</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{summary.totalMaterials}</div>
            <div className="summary-label">Total Materials</div>
          </div>
          <div className="summary-card alert">
            <div className="summary-value">{summary.lowStockCount}</div>
            <div className="summary-label">Low Stock Items</div>
          </div>
          <div className="summary-card danger">
            <div className="summary-value">{summary.outOfStockCount}</div>
            <div className="summary-label">Out of Stock</div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Materials
        </button>
        <button
          className={`filter-tab ${filter === 'lowStock' ? 'active' : ''}`}
          onClick={() => setFilter('lowStock')}
        >
          Low Stock
        </button>
      </div>

      {/* Materials Table */}
      <div className="content">
        {loading ? (
          <div className="loading">Loading inventory...</div>
        ) : materials.length === 0 ? (
          <div className="empty-state">
            <p>No materials found</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Material Name</th>
                  <th>Category</th>
                  <th>Current Stock</th>
                  <th>Unit</th>
                  <th>Cost/Unit</th>
                  <th>Reorder Level</th>
                  <th>Stock Value</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((material) => (
                  <tr key={material.id} className={getLowStockClass(material)}>
                    <td><span className="sku-code">{material.sku}</span></td>
                    <td className="material-name">{material.name}</td>
                    <td><span className="badge category-badge">{material.category}</span></td>
                    <td>
                      <div className="stock-cell">
                        <strong>{material.currentStock}</strong>
                        {material.currentStock === 0 && (
                          <span className="stock-alert danger">OUT OF STOCK</span>
                        )}
                        {material.currentStock > 0 && material.currentStock <= material.reorderLevel && (
                          <span className="stock-alert warning">LOW STOCK</span>
                        )}
                      </div>
                    </td>
                    <td>{material.unit}</td>
                    <td>₹{material.costPerUnit}</td>
                    <td>{material.reorderLevel}</td>
                    <td>₹{(material.currentStock * material.costPerUnit).toLocaleString('en-IN')}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-icon"
                          onClick={() => openMovementModal(material)}
                          title="Record movement"
                        >
                          +/-
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => openModal(material)}
                          title="Edit"
                        >
                          ✎
                        </button>
                        <button
                          className="btn-icon danger"
                          onClick={() => handleDelete(material.id)}
                          title="Delete"
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Material Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingMaterial ? 'Edit Material' : 'Add New Material'}</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>SKU *</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    required
                    disabled={editingMaterial}
                  />
                </div>
                <div className="form-group">
                  <label>Material Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                  >
                    <option value="Fabric">Fabric</option>
                    <option value="Thread">Thread</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Labels">Labels</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Unit *</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    required
                  >
                    <option value="Meters">Meters</option>
                    <option value="Kilograms">Kilograms</option>
                    <option value="Pieces">Pieces</option>
                    <option value="Rolls">Rolls</option>
                    <option value="Boxes">Boxes</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Cost Per Unit *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.costPerUnit}
                    onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value })}
                    required
                  />
                </div>
                {!editingMaterial && (
                  <div className="form-group">
                    <label>Current Stock</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.currentStock}
                      onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                    />
                  </div>
                )}
                <div className="form-group">
                  <label>Reorder Level</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Reorder Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.reorderQuantity}
                    onChange={(e) => setFormData({ ...formData, reorderQuantity: e.target.value })}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn">
                  {editingMaterial ? 'Update' : 'Create'} Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Movement Modal */}
      {showMovementModal && (
        <div className="modal-overlay" onClick={closeMovementModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Record Stock Movement</h2>
              <button className="modal-close" onClick={closeMovementModal}>×</button>
            </div>
            <form onSubmit={handleStockMovement}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Material *</label>
                  <select
                    value={movementData.materialId}
                    onChange={(e) => setMovementData({ ...movementData, materialId: e.target.value })}
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
                  <label>Movement Type *</label>
                  <select
                    value={movementData.type}
                    onChange={(e) => setMovementData({ ...movementData, type: e.target.value })}
                    required
                  >
                    <option value="IN">Stock IN</option>
                    <option value="OUT">Stock OUT</option>
                    <option value="ADJUSTMENT">Adjustment</option>
                    <option value="TRANSFER">Transfer</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Quantity *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={movementData.quantity}
                    onChange={(e) => setMovementData({ ...movementData, quantity: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group full-width">
                  <label>Reference</label>
                  <input
                    type="text"
                    value={movementData.reference}
                    onChange={(e) => setMovementData({ ...movementData, reference: e.target.value })}
                    placeholder="e.g., PO, Production, Wastage"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Notes</label>
                  <textarea
                    value={movementData.notes}
                    onChange={(e) => setMovementData({ ...movementData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeMovementModal}>
                  Cancel
                </button>
                <button type="submit" className="btn">
                  Record Movement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
