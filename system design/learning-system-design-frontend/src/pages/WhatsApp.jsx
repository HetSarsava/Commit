import { useState, useEffect } from 'react';
import { whatsappAPI } from '../api/whatsapp';
import './WhatsApp.css';

const WhatsApp = () => {
  const [activeTab, setActiveTab] = useState('inbox');
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [automations, setAutomations] = useState([]);
  const [analytics, setAnalytics] = useState({});

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

  return (
    <div className="whatsapp-page">
      {/* Top Bar */}
      <div className="topbar">
        <div>
          <h1>WhatsApp Business</h1>
          <div className="sub">Manage WhatsApp conversations and automation</div>
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
        {/* Inbox Tab */}
        {activeTab === 'inbox' && (
          <div className="inbox-layout">
            {/* Conversations List */}
            <div className="conversations-panel">
              <div className="panel-header">
                <h3>Conversations</h3>
                <button className="btn btn-sm btn-primary">+ New Chat</button>
              </div>
              <div className="conversations-list">
                {loading ? (
                  <div className="loading-state">Loading conversations...</div>
                ) : conversations.length === 0 ? (
                  <div className="empty-state">No conversations yet</div>
                ) : (
                  conversations.map((conv) => (
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
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Chat Panel */}
            <div className="chat-panel">
              {selectedConversation ? (
                <>
                  <div className="chat-header">
                    <div className="chat-header-info">
                      <div className="chat-avatar">
                        {selectedConversation.customerName?.[0] || '?'}
                      </div>
                      <div>
                        <h3>{selectedConversation.customerName}</h3>
                        <div className="chat-phone">{selectedConversation.phoneNumber}</div>
                      </div>
                    </div>
                    <div className="chat-header-actions">
                      <button className="btn btn-sm btn-secondary">📋 View Lead</button>
                      <button className="btn btn-sm btn-secondary">📄 Send Catalogue</button>
                    </div>
                  </div>

                  <div className="chat-messages">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`message ${msg.direction === 'OUTGOING' ? 'message-sent' : 'message-received'}`}
                      >
                        <div className="message-bubble">
                          {msg.message}
                          <div className="message-time">{formatTime(msg.timestamp)}</div>
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
                      placeholder="Type a message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button className="chat-send-btn" onClick={handleSendMessage}>
                      ➤
                    </button>
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
          </div>
        )}

        {/* Templates Tab */}
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

        {/* Automation Tab */}
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

        {/* Analytics Tab */}
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

export default WhatsApp;
