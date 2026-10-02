const { parsePhoneNumberFromString } = require('libphonenumber-js');

class WhatsAppError extends Error {
  constructor(message, status = 400, details = {}) {
    super(message);
    this.name = 'WhatsAppError';
    this.status = status;
    Object.assign(this, details);
  }
}

function normalizePhone(value, country = process.env.WHATSAPP_DEFAULT_COUNTRY || 'IN') {
  if (typeof value !== 'string' || value.length > 40 || /[^\d+\s().-]/.test(value)) {
    throw new WhatsAppError('Enter a valid WhatsApp phone number.');
  }
  const cleaned = value.replace(/[\s().-]/g, '');
  // Meta wa_id values are international digits without a plus sign.
  const input = cleaned.startsWith('+') ? cleaned : cleaned.length > 10 ? `+${cleaned}` : cleaned;
  const phone = parsePhoneNumberFromString(input, country);
  if (!phone?.isValid()) throw new WhatsAppError('Enter a valid WhatsApp phone number with country code.');
  return phone.number.slice(1);
}

class MetaProvider {
  constructor({ env = process.env, fetchImpl = global.fetch } = {}) {
    this.env = env;
    this.fetch = fetchImpl;
  }

  config() {
    const { WHATSAPP_ACCESS_TOKEN: token, WHATSAPP_PHONE_NUMBER_ID: phoneId } = this.env;
    const version = this.env.WHATSAPP_GRAPH_API_VERSION || 'v25.0';
    if (!token || !/^\d+$/.test(phoneId || '')) {
      throw new WhatsAppError('WhatsApp server credentials are missing.', 503);
    }
    if (!/^v\d+\.0$/.test(version)) throw new WhatsAppError('Invalid WhatsApp Graph API version.', 503);
    return { token, phoneId, version };
  }

  async request(path, method = 'GET', body) {
    const { token, version } = this.config();
    const timeout = Math.min(30000, Math.max(1000, Number(this.env.WHATSAPP_TIMEOUT_MS) || 10000));
    // A timed-out POST may already have been accepted. Never automatically resend it.
    for (let attempt = 0; attempt < 3; attempt++) {
      let response;
      try {
        response = await this.fetch(`https://graph.facebook.com/${version}/${path}`, {
          method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(timeout),
        });
      } catch {
        throw new WhatsAppError('Meta could not be reached. Delivery is uncertain; check the conversation before retrying.', 502, { uncertain: method === 'POST' });
      }
      if (method === 'GET' && (response.status === 429 || response.status >= 500) && attempt < 2) {
        const delay = Math.min(3000, Math.max(250, Number(response.headers.get('retry-after')) * 1000 || 500 * (attempt + 1)));
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      let data;
      try { data = await response.json(); } catch {
        throw new WhatsAppError('Meta returned an invalid response. Delivery may be uncertain.', 502, { uncertain: method === 'POST' && response.ok });
      }
      if (!response.ok || data.error) {
        const code = Number(data.error?.code) || response.status;
        const hints = {
          190: 'Meta access token is invalid or expired.',
          131030: 'Recipient is not registered as an allowed test recipient in Meta.',
          131047: 'The customer service window is closed. Send an approved Meta template.',
          132001: 'Meta template name or language is not available.',
          132000: 'Template parameters do not match the approved template.',
          130429: 'Meta rate limit reached. Wait before retrying.',
        };
        throw new WhatsAppError(hints[code] || `Meta rejected the request (code ${code}).`, response.status === 429 ? 429 : 502, { metaCode: code, metaSubcode: Number(data.error?.error_subcode) || null });
      }
      return data;
    }
  }

  async send({ to, message, template }) {
    const { phoneId } = this.config();
    const payload = { messaging_product: 'whatsapp', recipient_type: 'individual', to, ...(
      template ? { type: 'template', template } : { type: 'text', text: { preview_url: false, body: message } }
    ) };
    const data = await this.request(`${phoneId}/messages`, 'POST', payload);
    const messageId = data.messages?.[0]?.id;
    if (typeof messageId !== 'string' || !messageId.startsWith('wamid.')) {
      throw new WhatsAppError('Meta did not return a message ID. Delivery is uncertain.', 502, { uncertain: true });
    }
    return { messageId, timestamp: new Date().toISOString() };
  }

  async templates() {
    const waba = this.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    if (!/^\d+$/.test(waba || '')) throw new WhatsAppError('WhatsApp business account configuration is missing.', 503);
    const data = await this.request(`${waba}/message_templates?fields=id,name,language,status,category,components&limit=100`);
    return (data.data || []).map(t => ({
      id: t.id, name: t.name, language: t.language, category: t.category, status: t.status,
      components: t.components, content: t.components?.find(c => c.type === 'BODY')?.text || t.name,
      sentCount: 0, deliveredCount: 0, readCount: 0,
    }));
  }
}

module.exports = { MetaProvider, WhatsAppError, normalizePhone };
