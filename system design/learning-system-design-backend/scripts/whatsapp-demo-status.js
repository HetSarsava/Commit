require('dotenv').config();
const { MetaProvider } = require('../src/services/whatsapp/metaProvider');
const { RelaySync } = require('../src/services/whatsapp/relaySync');

(async () => {
  const status = { demoRecipientGuard: process.env.WHATSAPP_DEMO_MODE === 'true' };
  try {
    const templates = await new MetaProvider().templates();
    status.meta = { credentialsValid: true, templatesAccessible: templates.length };
  } catch (error) {
    status.meta = { credentialsValid: false, error: error.message, code: error.metaCode || null };
  }
  if (process.env.WHATSAPP_RELAY_URL) {
    const sync = new RelaySync({ service: null });
    try { status.cloudInbox = { reachable: true, ...await sync.request('/relay/status') }; }
    catch { status.cloudInbox = { reachable: false }; }
  } else status.cloudInbox = { configured: false };
  console.log(JSON.stringify(status, null, 2));
  if (!status.meta.credentialsValid || status.cloudInbox.reachable === false) process.exitCode = 1;
})().catch(() => { console.error('Demo status check failed.'); process.exitCode = 1; });
