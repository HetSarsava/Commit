import { useState, useEffect } from 'react';
import { leadsAPI } from '../api/leads';
import { useAuth } from '../context/AuthContext';
import { getLeadStatusOptions } from '../utils/leadStages';
import './LeadModal.css';

const LeadModal = ({ mode, lead, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    mobile: '',
    whatsapp: '',
    email: '',
    city: '',
    state: '',
    industry: '',
    requirement: '',
    productInterest: '',
    quantity: '',
    budget: '',
    deliveryDate: '',
    source: 'MANUAL',
    status: 'NEW',
    priority: 'MEDIUM',
    notes: '',
    followUpDate: '',
    salesPersonId: user?.id || '',
  });

  // Load lead data if editing or viewing
  useEffect(() => {
    if (lead && (mode === 'edit' || mode === 'view')) {
      setFormData({
        companyName: lead.companyName || '',
        contactPerson: lead.contactPerson || '',
        mobile: lead.mobile || '',
        whatsapp: lead.whatsapp || '',
        email: lead.email || '',
        city: lead.city || '',
        state: lead.state || '',
        industry: lead.industry || '',
        requirement: lead.requirement || '',
        productInterest: lead.productInterest || '',
        quantity: lead.quantity || '',
        budget: lead.budget || '',
        deliveryDate: lead.deliveryDate ? lead.deliveryDate.split('T')[0] : '',
        source: lead.source || 'MANUAL',
        status: lead.status || 'NEW',
        priority: lead.priority || 'MEDIUM',
        notes: lead.notes || '',
        followUpDate: lead.followUpDate ? lead.followUpDate.split('T')[0] : '',
        salesPersonId: lead.salesPersonId || user?.id || '',
      });
    }
  }, [lead, mode, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate required fields
      if (!formData.companyName.trim()) {
        throw new Error('Company name is required');
      }
      if (!formData.contactPerson.trim()) {
        throw new Error('Contact person is required');
      }
      if (!formData.mobile.trim()) {
        throw new Error('Mobile number is required');
      }

      // Prepare data
      const dataToSend = {
        ...formData,
        quantity: formData.quantity ? parseInt(formData.quantity) : null,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        deliveryDate: formData.deliveryDate || null,
        followUpDate: formData.followUpDate || null,
      };

      if (mode === 'create') {
        await leadsAPI.createLead(dataToSend);
      } else if (mode === 'edit') {
        await leadsAPI.updateLead(lead.id, dataToSend);
      }

      onSuccess();
    } catch (err) {
      console.error('Failed to save lead:', err);
      setError(err.message || err.response?.data?.error || 'Failed to save lead');
    } finally {
      setLoading(false);
    }
  };

  const isViewMode = mode === 'view';

  return (
    <div className="form-modal lead-modal" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <h2>
            {mode === 'create' && ' Create New Lead'}
            {mode === 'edit' && ' Edit Lead'}
            {mode === 'view' && ' Lead Details'}
          </h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="modal-error">
            {error}
          </div>
        )}

        {/* Modal Body */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Company Information */}
            <div className="form-section">
              <h3 className="section-title">Company Information</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label>Company Name *</label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    disabled={isViewMode}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Industry</label>
                  <input
                    type="text"
                    name="industry"
                    value={formData.industry}
                    onChange={handleChange}
                    disabled={isViewMode}
                    placeholder="e.g., Hospitality, Education"
                  />
                </div>

                <div className="form-field">
                  <label>City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    disabled={isViewMode}
                  />
                </div>

                <div className="form-field">
                  <label>State</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    disabled={isViewMode}
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="form-section">
              <h3 className="section-title">Contact Information</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label>Contact Person *</label>
                  <input
                    type="text"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleChange}
                    disabled={isViewMode}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Mobile *</label>
                  <input
                    type="tel"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleChange}
                    disabled={isViewMode}
                    required
                    placeholder="+91XXXXXXXXXX"
                  />
                </div>

                <div className="form-field">
                  <label>WhatsApp</label>
                  <input
                    type="tel"
                    name="whatsapp"
                    value={formData.whatsapp}
                    onChange={handleChange}
                    disabled={isViewMode}
                    placeholder="+91XXXXXXXXXX"
                  />
                </div>

                <div className="form-field">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={isViewMode}
                    placeholder="email@company.com"
                  />
                </div>
              </div>
            </div>

            {/* Requirement Details */}
            <div className="form-section">
              <h3 className="section-title">Requirement Details</h3>
              <div className="form-grid">
                <div className="form-field form-field-full">
                  <label>Requirement</label>
                  <textarea
                    name="requirement"
                    value={formData.requirement}
                    onChange={handleChange}
                    disabled={isViewMode}
                    rows="2"
                    placeholder="Describe their requirement..."
                  />
                </div>

                <div className="form-field">
                  <label>Product Interest</label>
                  <input
                    type="text"
                    name="productInterest"
                    value={formData.productInterest}
                    onChange={handleChange}
                    disabled={isViewMode}
                    placeholder="e.g., School Uniform"
                  />
                </div>

                <div className="form-field">
                  <label>Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    disabled={isViewMode}
                    min="0"
                  />
                </div>

                <div className="form-field">
                  <label>Budget (₹)</label>
                  <input
                    type="number"
                    name="budget"
                    value={formData.budget}
                    onChange={handleChange}
                    disabled={isViewMode}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="form-field">
                  <label>Delivery Date</label>
                  <input
                    type="date"
                    name="deliveryDate"
                    value={formData.deliveryDate}
                    onChange={handleChange}
                    disabled={isViewMode}
                  />
                </div>
              </div>
            </div>

            {/* Lead Management */}
            <div className="form-section">
              <h3 className="section-title">Lead Management</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label>Source *</label>
                  <select
                    name="source"
                    value={formData.source}
                    onChange={handleChange}
                    disabled={isViewMode}
                    required
                  >
                    <option value="WEBSITE">Website</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="GOOGLE_BUSINESS">Google Business</option>
                    <option value="GOOGLE_ADS">Google Ads</option>
                    <option value="FACEBOOK">Facebook</option>
                    <option value="INSTAGRAM">Instagram</option>
                    <option value="INDIAMART">IndiaMART</option>
                    <option value="JUSTDIAL">Justdial</option>
                    <option value="TRADEINDIA">TradeIndia</option>
                    <option value="ALIBABA">Alibaba</option>
                    <option value="EMAIL">Email</option>
                    <option value="PHONE">Phone</option>
                    <option value="REFERRAL">Referral</option>
                    <option value="MANUAL">Manual</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Stage *</label>
                  <select
                    name="status"
                    aria-label="Lead stage"
                    value={formData.status}
                    onChange={handleChange}
                    disabled={isViewMode || mode === 'create'}
                    required
                  >
                    {getLeadStatusOptions(formData.status).map(option => (
                      <option key={option.key} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Priority *</label>
                  <select
                    name="priority"
                    aria-label="Lead priority"
                    value={formData.priority}
                    onChange={handleChange}
                    disabled={isViewMode}
                    required
                  >
                    {!['LOW', 'MEDIUM', 'HIGH', 'HOT'].includes(formData.priority) && (
                      <option value={formData.priority}>{formData.priority.charAt(0) + formData.priority.slice(1).toLowerCase()}</option>
                    )}
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="HOT">Hot </option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Follow-up Date</label>
                  <input
                    type="date"
                    name="followUpDate"
                    value={formData.followUpDate}
                    onChange={handleChange}
                    disabled={isViewMode}
                  />
                </div>

                <div className="form-field form-field-full">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    disabled={isViewMode}
                    rows="3"
                    placeholder="Add any additional notes..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              {isViewMode ? 'Close' : 'Cancel'}
            </button>

            {!isViewMode && (
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : mode === 'create' ? 'Create Lead' : 'Save Changes'}
              </button>
            )}

            {isViewMode && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  onClose();
                  // Parent will handle switching to edit mode
                }}
              >
                Edit Lead
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeadModal;
