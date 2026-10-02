import { useEffect, useRef, useState } from 'react';
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
  // Compact viewports show either the list or the chat — never a squashed triple column.
  const [mobilePane, setMobilePane] = useState('list');

  const messagesRef = useRef(null);
  const activeTabRef = useRef(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Keep the newest message visible without ever scrolling the page shell.
  useEffect(() => {
    const node = messagesRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, selectedConversation?.id]);

  // The tab strip scrolls horizontally on phones — follow the selected tab.
  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
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
    setMobilePane('chat');
    loadMessages(conversation.id);
  };

  const handleSendMessage = async (event) => {
    event?.preventDefault();
    if (!messageInput.trim() || !selectedConversation) return;

    const outgoing = messageInput;
    try {
      const newMessage = await whatsappAPI.sendMessage({
        conversationId: selectedConversation.id,
        to: selectedConversation.phoneNumber,
        message: outgoing,
      });

      setMessages((previous) => [
        ...previous,
        newMessage || {
          id: `local-${Date.now()}`,
          direction: 'OUTGOING',
          message: outgoing,
          timestamp: new Date().toISOString(),
        },
      ]);
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

  const tabs = [
    { id: 'inbox', label: '💬 Inbox' },
    { id: 'templates', label: '📋 Templates' },
    { id: 'automation', label: '⚙️ Automation' },
    { id: 'analytics', label: '📊 Analytics' },
  ];

  return (
    <div className="whatsapp-page-enhanced page-fill">
      {/* Top Bar */}
      <div className="topbar">
        <div className="topbar-text">
          <h1>WhatsApp Business</h1>
          <div className="sub">CRM-Integrated messaging with automation</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="whatsapp-tabs tabs" role="tablist" aria-label="WhatsApp sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            ref={activeTab === tab.id ? activeTabRef : undefined}
            role="tab"
            id={`whatsapp-tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`whatsapp-panel-${tab.id}`}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="whatsapp-content">
        {/* ==================== INBOX TAB (3 columns, explicit pane state) ==================== */}
        {activeTab === 'inbox' && (
          <div
            id="whatsapp-panel-inbox"
            role="tabpanel"
            aria-labelledby="whatsapp-tab-inbox"
            className={`inbox-layout-enhanced ${showInfoPanel ? 'info-open' : 'info-closed'} ${
              mobilePane === 'chat' ? 'mobile-chat' : 'mobile-list'
            }`}
          >
            {/* Conversations List */}
            <div className="conversations-panel-enhanced">
              <div className="panel-header">
                <h3>Conversations</h3>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search conversations..."
                  aria-label="Search conversations"
                  autoComplete="off"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filter Tabs */}
              <div className="conversation-filters tabs tabs-compact" role="group" aria-label="Filter conversations">
                <button
                  type="button"
                  className={`tab ${conversationFilter === 'all' ? 'active' : ''}`}
                  aria-pressed={conversationFilter === 'all'}
                  onClick={() => setConversationFilter('all')}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`tab ${conversationFilter === 'needs-human' ? 'active' : ''}`}
                  aria-pressed={conversationFilter === 'needs-human'}
                  onClick={() => setConversationFilter('needs-human')}
                >
                  Needs human
                </button>
                <button
                  type="button"
                  className={`tab ${conversationFilter === 'bot-handling' ? 'active' : ''}`}
                  aria-pressed={conversationFilter === 'bot-handling'}
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
                    <button
                      type="button"
                      key={conv.id}
                      className={`conversation-item ${selectedConversation?.id === conv.id ? 'active' : ''}`}
                      aria-current={selectedConversation?.id === conv.id ? 'true' : undefined}
                      onClick={() => handleSelectConversation(conv)}
                    >
                      <div className="conversation-avatar" aria-hidden="true">
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
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Chat Panel */}
            <div className="chat-panel-enhanced">
              {selectedConversation ? (
                <>
                  <div className="chat-header-enhanced">
                    <button
                      type="button"
                      className="chat-back-btn"
                      onClick={() => {
                        setMobilePane('list');
                        setShowInfoPanel(false);
                      }}
                      aria-label="Back to conversations"
                    >
                      <span aria-hidden="true">←</span>
                    </button>
                    <div className="chat-header-left">
                      <div className="chat-avatar-enhanced" aria-hidden="true">
                        {selectedConversation.customerName?.[0] || '?'}
                      </div>
                      <div className="chat-header-info">
                        <h3 title={selectedConversation.customerName}>
                          {selectedConversation.customerName}
                        </h3>
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

                    <div className="chat-header-actions">
                      {/* Automation Status Indicator */}
                      <div
                        className={`automation-status ${selectedConversation.automationStatus === 'PAUSED' ? 'paused' : 'active'}`}
                        title={selectedConversation.automationStatus === 'PAUSED' ? 'Automation paused — human reply needed' : 'Automation active'}
                      >
                        <span className="status-dot" aria-hidden="true"></span>
                        {selectedConversation.automationStatus === 'PAUSED' ? (
                          'Automation paused — human reply needed'
                        ) : (
                          'Automation active'
                        )}
                      </div>

                      {/* Info panel is always reachable — no clipped edge handle */}
                      <button
                        type="button"
                        className="info-toggle-btn"
                        onClick={() => setShowInfoPanel((previous) => !previous)}
                        aria-expanded={showInfoPanel}
                        aria-controls="whatsapp-info-panel"
                      >
                        {showInfoPanel ? 'Hide info' : 'Lead info'}
                      </button>
                    </div>
                  </div>

                  <div className="chat-messages-enhanced" ref={messagesRef} role="log" aria-live="polite">
                    {messages.length === 0 ? (
                      <div className="empty-state">No messages yet</div>
                    ) : (
                      messages.map((msg) => (
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
                      ))
                    )}
                  </div>

                  <form className="chat-input-area" onSubmit={handleSendMessage}>
                    <button type="button" className="chat-attach-btn" title="Attach file" aria-label="Attach file">📎</button>
                    <button type="button" className="chat-template-btn" title="Use template" aria-label="Use template">📋</button>
                    <input
                      type="text"
                      className="chat-input"
                      placeholder="Type a message..."
                      aria-label="Message"
                      autoComplete="off"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                    />
                    <button type="submit" className="chat-send-btn" aria-label="Send message">
                      <span aria-hidden="true">➤</span>
                    </button>
                  </form>

                  <div className="compose-hint">
                    Replying as you — automation will {selectedConversation.automationStatus === 'PAUSED' ? 'stay paused until resumed' : 'continue after your reply'}
                  </div>
                </>
              ) : (
                <div className="chat-empty-state">
                  <div className="empty-icon" aria-hidden="true">💬</div>
                  <h3>Select a conversation</h3>
                  <p>Choose a conversation from the list to start chatting</p>
                </div>
              )}
            </div>

            {/* Info Panel */}
            {selectedConversation && showInfoPanel && (
              <aside
                id="whatsapp-info-panel"
                className="info-panel-enhanced"
                aria-label="Lead information"
              >
                <div className="info-panel-header">
                  <h3>Lead Information</h3>
                  <button
                    type="button"
                    className="close-panel-btn"
                    onClick={() => setShowInfoPanel(false)}
                    title="Hide panel"
                    aria-label="Hide lead information"
                  >
                    <span aria-hidden="true">✕</span>
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
                  <button type="button" className="info-action-btn primary">
                    📄 Open Quotation
                  </button>
                  <button type="button" className="info-action-btn">
                    📋 View Full Lead
                  </button>
                  <button type="button" className="info-action-btn">
                    📦 Send Catalogue
                  </button>
                  <button type="button" className="info-action-btn">
                    ⚙️ Resume Automation
                  </button>
                </div>
              </aside>
            )}
          </div>
        )}

        {/* ==================== TEMPLATES TAB ==================== */}
        {activeTab === 'templates' && (
          <div
            id="whatsapp-panel-templates"
            role="tabpanel"
            aria-labelledby="whatsapp-tab-templates"
            className="templates-section"
          >
            <div className="templates-header">
              <h2>Message Templates</h2>
              <button type="button" className="btn btn-primary">+ Create Template</button>
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
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => handleSendTemplate(template)}
                    >
                      Send
                    </button>
                    <button type="button" className="btn btn-sm btn-secondary">Edit</button>
                    <button type="button" className="btn btn-sm btn-danger">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== AUTOMATION TAB ==================== */}
        {activeTab === 'automation' && (
          <div
            id="whatsapp-panel-automation"
            role="tabpanel"
            aria-labelledby="whatsapp-tab-automation"
            className="automation-section"
          >
            <div className="automation-header">
              <h2>WhatsApp Automations</h2>
              <button type="button" className="btn btn-primary">+ Create Automation</button>
            </div>

            <div className="automation-list">
              {automations.map((automation) => (
                <div key={automation.id} className="automation-card">
                  <div className="automation-main">
                    <div className="automation-icon" aria-hidden="true">⚙️</div>
                    <div className="automation-info">
                      <h3>{automation.name}</h3>
                      <p>{automation.description}</p>
                      <div className="automation-meta">
                        <span>Trigger: {automation.trigger}</span>
                        <span aria-hidden="true">•</span>
                        <span>Sent: {automation.executionCount} times</span>
                      </div>
                    </div>
                  </div>
                  <div className="automation-actions">
                    <label className="toggle-switch">
                      <span className="visually-hidden">{`Enable ${automation.name}`}</span>
                      <input
                        type="checkbox"
                        checked={automation.enabled}
                        onChange={(e) => handleToggleAutomation(automation.id, e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                    <button type="button" className="btn btn-sm btn-secondary">Edit</button>
                    <button type="button" className="btn btn-sm btn-danger">Delete</button>
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

        {/* ==================== ANALYTICS TAB ==================== */}
        {activeTab === 'analytics' && (
          <div
            id="whatsapp-panel-analytics"
            role="tabpanel"
            aria-labelledby="whatsapp-tab-analytics"
            className="analytics-section"
          >
            <h2>WhatsApp Analytics</h2>

            <div className="analytics-grid">
              <div className="analytics-card">
                <div className="analytics-icon" aria-hidden="true">💬</div>
                <div className="analytics-data">
                  <div className="analytics-value">{analytics.totalConversations || 0}</div>
                  <div className="analytics-label">Total Conversations</div>
                </div>
              </div>

              <div className="analytics-card">
                <div className="analytics-icon" aria-hidden="true">📤</div>
                <div className="analytics-data">
                  <div className="analytics-value">{analytics.messagesSent || 0}</div>
                  <div className="analytics-label">Messages Sent</div>
                </div>
              </div>

              <div className="analytics-card">
                <div className="analytics-icon" aria-hidden="true">📥</div>
                <div className="analytics-data">
                  <div className="analytics-value">{analytics.messagesReceived || 0}</div>
                  <div className="analytics-label">Messages Received</div>
                </div>
              </div>

              <div className="analytics-card">
                <div className="analytics-icon" aria-hidden="true">✅</div>
                <div className="analytics-data">
                  <div className="analytics-value">{analytics.deliveryRate || 0}%</div>
                  <div className="analytics-label">Delivery Rate</div>
                </div>
              </div>

              <div className="analytics-card">
                <div className="analytics-icon" aria-hidden="true">👁️</div>
                <div className="analytics-data">
                  <div className="analytics-value">{analytics.readRate || 0}%</div>
                  <div className="analytics-label">Read Rate</div>
                </div>
              </div>

              <div className="analytics-card">
                <div className="analytics-icon" aria-hidden="true">💰</div>
                <div className="analytics-data">
                  <div className="analytics-value">{analytics.leadsGenerated || 0}</div>
                  <div className="analytics-label">Leads Generated</div>
                </div>
              </div>

              <div className="analytics-card">
                <div className="analytics-icon" aria-hidden="true">⚡</div>
                <div className="analytics-data">
                  <div className="analytics-value">{analytics.avgResponseTime || '0'}</div>
                  <div className="analytics-label">Avg Response Time</div>
                </div>
              </div>

              <div className="analytics-card">
                <div className="analytics-icon" aria-hidden="true">🤖</div>
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
