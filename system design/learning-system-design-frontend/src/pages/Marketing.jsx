import { useState, useEffect } from 'react';
import { marketingAPI } from '../api/marketing';
import './Marketing.css';

const Marketing = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [campaigns, setCampaigns] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [modalMode, setModalMode] = useState('create');

  const [campaignForm, setCampaignForm] = useState({
    name: '',
    type: 'PAID_ADS',
    platform: 'GOOGLE_ADS',
    budget: '',
    startDate: '',
    endDate: '',
    targetAudience: '',
    description: '',
    status: 'ACTIVE',
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'dashboard') {
        const dashboardData = await marketingAPI.getMarketingDashboard();
        setDashboard(dashboardData);
      } else {
        const campaignsData = await marketingAPI.getAllCampaigns();
        setCampaigns(campaignsData);
      }
    } catch (error) {
      console.error('Error fetching marketing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = () => {
    setModalMode('create');
    setSelectedCampaign(null);
    setCampaignForm({
      name: '',
      type: 'PAID_ADS',
      platform: 'GOOGLE_ADS',
      budget: '',
      startDate: '',
      endDate: '',
      targetAudience: '',
      description: '',
      status: 'ACTIVE',
    });
    setShowModal(true);
  };

  const handleEditCampaign = (campaign) => {
    setModalMode('edit');
    setSelectedCampaign(campaign);
    setCampaignForm({
      name: campaign.name,
      type: campaign.type,
      platform: campaign.platform,
      budget: campaign.budget,
      startDate: campaign.startDate ? new Date(campaign.startDate).toISOString().split('T')[0] : '',
      endDate: campaign.endDate ? new Date(campaign.endDate).toISOString().split('T')[0] : '',
      targetAudience: campaign.targetAudience || '',
      description: campaign.description || '',
      status: campaign.status,
    });
    setShowModal(true);
  };

  const handleSubmitCampaign = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === 'create') {
        await marketingAPI.createCampaign(campaignForm);
      } else {
        await marketingAPI.updateCampaign(selectedCampaign.id, campaignForm);
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error('Error saving campaign:', error);
      alert('Failed to save campaign');
    }
  };

  const getPlatformBadge = (platform) => {
    const badges = {
      GOOGLE_ADS: { label: 'Google Ads', color: '#4285f4' },
      META: { label: 'Meta', color: '#0081fb' },
      FACEBOOK: { label: 'Facebook', color: '#1877f2' },
      INSTAGRAM: { label: 'Instagram', color: '#e4405f' },
      WHATSAPP: { label: 'WhatsApp', color: '#25d366' },
      EMAIL: { label: 'Email', color: '#ea4335' },
      LINKEDIN: { label: 'LinkedIn', color: '#0077b5' },
    };
    const badge = badges[platform] || { label: platform, color: '#64748b' };
    return <span className="platform-badge" style={{ backgroundColor: badge.color }}>{badge.label}</span>;
  };

  const getStatusBadge = (status) => {
    const classes = {
      ACTIVE: 'status-active',
      PAUSED: 'status-paused',
      COMPLETED: 'status-completed',
      CANCELLED: 'status-cancelled',
    };
    return <span className={`status-badge ${classes[status]}`}>{status}</span>;
  };

  if (loading && !dashboard && !campaigns.length) {
    return <div className="marketing-container"><div className="loading">Loading...</div></div>;
  }

  return (
    <div className="marketing-container">
      <div className="marketing-header">
        <div>
          <h1>Digital Marketing</h1>
          <p className="marketing-subtitle">Campaign management, ROI tracking & lead attribution</p>
        </div>
        <button className="btn-primary" onClick={handleCreateCampaign}>
          ✚ New Campaign
        </button>
      </div>

      {/* Tabs */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard & ROI
        </button>
        <button
          className={`tab-btn ${activeTab === 'campaigns' ? 'active' : ''}`}
          onClick={() => setActiveTab('campaigns')}
        >
          All Campaigns
        </button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && dashboard && (
        <div className="dashboard-view">
          {/* Summary Cards */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">Total Campaigns</div>
              <div className="metric-value">{dashboard.summary.totalCampaigns}</div>
              <div className="metric-subtitle">{dashboard.summary.activeCampaigns} active</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Total Budget</div>
              <div className="metric-value">₹{dashboard.summary.totalBudget.toLocaleString()}</div>
              <div className="metric-subtitle">{dashboard.summary.budgetUtilization}% utilized</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Total Spent</div>
              <div className="metric-value spent">₹{dashboard.summary.totalSpent.toLocaleString()}</div>
              <div className="metric-subtitle">Across all campaigns</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Total Leads</div>
              <div className="metric-value">{dashboard.summary.totalLeads}</div>
              <div className="metric-subtitle">{dashboard.summary.completedLeads} converted</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">CPL (Cost Per Lead)</div>
              <div className="metric-value">₹{dashboard.summary.overallCPL}</div>
              <div className="metric-subtitle">Average across campaigns</div>
            </div>
            <div className="metric-card highlight">
              <div className="metric-label">Overall ROI</div>
              <div className="metric-value roi">{dashboard.summary.overallROI}%</div>
              <div className="metric-subtitle">Revenue vs Spend</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Conversion Rate</div>
              <div className="metric-value">{dashboard.summary.overallConversion}%</div>
              <div className="metric-subtitle">Lead to customer</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Total Revenue</div>
              <div className="metric-value revenue">₹{dashboard.summary.totalRevenue.toLocaleString()}</div>
              <div className="metric-subtitle">From converted leads</div>
            </div>
          </div>

          {/* Platform Performance */}
          <div className="section-card">
            <h2>Platform Performance</h2>
            <div className="platform-table">
              <div className="table-header">
                <div>Platform</div>
                <div>Campaigns</div>
                <div>Spent</div>
                <div>Leads</div>
                <div>CPL</div>
                <div>Revenue</div>
                <div>ROI</div>
              </div>
              {dashboard.platformStats.map((platform) => (
                <div key={platform.platform} className="table-row">
                  <div>{getPlatformBadge(platform.platform)}</div>
                  <div>{platform.campaigns}</div>
                  <div className="spent-value">₹{platform.spent.toLocaleString()}</div>
                  <div>{platform.leads}</div>
                  <div>₹{platform.cpl}</div>
                  <div className="revenue-value">₹{platform.revenue.toLocaleString()}</div>
                  <div className={`roi-value ${platform.roi > 0 ? 'positive' : 'negative'}`}>
                    {platform.roi}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Campaigns */}
          <div className="section-card">
            <h2>Top Performing Campaigns (by ROI)</h2>
            <div className="top-campaigns">
              {dashboard.topCampaigns.map((campaign, index) => (
                <div key={campaign.id} className="top-campaign-card">
                  <div className="campaign-rank">#{index + 1}</div>
                  <div className="campaign-info">
                    <h3>{campaign.name}</h3>
                    {getPlatformBadge(campaign.platform)}
                  </div>
                  <div className="campaign-stats">
                    <div className="stat">
                      <span className="stat-label">Spent:</span>
                      <span className="stat-value">₹{campaign.spent.toLocaleString()}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Leads:</span>
                      <span className="stat-value">{campaign.leads}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Revenue:</span>
                      <span className="stat-value">₹{campaign.revenue.toLocaleString()}</span>
                    </div>
                    <div className="stat highlight">
                      <span className="stat-label">ROI:</span>
                      <span className={`stat-value roi ${campaign.roi > 0 ? 'positive' : ''}`}>
                        {campaign.roi}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="campaigns-view">
          <div className="campaigns-grid">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="campaign-card">
                <div className="campaign-card-header">
                  <div>
                    <h3>{campaign.name}</h3>
                    <p className="campaign-code">{campaign.campaignCode}</p>
                  </div>
                  <div className="campaign-badges">
                    {getPlatformBadge(campaign.platform)}
                    {getStatusBadge(campaign.status)}
                  </div>
                </div>

                <div className="campaign-details">
                  <div className="detail-row">
                    <span>Budget:</span>
                    <span>₹{campaign.budget.toLocaleString()}</span>
                  </div>
                  <div className="detail-row">
                    <span>Spent:</span>
                    <span className="spent-highlight">₹{campaign.spent.toLocaleString()}</span>
                  </div>
                  <div className="detail-row">
                    <span>Utilization:</span>
                    <span>{Math.round((campaign.spent / campaign.budget) * 100)}%</span>
                  </div>
                </div>

                {campaign.metrics && (
                  <div className="campaign-metrics">
                    <div className="metric-item">
                      <span className="metric-num">{campaign.metrics.totalLeads}</span>
                      <span className="metric-lbl">Leads</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-num">₹{campaign.metrics.cpl}</span>
                      <span className="metric-lbl">CPL</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-num">{campaign.metrics.completed}</span>
                      <span className="metric-lbl">Converted</span>
                    </div>
                    <div className="metric-item highlight">
                      <span className={`metric-num roi ${campaign.metrics.roi > 0 ? 'positive' : ''}`}>
                        {campaign.metrics.roi}%
                      </span>
                      <span className="metric-lbl">ROI</span>
                    </div>
                  </div>
                )}

                <div className="campaign-actions">
                  <button className="btn-secondary" onClick={() => handleEditCampaign(campaign)}>
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campaign Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modalMode === 'create' ? 'Create Campaign' : 'Edit Campaign'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmitCampaign}>
              <div className="form-group">
                <label>Campaign Name *</label>
                <input
                  type="text"
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Type *</label>
                  <select
                    value={campaignForm.type}
                    onChange={(e) => setCampaignForm({ ...campaignForm, type: e.target.value })}
                  >
                    <option value="PAID_ADS">Paid Ads</option>
                    <option value="SOCIAL_MEDIA">Social Media</option>
                    <option value="EMAIL">Email</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="INFLUENCER">Influencer</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Platform *</label>
                  <select
                    value={campaignForm.platform}
                    onChange={(e) => setCampaignForm({ ...campaignForm, platform: e.target.value })}
                  >
                    <option value="GOOGLE_ADS">Google Ads</option>
                    <option value="META">Meta (FB + IG)</option>
                    <option value="FACEBOOK">Facebook</option>
                    <option value="INSTAGRAM">Instagram</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="EMAIL">Email</option>
                    <option value="LINKEDIN">LinkedIn</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Budget (₹) *</label>
                <input
                  type="number"
                  value={campaignForm.budget}
                  onChange={(e) => setCampaignForm({ ...campaignForm, budget: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date *</label>
                  <input
                    type="date"
                    value={campaignForm.startDate}
                    onChange={(e) => setCampaignForm({ ...campaignForm, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={campaignForm.endDate}
                    onChange={(e) => setCampaignForm({ ...campaignForm, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Target Audience</label>
                <input
                  type="text"
                  value={campaignForm.targetAudience}
                  onChange={(e) => setCampaignForm({ ...campaignForm, targetAudience: e.target.value })}
                  placeholder="e.g., B2B companies, schools, hospitals"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={campaignForm.description}
                  onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Status *</label>
                <select
                  value={campaignForm.status}
                  onChange={(e) => setCampaignForm({ ...campaignForm, status: e.target.value })}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="PAUSED">Paused</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {modalMode === 'create' ? 'Create Campaign' : 'Update Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketing;
