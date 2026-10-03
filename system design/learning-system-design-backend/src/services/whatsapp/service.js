const { createHash } = require('node:crypto');
const { z } = require('zod');
const { MetaProvider, WhatsAppError, normalizePhone } = require('./metaProvider');
const { templateText } = require('./templateText');

const templateSchema = z.object({
  name: z.string().regex(/^[a-z0-9_]{1,512}$/),
  language: z.object({ code: z.string().regex(/^[a-z]{2,3}(?:_[A-Z]{2})?$/) }),
  components: z.array(z.object({
    type: z.enum(['header', 'body', 'button']), sub_type: z.enum(['url', 'quick_reply']).optional(), index: z.string().regex(/^\d$/).optional(),
    parameters: z.array(z.object({ type: z.literal('text'), text: z.string().min(1).max(4096), parameter_name: z.string().max(128).optional() })).max(50),
  })).max(10).optional(),
});
const webhookSchema = z.object({
  object: z.literal('whatsapp_business_account'),
  entry: z.array(z.object({ id: z.string(), changes: z.array(z.object({ field: z.string(), value: z.object({
    metadata: z.object({ phone_number_id: z.string() }).passthrough().optional(),
    contacts: z.array(z.object({ wa_id: z.string(), profile: z.object({ name: z.string().max(256) }).optional() })).max(100).optional(),
    messages: z.array(z.object({ id: z.string().min(1).max(512), from: z.string().max(40), timestamp: z.string().regex(/^\d{1,12}$/), type: z.string().max(50) }).passthrough()).max(100).optional(),
    statuses: z.array(z.object({ id: z.string().min(1).max(512), status: z.enum(['sent', 'delivered', 'read', 'failed']), timestamp: z.string().regex(/^\d{1,12}$/), errors: z.array(z.object({ code: z.number() }).passthrough()).max(10).optional() }).passthrough()).max(100).optional(),
  }).passthrough() })).max(100) })).max(100),
});

const iso = timestamp => {
  const date = new Date(Number(timestamp) * 1000);
  if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() > 2100) throw new WhatsAppError('Invalid webhook timestamp.');
  return date.toISOString();
};
const ranks = { SENDING: 0, UNKNOWN: 0, ACCEPTED: 0, SENT: 1, FAILED: 1, DELIVERED: 2, READ: 3 };

class WhatsAppService {
  constructor({ store, crm, provider = new MetaProvider(), env = process.env }) {
    this.store = store;
    this.crm = crm;
    this.provider = provider;
    this.env = env;
  }

  async templatePreview(template) {
    if (!this.provider.templates) return null;
    try {
      if (!this.templateCache || Date.now() - this.templateCache.at > 300000) {
        if (!this.templateLoad) this.templateLoad = this.provider.templates().then(items => {
          this.templateCache = { items, at: Date.now() };
        }).finally(() => { this.templateLoad = null; });
        await this.templateLoad;
      }
      const definition = this.templateCache.items.find(t => t.name === template.name && t.language === template.language.code);
      return templateText(definition, template);
    } catch { return null; } // A preview outage must not change delivery handling.
  }

  async displayMessage(record) {
    if (!record.metadata?.template || !record.message.startsWith('[Template:')) return record;
    const text = await this.templatePreview(record.metadata.template);
    return { ...record, message: text || 'Template message — text unavailable', templatePreviewFromCurrentDefinition: Boolean(text) };
  }

  async identify(phone) {
    // Existing records may contain formatted numbers. Normalize both sides.
    for (const entity of ['customer', 'lead']) {
      if (!this.crm?.[entity]) continue;
      const records = await this.crm[entity].findMany({});
      const match = records.find(row => [row.whatsapp, row.mobile].some(value => {
        try { return normalizePhone(value, this.env.WHATSAPP_DEFAULT_COUNTRY) === phone; } catch { return false; }
      }));
      if (match) return { customerName: match.companyName || match.contactPerson, [`${entity}Id`]: match.id };
    }
    return {};
  }

  async createConversation(phoneValue) {
    const phone = normalizePhone(phoneValue, this.env.WHATSAPP_DEFAULT_COUNTRY);
    const info = await this.identify(phone);
    return this.store.transaction(store => store.conversation(phone, info));
  }

  async send({ to, message, conversationId, template, sentBy = null, messageType = 'TEXT', relatedId = null, idempotencyKey }) {
    if (idempotencyKey !== undefined && (typeof idempotencyKey !== 'string' || !/^[A-Za-z0-9_-]{8,128}$/.test(idempotencyKey))) {
      throw new WhatsAppError('Idempotency-Key must contain 8–128 letters, digits, underscores or hyphens.');
    }
    if (conversationId !== undefined && (typeof conversationId !== 'string' || !conversationId || conversationId.length > 128)) {
      throw new WhatsAppError('Invalid conversation ID.');
    }
    const phone = normalizePhone(to, this.env.WHATSAPP_DEFAULT_COUNTRY);
    if (template) {
      const parsed = templateSchema.safeParse(template);
      if (!parsed.success) throw new WhatsAppError('Invalid template name, language, or text parameters.');
      template = parsed.data;
      message = `[Template: ${template.name} (${template.language.code})]`;
    } else if (typeof message !== 'string' || !message.trim() || message.length > 4096) {
      throw new WhatsAppError('Message must contain between 1 and 4096 characters.');
    }
    const requestHash = idempotencyKey ? createHash('sha256').update(JSON.stringify({ phone, message, template, conversationId, sentBy, messageType, relatedId })).digest('hex') : null;
    if (template) message = await this.templatePreview(template) || message;
    const info = await this.identify(phone);
    const attempt = await this.store.transaction(async store => {
      if (idempotencyKey) {
        const previous = await store.getRequest(idempotencyKey);
        if (previous) {
          if (previous.requestHash !== requestHash) throw new WhatsAppError('This request key was already used for a different message.', 409);
          if (['SENDING', 'UNKNOWN'].includes(previous.status)) throw new WhatsAppError('This send is pending or uncertain. Check delivery before starting a new send.', 409, { uncertain: true });
          if (previous.status === 'FAILED') throw new WhatsAppError(previous.failure?.message || 'This send previously failed.', 409, { metaCode: previous.failure?.code });
          return { record: previous, reused: true };
        }
      }
      const conversation = conversationId ? await store.getConversation(conversationId) : await store.conversation(phone, info);
      if (!conversation || conversation.phoneNumber !== phone) throw new WhatsAppError('Conversation does not match this recipient.');
      // Business snippets are ordinary text, not approved Meta templates.
      if (!template && (!conversation.lastInboundAt || Date.now() - new Date(conversation.lastInboundAt).getTime() > 24 * 60 * 60 * 1000)) {
        throw new WhatsAppError('The 24-hour reply window is closed. Send an approved Meta template first.');
      }
      const record = await store.createMessage({ conversationId: conversation.id, message, direction: 'OUTGOING', status: 'SENDING', sentBy, messageType, relatedId, ...(idempotencyKey ? { idempotencyKey, requestHash } : {}), ...(template ? { metadata: { template } } : {}) });
      return { record, reused: false };
    });
    const { record } = attempt;
    if (attempt.reused) return record;
    let acceptedByMeta = false;
    let acceptedMessageId;
    try {
      const result = await this.provider.send({ to: phone, message, template });
      acceptedByMeta = true;
      acceptedMessageId = result.messageId;
      const updated = await this.store.transaction(async store => {
        let updated = await store.updateMessage(record.id, { messageId: result.messageId, status: 'ACCEPTED', statusAt: result.timestamp });
        for (const event of (await store.events(result.messageId)).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))) {
          updated = await this.applyStatus(store, updated, event);
        }
        await this.touch(store, updated.conversationId, message, updated.timestamp);
        return updated;
      });
      // A timeline outage must not turn an already accepted delivery into a failed send.
      if (this.crm?.activity) {
        try {
          const conversation = await this.store.getConversation(updated.conversationId);
          await this.crm.activity.create({ data: { type: 'WHATSAPP_SENT', description: 'WhatsApp message accepted by Meta', userId: sentBy, leadId: conversation.leadId || null, metadata: { conversationId: updated.conversationId, messageId: updated.messageId, relatedId, messageType } } });
        } catch { console.warn(JSON.stringify({ event: 'whatsapp.timeline_write_failed' })); }
      }
      return updated;
    } catch (error) {
      await this.store.transaction(async store => {
        await store.updateMessage(record.id, { ...(acceptedMessageId ? { messageId: acceptedMessageId } : {}), status: error.uncertain || acceptedByMeta ? 'UNKNOWN' : 'FAILED', failure: { code: error.metaCode || null, message: error instanceof WhatsAppError ? error.message : 'Delivery could not be recorded; check Meta before retrying.' }, statusAt: new Date().toISOString() });
        await this.touch(store, record.conversationId, message, record.timestamp);
      });
      if (!(error instanceof WhatsAppError)) throw new WhatsAppError('Delivery could not be recorded; check Meta before retrying.', 503, { uncertain: acceptedByMeta });
      throw error;
    }
  }

  async touch(store, conversationId, message, timestamp, inbound = false) {
    const current = await store.getConversation(conversationId);
    const newer = !current.lastMessage || new Date(timestamp) >= new Date(current.lastMessageAt);
    await store.updateConversation(conversationId, {
      ...(newer ? { lastMessage: message, lastMessageAt: timestamp } : {}),
      ...(inbound ? { unreadCount: current.unreadCount + 1, lastInboundAt: !current.lastInboundAt || new Date(timestamp) > new Date(current.lastInboundAt) ? timestamp : current.lastInboundAt } : {}),
    });
  }

  async applyStatus(store, message, event) {
    const newStatus = event.status.toUpperCase();
    const oldRank = ranks[message.status] ?? 0;
    const newer = !message.statusAt || new Date(event.timestamp) >= new Date(message.statusAt);
    if (ranks[newStatus] < oldRank || (ranks[newStatus] === oldRank && !newer)) return message;
    // A delayed SENT must not erase an observed failure.
    if (message.status === 'FAILED' && newStatus === 'SENT') return message;
    return store.updateMessage(message.id, { status: newStatus, statusAt: event.timestamp, failure: newStatus === 'FAILED' ? event.failure : null });
  }

  async webhook(payload) {
    const parsed = webhookSchema.safeParse(payload);
    if (!parsed.success) throw new WhatsAppError('Malformed WhatsApp webhook.');
    const count = parsed.data.entry.reduce((n, entry) => n + entry.changes.reduce((m, change) => m + (change.value.messages?.length || 0) + (change.value.statuses?.length || 0), 0), 0);
    if (count > 100) throw new WhatsAppError('Webhook batch exceeds the processing limit.');
    let handled = 0;
    for (const entry of parsed.data.entry) {
      if (entry.id !== this.env.WHATSAPP_BUSINESS_ACCOUNT_ID) continue;
      for (const change of entry.changes) {
        const value = change.value;
        if (change.field !== 'messages' || value.metadata?.phone_number_id !== this.env.WHATSAPP_PHONE_NUMBER_ID) continue;
        for (const item of value.messages || []) {
          const phone = normalizePhone(`+${item.from}`, this.env.WHATSAPP_DEFAULT_COUNTRY);
          const timestamp = iso(item.timestamp);
          const info = await this.identify(phone);
          const profileName = value.contacts?.find(c => c.wa_id === item.from)?.profile?.name;
          if (!info.customerName && profileName) info.customerName = `${profileName} (unknown contact)`;
          const { message, metadata } = this.inboundContent(item);
          await this.store.transaction(async store => {
            if (await store.getMessage(item.id)) return;
            let conversation = await store.conversation(phone, info);
            if (!conversation.customerId && !conversation.leadId && (info.customerId || info.leadId)) conversation = await store.updateConversation(conversation.id, info);
            await store.createMessage({ conversationId: conversation.id, messageId: item.id, message, metadata, direction: 'INCOMING', status: 'RECEIVED', timestamp, messageType: item.type.toUpperCase() });
            await this.touch(store, conversation.id, message, timestamp, true);
            handled++;
          });
        }
        for (const status of value.statuses || []) {
          const event = { id: createHash('sha256').update(`${status.id}:${status.status}:${status.timestamp}`).digest('hex'), messageId: status.id, status: status.status, timestamp: iso(status.timestamp), failure: status.status === 'failed' ? { code: status.errors?.[0]?.code || null, message: `Meta delivery failed (code ${status.errors?.[0]?.code || 'unknown'}).` } : null };
          await this.store.transaction(async store => {
            if (!await store.event(event)) return;
            const message = await store.getMessage(status.id);
            if (message?.direction === 'OUTGOING') await this.applyStatus(store, message, event);
            handled++;
          });
        }
      }
    }
    return { handled };
  }

  inboundContent(item) {
    if (item.type === 'text') {
      if (typeof item.text?.body !== 'string' || item.text.body.length > 4096) throw new WhatsAppError('Malformed text message.');
      return { message: item.text.body, metadata: null };
    }
    const data = item[item.type];
    if (['image', 'document', 'audio', 'video', 'sticker'].includes(item.type)) {
      return { message: `[${item.type}] ${typeof data?.caption === 'string' ? data.caption.slice(0,4096) : ''}`.trim(), metadata: { mediaId: typeof data?.id === 'string' ? data.id.slice(0,512) : null, mimeType: typeof data?.mime_type === 'string' ? data.mime_type.slice(0,100) : null, filename: typeof data?.filename === 'string' ? data.filename.slice(0,256) : null } };
    }
    if (item.type === 'interactive' || item.type === 'button') {
      const reply = data?.button_reply || data?.list_reply || data;
      return { message: String(reply?.title || reply?.text || '[interactive reply]').slice(0,4096), metadata: { replyId: String(reply?.id || reply?.payload || '').slice(0,512) } };
    }
    if (item.type === 'location') return { message: '[location]', metadata: { latitude: Number(data?.latitude) || null, longitude: Number(data?.longitude) || null } };
    if (item.type === 'contacts') return { message: '[contacts]', metadata: { names: Array.isArray(data) ? data.slice(0,20).map(c => String(c.name?.formatted_name || '').slice(0,256)) : [] } };
    return { message: `[Unsupported message: ${item.type}]`, metadata: null };
  }
}

module.exports = { WhatsAppService, webhookSchema, templateSchema };
