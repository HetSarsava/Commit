import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../api/dashboard';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await dashboardAPI.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentDate = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const now = new Date();
    return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formatCurrency = (amount) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount.toFixed(0)}`;
  };

  const formatNumber = (num) => {
    return num.toLocaleString('en-IN');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading dashboard...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="loading-container">
        <div>Failed to load dashboard</div>
      </div>
    );
  }

  const { metrics, topProducts, topCustomers, recentOrders, monthlyRevenue } = stats;

  return (
    <div className="dashboard">
      {/* Top Bar */}
      <div className="topbar">
        <div>
          <h1>{getGreeting()}, {user?.name}</h1>
          <div className="sub">{getCurrentDate()} · Ahmedabad office</div>
        </div>
        <button className="btn btn-primary" onClick={fetchDashboardData}>
          Refresh
        </button>
      </div>

      {/* Content */}
      <div className="content">
        {/* KPI Row */}
        <div className="kpi-row">
          <div className="kpi accent">
            <div className="label">Total Revenue</div>
            <div className="value">{formatCurrency(metrics.revenue.total)}</div>
            <div className={`delta ${metrics.revenue.growth >= 0 ? 'up' : 'down'}`}>
              {metrics.revenue.growth >= 0 ? '↑' : '↓'} {Math.abs(metrics.revenue.growth).toFixed(1)}% vs last month
            </div>
          </div>

          <div className="kpi">
            <div className="label">This Month Revenue</div>
            <div className="value">{formatCurrency(metrics.revenue.thisMonth)}</div>
            <div className="delta">{formatNumber(metrics.orders.thisMonth)} orders</div>
          </div>

          <div className="kpi">
            <div className="label">Total Orders</div>
            <div className="value">{metrics.orders.total}</div>
            <div className="delta up">{metrics.orders.completed} completed</div>
          </div>

          <div className="kpi">
            <div className="label">Active Leads</div>
            <div className="value">{metrics.leads.total}</div>
            <div className="delta">{metrics.leads.new} new</div>
          </div>

          <div className="kpi">
            <div className="label">Outstanding</div>
            <div className="value">{formatCurrency(metrics.invoices.outstanding)}</div>
            <div className="delta down">{metrics.invoices.unpaid} unpaid invoices</div>
          </div>
        </div>

        {/* Two Column Grid */}
        <div className="grid-2">
          {/* Revenue Trend Chart */}
          <div className="card">
            <div className="card-head">
              <h3>Revenue trend — last 6 months</h3>
              <span className="link" onClick={() => navigate('/orders')}>View orders →</span>
            </div>
            <div className="chart">
              <div className="chart-bars">
                {monthlyRevenue.map((month, index) => {
                  const maxRevenue = Math.max(...monthlyRevenue.map(m => m.revenue));
                  const height = maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0;
                  return (
                    <div key={index} className="chart-col">
                      <div className="chart-bar-wrap">
                        <div className="chart-bar" style={{ height: `${height}%` }}>
                          <div className="chart-tooltip">
                            {formatCurrency(month.revenue)}
                            <br />
                            {month.orders} orders
                          </div>
                        </div>
                      </div>
                      <div className="chart-label">{month.month.split(' ')[0]}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Top Products */}
          <div className="card">
            <div className="card-head">
              <h3>Top products by revenue</h3>
              <span className="link" onClick={() => navigate('/products')}>All products →</span>
            </div>
            <table className="mini-table">
              <tbody>
                {topProducts.map((product, index) => (
                  <tr key={product.id}>
                    <td>
                      <div className="mt-name">
                        {index + 1}. {product.name}
                      </div>
                      <div className="mt-sub">
                        SKU: {product.sku} · {product.quantity} units sold
                      </div>
                    </td>
                    <td className="mt-val">{formatCurrency(product.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Second Row Grid */}
        <div className="grid-2">
          {/* Top Customers */}
          <div className="card">
            <div className="card-head">
              <h3>Top customers by revenue</h3>
              <span className="link" onClick={() => navigate('/leads')}>All customers →</span>
            </div>
            <table className="mini-table">
              <tbody>
                {topCustomers.map((customer, index) => (
                  <tr key={customer.id}>
                    <td>
                      <div className="mt-name">
                        {index + 1}. {customer.companyName}
                      </div>
                      <div className="mt-sub">{customer.orderCount} orders</div>
                    </td>
                    <td className="mt-val">{formatCurrency(customer.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sales Pipeline */}
          <div className="card">
            <div className="card-head">
              <h3>Sales pipeline</h3>
              <span className="link" onClick={() => navigate('/quotations')}>View all →</span>
            </div>
            <div className="pipeline-stats">
              <div className="pipeline-item">
                <div className="pipeline-label">Active Leads</div>
                <div className="pipeline-value">{metrics.leads.total}</div>
              </div>
              <div className="pipeline-arrow">→</div>
              <div className="pipeline-item">
                <div className="pipeline-label">Quotations</div>
                <div className="pipeline-value">{metrics.quotations.total}</div>
                <div className="pipeline-sub">{metrics.quotations.sent} sent</div>
              </div>
              <div className="pipeline-arrow">→</div>
              <div className="pipeline-item">
                <div className="pipeline-label">Orders</div>
                <div className="pipeline-value">{metrics.orders.total}</div>
                <div className="pipeline-sub">{metrics.orders.inProduction} in production</div>
              </div>
              <div className="pipeline-arrow">→</div>
              <div className="pipeline-item highlight">
                <div className="pipeline-label">Conversion</div>
                <div className="pipeline-value">{metrics.quotations.conversionRate}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Production Status */}
        <div className="card">
          <div className="card-head">
            <h3>Production status</h3>
            <span className="link" onClick={() => navigate('/production')}>
              Open production board →
            </span>
          </div>
          <div className="production-strip">
            <div className="ps-col">
              <h4>MATERIAL</h4>
              <div className="ps-count">{metrics.production.MATERIAL}</div>
            </div>
            <div className="ps-col">
              <h4>CUTTING</h4>
              <div className="ps-count">{metrics.production.CUTTING}</div>
            </div>
            <div className={`ps-col ${metrics.production.STITCHING > 5 ? 'bottleneck' : ''}`}>
              <h4>STITCHING</h4>
              <div className="ps-count">{metrics.production.STITCHING}</div>
            </div>
            <div className="ps-col">
              <h4>FINISHING</h4>
              <div className="ps-count">{metrics.production.FINISHING}</div>
            </div>
            <div className="ps-col">
              <h4>QC</h4>
              <div className="ps-count">{metrics.production.QC}</div>
            </div>
            <div className="ps-col">
              <h4>PACKING</h4>
              <div className="ps-count">{metrics.production.PACKING}</div>
            </div>
            <div className="ps-col">
              <h4>DISPATCH</h4>
              <div className="ps-count">{metrics.production.DISPATCH}</div>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="card">
          <div className="card-head">
            <h3>Recent orders</h3>
            <span className="link" onClick={() => navigate('/orders')}>View all →</span>
          </div>
          <table className="recent-orders-table">
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} onClick={() => navigate(`/orders/${order.id}`)} style={{ cursor: 'pointer' }}>
                  <td className="order-num">{order.orderNumber}</td>
                  <td>
                    <span className={`status-badge status-${order.status.toLowerCase()}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="amount">{formatCurrency(order.total)}</td>
                  <td className="date">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
