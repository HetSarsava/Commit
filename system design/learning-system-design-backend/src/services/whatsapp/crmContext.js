const { WhatsAppError } = require('./metaProvider');
async function crmContext(service, conversationId) {
  let conversation = await service.store.getConversation(conversationId);
  if (!conversation) throw new WhatsAppError('Chat not found.', 404);
  if (!conversation.customerId && !conversation.leadId) {
    const match = await service.identify(conversation.phoneNumber);
    if (match.customerId || match.leadId) conversation = await service.store.transaction(s => s.updateConversation(conversationId, match));
  }
  const rows = async model => service.crm[model]?.findMany ? service.crm[model].findMany({}) : [];
  const [customers, leads, quotations, orders, invoices] = await Promise.all(['customer','lead','quotation','salesOrder','invoice'].map(rows));
  const customer = customers.find(c => c.id === conversation.customerId || (conversation.leadId && c.leadId === conversation.leadId));
  const lead = leads.find(l => l.id === conversation.leadId);
  const related = row => Boolean((customer && (row.customerId === customer.id || (customer.leadId && row.customerId === customer.leadId))) || (conversation.customerId && row.customerId === conversation.customerId) || (conversation.leadId && (row.leadId === conversation.leadId || row.customerId === conversation.leadId)));
  const summaries = (items, number) => items.filter(related).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).map(row => ({ id: row.id, number: row[number], status: row.status }));
  return { conversationId, customer: customer ? { id: customer.id, name: customer.companyName } : null,
    lead: lead ? { id: lead.id, name: lead.companyName, status: lead.status, productInterest: lead.productInterest, quantity: lead.quantity, budget: lead.budget } : null,
    quotations: summaries(quotations, 'quotationNumber'), orders: summaries(orders, 'orderNumber'), invoices: summaries(invoices, 'invoiceNumber'),
    contacts: [...customers.map(c => ({ id: `customer:${c.id}`, name: c.companyName || c.contactPerson })), ...leads.map(l => ({ id: `lead:${l.id}`, name: l.companyName || l.contactPerson }))] };
}
async function linkContact(service, conversationId, contact) {
  if (typeof contact !== 'string' || contact.length > 150) throw new WhatsAppError('Choose an existing customer or lead.');
  const separator = contact.indexOf(':'); const type = contact.slice(0, separator), id = contact.slice(separator + 1);
  if (!['customer', 'lead'].includes(type) || !id) throw new WhatsAppError('Choose an existing customer or lead.');
  const record = await service.crm[type].findUnique({ where: { id } });
  if (!record || !await service.store.getConversation(conversationId)) throw new WhatsAppError('Chat or contact not found.', 404);
  await service.store.transaction(store => store.updateConversation(conversationId, { customerId: type === 'customer' ? id : null, leadId: type === 'lead' ? id : null, customerName: record.companyName || record.contactPerson }));
  return crmContext(service, conversationId);
}
module.exports = { crmContext, linkContact };
