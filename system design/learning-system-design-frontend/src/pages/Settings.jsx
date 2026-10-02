import { useState, useEffect } from 'react';
import { settingsAPI } from '../api/settings';
import './Settings.css';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('company');
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await settingsAPI.getAllSettings();
      setSettings(data);

      // Convert settings to form data
      const form = {};
      Object.keys(data).forEach(key => {
        try {
          form[key] = JSON.parse(data[key].value);
        } catch {
          form[key] = data[key].value;
        }
      });
      setFormData(form);
    } catch (error) {
      console.error('Failed to load settings:', error);
      alert('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await settingsAPI.updateSettings(formData);
      alert('Settings saved successfully');
      loadSettings();
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset settings to defaults? This will overwrite all custom settings.')) {
      return;
    }

    try {
      setSaving(true);
      await settingsAPI.resetSettings();
      alert('Settings reset to defaults');
      loadSettings();
    } catch (error) {
      console.error('Failed to reset settings:', error);
      alert('Failed to reset settings');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await settingsAPI.exportSettings();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `settings_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export settings:', error);
      alert('Failed to export settings');
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.settings || !Array.isArray(data.settings)) {
        alert('Invalid backup file format');
        return;
      }

      if (confirm('Import settings from backup? This will overwrite current settings.')) {
        await settingsAPI.importSettings(data.settings);
        alert('Settings imported successfully');
        loadSettings();
      }
    } catch (error) {
      console.error('Failed to import settings:', error);
      alert('Failed to import settings');
    }
  };

  if (loading) {
    return (
      <div className="settings-page">
        <div className="loading-state">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      {/* Top Bar */}
      <div className="topbar">
        <div>
          <h1>Settings</h1>
          <div className="sub">Configure system preferences and company information</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-secondary" onClick={handleExport}>
            Export Backup
          </button>
          <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
            Import Backup
            <input
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImport}
            />
          </label>
          <button className="btn btn-warning" onClick={handleReset}>
            Reset to Defaults
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'company' ? 'active' : ''}`}
          onClick={() => setActiveTab('company')}
        >
          Company Profile
        </button>
        <button
          className={`tab ${activeTab === 'bank' ? 'active' : ''}`}
          onClick={() => setActiveTab('bank')}
        >
          Bank Details
        </button>
        <button
          className={`tab ${activeTab === 'tax' ? 'active' : ''}`}
          onClick={() => setActiveTab('tax')}
        >
          Tax Settings
        </button>
        <button
          className={`tab ${activeTab === 'invoice' ? 'active' : ''}`}
          onClick={() => setActiveTab('invoice')}
        >
          Invoice Settings
        </button>
        <button
          className={`tab ${activeTab === 'order' ? 'active' : ''}`}
          onClick={() => setActiveTab('order')}
        >
          Order Settings
        </button>
        <button
          className={`tab ${activeTab === 'system' ? 'active' : ''}`}
          onClick={() => setActiveTab('system')}
        >
          System Preferences
        </button>
      </div>

      {/* Content */}
      <div className="settings-content">
        {/* Company Profile */}
        {activeTab === 'company' && (
          <div className="settings-section">
            <h2>Company Profile</h2>
            <p className="section-desc">Basic company information displayed on invoices and documents</p>

            <div className="form-grid">
              <div className="form-group">
                <label>Company Name</label>
                <input
                  type="text"
                  value={formData['company.name'] || ''}
                  onChange={(e) => handleChange('company.name', e.target.value)}
                />
              </div>

              <div className="form-group full-width">
                <label>Address</label>
                <textarea
                  rows="3"
                  value={formData['company.address'] || ''}
                  onChange={(e) => handleChange('company.address', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>GSTIN</label>
                <input
                  type="text"
                  value={formData['company.gstin'] || ''}
                  onChange={(e) => handleChange('company.gstin', e.target.value)}
                  placeholder="24ABCDE1234F1Z5"
                />
              </div>

              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={formData['company.phone'] || ''}
                  onChange={(e) => handleChange('company.phone', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData['company.email'] || ''}
                  onChange={(e) => handleChange('company.email', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Website</label>
                <input
                  type="url"
                  value={formData['company.website'] || ''}
                  onChange={(e) => handleChange('company.website', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Bank Details */}
        {activeTab === 'bank' && (
          <div className="settings-section">
            <h2>Bank Details</h2>
            <p className="section-desc">Bank account information for invoices and payments</p>

            <div className="form-grid">
              <div className="form-group">
                <label>Bank Name</label>
                <input
                  type="text"
                  value={formData['bank.name'] || ''}
                  onChange={(e) => handleChange('bank.name', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Account Number</label>
                <input
                  type="text"
                  value={formData['bank.accountNumber'] || ''}
                  onChange={(e) => handleChange('bank.accountNumber', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>IFSC Code</label>
                <input
                  type="text"
                  value={formData['bank.ifsc'] || ''}
                  onChange={(e) => handleChange('bank.ifsc', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Branch</label>
                <input
                  type="text"
                  value={formData['bank.branch'] || ''}
                  onChange={(e) => handleChange('bank.branch', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>UPI ID</label>
                <input
                  type="text"
                  value={formData['bank.upi'] || ''}
                  onChange={(e) => handleChange('bank.upi', e.target.value)}
                  placeholder="company@bank"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tax Settings */}
        {activeTab === 'tax' && (
          <div className="settings-section">
            <h2>Tax Settings</h2>
            <p className="section-desc">GST and tax configuration</p>

            <div className="form-grid">
              <div className="form-group">
                <label>Default GST Rate (%)</label>
                <input
                  type="number"
                  value={formData['tax.defaultGSTRate'] || 18}
                  onChange={(e) => handleChange('tax.defaultGSTRate', parseInt(e.target.value))}
                  min="0"
                  max="28"
                />
              </div>

              <div className="form-group">
                <label>Default HSN Code</label>
                <input
                  type="text"
                  value={formData['tax.hsnCode'] || ''}
                  onChange={(e) => handleChange('tax.hsnCode', e.target.value)}
                  placeholder="6217"
                />
              </div>

              <div className="form-group full-width">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData['tax.enableIGST'] || false}
                    onChange={(e) => handleChange('tax.enableIGST', e.target.checked)}
                  />
                  <span>Enable IGST for interstate transactions</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Settings */}
        {activeTab === 'invoice' && (
          <div className="settings-section">
            <h2>Invoice Settings</h2>
            <p className="section-desc">Configure invoice numbering and defaults</p>

            <div className="form-grid">
              <div className="form-group">
                <label>Invoice Prefix</label>
                <input
                  type="text"
                  value={formData['invoice.prefix'] || ''}
                  onChange={(e) => handleChange('invoice.prefix', e.target.value)}
                  placeholder="INV"
                />
              </div>

              <div className="form-group">
                <label>Starting Number</label>
                <input
                  type="number"
                  value={formData['invoice.startNumber'] || 1000}
                  onChange={(e) => handleChange('invoice.startNumber', parseInt(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>Default Payment Terms</label>
                <select
                  value={formData['invoice.defaultPaymentTerms'] || 'Net 30'}
                  onChange={(e) => handleChange('invoice.defaultPaymentTerms', e.target.value)}
                >
                  <option value="Due on Receipt">Due on Receipt</option>
                  <option value="Net 15">Net 15</option>
                  <option value="Net 30">Net 30</option>
                  <option value="Net 45">Net 45</option>
                  <option value="Net 60">Net 60</option>
                </select>
              </div>

              <div className="form-group full-width">
                <label>Invoice Notes</label>
                <textarea
                  rows="3"
                  value={formData['invoice.notes'] || ''}
                  onChange={(e) => handleChange('invoice.notes', e.target.value)}
                />
              </div>

              <div className="form-group full-width">
                <label>Terms & Conditions</label>
                <textarea
                  rows="5"
                  value={formData['invoice.termsAndConditions'] || ''}
                  onChange={(e) => handleChange('invoice.termsAndConditions', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Order Settings */}
        {activeTab === 'order' && (
          <div className="settings-section">
            <h2>Order Settings</h2>
            <p className="section-desc">Configure order processing defaults</p>

            <div className="form-grid">
              <div className="form-group">
                <label>Order Prefix</label>
                <input
                  type="text"
                  value={formData['order.prefix'] || ''}
                  onChange={(e) => handleChange('order.prefix', e.target.value)}
                  placeholder="ORD"
                />
              </div>

              <div className="form-group">
                <label>Default Lead Time (days)</label>
                <input
                  type="number"
                  value={formData['order.defaultLeadTime'] || 15}
                  onChange={(e) => handleChange('order.defaultLeadTime', parseInt(e.target.value))}
                  min="1"
                />
              </div>

              <div className="form-group">
                <label>Approval Threshold (₹)</label>
                <input
                  type="number"
                  value={formData['order.approvalThreshold'] || 50000}
                  onChange={(e) => handleChange('order.approvalThreshold', parseInt(e.target.value))}
                  min="0"
                />
                <div className="help-text">Orders above this value require approval</div>
              </div>

              <div className="form-group">
                <label>Default Advance Payment (%)</label>
                <input
                  type="number"
                  value={formData['order.defaultAdvancePercentage'] || 50}
                  onChange={(e) => handleChange('order.defaultAdvancePercentage', parseInt(e.target.value))}
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </div>
        )}

        {/* System Preferences */}
        {activeTab === 'system' && (
          <div className="settings-section">
            <h2>System Preferences</h2>
            <p className="section-desc">General system configuration</p>

            <div className="form-grid">
              <div className="form-group">
                <label>Date Format</label>
                <select
                  value={formData['system.dateFormat'] || 'DD/MM/YYYY'}
                  onChange={(e) => handleChange('system.dateFormat', e.target.value)}
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>

              <div className="form-group">
                <label>Timezone</label>
                <select
                  value={formData['system.timezone'] || 'Asia/Kolkata'}
                  onChange={(e) => handleChange('system.timezone', e.target.value)}
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Currency</label>
                <input
                  type="text"
                  value={formData['system.currency'] || 'INR'}
                  onChange={(e) => handleChange('system.currency', e.target.value)}
                  disabled
                />
              </div>

              <div className="form-group">
                <label>Currency Symbol</label>
                <input
                  type="text"
                  value={formData['system.currencySymbol'] || '₹'}
                  onChange={(e) => handleChange('system.currencySymbol', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Language</label>
                <select
                  value={formData['system.language'] || 'en'}
                  onChange={(e) => handleChange('system.language', e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
