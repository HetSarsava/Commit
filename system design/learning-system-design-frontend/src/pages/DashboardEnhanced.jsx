import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import './DashboardEnhanced.css';

const DashboardEnhanced = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await apiClient.get('/dashboard/stats');
      setData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `₹${Math.round(amount).toLocaleString()}`;
  };

  const formatSource = (source) => {
    return source.replace(/_/g, ' ');
  };

  if (loading) {
    return <div className="dashboard-container"><div className="loading">Loading dashboard...</div></div>;
  }

  if (!data) {
    return <div className="dashboard-container"><div className="error">Failed to load dashboard</div></div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p className="dashboard-subtitle">Welcome back, {user?.firstName || 'User'}!</p>
        </div>
      </div>

      {/* Today's Quick Stats */}
      <div className="today-stats">
        <div className="stat-card highlight">
          <div className="stat-icon">◆</div>
          <div className="stat-info">
            <div className="stat-label">Today's Leads</div>
            <div className="stat-value">{data.today.leads}</div>
          </div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-icon">⊞</div>
          <div className="stat-info">
            <div className="stat-label">Today's Orders</div>
            <div className="stat-value">{data.today.orders}</div>
          </div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-icon">₹</div>
          <div className="stat-info">
            <div className="stat-label">Today's Revenue</div>
            <div className="stat-value">{formatCurrency(data.today.revenue)}</div>
          </div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-icon">◭</div>
          <div className="stat-info">
            <div className="stat-label">Today's Dispatches</div>
            <div className="stat-value">{data.today.dispatches}</div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="metrics-row">
        <div className="metric-card">
          <div className="metric-label">Total Revenue</div>
          <div className="metric-value revenue">{formatCurrency(data.summary.totalRevenue)}</div>
          <div className="metric-trend">
            <span className={data.summary.revenueGrowth >= 0 ? 'positive' : 'negative'}>
              {data.summary.revenueGrowth >= 0 ? '↑' : '↓'} {Math.abs(data.summary.revenueGrowth)}%
            </span>
            <span className="trend-label">vs last month</span>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">This Month Revenue</div>
          <div className="metric-value">{formatCurrency(data.summary.thisMonthRevenue)}</div>
          <div className="metric-subtitle">Current month total</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total Leads</div>
          <div className="metric-value">{data.summary.totalLeads}</div>
          <div className="metric-subtitle">{data.summary.newLeads} new leads</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Conversion Rate</div>
          <div className="metric-value">{data.summary.overallConversionRate}%</div>
          <div className="metric-subtitle">Lead to customer</div>
        </div>
        <div className="metric-card warning">
          <div className="metric-label">Outstanding</div>
          <div className="metric-value">{formatCurrency(data.summary.totalOutstanding)}</div>
          <div className="metric-subtitle">Pending payments</div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Revenue Trend Chart */}
        <div className="chart-card full-width">
          <h2>Revenue Trend (Last 30 Days)</h2>
          <div className="line-chart">
            <div className="chart-y-axis">
              {[3, 2, 1, 0].map(i => {
                const maxRevenue = Math.max(...data.revenueTrends.map(d => d.revenue));
                const value = Math.round((maxRevenue / 3) * i);
                return <div key={i} className="y-label">{formatCurrency(value)}</div>;
              })}
            </div>
            <div className="chart-area">
              {data.revenueTrends.map((day, index) => {
                const maxRevenue = Math.max(...data.revenueTrends.map(d => d.revenue));
                const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;

                return (
                  <div key={index} className="chart-bar-container" title={`${day.date}: ${formatCurrency(day.revenue)}`}>
                    <div className="chart-bar" style={{ height: `${height}%` }}>
                      <div className="bar-tooltip">
                        {formatCurrency(day.revenue)}
                        <br />
                        {day.orders} orders
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pipeline Funnel */}
        <div className="chart-card">
          <h2>Pipeline Funnel</h2>
          <div className="funnel-chart">
            {data.funnelData.filter(s => s.count > 0).map((stage, index) => {
              const maxCount = Math.max(...data.funnelData.map(s => s.count));
              const width = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;

              return (
                <div key={stage.stage} className="funnel-stage">
                  <div className="funnel-label">{stage.stage}</div>
                  <div className="funnel-bar-bg">
                    <div className="funnel-bar" style={{ width: `${width}%` }}>
                      <span className="funnel-count">{stage.count}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Salesperson Performance */}
        <div className="chart-card">
          <h2>Top Salespeople</h2>
          <div className="performance-list">
            {data.salespersonPerformance.map((sp, index) => (
              <div key={sp.id} className="performance-item">
                <div className="performance-rank">#{index + 1}</div>
                <div className="performance-info">
                  <div className="performance-name">{sp.name}</div>
                  <div className="performance-stats">
                    {sp.totalLeads} leads • {sp.converted} converted • {sp.conversionRate}%
                  </div>
                </div>
                <div className="performance-revenue">{formatCurrency(sp.revenue)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Lead Source Performance */}
        <div className="chart-card">
          <h2>Top Lead Sources</h2>
          <div className="performance-list">
            {data.sourcePerformance.map((source, index) => (
              <div key={source.source} className="performance-item">
                <div className="performance-rank">#{index + 1}</div>
                <div className="performance-info">
                  <div className="performance-name">{formatSource(source.source)}</div>
                  <div className="performance-stats">
                    {source.totalLeads} leads • {source.converted} converted • {source.conversionRate}%
                  </div>
                </div>
                <div className="performance-revenue">{formatCurrency(source.revenue)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="chart-card">
          <h2>Top Products by Revenue</h2>
          <div className="table-list">
            {data.topProducts.map((product, index) => (
              <div key={product.productId} className="table-row">
                <div className="table-cell rank">#{index + 1}</div>
                <div className="table-cell product-name">{product.productName}</div>
                <div className="table-cell">{product.quantity} units</div>
                <div className="table-cell revenue">{formatCurrency(product.revenue)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Outstanding Payments */}
        <div className="chart-card">
          <h2>Outstanding Payments</h2>
          <div className="table-list">
            {data.topOutstanding.length === 0 ? (
              <div className="empty-state">No outstanding payments</div>
            ) : (
              data.topOutstanding.map((customer) => (
                <div key={customer.customerId} className="table-row">
                  <div className="table-cell customer-name">{customer.customerName}</div>
                  <div className="table-cell">{customer.invoiceCount} invoices</div>
                  <div className="table-cell outstanding">{formatCurrency(customer.totalDue)}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Production Status */}
        <div className="chart-card">
          <h2>Production Overview</h2>
          <div className="production-grid">
            <div className="production-stat">
              <div className="production-label">Pending</div>
              <div className="production-value">{data.productionStats.pending}</div>
            </div>
            <div className="production-stat">
              <div className="production-label">In Progress</div>
              <div className="production-value active">{data.productionStats.inProgress}</div>
            </div>
            <div className="production-stat">
              <div className="production-label">Packed</div>
              <div className="production-value">{data.productionStats.packed}</div>
            </div>
            <div className="production-stat">
              <div className="production-label">Dispatched</div>
              <div className="production-value">{data.productionStats.dispatched}</div>
            </div>
          </div>
          <div className="production-total">
            Total: {data.productionStats.total} orders
          </div>
        </div>

        {/* Marketing ROI */}
        <div className="chart-card">
          <h2>Marketing Performance</h2>
          <div className="marketing-stats">
            <div className="marketing-stat">
              <div className="marketing-label">Active Campaigns</div>
              <div className="marketing-value">{data.marketingStats.activeCampaigns}</div>
            </div>
            <div className="marketing-stat">
              <div className="marketing-label">Total Spent</div>
              <div className="marketing-value spent">{formatCurrency(data.marketingStats.totalSpent)}</div>
            </div>
            <div className="marketing-stat">
              <div className="marketing-label">Leads Generated</div>
              <div className="marketing-value">{data.marketingStats.totalLeads}</div>
            </div>
            <div className="marketing-stat">
              <div className="marketing-label">CPL</div>
              <div className="marketing-value">{formatCurrency(data.marketingStats.cpl)}</div>
            </div>
            <div className="marketing-stat highlight">
              <div className="marketing-label">ROI</div>
              <div className={`marketing-value roi ${data.marketingStats.roi > 0 ? 'positive' : 'negative'}`}>
                {data.marketingStats.roi}%
              </div>
            </div>
            <div className="marketing-stat">
              <div className="marketing-label">Revenue</div>
              <div className="marketing-value revenue">{formatCurrency(data.marketingStats.revenue)}</div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="chart-card full-width">
          <h2>Recent Activity</h2>
          <div className="activity-tabs">
            <div className="activity-section">
              <h3>Latest Leads</h3>
              <div className="activity-list">
                {data.recentActivity.leads.map(lead => (
                  <div key={lead.id} className="activity-item" onClick={() => navigate('/leads')}>
                    <div className="activity-icon">◆</div>
                    <div className="activity-info">
                      <div className="activity-title">{lead.companyName}</div>
                      <div className="activity-meta">{formatSource(lead.source)} • {formatCurrency(lead.budget || 0)}</div>
                    </div>
                    <div className="activity-badge">{lead.status}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="activity-section">
              <h3>Latest Orders</h3>
              <div className="activity-list">
                {data.recentActivity.orders.map(order => (
                  <div key={order.id} className="activity-item" onClick={() => navigate('/orders')}>
                    <div className="activity-icon">⊞</div>
                    <div className="activity-info">
                      <div className="activity-title">{order.orderNumber}</div>
                      <div className="activity-meta">{order.customerName} • {formatCurrency(order.total)}</div>
                    </div>
                    <div className="activity-badge">{order.status}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="activity-section">
              <h3>Latest Dispatches</h3>
              <div className="activity-list">
                {data.recentActivity.dispatches.map(dispatch => (
                  <div key={dispatch.id} className="activity-item" onClick={() => navigate('/dispatch')}>
                    <div className="activity-icon">◭</div>
                    <div className="activity-info">
                      <div className="activity-title">{dispatch.dispatchNumber}</div>
                      <div className="activity-meta">{dispatch.customerName}</div>
                    </div>
                    <div className="activity-badge">{dispatch.status}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardEnhanced;
