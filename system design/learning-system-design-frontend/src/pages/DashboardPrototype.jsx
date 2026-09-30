import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import './DashboardPrototype.css';

const DashboardPrototype = () => {
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
    return `₹${(amount / 100000).toFixed(1)}L`;
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(d);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `Overdue · ${Math.abs(diffDays)}d`;
    } else if (diffDays === 0) {
      const hours = d.getHours();
      const minutes = d.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `Today, ${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else {
      return `In ${diffDays}d`;
    }
  };

  const getTimeStatus = (date) => {
    const d = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(d);
    targetDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'overdue';
    if (diffDays <= 0) return 'today';
    return 'ok';
  };

  if (loading) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  if (!data) {
    return <div className="dashboard-error">Failed to load dashboard</div>;
  }

  const maxFunnelCount = Math.max(...data.funnelData.map(s => s.count));

  return (
    <div className="dashboard-wrap">
      <div className="topbar">
        <div>
          <h1>Good morning, {user?.firstName || 'User'}</h1>
          <div className="sub">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · Ahmedabad office</div>
        </div>
        <div className="date-range">This week ▾</div>
      </div>

      <div className="content">
        {/* KPI Row */}
        <div className="kpi-row">
          <div className="kpi accent">
            <div className="label">Today's leads</div>
            <div className="value">{data.today.leads}</div>
            <div className="delta up">↑ 22% vs yesterday</div>
          </div>
          <div className="kpi">
            <div className="label">Follow-ups due today</div>
            <div className="value">{data.followups?.dueToday || 0}</div>
            <div className="delta down">{data.followups?.overdue || 0} overdue</div>
          </div>
          <div className="kpi">
            <div className="label">Quotations sent</div>
            <div className="value">{data.summary.totalOrders}</div>
            <div className="delta up">{formatCurrency(data.summary.thisMonthRevenue)} value</div>
          </div>
          <div className="kpi">
            <div className="label">Orders this week</div>
            <div className="value">{data.today.orders}</div>
            <div className="delta up">↑ 12%</div>
          </div>
          <div className="kpi">
            <div className="label">Outstanding receivable</div>
            <div className="value">{formatCurrency(data.summary.totalOutstanding)}</div>
            <div className="delta down">{formatCurrency(data.summary.totalOutstanding * 0.18)} overdue</div>
          </div>
        </div>

        {/* Grid 2 columns */}
        <div className="grid-2">
          <div className="card">
            <div className="card-head">
              <h3>Pipeline funnel — this month</h3>
              <span className="link" onClick={() => navigate('/leads')}>View all leads →</span>
            </div>
            <div className="funnel">
              {data.funnelData.filter(s => s.count > 0).slice(0, 6).map((stage, index) => {
                const width = maxFunnelCount > 0 ? (stage.count / maxFunnelCount) * 100 : 0;
                return (
                  <div key={stage.stage} className="fun-row">
                    <div className="fun-label">{stage.stage}</div>
                    <div className="fun-bar-wrap">
                      <div className={`fun-bar ${index === 0 ? 'hi' : ''}`} style={{ width: `${Math.max(width, 10)}%` }}>
                        {stage.count > 0 && <span className="fun-count">{stage.count}</span>}
                      </div>
                    </div>
                    <div className="fun-total">{stage.count}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card ai-card">
            <div className="card-head">
              <h3>AI insights <span className="ai-tag">BETA</span></h3>
            </div>
            <div className="ai-insight">
              Hospital &amp; hospitality leads are converting <b>2.3× faster</b> than factory workwear leads this month — consider prioritising follow-ups on that segment.
            </div>
            <div className="ai-insight">
              {data.sourcePerformance[0]?.source?.replace(/_/g, ' ') || 'IndiaMART'} leads have the highest close rate (<b>34%</b>) but {data.sourcePerformance[1]?.source?.replace(/_/g, ' ') || 'Google Ads'} leads have the highest average order value (<b>₹68,400</b>).
            </div>
            <div className="ai-insight">
              3 quotations sent 5+ days ago have had no reply — <b>Sunrise Hospital</b>, <b>Metro Facility</b>, and <b>Coastal Logistics</b> may need a follow-up call, not another WhatsApp message.
            </div>
          </div>
        </div>

        {/* Second grid */}
        <div className="grid-2">
          <div className="card">
            <div className="card-head">
              <h3>Follow-ups &amp; reminders</h3>
              <span className="link" onClick={() => navigate('/leads')}>See all</span>
            </div>
            {data.followups?.list?.length > 0 ? (
              data.followups.list.slice(0, 4).map((item, index) => (
                <div key={index} className="follow-item">
                  <div className="follow-left">
                    <div className="co">{item.companyName}</div>
                    <div className="action">{item.action}</div>
                  </div>
                  <div className={`follow-time ${getTimeStatus(item.date)}`}>
                    {formatDate(item.date)}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">No pending follow-ups</div>
            )}
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Salesperson performance</h3>
              <span className="link" onClick={() => navigate('/reports')}>Full report</span>
            </div>
            <table className="mini-table">
              <tbody>
                {data.salespersonPerformance.slice(0, 4).map((sp) => (
                  <tr key={sp.id}>
                    <td>
                      <div className="mt-name">{sp.name}</div>
                      <div className="mt-sub">{sp.totalLeads} leads · {sp.converted} orders</div>
                    </td>
                    <td className="mt-val">{formatCurrency(sp.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Production status */}
        <div className="card">
          <div className="card-head">
            <h3>Production status</h3>
            <span className="link" onClick={() => navigate('/production')}>Open production board →</span>
          </div>
          <div className="production-strip">
            <div className="ps-col">
              <h4>MATERIAL</h4>
              <div className="ps-count">{data.productionStats.material || 0}</div>
            </div>
            <div className="ps-col">
              <h4>CUTTING</h4>
              <div className="ps-count">{data.productionStats.cutting || 0}</div>
            </div>
            <div className={`ps-col ${data.productionStats.stitching > 15 ? 'bottleneck' : ''}`}>
              <h4>STITCHING</h4>
              <div className="ps-count">{data.productionStats.stitching || 0}</div>
            </div>
            <div className="ps-col">
              <h4>FINISHING</h4>
              <div className="ps-count">{data.productionStats.finishing || 0}</div>
            </div>
            <div className="ps-col">
              <h4>QC</h4>
              <div className="ps-count">{data.productionStats.qc || 0}</div>
            </div>
            <div className="ps-col">
              <h4>PACKING</h4>
              <div className="ps-count">{data.productionStats.packing || 0}</div>
            </div>
            <div className="ps-col">
              <h4>DISPATCH</h4>
              <div className="ps-count">{data.productionStats.dispatch || 0}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPrototype;
