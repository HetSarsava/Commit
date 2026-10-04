function attribution(campaign, leads, orders, customers = [], quotations = []) {
  const campaignLeads = leads.filter(l => l.campaignId === campaign.id);
  const attributed = orders.map(order => {
    const customer = customers.find(c => c.id === order.customerId);
    const quote = quotations.find(q => q.id === order.quotationId);
    const lead = leads.find(l => l.id === customer?.leadId || l.id === order.customerId || l.id === quote?.customerId);
    return {...order, attributedLeadId:lead?.id, attributedCampaignId:lead?.campaignId};
  }).filter(order => order.attributedCampaignId === campaign.id);
  const confirmed = attributed.filter(o => ['CONFIRMED','IN_PRODUCTION','READY','DISPATCHED','DELIVERED','COMPLETED'].includes(o.status));
  const revenue = confirmed.reduce((sum,o) => sum + Math.max(0, Number(o.subtotal || 0) - Number(o.discountAmount || 0)),0);
  const converted = new Set(confirmed.map(o => o.attributedLeadId)).size;
  const spent = Number(campaign.spent || 0);
  return { leads:campaignLeads, orders:attributed, metrics:{totalLeads:campaignLeads.length, orders:confirmed.length, completed:converted, revenue, cpl:campaignLeads.length ? Math.round(spent / campaignLeads.length) : 0, roi:spent ? Math.round((revenue-spent)/spent*1000)/10 : null, conversionRate:campaignLeads.length ? Math.round(converted/campaignLeads.length*1000)/10 : 0} };
}
module.exports = { attribution };
