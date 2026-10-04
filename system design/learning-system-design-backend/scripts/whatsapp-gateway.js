// Expose only the webhook to a Quick Tunnel; keep the CRM and auth APIs local.
require('dotenv').config();
const http = require('node:http');
const backendPort = Number(process.env.PORT || 5000);
const gatewayPort = Number(process.env.WHATSAPP_GATEWAY_PORT || 5001);
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname !== '/api/whatsapp/webhook' || !['GET', 'POST'].includes(req.method)) {
    res.writeHead(404); return res.end();
  }
  const upstream = http.request({ hostname: '127.0.0.1', port: backendPort, method: req.method, path: req.url, headers: { 'content-type': req.headers['content-type'] || 'application/json', ...(req.headers['x-hub-signature-256'] ? { 'x-hub-signature-256': req.headers['x-hub-signature-256'] } : {}) }, timeout: 15000 }, response => {
    res.writeHead(response.statusCode, { 'content-type': response.headers['content-type'] || 'text/plain' });
    response.pipe(res);
  });
  upstream.on('timeout', () => upstream.destroy());
  upstream.on('error', () => { if (!res.headersSent) res.writeHead(503); res.end(); });
  req.pipe(upstream);
}).listen(gatewayPort, '127.0.0.1', () => console.info(`WhatsApp-only gateway on port ${gatewayPort}; backend on ${backendPort}`));
