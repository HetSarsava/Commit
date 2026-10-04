import { useState, useEffect } from 'react';
import { quotationsAPI } from '../api/quotations';
import { leadsAPI } from '../api/leads';
import { productsAPI } from '../api/products';
import './QuotationBuilder.css';

const QuotationBuilder = ({ quotation = null, mode = 'create', onClose, onSuccess }) => {
  const isEditMode = mode === 'edit' && quotation;
  const isViewMode = mode === 'view' && quotation;

  const [step, setStep] = useState(1); // 1: Customer, 2: Products, 3: Review
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Data
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  // Form data
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [notes, setNotes] = useState('');
  const [termsConditions, setTermsConditions] = useState('Payment terms: Net 30 days\nDelivery: As per agreed schedule\nPrices are subject to GST');

  // Load customers (from leads for now)
  useEffect(() => {
    loadCustomers();
    loadProducts();
  }, []);

  // Load existing quotation data for edit/view mode
  useEffect(() => {
    if (quotation && (isEditMode || isViewMode)) {
      setSelectedCustomer(quotation.customer);
      setDiscountPercent(quotation.discountPercent || 0);
      setNotes(quotation.notes || '');
      setTermsConditions(quotation.termsConditions || 'Payment terms: Net 30 days\nDelivery: As per agreed schedule\nPrices are subject to GST');

      // Load products from items
      if (quotation.items && quotation.items.length > 0) {
        const loadedProducts = quotation.items.map(item => ({
          productId: item.productId,
          product: item.product,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          customization: item.customization || '',
        }));
        setSelectedProducts(loadedProducts);
      }
    }
  }, [quotation, isEditMode, isViewMode]);

  const loadCustomers = async () => {
    try {
      const data = await leadsAPI.getLeads({ limit: 100 });
      setCustomers(data.leads);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await productsAPI.getProducts({ limit: 100, isActive: 'true' });
      setProducts(data.products);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  // Add product to quotation
  const addProduct = (product) => {
    const exists = selectedProducts.find(p => p.productId === product.id);
    if (exists) {
      setError('Product already added');
      return;
    }

    setSelectedProducts([
      ...selectedProducts,
      {
        productId: product.id,
        product: product,
        quantity: product.moq,
        unitPrice: Number(product.basePrice),
        discount: 0,
        customization: '',
      },
    ]);
    setError('');
  };

  // Remove product
  const removeProduct = (productId) => {
    setSelectedProducts(selectedProducts.filter(p => p.productId !== productId));
  };

  // Update product quantity
  const updateQuantity = (productId, quantity) => {
    setSelectedProducts(
      selectedProducts.map(p =>
        p.productId === productId ? { ...p, quantity: parseInt(quantity) || 0 } : p
      )
    );
  };

  // Update product price
  const updatePrice = (productId, price) => {
    setSelectedProducts(
      selectedProducts.map(p =>
        p.productId === productId ? { ...p, unitPrice: parseFloat(price) || 0 } : p
      )
    );
  };

  // Update product discount
  const updateDiscount = (productId, discount) => {
    setSelectedProducts(
      selectedProducts.map(p =>
        p.productId === productId ? { ...p, discount: parseFloat(discount) || 0 } : p
      )
    );
  };

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = selectedProducts.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unitPrice;
      const itemDiscount = item.discount || 0;
      return sum + (itemTotal - itemDiscount);
    }, 0);

    const discountAmount = (subtotal * discountPercent) / 100;
    const afterDiscount = subtotal - discountAmount;

    // GST 18% (9% CGST + 9% SGST for intra-state, or 18% IGST for inter-state)
    const gstPercent = 18;
    const taxAmount = (afterDiscount * gstPercent) / 100;
    const total = afterDiscount + taxAmount;

    return {
      subtotal,
      discountAmount,
      afterDiscount,
      taxAmount,
      total,
      gstPercent,
    };
  };

  // Submit quotation
  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      if (!selectedCustomer) {
        throw new Error('Please select a customer');
      }

      if (selectedProducts.length === 0) {
        throw new Error('Please add at least one product');
      }

      const totals = calculateTotals();

      // Prepare items
      const items = selectedProducts.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        total: item.quantity * item.unitPrice - (item.discount || 0),
        customization: item.customization || '',
      }));

      const quotationData = {
        customerId: selectedCustomer.id,
        items,
        subtotal: totals.subtotal,
        discountPercent: discountPercent || 0,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        total: totals.total,
        termsConditions,
        notes,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      };

      if (isEditMode) {
        await quotationsAPI.updateQuotation(quotation.id, quotationData);
      } else {
        await quotationsAPI.createQuotation(quotationData);
      }
      onSuccess();
    } catch (err) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} quotation:`, err);
      setError(err.message || err.response?.data?.error || `Failed to ${isEditMode ? 'update' : 'create'} quotation`);
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="quotation-builder-modal" onClick={onClose}>
      <div className="quotation-builder" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="builder-header">
          <h2>
             {isViewMode ? 'View Quotation' : isEditMode ? 'Edit Quotation' : 'Create Quotation'}
            {quotation && <span style={{ fontSize: '16px', color: 'var(--thread)', marginLeft: '12px' }}>{quotation.quotationNumber}</span>}
          </h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Steps */}
        <div className="builder-steps">
          <div className={`step ${step >= 1 ? 'active' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">Customer</span>
          </div>
          <div className="step-line"></div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Products</span>
          </div>
          <div className="step-line"></div>
          <div className={`step ${step >= 3 ? 'active' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">Review</span>
          </div>
        </div>

        {error && <div className="builder-error">{error}</div>}

        {/* Content */}
        <div className="builder-content">
          {/* Step 1: Select Customer */}
          {step === 1 && (
            <div className="step-content">
              <h3>Select Customer</h3>
              <input className="customer-search" aria-label="Search quotation customers" placeholder="Search company, contact or phone" value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} />
              <div className="customer-list">
                {[...customers.filter(c => c.id !== selectedCustomer?.id && [c.companyName,c.contactPerson,c.mobile].join(' ').toLowerCase().includes(customerSearch.toLowerCase())), ...(selectedCustomer ? [selectedCustomer] : [])].sort((a,b) => (b.id === selectedCustomer?.id ? 1 : 0) - (a.id === selectedCustomer?.id ? 1 : 0)).map((customer) => (
                  <div
                    key={customer.id}
                    className={`customer-item ${selectedCustomer?.id === customer.id ? 'selected' : ''} ${isViewMode ? 'disabled' : ''}`}
                    onClick={() => !isViewMode && setSelectedCustomer(customer)}
                  >
                    <div className="customer-name">{customer.companyName}</div>
                    <div className="customer-contact">{customer.contactPerson}</div>
                    <div className="customer-mobile">{customer.mobile}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Select Products */}
          {step === 2 && (
            <div className="step-content">
              <h3>Add Products</h3>

              {/* Selected Products */}
              {selectedProducts.length > 0 && (
                <div className="selected-products">
                  <h4>Selected Products ({selectedProducts.length})</h4>
                  {selectedProducts.map((item) => (
                    <div key={item.productId} className="selected-product-item">
                      <div className="product-info">
                        <strong>{item.product.name}</strong>
                        <small>{item.product.sku}</small>
                      </div>
                      <div className="product-inputs">
                        <label className="product-field">
                          <span className="field-annotation">Qty</span>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.productId, e.target.value)}
                            min={item.product.moq}
                            disabled={isViewMode}
                            aria-label={`Quantity of ${item.product.name} (minimum ${item.product.moq})`}
                          />
                        </label>
                        <label className="product-field">
                          <span className="field-annotation">Price (₹)</span>
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updatePrice(item.productId, e.target.value)}
                            step="0.01"
                            disabled={isViewMode}
                            aria-label={`Unit price of ${item.product.name} in rupees`}
                          />
                        </label>
                        <label className="product-field">
                          <span className="field-annotation">Discount (₹)</span>
                          <input
                            type="number"
                            value={item.discount}
                            onChange={(e) => updateDiscount(item.productId, e.target.value)}
                            step="0.01"
                            disabled={isViewMode}
                            aria-label={`Rupee discount on ${item.product.name}`}
                          />
                        </label>
                        <span className="item-total">
                          ₹{((item.quantity * item.unitPrice) - (item.discount || 0)).toLocaleString('en-IN')}
                        </span>
                        {!isViewMode && (
                          <button className="btn-remove" onClick={() => removeProduct(item.productId)}>
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Available Products */}
              {!isViewMode && (
                <>
                  <h4>Available Products</h4>
                  <div className="products-grid-mini">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className={`product-mini ${selectedProducts.find(p => p.productId === product.id) ? 'disabled' : ''}`}
                        onClick={() => !selectedProducts.find(p => p.productId === product.id) && addProduct(product)}
                      >
                        <div className="product-name">{product.name}</div>
                        <div className="product-sku">{product.sku}</div>
                        <div className="product-price">₹{Number(product.basePrice).toLocaleString('en-IN')}</div>
                        <div className="product-moq">MOQ: {product.moq}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="step-content">
              <h3>Review Quotation</h3>

              {/* Customer Info */}
              <div className="review-section">
                <h4>Customer</h4>
                <p><strong>{selectedCustomer?.companyName}</strong></p>
                <p>{selectedCustomer?.contactPerson} • {selectedCustomer?.mobile}</p>
              </div>

              {/* Products */}
              <div className="review-section">
                <h4>Products</h4>
                <table className="review-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Price</th>
                      <th>Discount</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProducts.map((item) => (
                      <tr key={item.productId}>
                        <td>{item.product.name}</td>
                        <td>{item.quantity}</td>
                        <td>₹{item.unitPrice.toLocaleString('en-IN')}</td>
                        <td>₹{(item.discount || 0).toLocaleString('en-IN')}</td>
                        <td>₹{((item.quantity * item.unitPrice) - (item.discount || 0)).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pricing */}
              <div className="review-section">
                <h4>Pricing</h4>
                <div className="pricing-rows">
                  <div className="pricing-row">
                    <span>Subtotal:</span>
                    <span>₹{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="pricing-row">
                    <label className="discount-field">
                      Discount:
                      <input
                        type="number"
                        value={discountPercent}
                        onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                        min="0"
                        max="100"
                        step="0.1"
                        style={{ width: '60px', marginLeft: '8px' }}
                        disabled={isViewMode}
                        aria-label="Overall quotation discount percent (0 to 100)"
                      />
                      %
                    </label>
                    <span>-₹{totals.discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="pricing-row">
                    <span>After Discount:</span>
                    <span>₹{totals.afterDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="pricing-row">
                    <span>GST ({totals.gstPercent}%):</span>
                    <span>₹{totals.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="pricing-row total-row">
                    <span><strong>Total:</strong></span>
                    <span><strong>₹{totals.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="review-section">
                <h4>Notes (Optional)</h4>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any special notes or instructions..."
                  rows="2"
                  disabled={isViewMode}
                  aria-label="Additional notes for this quotation"
                />
              </div>

              {/* Terms */}
              <div className="review-section">
                <h4>Terms & Conditions</h4>
                <textarea
                  value={termsConditions}
                  onChange={(e) => setTermsConditions(e.target.value)}
                  rows="3"
                  disabled={isViewMode}
                  aria-label="Terms and conditions"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="builder-footer">
          {step > 1 && (
            <button className="btn-secondary" onClick={() => setStep(step - 1)}>
              ← Back
            </button>
          )}
          <div style={{ flex: 1 }}></div>
          {step < 3 ? (
            <button
              className="btn-primary"
              onClick={() => {
                if (step === 1 && !selectedCustomer) {
                  setError('Please select a customer');
                  return;
                }
                if (step === 2 && selectedProducts.length === 0) {
                  setError('Please add at least one product');
                  return;
                }
                setError('');
                setStep(step + 1);
              }}
            >
              Next →
            </button>
          ) : isViewMode ? (
            <button className="btn-secondary" onClick={onClose}>
              Close
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? '✓ Update Quotation' : '✓ Create Quotation')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuotationBuilder;
