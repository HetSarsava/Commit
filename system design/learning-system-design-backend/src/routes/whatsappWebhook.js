const express = require('express');
const { createHmac, timingSafeEqual } = require('node:crypto');

function webhookRouter(service, env = process.env) {
  const router = express.Router();
  router.get('/', (req, res) => {
    const token = env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    if (!token) return res.sendStatus(503);
    const supplied = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const valid = typeof supplied === 'string' && Buffer.byteLength(supplied) === Buffer.byteLength(token) && timingSafeEqual(Buffer.from(supplied), Buffer.from(token));
    if (req.query['hub.mode'] !== 'subscribe' || !valid || typeof challenge !== 'string' || challenge.length > 1024) return res.sendStatus(403);
    return res.type('text/plain').send(challenge);
  });
  router.post('/', express.raw({ type: 'application/json', limit: '256kb' }), async (req, res) => {
    if (!env.WHATSAPP_APP_SECRET) return res.sendStatus(503);
    const signature = req.get('x-hub-signature-256');
    if (!Buffer.isBuffer(req.body) || !/^sha256=[a-f0-9]{64}$/.test(signature || '')) return res.sendStatus(401);
    const expected = createHmac('sha256', env.WHATSAPP_APP_SECRET).update(req.body).digest();
    if (!timingSafeEqual(Buffer.from(signature.slice(7), 'hex'), expected)) return res.sendStatus(401);
    try {
      const result = await service.webhook(JSON.parse(req.body.toString('utf8')));
      console.info(JSON.stringify({ event: 'whatsapp.webhook', handled: result.handled }));
      return res.sendStatus(200);
    } catch (error) {
      // Persist before acknowledging. A storage failure must ask Meta to redeliver.
      const malformed = error instanceof SyntaxError || error.status === 400;
      console.warn(JSON.stringify({ event: 'whatsapp.webhook_error', kind: malformed ? 'malformed' : 'storage', code: error.code || null }));
      return res.sendStatus(malformed ? 400 : 503);
    }
  });
  return router;
}

module.exports = { webhookRouter };
