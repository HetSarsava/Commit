import { useCompany } from '../context/CompanyData';
import { useState, useEffect } from 'react';
import { leadsAPI } from '../api/leads';
import { useAuth } from '../context/AuthContext';
import LeadModal from '../components/LeadModal';
import './Leads.css';

const Leads = () => {
  const company = useCompany();
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');

  // Filters
  const [selectedStage, setSelectedStage] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');

  useEffect(() => {
    fetchData();
  }, [selectedStage, searchQuery, filterSource, filterPriority]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [leadsData, statsData] = await Promise.all([
        leadsAPI.getLeads({
          status: selectedStage === 'ALL' ? undefined : selectedStage,
          source: filterSource === 'ALL' ? undefined : filterSource,
          priority: filterPriority === 'ALL' ? undefined : filterPriority,
          search: searchQuery || undefined,
          limit: 100,
        }),
        leadsAPI.getLeadStats(),
      ]);

      setLeads(leadsData.leads);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
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

  const stages = [
    { key: 'NEW', label: 'New', count: stats?.byStatus?.NEW || 0 },
    { key: 'CONTACTED', label: 'Contacted', count: stats?.byStatus?.CONTACTED || 0 },
    { key: 'QUALIFIED', label: 'Qualified', count: stats?.byStatus?.QUALIFIED || 0 },
    { key: 'QUOTATION', label: 'Quotation', count: stats?.byStatus?.QUOTATION || 0 },
    { key: 'NEGOTIATION', label: 'Negotiation', count: stats?.byStatus?.NEGOTIATION || 0 },
    { key: 'WON', label: 'Won', count: stats?.byStatus?.WON || 0 },
    { key: 'LOST', label: 'Lost', count: stats?.byStatus?.LOST || 0 },
  ];

  const getStageLabel = () => {
    if (selectedStage === 'ALL') return 'All leads';
    return stages.find(s => s.key === selectedStage)?.label || selectedStage;
  };

  const getPriorityClass = (priority) => {
    if (priority === 'HOT') return 'priority-hot';
    if (priority === 'WARM') return 'priority-warm';
    return 'priority-normal';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diff = date - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return <span className="followup-overdue">Overdue — {Math.abs(days)}d</span>;
    if (days === 0) return <span className="followup-today">Today</span>;
    if (days === 1) return 'Tomorrow';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="leads-page">
      {/* Pipeline Rail */}
      <div className="pipeline-rail">
        <div className="rail-brand">
          <div className="mark">{company.name}</div>
          <div className="name">Lead Pipeline</div>
        </div>

        <div className="rail-section-label">Pipeline stage</div>
        <ul className="stage-list">
          <li
            className={`stage-item ${selectedStage === 'ALL' ? 'active' : ''}`}
            onClick={() => setSelectedStage('ALL')}
          >
            <span>All leads</span>
            <span className="stage-count">{stats?.totalLeads || 0}</span>
          </li>
          {stages.map((stage) => (
            <li
              key={stage.key}
              className={`stage-item ${selectedStage === stage.key ? 'active' : ''}`}
              onClick={() => setSelectedStage(stage.key)}
            >
              <span>{stage.label}</span>
              <span className="stage-count">{stage.count}</span>
            </li>
          ))}
        </ul>

        <div className="rail-section-label">Views</div>
        <ul className="stage-list">
          <li className="stage-item">
            <span>My follow-ups today</span>
            <span className="stage-count">0</span>
          </li>
          <li className="stage-item">
            <span>Overdue</span>
            <span className="stage-count">0</span>
          </li>
        </ul>

        <div className="rail-foot">
          <div className="avatar">{user?.name?.substring(0, 2).toUpperCase()}</div>
          <div className="who">
            <div>{user?.name}</div>
            <div className="r">{user?.role}</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="leads-main">
        <div className="topbar">
          <div>
            <h1>{getStageLabel()}</h1>
            <div className="sub">{leads.length} leads</div>
          </div>
          <div className="topbar-actions">
            <button className="btn">Import leads</button>
            <button className="btn btn-primary" onClick={handleCreate}>+ New lead</button>
          </div>
        </div>

        <div className="toolbar">
          <div className="search">
            <input
              placeholder="Search company, contact, mobile…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className={`chip ${filterSource !== 'ALL' ? 'on' : ''}`} onClick={() => setFilterSource(filterSource === 'ALL' ? 'INDIAMART' : 'ALL')}>
            Source: {filterSource === 'ALL' ? 'All' : filterSource}
          </div>
          <div className={`chip ${filterPriority !== 'ALL' ? 'on' : ''}`} onClick={() => setFilterPriority(filterPriority === 'ALL' ? 'HOT' : 'ALL')}>
            Priority: {filterPriority === 'ALL' ? 'All' : filterPriority}
          </div>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="loading-state">Loading...</div>
          ) : leads.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No leads found</h3>
              <p>Create your first lead to get started</p>
              <button className="btn btn-primary" onClick={handleCreate}>+ New lead</button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Company / contact</th>
                  <th>Source</th>
                  <th>Requirement</th>
                  <th>Priority</th>
                  <th>Salesperson</th>
                  <th>Next follow-up</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className={selectedLead?.id === lead.id ? 'selected' : ''}
                    onClick={() => handleLeadClick(lead)}
                  >
                    <td className="company-cell">
                      <div className="co">{lead.companyName}</div>
                      <div className="loc">{lead.contactPerson} · {lead.mobile}</div>
                    </td>
                    <td><span className="source-tag">{lead.source}</span></td>
                    <td>{lead.productInterest || '-'}</td>
                    <td><span className={getPriorityClass(lead.priority)}>{lead.priority}</span></td>
                    <td>{lead.salesPerson?.name || '-'}</td>
                    <td>{formatDate(lead.followUpDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail Drawer */}
      {selectedLead && (
        <div className="drawer">
          <div className="drawer-head">
            <div className="co-name">{selectedLead.companyName}</div>
            <div className="co-meta">{selectedLead.contactPerson} · {selectedLead.mobile}</div>
            <div className="drawer-stage">
              {stages.map((stage, idx) => (
                <div
                  key={stage.key}
                  className={`stage-track ${stages.findIndex(s => s.key === selectedLead.status) >= idx ? 'filled' : ''}`}
                ></div>
              ))}
            </div>
          </div>

          <div className="drawer-section">
            <h3>Lead details</h3>
            <div className="field-row">
              <span className="k">Status</span>
              <span className="v">{selectedLead.status}</span>
            </div>
            <div className="field-row">
              <span className="k">Priority</span>
              <span className="v">{selectedLead.priority}</span>
            </div>
            <div className="field-row">
              <span className="k">Source</span>
              <span className="v">{selectedLead.source}</span>
            </div>
            <div className="field-row">
              <span className="k">Email</span>
              <span className="v">{selectedLead.email || '-'}</span>
            </div>
            <div className="field-row">
              <span className="k">City</span>
              <span className="v">{selectedLead.city || '-'}</span>
            </div>
          </div>

          <div className="drawer-section">
            <h3>Requirement</h3>
            <div className="note-box">{selectedLead.productInterest || 'No requirement details'}</div>
          </div>

          {selectedLead.notes && (
            <div className="drawer-section">
              <h3>Notes</h3>
              <div className="note-box">{selectedLead.notes}</div>
            </div>
          )}

          <div className="drawer-actions">
            <button className="action-btn primary">💬 Send WhatsApp</button>
            <button className="action-btn" onClick={handleEdit}>✏ Edit lead</button>
            <button className="action-btn" onClick={handleDelete}>🗑 Delete lead</button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <LeadModal
          lead={selectedLead}
          mode={modalMode}
          onClose={() => setShowModal(false)}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
};

export default Leads;
