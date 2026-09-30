# WhatsApp Business API Integration - Complete Architecture

**Date:** 2026-09-27  
**Status:** IMPLEMENTATION GUIDE

---

## 🎯 Overview

This document explains how WhatsApp Business API integration works in production, what happens on both sides (CRM and WhatsApp), and the complete user experience.

---

## 📱 What is WhatsApp Business API?

### Different WhatsApp Products:

1. **WhatsApp (Personal)** - Regular WhatsApp for individuals
2. **WhatsApp Business App** - Free app for small businesses (single device)
3. **WhatsApp Business API** ⭐ - For medium/large businesses (what we need)

### WhatsApp Business API Features:
- ✅ Multiple users can handle messages
- ✅ Integrate with CRM/backend systems
- ✅ Send automated messages
- ✅ Use approved message templates
- ✅ Connect via API endpoints
- ✅ Webhook for incoming messages
- ❌ No direct UI (needs custom interface - our WhatsApp.jsx)

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CUSTOMER'S WHATSAPP APP                  │
│  (Regular WhatsApp - Android/iOS - What customer sees)      │
└────────────┬────────────────────────────────────────────────┘
             │
             │ Customer sends/receives messages
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│              WHATSAPP BUSINESS API (Meta/Facebook)          │
│  • Message routing                                          │
│  • Template approval                                        │
│  • Delivery status tracking                                 │
│  • Media handling                                           │
└────────────┬─────────────────────────────┬──────────────────┘
             │                             │
             │ Webhook (Incoming)          │ API (Outgoing)
             │                             │
             ▼                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   YOUR BACKEND SERVER                        │
│                (learning-system-design-backend)              │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Webhook Handler (POST /api/whatsapp/webhook)        │  │
│  │  • Receive incoming messages                         │  │
│  │  • Process customer replies                          │  │
│  │  • Update conversation status                        │  │
│  │  • Create leads automatically                        │  │
│  │  • Trigger automations                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Message Sender (whatsappController.js)              │  │
│  │  • Send messages via API                             │  │
│  │  • Send templates                                    │  │
│  │  • Upload media                                      │  │
│  │  • Track delivery status                             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Database (PostgreSQL/Prisma)                        │  │
│  │  • Store conversations                               │  │
│  │  • Store messages                                    │  │
│  │  • Store templates                                   │  │
│  │  • Store automation rules                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Automation Engine                                   │  │
│  │  • Check triggers                                    │  │
│  │  • Execute rules                                     │  │
│  │  • Send automated messages                           │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────┬─────────────────────────────────────────────────┘
             │
             │ WebSocket / Polling
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                  FRONTEND (React - WhatsApp.jsx)            │
│  • Display conversations                                    │
│  • Show message history                                     │
│  • Send messages from UI                                    │
│  • Real-time updates                                        │
│                                                              │
│  (What your sales team sees in the CRM)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Message Flow: Complete Journey

### Scenario 1: Customer Sends First Message

```
STEP 1: Customer opens WhatsApp
┌──────────────────────────────────┐
│  Customer's WhatsApp App         │
│                                  │
│  To: +91 79 2765 4321           │
│  (Your Business Number)          │
│                                  │
│  "Hello, I need uniforms for    │
│   my hotel staff"                │
│                                  │
│  [Send] ✓                        │
└──────────────────────────────────┘
            │
            ▼
STEP 2: Message goes to WhatsApp Business API
┌──────────────────────────────────┐
│  WhatsApp Business API (Meta)    │
│  • Validates sender              │
│  • Routes message                │
│  • Prepares webhook payload      │
└──────────────────────────────────┘
            │
            ▼
STEP 3: Webhook to your server
POST https://yourserver.com/api/whatsapp/webhook

{
  "object": "whatsapp_business_account",
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "919876543210",  // Customer's number
          "id": "wamid.HBgNOTE5ODc2NTQzMjEwFQIAERgSNEE",
          "timestamp": "1696234567",
          "text": {
            "body": "Hello, I need uniforms for my hotel staff"
          },
          "type": "text"
        }],
        "contacts": [{
          "profile": {
            "name": "Rajesh Kumar"
          },
          "wa_id": "919876543210"
        }]
      }
    }]
  }]
}

            │
            ▼
STEP 4: Your backend processes webhook
┌──────────────────────────────────┐
│  Your Backend (Node.js/Express)  │
│                                  │
│  webhookHandler():               │
│  1. Parse webhook payload        │
│  2. Extract message data         │
│  3. Check if new customer        │
│  4. Create/Update conversation   │
│  5. Save message to DB           │
│  6. Check automation triggers    │
│  7. Auto-create lead (optional)  │
│  8. Send to frontend via WS      │
└──────────────────────────────────┘
            │
            ▼
STEP 5: Automation triggered (Welcome Message)
┌──────────────────────────────────┐
│  Automation Engine               │
│                                  │
│  Trigger: First message from     │
│           new contact            │
│                                  │
│  Action: Send welcome template   │
└──────────────────────────────────┘
            │
            ▼
STEP 6: Send automated response
POST https://graph.facebook.com/v18.0/{phone_number_id}/messages

{
  "messaging_product": "whatsapp",
  "to": "919876543210",
  "type": "template",
  "template": {
    "name": "welcome_message",
    "language": {
      "code": "en"
    }
  }
}

            │
            ▼
STEP 7: Customer receives auto-reply
┌──────────────────────────────────┐
│  Customer's WhatsApp App         │
│                                  │
│  🏭 AMIT UNIFORM                 │
│  Hello! Welcome to Amit Uniform. │
│  We specialize in high-quality   │
│  uniforms. How can we help you?  │
│                                  │
│  9:45 AM ✓✓                      │
└──────────────────────────────────┘

            │
            ▼
STEP 8: Sales team sees notification
┌──────────────────────────────────┐
│  CRM WhatsApp Interface          │
│  (Your React Frontend)           │
│                                  │
│  🔔 New Message                  │
│  Rajesh Kumar (Hotel Paradise)   │
│  "Hello, I need uniforms..."     │
│                                  │
│  [View Conversation]             │
└──────────────────────────────────┘
```

---

### Scenario 2: Sales Team Sends Message

```
STEP 1: Sales team types in CRM
┌──────────────────────────────────┐
│  CRM Chat Interface              │
│                                  │
│  To: Rajesh Kumar                │
│                                  │
│  "Great! How many uniforms do    │
│   you need?"                     │
│                                  │
│  [📎] [📋] [Send] ←              │
└──────────────────────────────────┘
            │
            ▼
STEP 2: Frontend calls backend API
POST /api/whatsapp/send

{
  "to": "919876543210",
  "message": "Great! How many uniforms do you need?",
  "conversationId": "conv-123"
}

            │
            ▼
STEP 3: Backend calls WhatsApp API
POST https://graph.facebook.com/v18.0/{phone_number_id}/messages

{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "919876543210",
  "type": "text",
  "text": {
    "preview_url": false,
    "body": "Great! How many uniforms do you need?"
  }
}

            │
            ▼
STEP 4: WhatsApp API processes
┌──────────────────────────────────┐
│  WhatsApp Business API           │
│  • Validates request             │
│  • Checks rate limits            │
│  • Sends to customer             │
│  • Returns message ID            │
└──────────────────────────────────┘
            │
            ▼
STEP 5: Customer receives in WhatsApp
┌──────────────────────────────────┐
│  Customer's WhatsApp App         │
│                                  │
│  AMIT UNIFORM                    │
│  Great! How many uniforms do     │
│  you need?                       │
│                                  │
│  10:02 AM ✓✓                     │
└──────────────────────────────────┘

            │
            ▼
STEP 6: Delivery status webhooks
Webhook 1: Sent
{
  "status": "sent",
  "message_id": "wamid.ABC123",
  "timestamp": "1696234589"
}

Webhook 2: Delivered
{
  "status": "delivered",
  "message_id": "wamid.ABC123",
  "timestamp": "1696234590"
}

Webhook 3: Read
{
  "status": "read",
  "message_id": "wamid.ABC123",
  "timestamp": "1696234595"
}

            │
            ▼
STEP 7: CRM shows status updates
┌──────────────────────────────────┐
│  CRM Chat Interface              │
│                                  │
│  Great! How many uniforms do     │
│  you need?                       │
│                                  │
│  10:02 AM ✓✓ Read                │
└──────────────────────────────────┘
```

---

## 👥 What Each User Sees

### 1. What CUSTOMER Sees (In Their WhatsApp App)

```
┌─────────────────────────────────────────┐
│  ← AMIT UNIFORM                    ⋮   │
├─────────────────────────────────────────┤
│                                         │
│  🏭 AMIT UNIFORM                        │
│  Hello! Welcome to Amit Uniform.        │
│  We specialize in high-quality          │
│  uniforms for hotels, hospitals,        │
│  schools, and more.                     │
│                                         │
│  How can we help you today?            │
│  9:45 AM ✓✓                            │
│                                         │
│                       Hello, I need     │
│                       uniforms for my   │
│                       hotel staff       │
│                       9:44 AM ✓✓        │
│                                         │
│  Great! How many uniforms do            │
│  you need?                              │
│  10:02 AM ✓✓                           │
│                                         │
│                       Around 50 pieces  │
│                       for reception and │
│                       housekeeping      │
│                       10:05 AM ✓✓       │
│                                         │
│  Perfect! I'm sending you our           │
│  catalogue right away.                  │
│  10:06 AM ✓✓                           │
│                                         │
│  📄 Hotel_Uniforms_Catalogue.pdf        │
│  2.3 MB                                 │
│  10:06 AM ✓✓                           │
│                                         │
├─────────────────────────────────────────┤
│  Type a message              😊  🎤  📎 │
└─────────────────────────────────────────┘

KEY POINTS FOR CUSTOMER:
✅ Looks like regular WhatsApp chat
✅ Company name shows as "AMIT UNIFORM"
✅ Can see all message history
✅ Receives automated messages seamlessly
✅ Can send text, images, documents
✅ Gets delivery receipts (✓✓)
✅ Can start conversation anytime
✅ Works on their phone just like any WhatsApp chat
```

---

### 2. What SALES TEAM Sees (In CRM)

```
┌──────────────────────────────────────────────────────────┐
│  WhatsApp Business                            [Settings] │
├──────────────────────────────────────────────────────────┤
│  💬 Inbox | 📋 Templates | ⚙️ Automation | 📊 Analytics │
├─────────────────┬────────────────────────────────────────┤
│                 │  Rajesh Kumar - Hotel Paradise    ⋮   │
│ Conversations   │  +91 98765 43210                       │
│                 │  [📋 View Lead] [📄 Send Catalogue]    │
│ 🔴 Rajesh Kumar │ ────────────────────────────────────── │
│    Hotel Para.. │                                        │
│    5 min ago    │  YOU (Automated)                9:45 AM│
│    2 unread     │  🏭 AMIT UNIFORM                       │
│                 │  Hello! Welcome to Amit Uniform...     │
│                 │  ✓✓ Delivered                          │
│                 │                                        │
│ Mumbai Hospital │  CUSTOMER                       9:44 AM│
│    30 min ago   │  Hello, I need uniforms for my         │
│                 │  hotel staff                           │
│                 │  [Create Lead] [Send Template]         │
│ Delhi School    │                                        │
│    2 hrs ago    │  YOU (Manual)                  10:02 AM│
│    1 unread     │  Great! How many uniforms do           │
│                 │  you need?                             │
│ Bangalore Tech  │  ✓✓ Read at 10:03 AM                  │
│    3 hrs ago    │                                        │
│                 │  CUSTOMER                      10:05 AM│
│ Chennai Rest..  │  Around 50 pieces for reception        │
│    5 hrs ago    │  and housekeeping                      │
│    3 unread     │  [Auto-send Catalogue] [Send Quote]   │
│                 │                                        │
│ (+ 10 more)     │  YOU (Manual)                  10:06 AM│
│                 │  Perfect! I'm sending you our          │
│                 │  catalogue right away.                 │
│                 │  ✓✓ Delivered                          │
│                 │                                        │
│                 │  YOU (Manual)                  10:06 AM│
│                 │  📄 Hotel_Uniforms_Catalogue.pdf       │
│                 │  2.3 MB                                │
│                 │  ✓✓ Delivered                          │
│                 │                                        │
│                 │ ────────────────────────────────────── │
│                 │  [📎] [📋] Type a message...  [Send]  │
└─────────────────┴────────────────────────────────────────┘

KEY FEATURES FOR SALES TEAM:
✅ See all conversations in one place
✅ Know which messages are automated vs manual
✅ See message status (sent/delivered/read)
✅ Quick actions: Create Lead, Send Template, Send Quote
✅ Unread message badges
✅ Customer info and context
✅ Chat history with timestamps
✅ Send messages, media, templates
✅ Real-time updates when customer replies
✅ Can take over from automation anytime
```

---

## 🔧 Technical Implementation Details

### 1. WhatsApp Business API Setup

#### Step 1: Create Meta Business Account
```
1. Go to: https://business.facebook.com
2. Create Meta Business Account
3. Add WhatsApp product
4. Get Phone Number ID
5. Generate Access Token
```

#### Step 2: Configure Webhook
```
Webhook URL: https://yourserver.com/api/whatsapp/webhook
Verify Token: your-secret-verify-token
Subscribed Fields:
  - messages
  - message_status
  - messaging_postbacks
```

#### Step 3: Backend Webhook Handler
```javascript
// src/controllers/whatsappController.js

// Webhook verification (GET request from Meta)
exports.verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('Webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
};

// Webhook handler (POST request from Meta)
exports.handleWebhook = async (req, res) => {
  try {
    // Respond immediately (Meta requires fast response)
    res.sendStatus(200);

    const body = req.body;

    if (body.object !== 'whatsapp_business_account') {
      return;
    }

    body.entry.forEach(async (entry) => {
      entry.changes.forEach(async (change) => {
        if (change.value.messages) {
          // Handle incoming messages
          const message = change.value.messages[0];
          await processIncomingMessage(message, change.value.contacts[0]);
        }

        if (change.value.statuses) {
          // Handle message status updates
          const status = change.value.statuses[0];
          await updateMessageStatus(status);
        }
      });
    });
  } catch (error) {
    console.error('Webhook error:', error);
  }
};

// Process incoming message
async function processIncomingMessage(message, contact) {
  const phoneNumber = message.from;
  const messageText = message.text?.body || '';
  const messageId = message.id;
  const timestamp = message.timestamp;
  const contactName = contact.profile.name;

  // 1. Find or create conversation
  let conversation = await prisma.whatsappConversation.findFirst({
    where: { phoneNumber },
  });

  if (!conversation) {
    conversation = await prisma.whatsappConversation.create({
      data: {
        phoneNumber,
        customerName: contactName,
        status: 'ACTIVE',
      },
    });

    // Trigger: First message from new contact
    await checkAutomationTriggers('FIRST_MESSAGE', conversation);
  }

  // 2. Save message to database
  await prisma.whatsappMessage.create({
    data: {
      conversationId: conversation.id,
      messageId,
      message: messageText,
      direction: 'INCOMING',
      status: 'RECEIVED',
      timestamp: new Date(parseInt(timestamp) * 1000),
    },
  });

  // 3. Update conversation last message
  await prisma.whatsappConversation.update({
    where: { id: conversation.id },
    data: {
      lastMessage: messageText,
      lastMessageAt: new Date(),
      unreadCount: { increment: 1 },
    },
  });

  // 4. Check for keyword-based automations
  await checkKeywordTriggers(messageText, conversation);

  // 5. Auto-create lead if configured
  if (conversation.leadId === null) {
    const lead = await createLeadFromConversation(conversation, messageText);
    await prisma.whatsappConversation.update({
      where: { id: conversation.id },
      data: { leadId: lead.id },
    });
  }

  // 6. Send to frontend via WebSocket
  io.emit('whatsapp:new-message', {
    conversationId: conversation.id,
    message: {
      id: messageId,
      message: messageText,
      direction: 'INCOMING',
      timestamp: new Date(),
    },
  });
}
```

#### Step 4: Send Message Function
```javascript
const axios = require('axios');

async function sendWhatsAppMessage(to, message, type = 'text') {
  const WHATSAPP_API_URL = `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`;
  const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

  try {
    const response = await axios.post(
      WHATSAPP_API_URL,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to.replace(/\D/g, ''), // Remove non-digits
        type: type,
        text: {
          preview_url: false,
          body: message,
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      success: true,
      messageId: response.data.messages[0].id,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('WhatsApp send error:', error.response?.data || error);
    throw error;
  }
}

// Send template message
async function sendTemplateMessage(to, templateName, language = 'en') {
  const WHATSAPP_API_URL = `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`;
  const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

  try {
    const response = await axios.post(
      WHATSAPP_API_URL,
      {
        messaging_product: 'whatsapp',
        to: to.replace(/\D/g, ''),
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: language,
          },
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      success: true,
      messageId: response.data.messages[0].id,
    };
  } catch (error) {
    console.error('WhatsApp template send error:', error.response?.data || error);
    throw error;
  }
}
```

---

### 2. Message Templates

#### Template Approval Process

```
STEP 1: Create template in Meta Business Manager
┌──────────────────────────────────────┐
│  Meta Business Manager               │
│  → WhatsApp → Message Templates      │
│                                      │
│  Create Template:                    │
│  Name: welcome_message               │
│  Category: MARKETING                 │
│  Language: English                   │
│                                      │
│  Content:                            │
│  Hello! Welcome to {{1}}.            │
│  We specialize in uniforms.          │
│  How can we help you?                │
│                                      │
│  [Submit for Approval]               │
└──────────────────────────────────────┘
            │
            ▼
STEP 2: Meta reviews template (24-48 hours)
┌──────────────────────────────────────┐
│  Meta Review Process                 │
│  • Check for policy violations       │
│  • Verify business legitimacy        │
│  • Approve or reject                 │
└──────────────────────────────────────┘
            │
            ▼
STEP 3: Template approved
┌──────────────────────────────────────┐
│  Status: APPROVED ✅                 │
│                                      │
│  Now you can use this template       │
│  via API                             │
└──────────────────────────────────────┘
            │
            ▼
STEP 4: Use in your CRM
// Your backend can now send this template
await sendTemplateMessage(
  '+919876543210',
  'welcome_message',
  'en'
);
```

#### Template Categories:

1. **MARKETING** - Promotional messages, offers
2. **UTILITY** - Account updates, reminders
3. **AUTHENTICATION** - OTPs, verification codes

#### Important Rules:
- ❌ Can only send templates to customers who haven't messaged in 24 hours
- ✅ Can send free-form messages within 24-hour window after customer message
- ❌ Templates must be pre-approved by Meta
- ✅ Can use variables in templates {{1}}, {{2}}, etc.

---

### 3. Automation Engine

```javascript
// Automation trigger checker
async function checkAutomationTriggers(triggerType, data) {
  // Get enabled automations for this trigger
  const automations = await prisma.whatsappAutomation.findMany({
    where: {
      enabled: true,
      trigger: triggerType,
    },
  });

  for (const automation of automations) {
    await executeAutomation(automation, data);
  }
}

// Execute automation
async function executeAutomation(automation, data) {
  try {
    switch (automation.action) {
      case 'SEND_TEMPLATE':
        await sendTemplateMessage(
          data.phoneNumber,
          automation.templateName,
          automation.language
        );
        break;

      case 'SEND_MESSAGE':
        await sendWhatsAppMessage(
          data.phoneNumber,
          automation.messageContent
        );
        break;

      case 'CREATE_LEAD':
        await createLeadFromConversation(data);
        break;

      case 'ASSIGN_SALESPERSON':
        await assignSalesperson(data, automation.salespersonId);
        break;

      case 'ADD_TAG':
        await addTagToConversation(data.conversationId, automation.tag);
        break;
    }

    // Update execution count
    await prisma.whatsappAutomation.update({
      where: { id: automation.id },
      data: {
        executionCount: { increment: 1 },
        lastExecutedAt: new Date(),
      },
    });
  } catch (error) {
    console.error(`Automation ${automation.id} failed:`, error);
  }
}

// Keyword trigger checker
async function checkKeywordTriggers(messageText, conversation) {
  const lowerText = messageText.toLowerCase();

  // Catalogue keywords
  if (lowerText.includes('catalogue') || 
      lowerText.includes('price list') || 
      lowerText.includes('products')) {
    await checkAutomationTriggers('KEYWORD_CATALOGUE', conversation);
  }

  // Sample keywords
  if (lowerText.includes('sample')) {
    await checkAutomationTriggers('KEYWORD_SAMPLE', conversation);
  }

  // MOQ keywords
  if (lowerText.includes('moq') || 
      lowerText.includes('minimum')) {
    await checkAutomationTriggers('KEYWORD_MOQ', conversation);
  }

  // Bulk order keywords
  const quantityMatch = messageText.match(/\d+/);
  if (quantityMatch && parseInt(quantityMatch[0]) > 50) {
    await checkAutomationTriggers('BULK_ORDER', conversation);
  }
}
```

---

### 4. Real-time Updates (WebSocket)

```javascript
// Backend: src/server.js
const http = require('http');
const socketIo = require('socket.io');

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
});

// WebSocket connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Authenticate socket
  const token = socket.handshake.auth.token;
  const user = verifyToken(token);

  if (!user) {
    socket.disconnect();
    return;
  }

  // Join user's room
  socket.join(`user-${user.id}`);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Emit events
io.emit('whatsapp:new-message', messageData);
io.emit('whatsapp:message-status', statusData);
io.emit('whatsapp:new-conversation', conversationData);

module.exports = { io };
```

```javascript
// Frontend: WhatsApp.jsx
import { useEffect } from 'react';
import { io } from 'socket.io-client';

const WhatsApp = () => {
  const [conversations, setConversations] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Connect to WebSocket
    const newSocket = io('http://localhost:5000', {
      auth: {
        token: localStorage.getItem('token'),
      },
    });

    setSocket(newSocket);

    // Listen for new messages
    newSocket.on('whatsapp:new-message', (data) => {
      // Update conversation list
      setConversations(prev => {
        const index = prev.findIndex(c => c.id === data.conversationId);
        if (index !== -1) {
          const updated = [...prev];
          updated[index].lastMessage = data.message.message;
          updated[index].lastMessageAt = data.message.timestamp;
          updated[index].unreadCount += 1;
          return updated;
        }
        return prev;
      });

      // If conversation is open, add message
      if (selectedConversation?.id === data.conversationId) {
        setMessages(prev => [...prev, data.message]);
      }

      // Play notification sound
      new Audio('/notification.mp3').play();

      // Show browser notification
      if (Notification.permission === 'granted') {
        new Notification('New WhatsApp Message', {
          body: data.message.message,
          icon: '/logo.png',
        });
      }
    });

    // Listen for status updates
    newSocket.on('whatsapp:message-status', (data) => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === data.messageId 
            ? { ...msg, status: data.status }
            : msg
        )
      );
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // Rest of component...
};
```

---

## 📋 Database Schema

```sql
-- Conversations table
CREATE TABLE whatsapp_conversations (
  id VARCHAR(36) PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  customer_name VARCHAR(255),
  lead_id VARCHAR(36) REFERENCES leads(id),
  status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, ARCHIVED, BLOCKED
  last_message TEXT,
  last_message_at TIMESTAMP,
  unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages table
CREATE TABLE whatsapp_messages (
  id VARCHAR(36) PRIMARY KEY,
  conversation_id VARCHAR(36) REFERENCES whatsapp_conversations(id),
  message_id VARCHAR(255) UNIQUE, -- WhatsApp message ID
  message TEXT,
  direction VARCHAR(10), -- INCOMING, OUTGOING
  type VARCHAR(20) DEFAULT 'text', -- text, image, document, video, audio
  media_url TEXT,
  status VARCHAR(20), -- SENT, DELIVERED, READ, FAILED
  sent_by VARCHAR(36) REFERENCES users(id),
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Templates table
CREATE TABLE whatsapp_templates (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50), -- GREETING, QUOTATION, ORDER, PAYMENT, MARKETING
  content TEXT NOT NULL,
  status VARCHAR(20), -- APPROVED, PENDING, REJECTED
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Automations table
CREATE TABLE whatsapp_automations (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger VARCHAR(100), -- FIRST_MESSAGE, QUOTATION_SENT, KEYWORD_CATALOGUE, etc.
  action VARCHAR(100), -- SEND_TEMPLATE, SEND_MESSAGE, CREATE_LEAD, etc.
  template_name VARCHAR(100),
  message_content TEXT,
  enabled BOOLEAN DEFAULT true,
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Analytics table (daily aggregates)
CREATE TABLE whatsapp_analytics (
  id VARCHAR(36) PRIMARY KEY,
  date DATE NOT NULL,
  conversations_total INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  delivery_rate DECIMAL(5,2),
  read_rate DECIMAL(5,2),
  leads_generated INTEGER DEFAULT 0,
  avg_response_time_seconds INTEGER,
  automated_messages INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🎯 24-Hour Window Rule

### Important WhatsApp Limitation:

```
Customer sends message
        │
        ▼
┌─────────────────────────────────────┐
│   24-HOUR WINDOW OPENS              │
│                                     │
│   ✅ Can send FREE-FORM messages    │
│   ✅ No template needed             │
│   ✅ Unlimited messages             │
│                                     │
│   Example:                          │
│   "Thanks for your inquiry!"        │
│   "Here are the details..."         │
│   "Let me send you a quote"         │
│                                     │
└─────────────────────────────────────┘
        │
        │ After 24 hours...
        ▼
┌─────────────────────────────────────┐
│   24-HOUR WINDOW CLOSED             │
│                                     │
│   ❌ Cannot send free-form messages │
│   ✅ Can only send TEMPLATES        │
│   ✅ Templates must be pre-approved │
│                                     │
│   Example:                          │
│   [Send welcome_message template]   │
│   [Send payment_reminder template]  │
│                                     │
└─────────────────────────────────────┘
```

This is why templates are important - they allow you to re-engage customers after 24 hours!

---

## 💰 Pricing (WhatsApp Business API)

### Conversation-based Pricing:

```
User-initiated conversation:
  First 1,000 conversations/month: FREE
  After that: ~₹0.35 per conversation

Business-initiated conversation:
  ~₹0.35 - ₹0.70 per conversation
  (Varies by country and template category)

Conversation = 24-hour session

Example:
- Customer messages you: FREE (if within 1000 limit)
- You send template after 24 hours: ₹0.35
- Customer replies: Still in same conversation, no extra charge
- You send 10 messages in 24 hours: Still same conversation
```

---

## ✅ Implementation Checklist

### Phase 1: Setup (Week 1)
- [ ] Create Meta Business Account
- [ ] Apply for WhatsApp Business API access
- [ ] Get Phone Number ID and Access Token
- [ ] Configure webhook URL
- [ ] Verify webhook connection

### Phase 2: Basic Integration (Week 2)
- [ ] Implement webhook handler
- [ ] Implement send message function
- [ ] Create database schema
- [ ] Test sending/receiving messages
- [ ] Handle message status updates

### Phase 3: Templates (Week 3)
- [ ] Create message templates in Meta
- [ ] Wait for template approval
- [ ] Implement template sending function
- [ ] Store templates in database
- [ ] Build template management UI

### Phase 4: Automation (Week 4)
- [ ] Build automation engine
- [ ] Implement trigger detection
- [ ] Create automation rules
- [ ] Test automation flows
- [ ] Monitor execution

### Phase 5: Real-time (Week 5)
- [ ] Implement WebSocket
- [ ] Real-time message updates
- [ ] Browser notifications
- [ ] Unread message badges
- [ ] Online/offline status

### Phase 6: Advanced Features (Week 6+)
- [ ] Media upload/download
- [ ] Auto-lead creation
- [ ] Conversation assignment
- [ ] Bulk messaging
- [ ] Analytics and reporting
- [ ] Export conversation history

---

## 🎉 Summary

### What Customer Sees:
- Regular WhatsApp chat on their phone
- Your business name at top
- All messages in chronological order
- Can send text, images, documents anytime
- Receives automated messages seamlessly

### What Sales Team Sees:
- All conversations in CRM interface
- Message history with full context
- Status updates (sent/delivered/read)
- Quick actions (send template, create lead, etc.)
- Real-time notifications
- Can take over from automation anytime

### Behind the Scenes:
- WhatsApp Business API routes messages
- Webhook receives incoming messages
- Your backend processes and stores everything
- Automation engine triggers actions
- WebSocket pushes updates to frontend
- Database stores complete history

### Key Benefits:
✅ Multiple team members can handle messages
✅ Full CRM integration
✅ Automated workflows
✅ Complete message history
✅ Analytics and insights
✅ Scalable for high volume

---

This is production-ready WhatsApp Business API integration! 🚀
