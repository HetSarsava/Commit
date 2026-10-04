import { useState, useEffect } from 'react';
import { productsAPI } from '../api/products';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import ProductModal from '../components/ProductModal';
import './Products.css';

const Products = () => {
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [catalogueError, setCatalogueError] = useState("");
  const [catalogueContacts, setCatalogueContacts] = useState([]);
  const [catalogueCustomer, setCatalogueCustomer] = useState('');
  useEffect(() => {
    apiClient.get('/catalogues/contacts').then(response => setCatalogueContacts(response.data)).catch(() => setCatalogueError('Could not load customers. You can still download a PDF.'));
  }, []);
  const downloadCatalogue = async () => {
    setGenerating(true); setCatalogueError("");
    try {
      const response = await apiClient.post('/catalogues/pdf', { productIds: selectedForCatalogue.map(p => p.id) }, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url; link.download = 'product-catalogue.pdf';
      document.body.appendChild(link);
      link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
    catch (error) { let message = "Could not generate the catalogue. Please try again."; try { message = JSON.parse(await error.response.data.text()).error || message; } catch {} setCatalogueError(message); }
    finally { setGenerating(false); }
  };
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalMode, setModalMode] = useState('create');

  // Catalogue builder state
  const [selectedForCatalogue, setSelectedForCatalogue] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');

  useEffect(() => {
    fetchProducts();
  }, [searchQuery, filterCategory]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await productsAPI.getProducts({
        category: filterCategory === 'ALL' ? undefined : filterCategory,
        search: searchQuery || undefined,
        isActive: 'true',
        limit: 100,
      });
      setProducts(data.products);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setModalMode('create');
    setSelectedProduct(null);
    setShowModal(true);
  };

  const handleEdit = (product) => {
    setModalMode('edit');
    setSelectedProduct(product);
    setShowModal(true);
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete product ${product.name}?`)) return;

    try {
      await productsAPI.deleteProduct(product.id);
      fetchProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('Failed to delete product');
    }
  };

  const handleModalSuccess = () => {
    setShowModal(false);
    setSelectedProduct(null);
    fetchProducts();
  };

  const toggleCatalogueSelection = (product) => {
    if (selectedForCatalogue.find(p => p.id === product.id)) {
      setSelectedForCatalogue(selectedForCatalogue.filter(p => p.id !== product.id));
    } else {
      setSelectedForCatalogue([...selectedForCatalogue, product]);
    }
  };

  const clearCatalogueSelection = () => {
    setSelectedForCatalogue([]);
  };

  const getProductPlaceholder = (category) => {
    const categoryLabels = {
      'SHIRTS': 'Shirts',
      'PANTS': 'Pants',
      'JACKETS': 'Jackets',
      'SCRUBS': 'Scrubs',
      'CAPS': 'Caps',
      'ACCESSORIES': 'Accessories',
    };
    return categoryLabels[category] || 'Product';
  };

  return (
    <div className="products-page">
      {/* Main Content */}
      <div className="products-main">
        <div className="topbar">
          <div>
            <h1>Product Catalogue</h1>
            <div className="sub">{products.length} products available</div>
          </div>
          <div className="topbar-actions">
            <button className="btn" disabled title="CSV import is not configured">Import from CSV</button>
            <button className="btn btn-primary" onClick={handleCreate}>+ Add product</button>
          </div>
        </div>

        <div className="toolbar">
          <div className="search">
            <input
              placeholder="Search products, SKU…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search products by name or SKU"
            />
          </div>
          <button
            type="button"
            className={`chip ${filterCategory !== 'ALL' ? 'on' : ''}`}
            aria-pressed={filterCategory !== 'ALL'}
            onClick={() => setFilterCategory(filterCategory === 'ALL' ? 'SHIRTS' : 'ALL')}
          >
            Category: {filterCategory === 'ALL' ? 'All' : filterCategory}
          </button>
          <span className="chip chip-static">Sort: Name A-Z</span>
        </div>

        <div className="products-grid-wrap">
          {loading ? (
            <div className="loading-state">Loading...</div>
          ) : products.length === 0 ? (
            <div className="empty-state">

              <h3>No products found</h3>
              <p>Add your first product to get started</p>
              <button className="btn btn-primary" onClick={handleCreate}>+ Add product</button>
            </div>
          ) : (
            <div className="products-grid">
              {products.map((product) => {
                const isSelected = selectedForCatalogue.find(p => p.id === product.id);
                return (
                  <div
                    key={product.id}
                    className={`p-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleCatalogueSelection(product)}
                  >
                    <div className="p-img">
                      {getProductPlaceholder(product.category)}
                      {product.stockQuantity < 20 && (
                        <div className="low-stock">Low stock</div>
                      )}
                    </div>
                    <div className="p-body">
                      <div className="p-name">{product.name}</div>
                      <div className="p-sku">SKU: {product.sku}</div>
                      <div className="p-meta">
                        <span className="p-price">₹{Number(product.basePrice).toLocaleString('en-IN')}</span>
                        <span className="p-moq">MOQ {product.moq}</span>
                      </div>
                      {product.colors && product.colors.length > 0 && (
                        <div className="p-tags">
                          {product.fabric && <span className="p-tag">{product.fabric}</span>}
                          {product.colors.slice(0, 2).map((color, idx) => (
                            <span key={idx} className="p-tag">{color}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="p-actions">
                      <button
                        className="p-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(product);
                        }}
                        title="Edit">Edit</button>
                      <button
                        className="p-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(product);
                        }}
                        title="Delete"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Catalogue Builder Panel */}
      <div className="builder">
        <div className="builder-head">
          <h3>Build a catalogue</h3>
          <div className="sub">Create a customer or requirement-specific selection</div>
        </div>

        <div className="builder-section">
          <h4>Send to</h4>
          <div className="field">
            <label>Lead / Customer</label>
            <select aria-label="Catalogue customer" value={catalogueCustomer} onChange={event => setCatalogueCustomer(event.target.value)}>
              <option value="">Choose a customer when saving</option>
              {catalogueContacts.map(contact => <option key={contact.id} value={contact.id}>{contact.companyName}</option>)}
            </select>
          </div>
          <p>Choose products from the list. A customer is optional for a PDF and required when you save a catalogue.</p>
        </div>

        <div className="builder-section" style={{ flex: 1, overflowY: 'auto' }}>
          <h4>Selected products ({selectedForCatalogue.length})</h4>
          {selectedForCatalogue.length === 0 ? (
            <div className="empty-selection">
              Click on products to add them to the catalogue
            </div>
          ) : (
            <div className="selected-list">
              {selectedForCatalogue.map((product) => (
                <div key={product.id} className="sel-item">
                  <div className="sel-thumb">{getProductPlaceholder(product.category).slice(0, 2).toUpperCase()}</div>
                  <div className="sel-name">{product.name}</div>
                  <button
                    type="button"
                    className="sel-remove"
                    onClick={() => toggleCatalogueSelection(product)}
                    aria-label={`Remove ${product.name} from catalogue`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="analytics-strip"><div className="a-stat"><div className="n">{selectedForCatalogue.length}</div><div className="l">PRODUCTS SELECTED</div></div><p>Download a PDF, or save a catalogue for a customer to get its viewing link.</p></div>

        <div className="builder-actions">
          {catalogueError && <p role="alert">{catalogueError}</p>}
          <button
            className="action-btn primary"
            disabled={generating || !selectedForCatalogue.length}
            onClick={downloadCatalogue}
          >
            {generating ? 'Preparing PDF…' : 'Download catalogue PDF'}
          </button>
          <button
            className="action-btn"
            disabled={!selectedForCatalogue.length}
            onClick={() => navigate('/catalogues', { state: { selectedProducts: selectedForCatalogue.map(p => p.id), customerId: catalogueCustomer } })}
          >
            Save catalogue & get link
          </button>
          {selectedForCatalogue.length > 0 && (
            <button className="action-btn-text" onClick={clearCatalogueSelection}>
              Clear selection
            </button>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <ProductModal
          product={selectedProduct}
          mode={modalMode}
          onClose={() => setShowModal(false)}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
};

export default Products;
