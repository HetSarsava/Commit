import { readFile } from 'node:fs/promises';
import path from 'node:path';

const allowedFiles = new Set([
  'whatsapp-view-ui.html',
  'payments-outstanding-ui.html',
  'production-inventory-ui.html',
  'digital-marketing-ui.html',
  'reports-ui.html',
  'workflow-builder-ui.html',
  'settings-roles-ui.html',
]);

export async function GET(_request: Request, context: { params: Promise<{ name: string }> }) {
  const { name } = await context.params;
  if (!allowedFiles.has(name)) return new Response('Prototype screen not found', { status: 404 });
  try {
    const html = await readFile(path.resolve(process.cwd(), '..', '..', name), 'utf8');
    return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  } catch {
    return new Response('Prototype screen not available', { status: 404 });
  }
}
