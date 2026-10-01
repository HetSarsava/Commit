import { useState, useEffect } from 'react';
import { whatsappAPI } from '../api/whatsapp';
import './WhatsAppEnhanced.css';

const WhatsAppEnhanced = () => {
  const [activeTab, setActiveTab] = useState('inbox');
  const [conversationFilter, setConversationFilter] = useState('all'); // all, needs-human, bot-handling
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [automations, setAutomations] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [showInfoPanel, setShowInfoPanel] = useState(true);

  useEffect(() => {
    if (activeTab === 'inbox') {
      loadConversations();
    } else if (activeTab === 'templates') {
      loadTemplates();
    } else if (activeTab === 'automation') {
      loadAutomations();
    } else if (activeTab === 'analytics') {
      loadAnalytics();
    }
  }, [activeTab]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await whatsappAPI.getConversations();
      setConversations(data);
      // Open the most recent conversation by default so the inbox is useful on first load.
      if (!selectedConversation && data.length > 0) {
        setSelectedConversation(data[0]);
        loadMessages(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      const data = await whatsappAPI.getMessages(conversationId);
      setMessages(data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await whatsappAPI.getTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAutomations = async () => {
    try {
      setLoading(true);
      const data = await whatsappAPI.getAutomations();
      setAutomations(data);
    } catch (error) {
      console.error('Failed to load automations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await whatsappAPI.getAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    loadMessages(conversation.id);
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return;

    try {
      const newMessage = await whatsappAPI.sendMessage({
        conversationId: selectedConversation.id,
        to: selectedConversation.phoneNumber,
        message: messageInput,
      });

      setMessages([...messages, newMessage]);
      setMessageInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
    }
  };

  const handleSendTemplate = async (template) => {
    if (!selectedConversation) {
      alert('Please select a conversation first');
      return;
    }

    try {
      await whatsappAPI.sendTemplate({
        conversationId: selectedConversation.id,
        to: selectedConversation.phoneNumber,
        templateName: template.name,
      });
      alert('Template message sent successfully');
      loadMessages(selectedConversation.id);
    } catch (error) {
      console.error('Failed to send template:', error);
      alert('Failed to send template');
    }
  };

  const handleToggleAutomation = async (automationId, enabled) => {
    try {
      await whatsappAPI.toggleAutomation(automationId, enabled);
      loadAutomations();
    } catch (error) {
      console.error('Failed to toggle automation:', error);
      alert('Failed to update automation');
    }
  };

  const formatTime = (date) => {
    const d = new Date(date);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter conversations based on active filter
  const filteredConversations = conversations.filter(conv => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = conv.customerName?.toLowerCase().includes(query);
      const matchesPhone = conv.phoneNumber?.includes(query);
      if (!matchesName && !matchesPhone) return false;
    }

    // Tab filter
    if (conversationFilter === 'needs-human') {
      return conv.automationStatus === 'PAUSED' || conv.needsHuman;
    } else if (conversationFilter === 'bot-handling') {
      return conv.automationStatus === 'ACTIVE' || conv.isAutomated;
    }

    return true; // 'all' filter
  });

  return (
    <div className="whatsapp-page-enhanced">
      {/* Top Bar */}
      <div className="topbar">
        <div>
          <h1>WhatsApp Business</h1>
          <div className="sub">CRM-Integrated messaging with automation</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="whatsapp-tabs">
        <button
          className={`tab ${activeTab === 'inbox' ? 'active' : ''}`}
          onClick={() => setActiveTab('inbox')}
        >
          💬 Inbox
        </button>
        <button
          className={`tab ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          📋 Templates
        </button>
        <button
          className={`tab ${activeTab === 'automation' ? 'active' : ''}`}
          onClick={() => setActiveTab('automation')}
        >
          ⚙️ Automation
        </button>
        <button
          className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          📊 Analytics
        </button>
      </div>

      {/* Content */}
      <div className="whatsapp-content">
        {/* ==================== INBOX TAB (Enhanced with 3 columns) ==================== */}
        {activeTab === 'inbox' && (
          <div className="inbox-layout-enhanced">
            {/* Conversations List */}
            <div className="conversations-panel-enhanced">
              <div className="panel-header">
                <h3>Conversations</h3>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filter Tabs */}
              <div className="conversation-filters">
                <button
                  className={`filter-tab ${conversationFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setConversationFilter('all')}
                >
                  All
                </button>
                <button
                  className={`filter-tab ${conversationFilter === 'needs-human' ? 'active' : ''}`}
                  onClick={() => setConversationFilter('needs-human')}
                >
                  Needs human
                </button>
                <button
                  className={`filter-tab ${conversationFilter === 'bot-handling' ? 'active' : ''}`}
                  onClick={() => setConversationFilter('bot-handling')}
                >
                  Bot handling
                </button>
              </div>

              <div className="conversations-list">
                {loading ? (
                  <div className="loading-state">Loading...</div>
                ) : filteredConversations.length === 0 ? (
                  <div className="empty-state">
                    {searchQuery ? 'No conversations found' : 'No conversations yet'}
                  </div>
                ) : (
                  filteredConversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`conversation-item ${selectedConversation?.id === conv.id ? 'active' : ''}`}
                      onClick={() => handleSelectConversation(conv)}
                    >
                      <div className="conversation-avatar">
                        {conv.customerName?.[0] || '?'}
                      </div>
                      <div className="conversation-info">
                        <div className="conversation-top">
                          <span className="conversation-name">{conv.customerName}</span>
                          <span className="conversation-time">{formatTime(conv.lastMessageAt)}</span>
                        </div>
                        <div className="conversation-bottom">
                          <span className="conversation-preview">{conv.lastMessage}</span>
                          {conv.unreadCount > 0 && (
                            <span className="unread-badge">{conv.unreadCount}</span>
                          )}
                        </div>
                        {/* Automation Badge */}
                        <div className="conversation-badges">
                          {(conv.automationStatus === 'PAUSED' || conv.needsHuman) && (
                            <span className="conv-badge needs-human">Needs you</span>
                          )}
                          {(conv.automationStatus === 'ACTIVE' || conv.isAutomated) && (
                            <span className="conv-badge bot-handling">Bot handling</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Chat Panel */}
            <div className="chat-panel-enhanced">
              {selectedConversation ? (
                <>
                  <div className="chat-header-enhanced">
                    <div className="chat-header-left">
                      <div className="chat-avatar-enhanced">
                        {selectedConversation.customerName?.[0] || '?'}
                      </div>
                      <div className="chat-header-info">
                        <h3>{selectedConversation.customerName}</h3>
                        <div className="chat-header-meta">
                          {selectedConversation.leadStage && (
                            <span>Lead: {selectedConversation.leadStage}</span>
                          )}
                          {selectedConversation.salesperson && (
                            <span> · Assigned to {selectedConversation.salesperson}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Automation Status Indicator */}
                    <div className={`automation-status ${selectedConversation.automationStatus === 'PAUSED' ? 'paused' : 'active'}`}>
                      <span className="status-dot"></span>
                      {selectedConversation.automationStatus === 'PAUSED' ? (
                        'Automation paused — human reply needed'
                      ) : (
                        'Automation active'
                      )}
                    </div>
                  </div>

                  <div className="chat-messages-enhanced">
                    {messages.map((msg) => (
                      <div key={msg.id} className="message-wrapper">
                        {/* Sender Tag */}
                        {msg.direction === 'OUTGOING' && (
                          <div className={`sender-tag ${msg.isAutomated ? 'automated' : 'manual'}`}>
                            {msg.isAutomated ? '⚙ Automated' : 'YOU (Manual)'}
                          </div>
                        )}

                        <div
                          className={`message ${msg.direction === 'OUTGOING' ? 'message-sent' : 'message-received'}`}
                        >
                          <div className="message-bubble">
                            {msg.message}
                            <div className="message-time">{formatTime(msg.timestamp)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="chat-input-area">
                    <button className="chat-attach-btn" title="Attach file">📎</button>
                    <button className="chat-template-btn" title="Use template">📋</button>
                    <input
                      type="text"
                      className="chat-input"
                      placeholder={`Type a message...`}
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button className="chat-send-btn" onClick={handleSendMessage}>
                      ➤
                    </button>
                  </div>

                  <div className="compose-hint">
                    Replying as you — automation will {selectedConversation.automationStatus === 'PAUSED' ? 'stay paused until resumed' : 'continue after your reply'}
                  </div>
                </>
              ) : (
                <div className="chat-empty-state">
                  <div className="empty-icon">💬</div>
                  <h3>Select a conversation</h3>
                  <p>Choose a conversation from the list to start chatting</p>
                </div>
              )}
            </div>

            {/* Info Panel (NEW!) */}
            {selectedConversation && showInfoPanel && (
              <div className="info-panel-enhanced">
                <div className="info-panel-header">
                  <h3>Lead Information</h3>
                  <button
                    className="close-panel-btn"
                    onClick={() => setShowInfoPanel(false)}
                    title="Hide panel"
                  >
                    ✕
                  </button>
                </div>

                <div className="info-section">
                  <h4>Lead Details</h4>
                  <div className="info-row">
                    <span className="info-label">Company</span>
                    <span className="info-value">{selectedConversation.customerName}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Stage</span>
                    <span className="info-value">
                      <span className="stage-pill">{selectedConversation.leadStage || 'New'}</span>
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Source</span>
                    <span className="info-value">WhatsApp</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Salesperson</span>
                    <span className="info-value">{selectedConversation.salesperson || 'Unassigned'}</span>
                  </div>
                </div>

                <div className="info-section">
                  <h4>Requirements</h4>
                  <div className="info-row">
                    <span className="info-label">Product</span>
                    <span className="info-value">{selectedConversation.productInterest || 'Not specified'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Quantity</span>
                    <span className="info-value">{selectedConversation.quantity || 'N/A'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Budget</span>
                    <span className="info-value">{selectedConversation.budget || 'N/A'}</span>
                  </div>
                </div>

                <div className="info-section">
                  <h4>Quick Actions</h4>
                  <button className="info-action-btn primary">
                    📄 Open Quotation
                  </button>
                  <button className="info-action-btn">
                    📋 View Full Lead
                  </button>
                  <button className="info-action-btn">
                    📦 Send Catalogue
                  </button>
                  <button className="info-action-btn">
                    ⚙️ Resume Automation
                  </button>
                </div>
              </div>
            )}

            {/* Show Info Panel Button (when hidden) */}
            {selectedConversation && !showInfoPanel && (
              <button
                className="show-panel-btn"
                onClick={() => setShowInfoPanel(true)}
                title="Show info panel"
              >
                ◀ Info
              </button>
            )}
          </div>
        )}

        {/* ==================== TEMPLATES TAB (unchanged) ==================== */}
        {activeTab === 'templates' && (
          <div className="templates-section">
            <div className="templates-header">
              <h2>Message Templates</h2>
              <button className="btn btn-primary">+ Create Template</button>
            </div>

            <div className="templates-grid">
              {templates.map((template) => (
                <div key={template.id} className="template-card">
                  <div className="template-header">
                    <h3>{template.name}</h3>
                    <span className={`template-status ${template.status}`}>
                      {template.status}
                    </span>
                  </div>
                  <div className="template-category">{template.category}</div>
                  <div className="template-preview">{template.content}</div>
                  <div className="template-stats">
                    <span>📤 Sent: {template.sentCount}</span>
                    <span>📬 Delivered: {template.deliveredCount}</span>
                    <span>👁️ Read: {template.readCount}</span>
                  </div>
                  <div className="template-actions">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleSendTemplate(template)}
                    >
                      Send
                    </button>
                    <button className="btn btn-sm btn-secondary">Edit</button>
                    <button className="btn btn-sm btn-danger">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== AUTOMATION TAB (unchanged) ==================== */}
        {activeTab === 'automation' && (
          <div className="automation-section">
            <div className="automation-header">
              <h2>WhatsApp Automations</h2>
              <button className="btn btn-primary">+ Create Automation</button>
            </div>

            <div className="automation-list">
              {automations.map((automation) => (
                <div key={automation.id} className="automation-card">
                  <div className="automation-main">
                    <div className="automation-icon">⚙️</div>
                    <div className="automation-info">
                      <h3>{automation.name}</h3>
                      <p>{automation.description}</p>
                      <div className="automation-meta">
                        <span>Trigger: {automation.trigger}</span>
                        <span>•</span>
                        <span>Sent: {automation.executionCount} times</span>
                      </div>
                    </div>
                  </div>
                  <div className="automation-actions">
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={automation.enabled}
                        onChange={(e) => handleToggleAutomation(automation.id, e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                    <button className="btn btn-sm btn-secondary">Edit</button>
                    <button className="btn btn-sm btn-danger">Delete</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="automation-info-box">
              <h3>💡 Available Automations</h3>
              <ul>
                <li>Welcome message when customer sends first message</li>
                <li>Send catalogue when customer asks for products</li>
                <li>Auto-respond to common questions (price, MOQ, delivery time)</li>
                <li>Follow-up reminders after quotation sent</li>
                <li>Payment reminder messages for due invoices</li>
                <li>Order confirmation and production updates</li>
                <li>Dispatch notifications with courier tracking</li>
              </ul>
            </div>
          </div>
        )}

        {/* ==================== ANALYTICS TAB (unchanged) ==================== */}
        {activeTab === 'analytics' && (
          <div className="analytics-section">
            <h2>WhatsApp Analytics</h2>

            <div className="analytics-grid">
              <div className="analytics-card">
                <div className="analytics-icon">💬</div>
                <div className="analytics-data">
                  <div className="analytics-value">{analytics.totalConversations || 0}</div>
                  <div className="analytics-label">Total Conversations</div>
                </div>
              </div>

              <div className="analytics-card">
                <div className="analytics-icon">📤</div>
                <div className="analytics-data">
                  <div className="analytics-value">{analytics.messagesSent || 0}</div>
                  <div className="analytics-label">Messages Sent</div>
                </div>
              </div>

              <div className="analytics-card">
                <div className="analytics-icon">📥</div>
                <div className="analytics-data">
                  <div className="analytics-value">{analytics.messagesReceived || 0}</div>
                  <div className="analytics-label">Messages Received</div>
                </div>
              </div>

              <div className="analytics-card">
                <div className="analytics-icon">✅</div>
                <div className="analytics-data">
                  <div className="analytics-value">{analytics.deliveryRate || 0}%</div>
                  <div className="analytics-label">Delivery Rate</div>
                </div>
              </div>

              <div className="analytics-card">
                <div className="analytics-icon">👁️</div>
                <div className="analytics-data">
                  <div className="analytics-value">{analytics.readRate || 0}%</div>
                  <div className="analytics-label">Read Rate</div>
                </div>
              </div>

              <div className="analytics-card">
                <div className="analytics-icon">💰</div>
                <div className="analytics-data">
                  <div className="analytics-value">{analytics.leadsGenerated || 0}</div>
                  <div className="analytics-label">Leads Generated</div>
                </div>
              </div>

              <div className="analytics-card">
                <div className="analytics-icon">⚡</div>
                <div className="analytics-data">
                  <div className="analytics-value">{analytics.avgResponseTime || '0'}</div>
                  <div className="analytics-label">Avg Response Time</div>
                </div>
              </div>

              <div className="analytics-card">
                <div className="analytics-icon">🤖</div>
                <div className="analytics-data">
                  <div className="analytics-value">{analytics.automatedMessages || 0}</div>
                  <div className="analytics-label">Automated Messages</div>
                </div>
              </div>
            </div>

            <div className="analytics-chart-section">
              <h3>Message Trends (Last 30 Days)</h3>
              <div className="analytics-placeholder">
                <p>📊 Chart visualization would appear here</p>
                <p className="text-muted">Showing daily message volume, delivery rates, and engagement metrics</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppEnhanced;
