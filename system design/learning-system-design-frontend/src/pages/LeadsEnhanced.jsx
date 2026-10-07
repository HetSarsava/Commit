import { useSearchParams } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import { leadsAPI } from '../api/leads';
import { useAuth } from '../context/AuthContext';
import CustomerForm from '../components/CustomerForm';
import LeadModal from '../components/LeadModal';
import { leadStageGroups, getLeadStatus, countLeadStage } from '../utils/leadStages';
import './LeadsEnhanced.css';

const LeadsEnhanced = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [convertingLead, setConvertingLead] = useState(false);
  const [conversionNotice, setConversionNotice] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');

  // Filters
  const [selectedStage, setSelectedStage] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [loadError, setLoadError] = useState('');
  const requestVersion = useRef(0);

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

  const fetchData = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setLoadError('');
    try {
      const group = leadStageGroups.find(stage => stage.key === selectedStage);
      const [leadsData, statsData] = await Promise.all([
        leadsAPI.getLeads({
          statuses: group?.statuses.join(','),
          source: filterSource === 'ALL' ? undefined : filterSource,
          priority: filterPriority === 'ALL' ? undefined : filterPriority,
          search: searchQuery || undefined,
          limit: 200,
        }),
        leadsAPI.getLeadStats(),
      ]);
      if (version !== requestVersion.current) return;
      setLeads(leadsData.leads);
      const requestedLead = leadsData.leads.find(lead => lead.id === searchParams.get('leadId'));
      if (requestedLead) { setSelectedLead(requestedLead); setModalMode('view'); setShowModal(true); }
      setStats(statsData);
    } catch {
      if (version === requestVersion.current) setLoadError('Could not load leads. Please try again.');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [selectedStage, searchQuery, filterSource, filterPriority, searchParams]);

  useEffect(() => {
    void fetchData();
    return () => { requestVersion.current += 1; };
  }, [fetchData]);

  const handleLeadClick = (lead) => {
    setConversionNotice('');
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

  const getPriorityClass = (priority) => {
    const classes = {
      HOT: 'priority-hot',
      HIGH: 'priority-warm',
      MEDIUM: 'priority-normal',
      LOW: 'priority-cold',
      WARM: 'priority-warm',
      NORMAL: 'priority-normal',
      COLD: 'priority-cold',
    };
    return classes[priority] || 'priority-normal';
  };

  const formatSource = (source) => {
    return (source || 'MANUAL').replace(/_/g, ' ');
  };

  if (loading && !stats) {
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
          <h1>Leads</h1>
          <p className="leads-subtitle">Keep track of enquiries and follow-ups</p>
        </div>
        <button className="btn-primary" onClick={handleCreate}>
          Add lead
        </button>
      </div>

      <div className="lead-stage-filters" role="group" aria-label="Filter leads by stage">
        <button
          className={`lead-stage-filter ${selectedStage === 'ALL' ? 'active' : ''}`}
          aria-pressed={selectedStage === 'ALL'}
          onClick={() => { setSelectedStage('ALL'); setSelectedLead(null); }}
        >
          All <span className="stage-count">{stats?.totalLeads || 0}</span>
        </button>
        {leadStageGroups.map(stage => (
          <button
            key={stage.key}
            className={`lead-stage-filter ${selectedStage === stage.key ? 'active' : ''}`}
            aria-pressed={selectedStage === stage.key}
            onClick={() => { setSelectedStage(stage.key); setSelectedLead(null); }}
          >
            {stage.label} <span className="stage-count">{countLeadStage(stage, stats?.byStatus)}</span>
          </button>
        ))}
      </div>
      {loadError && <div className="lead-load-error" role="alert">{loadError} <button className="btn-secondary" onClick={fetchData}>Try again</button></div>}

      {/* Filters */}
      <div className="filters-bar">
        <input
          type="text"
          placeholder="Search name, company or phone..."
          aria-label="Search leads"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <button className="btn-secondary" aria-expanded={showFilters} aria-controls="lead-extra-filters" onClick={() => setShowFilters(value => !value)}>
          {showFilters ? 'Hide filters' : 'More filters'}{filterSource !== 'ALL' || filterPriority !== 'ALL' ? ' (on)' : ''}
        </button>
      </div>
      {showFilters && <div id="lead-extra-filters" className="lead-extra-filters">
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
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
            <option value="WARM">Warm</option>
            <option value="NORMAL">Normal</option>
            <option value="COLD">Cold</option>
          </select>
        </label>
       </div>}

      {/* Leads List */}
      <div className={`leads-layout ${selectedLead ? 'has-selection' : ''}`}>
        {/* List */}
        <div className="leads-list" aria-busy={loading}>
          {leads.length === 0 ? (
            <div className="empty-state">No leads found</div>
          ) : (
            leads.map((lead) => {
              const stageConfig = getLeadStatus(lead.status);
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
                        {stageConfig.label}
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
                    {lead.quantity != null && <div className="detail-item">
                      <span className="label">Quantity:</span>
                      <span className="value">{lead.quantity} units</span>
                    </div>}
                    {lead.budget != null && <div className="detail-item">
                      <span className="label">Budget:</span>
                      <span className="value budget">₹{lead.budget?.toLocaleString()}</span>
                    </div>}
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
                {['ADMIN','SALES'].includes(user?.role) && <button className="btn-secondary" onClick={()=>setConvertingLead(true)}>Turn into customer</button>}
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
              {conversionNotice && <p role="status">{conversionNotice}</p>}
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
                  <span>Stage:</span>
                  <span>{getLeadStatus(selectedLead.status).label}</span>
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
      {/* Lead Modal */}
      {convertingLead && selectedLead && <CustomerForm lead={selectedLead} onClose={()=>setConvertingLead(false)} onSuccess={c=>{setConvertingLead(false);setSelectedLead(l=>({...l,status:'COMPLETED'}));setConversionNotice(c.companyName+' is now available in quotation and order customer lists.');void fetchData();}}/>}
      {showModal && (
        <LeadModal
          mode={modalMode}
          lead={selectedLead}
          onClose={() => setShowModal(false)}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
};

export default LeadsEnhanced;
