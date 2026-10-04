import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useCompany } from '../context/CompanyData';
import { useEffect, useRef, useState } from 'react';
import { whatsappAPI } from '../api/whatsapp';
import './WhatsAppEnhanced.css';

const messageStatus = status => ({ SENDING: 'Sending…', ACCEPTED: 'Waiting for delivery', SENT: 'Sent', DELIVERED: 'Delivered', READ: 'Read', FAILED: 'Not sent', UNKNOWN: 'Delivery not confirmed' }[status] || 'Status unavailable');
const messageError = text => {
  if (!text) return 'We could not confirm delivery. Check this chat before trying again.';
  if (/24-hour|service window/i.test(text)) return 'This customer has not messaged you in the last 24 hours. Choose a WhatsApp-approved template to message them.';
  if (/token|credentials|configuration/i.test(text)) return 'WhatsApp needs attention from your administrator. Please contact them to reconnect it.';
  if (/uncertain|pending/i.test(text)) return 'Delivery is not confirmed yet. Check this chat before trying again.';
  if (/template name|template parameters/i.test(text)) return 'This template could not be sent. Check its language and fill in all the required details.';
  return text;
};

const WhatsAppEnhanced = () => {
  const company = useCompany();
  const { user } = useAuth();
  const [guidelines, setGuidelines] = useState('');
  const [guidelineDraft, setGuidelineDraft] = useState('');
  const [guidelineError, setGuidelineError] = useState('');
  const [guidelineSaving, setGuidelineSaving] = useState(false);
  useEffect(() => { apiClient.get('/whatsapp/guidelines').then(({data})=>{setGuidelines(data.text);setGuidelineDraft(data.text);}).catch(()=>setGuidelineError('Could not load business guidelines.')); }, []);
  const saveGuidelines = async () => { setGuidelineSaving(true); try { const {data}=await apiClient.put('/whatsapp/guidelines',{text:guidelineDraft});setGuidelines(data.text);setGuidelineError(''); } catch(e){setGuidelineError(e.response?.data?.error || 'Could not save guidelines.');} finally {setGuidelineSaving(false);} };
  const navigate = useNavigate();
  const [crmContext, setCrmContext] = useState(null);
  const [contextError, setContextError] = useState("");
  const [linkingContact, setLinkingContact] = useState(false);
  const [activeTab, setActiveTab] = useState('inbox');
  const [conversationFilter, setConversationFilter] = useState('all'); // all, needs-human, bot-handling
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [templates, setTemplates] = useState([]);
  const [automations, setAutomations] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  // Compact viewports show either the list or the chat — never a squashed triple column.
  const [mobilePane, setMobilePane] = useState('list');

  const messagesRef = useRef(null);
  const activeTabRef = useRef(null);
  const selectedIdRef = useRef(null);
  const messageRequestRef = useRef(0);
  const sendLockRef = useRef(false);
  const pendingTextRef = useRef(null);
  const pendingTemplateRef = useRef(null);

  useEffect(() => {
    const id = selectedConversation?.id;
    let cancelled = false;
    Promise.resolve().then(() => { if (!cancelled) { setCrmContext(null); setContextError(''); } });
    if (id) apiClient.get('/whatsapp/conversations/' + id + '/context').then(({data}) => { if (!cancelled) setCrmContext(data); }).catch(() => { if (!cancelled) setContextError('Could not load customer records. Reopen this chat to try again.'); });
    return () => { cancelled = true; };
  }, [selectedConversation?.id]);
  const linkCustomer = async event => {
    if (!event.target.value || linkingContact) return;
    setLinkingContact(true); setContextError('');
    const id = selectedConversation.id;
    try { const {data} = await apiClient.put('/whatsapp/conversations/' + id + '/contact', {contact:event.target.value}); if (selectedIdRef.current === id) { setCrmContext(data); loadConversations(); } }
    catch { setContextError('Could not link this contact. Please try again.'); }
    finally { setLinkingContact(false); }
  };

  const requestKey = (reference, payload) => {
    const fingerprint = JSON.stringify(payload);
    if (reference.current?.fingerprint !== fingerprint) reference.current = { fingerprint, key: crypto.randomUUID() };
    return reference.current.key;
  };

  // Poll the real inbox and status events. Cancel stale responses after switching chats.
  useEffect(() => {
    if (activeTab !== 'inbox') return;
    const conversationId = selectedConversation?.id;
    let cancelled = false;
    let busy = false;
    const refresh = async () => {
      if (busy) return;
      busy = true;
      try {
        const inbox = await whatsappAPI.getConversations();
        if (!cancelled) {
          setConversations(inbox);
          setSelectedConversation(current => inbox.find(chat => chat.id === current?.id) || current);
          if (conversationId && selectedIdRef.current === conversationId) {
            loadMessages(conversationId);
          }
        }
      } catch { /* Keep the last known inbox on a transient network failure. */ }
      finally { busy = false; }
    };
    const timer = setInterval(refresh, 5000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [activeTab, selectedConversation?.id]);

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
      setLoadError('');
      setConversations(data);
      setSelectedConversation(current => data.find(chat => chat.id === current?.id) || current);
      // Open the most recent conversation by default so the inbox is useful on first load.
      if (!selectedIdRef.current && data.length > 0) {
        selectedIdRef.current = data[0].id;
        setSelectedConversation(data[0]);
        loadMessages(data[0].id);
        whatsappAPI.markAsRead(data[0].id).catch(() => {});
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setLoadError(error.response?.data?.error || 'Could not load WhatsApp conversations.');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId) => {
    if (selectedIdRef.current !== conversationId) return;
    const sequence = ++messageRequestRef.current;
    try {
      const data = await whatsappAPI.getMessages(conversationId);
      if (selectedIdRef.current === conversationId && messageRequestRef.current === sequence) setMessages(data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await whatsappAPI.getTemplates();
      setLoadError('');
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
      setLoadError(error.response?.data?.error || 'Could not load Meta templates.');
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
    selectedIdRef.current = conversation.id;
    setMessages([]);
    setSendError('');
    setSelectedConversation(conversation);
    setMobilePane('chat');
    loadMessages(conversation.id);
    whatsappAPI.markAsRead(conversation.id).catch(() => {});
  };

  const handleSendMessage = async (event) => {
    event?.preventDefault();
    if (!messageInput.trim() || !selectedConversation || sendLockRef.current) return;

    const outgoing = messageInput;
    const payload = { conversationId: selectedConversation.id, to: selectedConversation.phoneNumber, message: outgoing };
    const key = requestKey(pendingTextRef, payload);
    sendLockRef.current = true;
    setSending(true);
    setSendError('');
    try {
      await whatsappAPI.sendMessage(payload, key);
      pendingTextRef.current = null;
      if (selectedIdRef.current === payload.conversationId) {
        loadMessages(payload.conversationId);
        setMessageInput(current => current === outgoing ? '' : current);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      if (selectedIdRef.current === payload.conversationId) {
        setSendError(messageError(error.response?.data?.error));
        loadMessages(payload.conversationId);
      }
    } finally {
      sendLockRef.current = false;
      setSending(false);
    }
  };

  const handleSendTemplate = async (template) => {
    if (sendLockRef.current) return;
    if (!selectedConversation) {
      alert('Choose a customer chat first.');
      return;
    }

    try {
      const components = [];
      for (const component of template.components || []) {
        if (!['BODY', 'HEADER'].includes(component.type)) continue;
        if (component.type === 'HEADER' && component.format !== 'TEXT') {
          alert('Templates with photos or files cannot be sent yet.');
          return;
        }
        const placeholders = [...new Set((component.text || '').match(/\{\{\w+\}\}/g) || [])];
        if (!placeholders.length) continue;
        const parameters = [];
        for (const placeholder of placeholders) {
          const value = window.prompt(`Value for ${placeholder} in ${template.name}:`);
          if (!value?.trim()) return;
          const key = placeholder.slice(2, -2);
          parameters.push({ type: 'text', text: value, ...(/^\d+$/.test(key) ? {} : { parameter_name: key }) });
        }
        components.push({ type: component.type.toLowerCase(), parameters });
      }
      const buttons = template.components?.find(c => c.type === 'BUTTONS')?.buttons || [];
      for (const [index, button] of buttons.entries()) {
        if (button.type !== 'URL' || !button.url?.includes('{{')) continue;
        const text = window.prompt(`URL suffix for button ${button.text}:`);
        if (!text?.trim()) return;
        components.push({ type: 'button', sub_type: 'url', index: String(index), parameters: [{ type: 'text', text }] });
      }
      const payload = {
        conversationId: selectedConversation.id,
        to: selectedConversation.phoneNumber,
        templateName: template.name,
        language: template.language,
        components,
      };
      const key = requestKey(pendingTemplateRef, payload);
      sendLockRef.current = true;
      setSending(true);
      await whatsappAPI.sendTemplate(payload, key);
      pendingTemplateRef.current = null;
      setActiveTab('inbox');
      setMobilePane('chat');
      loadMessages(selectedConversation.id);
    } catch (error) {
      console.error('Failed to send template:', error);
      alert(messageError(error.response?.data?.error));
    } finally {
      sendLockRef.current = false;
      setSending(false);
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
    { id: 'inbox', label: 'Chats' },
    { id: 'templates', label: 'Templates' },
    { id: 'automation', label: 'Automatic messages' },
    { id: 'analytics', label: 'Message report' },
  ];

  return (
    <div className="whatsapp-page-enhanced page-fill">
      {/* Top Bar */}
      <div className="topbar">
        <div className="topbar-text">
          <h1>WhatsApp Business</h1>
          <div className="sub">Chat with customers and keep track of their orders</div>
        </div>
      </div>
      {loadError && <div role="alert">{loadError}</div>}

      <details className="business-guidelines"><summary>Business guidelines</summary><p style={{whiteSpace:'pre-wrap'}}>{guidelines || 'Your admin has not added guidelines yet.'}</p>{user?.role === 'ADMIN' && <><label>Guidelines for your team<textarea aria-label="Business guidelines text" rows={5} maxLength={12000} value={guidelineDraft} onChange={e=>setGuidelineDraft(e.target.value)} style={{width:'100%',boxSizing:'border-box'}} /></label><button className="btn" disabled={guidelineSaving} onClick={saveGuidelines}>{guidelineSaving?'Saving…':'Save guidelines'}</button></>}{guidelineError && <p role="alert">{guidelineError}</p>}</details>
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
                <div className="chat-list-heading"><h3>Chats</h3>
                <button type="button" className="btn btn-sm btn-primary" onClick={async () => {
                  const phoneNumber = window.prompt('WhatsApp number, including country code:');
                  if (!phoneNumber) return;
                  try {
                    const conversation = await whatsappAPI.createConversation({ phoneNumber });
                    handleSelectConversation(conversation);
                    loadConversations();
                  } catch (error) { alert(error.response?.data?.error || 'Could not start conversation.'); }
                }}>New chat</button></div>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search name or number..."
                  aria-label="Search name or number"
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
                  Needs reply
                </button>
                <button
                  type="button"
                  className={`tab ${conversationFilter === 'bot-handling' ? 'active' : ''}`}
                  aria-pressed={conversationFilter === 'bot-handling'}
                  onClick={() => setConversationFilter('bot-handling')}
                >
                  Automatic replies
                </button>
              </div>

              <div className="conversations-list">
                {loading ? (
                  <div className="loading-state">Loading...</div>
                ) : filteredConversations.length === 0 ? (
                  <div className="empty-state">
                    {searchQuery ? 'No matching chats' : 'No chats yet'}
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
                            <span className="conv-badge bot-handling">Automatic replies</span>
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
                        title={selectedConversation.automationStatus === 'PAUSED' ? 'Reply yourself' : 'Automatic replies on'}
                      >
                        <span className="status-dot" aria-hidden="true"></span>
                        {selectedConversation.automationStatus === 'PAUSED' ? (
                          'Reply yourself'
                        ) : (
                          'Automatic replies on'
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
                        {showInfoPanel ? 'Hide details' : 'Customer details'}
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
                              {msg.isAutomated ? 'Automatic message' : 'You'}
                            </div>
                          )}

                          <div
                            className={`message ${msg.direction === 'OUTGOING' ? 'message-sent' : 'message-received'}`}
                          >
                            <div className="message-bubble">
                              <div className="message-text">{msg.message}</div>
                              {msg.templatePreviewFromCurrentDefinition && <small>Template text shown from the current approved version</small>}
                              <div className="message-time">{formatTime(msg.timestamp)} {msg.direction === 'OUTGOING' && <span title={msg.failure?.message || ''}>{messageStatus(msg.status)}</span>}</div>
                              {msg.failure && <div role="status">{messageError(msg.failure.message)}</div>}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <form className="chat-input-area" onSubmit={handleSendMessage}>
                    <button type="button" className="chat-attach-btn" disabled title="Sending photos and files is not available yet" aria-label="Sending photos and files is not available yet">Attach</button>
                    <button type="button" className="chat-template-btn" onClick={() => setActiveTab('templates')} title="Choose a message template" aria-label="Choose a message template">Templates</button>
                    <input
                      type="text"
                      className="chat-input"
                      placeholder="Type a message..."
                      aria-label="Message"
                      autoComplete="off"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                    />
                    <button type="submit" className="chat-send-btn" aria-label="Send message" disabled={sending || !messageInput.trim()}>
                      <span aria-hidden="true">➤</span>
                    </button>
                  </form>
                  {sending && <div role="status">Sending…</div>}
                  {sendError && <div role="alert">{sendError}</div>}

                  <div className="compose-hint">
                    You can type a reply for 24 hours after a customer messages you. After that, choose a WhatsApp-approved template.
                  </div>
                </>
              ) : (
                <div className="chat-empty-state">

                  <h3>Select a chat</h3>
                  <p>Choose a customer from the list to read and reply</p>
                </div>
              )}
            </div>

            {/* Info Panel */}
            {selectedConversation && showInfoPanel && (
              <aside
                id="whatsapp-info-panel"
                className="info-panel-enhanced"
                aria-label="Customer details"
              >
                <div className="info-panel-header">
                  <h3>Customer details</h3>
                  <button
                    type="button"
                    className="close-panel-btn"
                    onClick={() => setShowInfoPanel(false)}
                    title="Hide panel"
                    aria-label="Hide customer details"
                  >
                    <span aria-hidden="true">✕</span>
                  </button>
                </div>

                <div className="info-section">
                  <h4>Contact details</h4>
                  {contextError && <p role="alert">{contextError}</p>}
                  {crmContext && <label>Linked customer or lead
                    <select aria-label="Linked customer or lead" disabled={linkingContact} value={crmContext.customer ? 'customer:' + crmContext.customer.id : crmContext.lead ? 'lead:' + crmContext.lead.id : ''} onChange={linkCustomer}>
                      <option value="">Choose an existing contact</option>
                      {crmContext.contacts.map(contact => <option key={contact.id} value={contact.id}>{contact.name}</option>)}
                    </select>
                  </label>}
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
                    <span className="info-value">{selectedConversation.salesperson || 'Not assigned'}</span>
                  </div>
                </div>

                <div className="info-section">
                  <h4>Requirements</h4>
                  <div className="info-row">
                    <span className="info-label">Product</span>
                    <span className="info-value">{crmContext?.lead?.productInterest || selectedConversation.productInterest || 'Not added'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Quantity</span>
                    <span className="info-value">{crmContext?.lead?.quantity || selectedConversation.quantity || 'Not added'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Budget</span>
                    <span className="info-value">{crmContext?.lead?.budget || selectedConversation.budget || 'Not added'}</span>
                  </div>
                </div>

                <div className="info-section">
                  <h4>Quick Actions</h4>
                  {crmContext && !crmContext.quotations.length && <p>No quotation for this contact yet.</p>}
                  {crmContext?.orders.map(order => <button key={order.id} className="info-action-btn" onClick={() => navigate('/orders/' + order.id)}>Order {order.number}</button>)}
                  {crmContext?.invoices.map(invoice => <button key={invoice.id} className="info-action-btn" onClick={() => navigate('/invoices/' + invoice.id)}>Invoice {invoice.number}</button>)}
                  <button type="button" className="info-action-btn primary" disabled={!crmContext?.quotations.length} title={crmContext?.quotations.length ? "Open the latest quotation" : "No quotation for this contact. Link a customer or create a quotation first."} onClick={() => navigate("/quotations/" + crmContext.quotations[0].id)}>
                     Open Quotation
                  </button>
                  <button type="button" className="info-action-btn" disabled={!crmContext?.lead} title={crmContext?.lead ? "Open this lead" : "No linked lead"} onClick={() => navigate("/leads?leadId=" + encodeURIComponent(crmContext.lead.id))}>
                     View Full Lead
                  </button>
                  <button type="button" className="info-action-btn" onClick={() => navigate("/catalogues", { state: { customerId: crmContext?.customer?.id || crmContext?.lead?.id } })}>
                     Choose Catalogue
                  </button>
                  <button type="button" className="info-action-btn" disabled title="Automatic replies have not been set up yet">
                     Resume Automation
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
              <h2>{company.name} message examples</h2>
              <button type="button" className="btn btn-primary" disabled title="Template creation is not configured">+ Create Template</button>
            </div>

            <p>Examples for your business. These drafts need WhatsApp approval before they can be sent as templates.</p>
            <div className="templates-grid">
              {[
                ['Welcome', `Hello {{customer_name}}, welcome to ${company.name}. We make uniforms for schools, hospitals and businesses. How can we help you?`],
                ['Quotation', `Hello {{customer_name}}, your uniform quotation {{quotation_number}} from ${company.name} is ready. Total: ₹{{amount}}. Please reply if you would like to place the order.`],
                ['Order confirmation', `Hello {{customer_name}}, ${company.name} has confirmed your uniform order {{order_number}}. Expected delivery: {{delivery_date}}. Thank you!`],
                ['Payment reminder', `Hello {{customer_name}}, ₹{{balance}} is due for invoice {{invoice_number}} from ${company.name}. Please share your payment confirmation. For help, contact ${company.phone || 'our team'}.`],
              ].map(([title, text]) => <div className="template-card" key={title}>
                <div className="template-header"><h3>{title}</h3><span className="template-status">Draft example</span></div>
                <div className="template-preview">{text}</div>
                <small>Not approved for template sending yet</small>
              </div>)}
            </div>

            <h2>Approved test messages</h2>
            <p>These are Meta's available test messages. Their exact approved text is shown below and will be sent unchanged.</p>

            <div className="templates-grid">
              {templates.filter(template => !template.name.startsWith('jaspers_market_')).map((template) => (
                <div key={template.id} className="template-card">
                  <div className="template-header">
                    <h3>{template.name} ({template.language})</h3>
                    <span className={`template-status ${template.status}`}>
                      {template.status}
                    </span>
                  </div>
                  <div className="template-category">{template.category}</div>
                  <div className="template-preview">{template.content}</div>
                  <div className="template-stats">
                    <span> Sent: {template.sentCount}</span>
                    <span> Delivered: {template.deliveredCount}</span>
                    <span> Read: {template.readCount}</span>
                  </div>
                  <div className="template-actions">
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => handleSendTemplate(template)}
                      disabled={sending || template.status !== 'APPROVED' || (template.components || []).some(c => c.type === 'CAROUSEL' || (c.type === 'HEADER' && c.format !== 'TEXT'))}
                    >
                      Send
                    </button>
                    <button type="button" className="btn btn-sm btn-secondary" disabled title="Editing is not configured">Edit</button>
                    <button type="button" className="btn btn-sm btn-danger" disabled title="Deletion is not configured">Delete</button>
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
              <button type="button" className="btn btn-primary" disabled title="Automation creation is not configured">+ Create Automation</button>
            </div>

            <div className="automation-list">
              {!automations.length && <p>Automatic messages are not set up yet. You can reply in Chats or send a template.</p>}
              {automations.map((automation) => (
                <div key={automation.id} className="automation-card">
                  <div className="automation-main">

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
                    <button type="button" className="btn btn-sm btn-secondary" disabled title="Editing is not configured">Edit</button>
                    <button type="button" className="btn btn-sm btn-danger" disabled title="Deletion is not configured">Delete</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="automation-info-box">
              <h3> Ideas for automatic messages (not set up yet)</h3>
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
            <h2>WhatsApp message report</h2>

            <div className="analytics-grid">
              <div className="analytics-card">

                <div className="analytics-data">
                  <div className="analytics-value">{analytics.totalConversations || 0}</div>
                  <div className="analytics-label">Total Conversations</div>
                </div>
              </div>

              <div className="analytics-card">

                <div className="analytics-data">
                  <div className="analytics-value">{analytics.messagesSent || 0}</div>
                  <div className="analytics-label">Messages Sent</div>
                </div>
              </div>

              <div className="analytics-card">

                <div className="analytics-data">
                  <div className="analytics-value">{analytics.messagesReceived || 0}</div>
                  <div className="analytics-label">Messages Received</div>
                </div>
              </div>

              <div className="analytics-card">

                <div className="analytics-data">
                  <div className="analytics-value">{analytics.deliveryRate || 0}%</div>
                  <div className="analytics-label">Delivery Rate</div>
                </div>
              </div>

              <div className="analytics-card">

                <div className="analytics-data">
                  <div className="analytics-value">{analytics.readRate || 0}%</div>
                  <div className="analytics-label">Read Rate</div>
                </div>
              </div>

              <div className="analytics-card">

                <div className="analytics-data">
                  <div className="analytics-value">{analytics.leadsGenerated || 0}</div>
                  <div className="analytics-label">Leads Generated</div>
                </div>
              </div>

              <div className="analytics-card">

                <div className="analytics-data">
                  <div className="analytics-value">{analytics.avgResponseTime || '0'}</div>
                  <div className="analytics-label">Avg Response Time</div>
                </div>
              </div>

              <div className="analytics-card">

                <div className="analytics-data">
                  <div className="analytics-value">{analytics.automatedMessages || 0}</div>
                  <div className="analytics-label">Automated Messages</div>
                </div>
              </div>
            </div>

            <div className="analytics-chart-section">
              <h3>Message Trends (Last 30 Days)</h3>
              <div className="analytics-placeholder">
                <p> Chart visualization would appear here</p>
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
