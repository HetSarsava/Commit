import { useState, useEffect } from 'react';
import { productsAPI } from '../api/products';
import ProductModal from '../components/ProductModal';
import './Products.css';

const Products = () => {
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

  const getProductEmoji = (category) => {
    const emojiMap = {
      'SHIRTS': '👕',
      'PANTS': '👖',
      'JACKETS': '🧥',
      'SCRUBS': '🥼',
      'CAPS': '🧢',
      'ACCESSORIES': '🎽',
    };
    return emojiMap[category] || '👔';
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
            <button className="btn">Import from CSV</button>
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
          <div className={`chip ${filterCategory !== 'ALL' ? 'on' : ''}`} onClick={() => setFilterCategory(filterCategory === 'ALL' ? 'SHIRTS' : 'ALL')}>
            Category: {filterCategory === 'ALL' ? 'All' : filterCategory}
          </div>
          <div className="chip">Sort: Name A-Z</div>
        </div>

        <div className="products-grid-wrap">
          {loading ? (
            <div className="loading-state">Loading...</div>
          ) : products.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
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
                      {getProductEmoji(product.category)}
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
                        title="Edit"
                      >
                        ✏
                      </button>
                      <button
                        className="p-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(product);
                        }}
                        title="Delete"
                      >
                        🗑
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
            <select>
              <option>Select customer...</option>
              <option>Sunrise Hospital Group</option>
              <option>Grand Horizon Hotels</option>
              <option>Metro Facility Services</option>
            </select>
          </div>
          <div className="field">
            <label>Requirement match</label>
            <select>
              <option>Select requirement...</option>
              <option>Hospital & healthcare uniforms</option>
              <option>Hotel & hospitality wear</option>
              <option>Security & facility staff</option>
            </select>
          </div>
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
                  <div className="sel-thumb">{getProductEmoji(product.category)}</div>
                  <div className="sel-name">{product.name}</div>
                  <div
                    className="sel-remove"
                    onClick={() => toggleCatalogueSelection(product)}
                  >
                    ✕
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="analytics-strip">
          <div className="a-stat">
            <div className="n">86%</div>
            <div className="l">OPEN RATE (30D)</div>
          </div>
          <div className="a-stat">
            <div className="n">312</div>
            <div className="l">PRODUCT VIEWS</div>
          </div>
          <div className="a-stat">
            <div className="n">24</div>
            <div className="l">ENQUIRY CLICKS</div>
          </div>
        </div>

        <div className="builder-actions">
          <button
            className="action-btn primary"
            disabled={selectedForCatalogue.length === 0}
          >
            Generate PDF & share link
          </button>
          <button
            className="action-btn"
            disabled={selectedForCatalogue.length === 0}
          >
            Send directly on WhatsApp
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
