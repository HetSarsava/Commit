import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersAPI } from '../api/orders';
import './Orders.css';

const Orders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [filterStatus, searchQuery]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await ordersAPI.getOrders({
        status: filterStatus === 'ALL' ? undefined : filterStatus,
        search: searchQuery || undefined,
        limit: 100,
      });
      setOrders(data.orders);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (order) => {
    navigate(`/orders/${order.id}`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING':
        return 'status-pending';
      case 'CONFIRMED':
        return 'status-confirmed';
      case 'IN_PRODUCTION':
        return 'status-production';
      case 'COMPLETED':
        return 'status-completed';
      case 'CANCELLED':
        return 'status-cancelled';
      default:
        return '';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="orders-page">
      {/* Top Bar */}
      <div className="topbar">
        <div>
          <h1>Sales Orders</h1>
          <div className="sub">{orders.length} orders</div>
        </div>
        <div className="topbar-actions">
          <button className="btn">Export</button>
          <button className="btn btn-primary" onClick={() => navigate('/quotations')}>
            + New Order (from Quotation)
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search">
          <input
            placeholder="Search by order number, PO number…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className={`chip ${filterStatus !== 'ALL' ? 'on' : ''}`} onClick={() => setFilterStatus(filterStatus === 'ALL' ? 'CONFIRMED' : 'ALL')}>
          Status: {filterStatus === 'ALL' ? 'All' : filterStatus}
        </div>
      </div>

      {/* Orders List */}
      <div className="content-area">
        {loading ? (
          <div className="loading-state">Loading...</div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">▤</div>
            <h3>No orders yet</h3>
            <p>Convert quotations to orders to get started</p>
            <button className="btn btn-primary" onClick={() => navigate('/quotations')}>
              View Quotations
            </button>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <div
                key={order.id}
                className="order-card"
                onClick={() => handleView(order)}
              >
                <div className="order-header">
                  <div className="order-number">{order.orderNumber}</div>
                  <div className={`order-status ${getStatusColor(order.status)}`}>
                    {order.status.replace('_', ' ')}
                  </div>
                </div>

                <div className="order-body">
                  <div className="order-customer">
                    <strong>{order.customer?.companyName}</strong>
                    <div className="order-contact">{order.customer?.contactPerson}</div>
                  </div>

                  <div className="order-details">
                    {order.poNumber && (
                      <div className="order-meta">
                        <span className="label">PO:</span>
                        <span className="value">{order.poNumber}</span>
                      </div>
                    )}
                    <div className="order-meta">
                      <span className="label">Delivery:</span>
                      <span className="value">{formatDate(order.deliveryDate)}</span>
                    </div>
                    <div className="order-meta">
                      <span className="label">Items:</span>
                      <span className="value">{order.items?.length || 0} items</span>
                    </div>
                  </div>
                </div>

                <div className="order-footer">
                  <div className="order-amount">
                    <span className="label">Total:</span>
                    <span className="amount">₹{Number(order.total).toLocaleString('en-IN')}</span>
                  </div>
                  {order.advanceAmount > 0 && (
                    <div className="payment-status">
                      <span className="advance-paid">
                        ₹{Number(order.advanceAmount).toLocaleString('en-IN')} paid
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
