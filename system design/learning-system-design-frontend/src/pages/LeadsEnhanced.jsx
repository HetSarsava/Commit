import { useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { leadsAPI } from '../api/leads';
import { useAuth } from '../context/AuthContext';
import LeadModal from '../components/LeadModal';
import './LeadsEnhanced.css';

const LeadsEnhanced = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('pipeline'); // pipeline, analytics
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [funnelData, setFunnelData] = useState(null);
  const [sourcePerformance, setSourcePerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');

  // Filters
  const [selectedStage, setSelectedStage] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');

  // 11-stage pipeline as per PDF
  const pipelineStages = [
    { key: 'NEW', label: 'New', icon: '◆', color: '#94a3b8' },
    { key: 'CONTACTED', label: 'Contacted', icon: '◇', color: '#64748b' },
    { key: 'REQUIREMENT', label: 'Requirement', icon: '◈', color: '#475569' },
    { key: 'CATALOGUE', label: 'In discussion', icon: '◪', color: '#0ea5e9' },
    { key: 'QUOTATION', label: 'Quotation', icon: '◫', color: '#3b82f6' },
    { key: 'NEGOTIATION', label: 'Negotiation', icon: '◬', color: '#8b5cf6' },
    { key: 'SAMPLE', label: 'Sample', icon: '◭', color: '#a855f7' },
    { key: 'ORDER', label: 'Order', icon: '⊞', color: '#f59e0b' },
    { key: 'PRODUCTION', label: 'Production', icon: '◧', color: '#f97316' },
    { key: 'DISPATCH', label: 'Dispatch', icon: '◭', color: '#10b981' },
    { key: 'COMPLETED', label: 'Completed', icon: '✓', color: '#22c55e' },
  ];

  // 13 lead sources as per PDF
  const leadSources = [
    'WEBSITE',
    'WHATSAPP',
    'GOOGLE_BUSINESS',
    'GOOGLE_ADS',
    'FACEBOOK',
    'INSTAGRAM',
    'INDIAMART',
    'JUSTDIAL',
    'TRADEINDIA',
    'ALIBABA',
    'EMAIL',
    'PHONE',
    'REFERRAL',
    'MANUAL',
  ];

  useEffect(() => {
    fetchData();
  }, [selectedStage, searchQuery, filterSource, filterPriority, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);

      if (activeTab === 'pipeline') {
        const [leadsData, statsData] = await Promise.all([
          leadsAPI.getLeads({
            status: selectedStage === 'ALL' ? undefined : selectedStage,
            source: filterSource === 'ALL' ? undefined : filterSource,
            priority: filterPriority === 'ALL' ? undefined : filterPriority,
            search: searchQuery || undefined,
            limit: 200,
          }),
          leadsAPI.getLeadStats(),
        ]);

        setLeads(leadsData.leads);
        const requestedLead = leadsData.leads.find(lead => lead.id === searchParams.get("leadId"));
        if (requestedLead) { setSelectedLead(requestedLead); setModalMode("view"); setShowModal(true); }
        setStats(statsData);
      } else if (activeTab === 'analytics') {
        const [funnelRes, sourceRes] = await Promise.all([
          leadsAPI.getPipelineFunnel(),
          leadsAPI.getSourcePerformance(),
        ]);

        setFunnelData(funnelRes);
        setSourcePerformance(sourceRes);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeadClick = (lead) => {
    setSelectedLead(lead);
  };

  const handleCreate = () => {
    setModalMode('create');
    setSelectedLead(null);
    setShowModal(true);
  };

  const handleEdit = () => {
    if (!selectedLead) return;
    setModalMode('edit');
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!selectedLead) return;
    if (!window.confirm(`Delete lead for ${selectedLead.companyName}?`)) return;

    try {
      await leadsAPI.deleteLead(selectedLead.id);
      setSelectedLead(null);
      fetchData();
    } catch (error) {
      console.error('Failed to delete lead:', error);
      alert('Failed to delete lead');
    }
  };

  const handleModalSuccess = () => {
    setShowModal(false);
    setSelectedLead(null);
    fetchData();
  };

  const getStageConfig = (stageKey) => {
    return pipelineStages.find((s) => s.key === stageKey) || pipelineStages[0];
  };

  const getPriorityClass = (priority) => {
    const classes = {
      HOT: 'priority-hot',
      WARM: 'priority-warm',
      NORMAL: 'priority-normal',
      COLD: 'priority-cold',
    };
    return classes[priority] || 'priority-normal';
  };

  const formatSource = (source) => {
    return source.replace(/_/g, ' ');
  };

  if (loading && !leads.length && !funnelData) {
    return (
      <div className="leads-container">
        <div className="loading">Loading leads data...</div>
      </div>
    );
  }

  return (
    <div className="leads-container">
      {/* Header */}
      <div className="leads-header">
        <div>
          <h1>Lead Management</h1>
          <p className="leads-subtitle">11-stage pipeline with source tracking</p>
        </div>
        <button className="btn-primary" onClick={handleCreate}>
          ✚ New Lead
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'pipeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('pipeline')}
        >
          Pipeline View
        </button>
        <button
          className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics & Performance
        </button>
      </div>

      {/* Pipeline View */}
      {activeTab === 'pipeline' && (
        <>
          {/* Pipeline Stages Filter */}
          <div className="tabs">
            <button
              className={`tab ${selectedStage === 'ALL' ? 'active' : ''}`}
              onClick={() => setSelectedStage('ALL')}
            >
              <span>All</span>
              <span className="stage-count">{stats?.totalLeads || 0}</span>
            </button>
            {pipelineStages.map((stage) => {
              const count =
                stats?.byStatus?.find((s) => s.status === stage.key)?._count || 0;
              return (
                <button
                  key={stage.key}
                  className={`tab ${selectedStage === stage.key ? 'active' : ''}`}
                  onClick={() => setSelectedStage(stage.key)}
                  style={{
                    '--stage-color': stage.color,
                  }}
                >
                  <span className="stage-icon">{stage.icon}</span>
                  <span>{stage.label}</span>
                  <span className="stage-count">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Filters */}
          <div className="filters-bar">
            <input
              type="text"
              placeholder="Search leads..."
              aria-label="Search leads"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <label className="filter-field">
              <span className="field-caption">Source</span>
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                aria-label="Lead source"
                className="filter-select"
              >
                <option value="ALL">All Sources</option>
                {leadSources.map((source) => (
                  <option key={source} value={source}>
                    {formatSource(source)}
                  </option>
                ))}
              </select>
            </label>
            <label className="filter-field">
              <span className="field-caption">Priority</span>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                aria-label="Lead priority"
                className="filter-select"
              >
                <option value="ALL">All Priorities</option>
                <option value="HOT">Hot</option>
                <option value="WARM">Warm</option>
                <option value="NORMAL">Normal</option>
                <option value="COLD">Cold</option>
              </select>
            </label>
          </div>

          {/* Leads List */}
          <div className={`leads-layout ${selectedLead ? 'has-selection' : ''}`}>
            {/* List */}
            <div className="leads-list">
              {leads.length === 0 ? (
                <div className="empty-state">No leads found</div>
              ) : (
                leads.map((lead) => {
                  const stageConfig = getStageConfig(lead.status);
                  return (
                    <div
                      key={lead.id}
                      className={`lead-card ${selectedLead?.id === lead.id ? 'selected' : ''}`}
                      onClick={() => handleLeadClick(lead)}
                    >
                      <div className="lead-card-header">
                        <div>
                          <h3>{lead.companyName}</h3>
                          <p className="lead-contact">{lead.contactPerson}</p>
                        </div>
                        <div className="lead-badges">
                          <span
                            className="stage-badge"
                            style={{ backgroundColor: stageConfig.color }}
                          >
                            {stageConfig.icon} {stageConfig.label}
                          </span>
                          <span className={`priority-badge ${getPriorityClass(lead.priority)}`}>
                            {lead.priority}
                          </span>
                        </div>
                      </div>
                      <div className="lead-details">
                        <div className="detail-item">
                          <span className="label">Source:</span>
                          <span className="value">{formatSource(lead.source)}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Quantity:</span>
                          <span className="value">{lead.quantity} units</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Budget:</span>
                          <span className="value budget">₹{lead.budget?.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Detail Panel */}
            {selectedLead && (
              <div className="lead-detail-panel">
                <div className="detail-panel-header">
                  <h2>{selectedLead.companyName}</h2>
                  <div className="detail-actions">
                    <button className="btn-secondary" onClick={handleEdit}>
                      Edit
                    </button>
                    {user?.role === 'ADMIN' && (
                      <button className="btn-danger" onClick={handleDelete}>
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                <div className="detail-panel-body">
                  <div className="detail-section">
                    <h3>Contact Information</h3>
                    <div className="detail-row">
                      <span>Contact Person:</span>
                      <span>{selectedLead.contactPerson}</span>
                    </div>
                    <div className="detail-row">
                      <span>Mobile:</span>
                      <span>{selectedLead.mobile}</span>
                    </div>
                    {selectedLead.whatsapp && (
                      <div className="detail-row">
                        <span>WhatsApp:</span>
                        <span>{selectedLead.whatsapp}</span>
                      </div>
                    )}
                    <div className="detail-row">
                      <span>Email:</span>
                      <span>{selectedLead.email}</span>
                    </div>
                    <div className="detail-row">
                      <span>Location:</span>
                      <span>
                        {selectedLead.city}, {selectedLead.state}
                      </span>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h3>Requirement Details</h3>
                    <div className="detail-row">
                      <span>Industry:</span>
                      <span>{selectedLead.industry}</span>
                    </div>
                    <div className="detail-row">
                      <span>Requirement:</span>
                      <span>{selectedLead.requirement}</span>
                    </div>
                    <div className="detail-row">
                      <span>Product Interest:</span>
                      <span>{selectedLead.productInterest}</span>
                    </div>
                    <div className="detail-row">
                      <span>Quantity:</span>
                      <span>{selectedLead.quantity} units</span>
                    </div>
                    <div className="detail-row">
                      <span>Budget:</span>
                      <span className="budget-value">₹{selectedLead.budget?.toLocaleString()}</span>
                    </div>
                    {selectedLead.deliveryDate && (
                      <div className="detail-row">
                        <span>Delivery Date:</span>
                        <span>{new Date(selectedLead.deliveryDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="detail-section">
                    <h3>Lead Tracking</h3>
                    <div className="detail-row">
                      <span>Source:</span>
                      <span className="source-badge">{formatSource(selectedLead.source)}</span>
                    </div>
                    <div className="detail-row">
                      <span>Status:</span>
                      <span>{getStageConfig(selectedLead.status).label}</span>
                    </div>
                    <div className="detail-row">
                      <span>Priority:</span>
                      <span className={getPriorityClass(selectedLead.priority)}>
                        {selectedLead.priority}
                      </span>
                    </div>
                    {selectedLead.followUpDate && (
                      <div className="detail-row">
                        <span>Follow-up Date:</span>
                        <span>{new Date(selectedLead.followUpDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {selectedLead.notes && (
                    <div className="detail-section">
                      <h3>Notes</h3>
                      <p className="notes-text">{selectedLead.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Analytics View */}
      {activeTab === 'analytics' && (
        <div className="analytics-view">
          {/* Pipeline Funnel */}
          {funnelData && (
            <div className="analytics-section">
              <h2>Pipeline Funnel - Conversion Analysis</h2>
              <div className="funnel-summary">
                <div className="funnel-stat">
                  <span className="funnel-label">Total Leads</span>
                  <span className="funnel-value">{funnelData.totalLeads}</span>
                </div>
                <div className="funnel-stat">
                  <span className="funnel-label">Completed</span>
                  <span className="funnel-value success">{funnelData.completedLeads}</span>
                </div>
                <div className="funnel-stat">
                  <span className="funnel-label">Overall Conversion</span>
                  <span className="funnel-value">{funnelData.overallConversionRate}%</span>
                </div>
              </div>

              <div className="funnel-visualization">
                {funnelData.funnel.map((item, index) => {
                  const stageConfig = getStageConfig(item.stage);
                  const width = item.conversionRate;

                  return (
                    <div key={item.stage} className="funnel-stage">
                      <div className="funnel-stage-header">
                        <span className="funnel-stage-name">
                          {stageConfig.icon} {stageConfig.label}
                        </span>
                        <span className="funnel-stage-count">{item.count} leads</span>
                      </div>
                      <div className="funnel-bar-container">
                        <div
                          className="funnel-bar"
                          style={{
                            width: `${width}%`,
                            backgroundColor: stageConfig.color,
                          }}
                        >
                          <span className="funnel-bar-label">{item.conversionRate}%</span>
                        </div>
                      </div>
                      {index > 0 && item.dropOffFromPrevious > 0 && (
                        <div className="funnel-dropoff">
                          Drop-off: {item.dropOffFromPrevious}%
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Source Performance */}
          {sourcePerformance && (
            <div className="analytics-section">
              <h2>Lead Source Performance</h2>
              <p className="section-subtitle">
                Best converting source: <strong>{formatSource(sourcePerformance.bestSource)}</strong>
              </p>

              <div className="source-performance-table">
                <div className="table-header">
                  <div className="th">Source</div>
                  <div className="th">Total Leads</div>
                  <div className="th">Contacted</div>
                  <div className="th">Quotations</div>
                  <div className="th">Orders</div>
                  <div className="th">Completed</div>
                  <div className="th">Conversion %</div>
                  <div className="th">Revenue</div>
                </div>

                {sourcePerformance.sourcePerformance.map((source) => (
                  <div key={source.source} className="table-row">
                    <div className="td source-name">{formatSource(source.source)}</div>
                    <div className="td">{source.totalLeads}</div>
                    <div className="td">{source.contacted}</div>
                    <div className="td">{source.quotations}</div>
                    <div className="td">{source.orders}</div>
                    <div className="td success">{source.completed}</div>
                    <div className="td">
                      <span className={`conversion-badge ${source.conversionRate >= 10 ? 'high' : ''}`}>
                        {source.conversionRate}%
                      </span>
                    </div>
                    <div className="td revenue">₹{source.revenue.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lead Modal */}
      {showModal && (
        <LeadModal
          mode={modalMode}
          lead={selectedLead}
          onClose={() => setShowModal(false)}
          onSuccess={handleModalSuccess}
          pipelineStages={pipelineStages}
          leadSources={leadSources}
        />
      )}
    </div>
  );
};

export default LeadsEnhanced;
