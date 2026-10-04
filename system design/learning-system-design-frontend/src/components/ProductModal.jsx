import { useState, useEffect } from 'react';
import { productsAPI } from '../api/products';
import './ProductModal.css';
import './LeadModal.css';

const ProductModal = ({ mode, product, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category: 'UNIFORM',
    fabric: '',
    colors: [],
    sizes: [],
    moq: '',
    basePrice: '',
    stockQuantity: '0',
    lowStockAlert: '10',
    customizable: false,
    customizationOptions: '',
    thumbnail: '',
    images: [],
    isActive: true,
  });

  // Temporary strings for colors and sizes
  const [colorsInput, setColorsInput] = useState('');
  const [sizesInput, setSizesInput] = useState('');

  // Load product data if editing or viewing
  useEffect(() => {
    if (product && (mode === 'edit' || mode === 'view')) {
      setFormData({
        sku: product.sku || '',
        name: product.name || '',
        description: product.description || '',
        category: product.category || 'UNIFORM',
        fabric: product.fabric || '',
        colors: product.colors || [],
        sizes: product.sizes || [],
        moq: product.moq || '',
        basePrice: product.basePrice || '',
        stockQuantity: product.stockQuantity || 0,
        lowStockAlert: product.lowStockAlert || 10,
        customizable: product.customizable || false,
        customizationOptions: product.customizationOptions || '',
        thumbnail: product.thumbnail || '',
        images: product.images || [],
        isActive: product.isActive !== undefined ? product.isActive : true,
      });

      setColorsInput((product.colors || []).join(', '));
      setSizesInput((product.sizes || []).join(', '));
    }
  }, [product, mode]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError('');
  };

  const handleColorsChange = (e) => {
    const value = e.target.value;
    setColorsInput(value);
    // Convert comma-separated string to array
    const colorsArray = value.split(',').map(c => c.trim()).filter(c => c);
    setFormData(prev => ({ ...prev, colors: colorsArray }));
  };

  const handleSizesChange = (e) => {
    const value = e.target.value;
    setSizesInput(value);
    // Convert comma-separated string to array
    const sizesArray = value.split(',').map(s => s.trim()).filter(s => s);
    setFormData(prev => ({ ...prev, sizes: sizesArray }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate required fields
      if (!formData.sku.trim()) {
        throw new Error('SKU is required');
      }
      if (!formData.name.trim()) {
        throw new Error('Product name is required');
      }
      if (!formData.moq || formData.moq <= 0) {
        throw new Error('MOQ must be greater than 0');
      }
      if (!formData.basePrice || formData.basePrice <= 0) {
        throw new Error('Price must be greater than 0');
      }

      const dataToSend = {
        ...formData,
        moq: parseInt(formData.moq),
        basePrice: parseFloat(formData.basePrice),
        stockQuantity: parseInt(formData.stockQuantity) || 0,
        lowStockAlert: parseInt(formData.lowStockAlert) || 10,
      };

      if (mode === 'create') {
        await productsAPI.createProduct(dataToSend);
      } else if (mode === 'edit') {
        await productsAPI.updateProduct(product.id, dataToSend);
      }

      onSuccess();
    } catch (err) {
      console.error('Failed to save product:', err);
      console.error('Error response:', err.response?.data);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to save product';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isViewMode = mode === 'view';

  return (
    <div className="form-modal product-modal" onClick={onClose}>
      <div className="modal-container modal-large" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <h2>
            {mode === 'create' && ' Add New Product'}
            {mode === 'edit' && ' Edit Product'}
            {mode === 'view' && ' Product Details'}
          </h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="modal-error">
            {error}
          </div>
        )}

        {/* Modal Body */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Basic Information */}
            <div className="form-section">
              <h3 className="section-title">Basic Information</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label>SKU *</label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleChange}
                    disabled={isViewMode || mode === 'edit'}
                    required
                    placeholder="UNI-001"
                  />
                </div>

                <div className="form-field">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={isViewMode}
                    required
                    placeholder="Corporate Uniform Shirt"
                  />
                </div>

                <div className="form-field">
                  <label>Category *</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    disabled={isViewMode}
                    required
                  >
                    <option value="UNIFORM">Uniform</option>
                    <option value="SHIRT">Shirt</option>
                    <option value="PANT">Pant</option>
                    <option value="JACKET">Jacket</option>
                    <option value="ACCESSORIES">Accessories</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Fabric</label>
                  <input
                    type="text"
                    name="fabric"
                    value={formData.fabric}
                    onChange={handleChange}
                    disabled={isViewMode}
                    placeholder="Cotton Blend"
                  />
                </div>

                <div className="form-field form-field-full">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    disabled={isViewMode}
                    rows="3"
                    placeholder="Detailed product description..."
                  />
                </div>
              </div>
            </div>

            {/* Variants */}
            <div className="form-section">
              <h3 className="section-title">Variants & Specifications</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label>Available Colors</label>
                  <input
                    type="text"
                    value={colorsInput}
                    onChange={handleColorsChange}
                    disabled={isViewMode}
                    placeholder="White, Blue, Black (comma-separated)"
                  />
                  <small className="field-hint">Enter colors separated by commas</small>
                </div>

                <div className="form-field">
                  <label>Available Sizes</label>
                  <input
                    type="text"
                    value={sizesInput}
                    onChange={handleSizesChange}
                    disabled={isViewMode}
                    placeholder="S, M, L, XL, XXL (comma-separated)"
                  />
                  <small className="field-hint">Enter sizes separated by commas</small>
                </div>
              </div>
            </div>

            {/* Pricing & Stock */}
            <div className="form-section">
              <h3 className="section-title">Pricing & Inventory</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label>Base Price (₹) *</label>
                  <input
                    type="number"
                    name="basePrice"
                    value={formData.basePrice}
                    onChange={handleChange}
                    disabled={isViewMode}
                    required
                    min="0"
                    step="0.01"
                    placeholder="450.00"
                  />
                </div>

                <div className="form-field">
                  <label>MOQ (Minimum Order Quantity) *</label>
                  <input
                    type="number"
                    name="moq"
                    value={formData.moq}
                    onChange={handleChange}
                    disabled={isViewMode}
                    required
                    min="1"
                    placeholder="50"
                  />
                </div>

                <div className="form-field">
                  <label>Stock Quantity</label>
                  <input
                    type="number"
                    name="stockQuantity"
                    value={formData.stockQuantity}
                    onChange={handleChange}
                    disabled={isViewMode}
                    min="0"
                  />
                </div>

                <div className="form-field">
                  <label>Low Stock Alert</label>
                  <input
                    type="number"
                    name="lowStockAlert"
                    value={formData.lowStockAlert}
                    onChange={handleChange}
                    disabled={isViewMode}
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Customization */}
            <div className="form-section">
              <h3 className="section-title">Customization</h3>
              <div className="form-grid">
                <div className="form-field form-checkbox">
                  <label>
                    <input
                      type="checkbox"
                      name="customizable"
                      checked={formData.customizable}
                      onChange={handleChange}
                      disabled={isViewMode}
                    />
                    <span>This product is customizable</span>
                  </label>
                </div>

                {formData.customizable && (
                  <div className="form-field form-field-full">
                    <label>Customization Options</label>
                    <textarea
                      name="customizationOptions"
                      value={formData.customizationOptions}
                      onChange={handleChange}
                      disabled={isViewMode}
                      rows="2"
                      placeholder="E.g., Logo printing, name embroidery, custom colors..."
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Images */}
            <div className="form-section">
              <h3 className="section-title">Product Images</h3>
              <div className="form-grid">
                <div className="form-field form-field-full">
                  <label>Thumbnail URL</label>
                  <input
                    type="url"
                    name="thumbnail"
                    value={formData.thumbnail}
                    onChange={handleChange}
                    disabled={isViewMode}
                    placeholder="https://example.com/image.jpg"
                  />
                  <small className="field-hint">Use a public image link for the product thumbnail.</small>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="form-section">
              <h3 className="section-title">Status</h3>
              <div className="form-field form-checkbox">
                <label>
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                    disabled={isViewMode}
                  />
                  <span>Product is active and visible</span>
                </label>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              {isViewMode ? 'Close' : 'Cancel'}
            </button>

            {!isViewMode && (
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : mode === 'create' ? 'Create Product' : 'Save Changes'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;
