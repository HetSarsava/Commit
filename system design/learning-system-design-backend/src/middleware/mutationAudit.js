const { logActivity } = require('./activityLogger');
// Store action metadata, without bodies, credentials or message text.
function mutationAudit(req, res, next) {
  const auditPath = (req.originalUrl || req.path).split('?')[0];
  const parts = auditPath.split('/').filter(Boolean);
  const names = {catalogues:'CATALOGUE',quotations:'QUOTATION',orders:'ORDER',invoices:'INVOICE',leads:'LEAD',products:'PRODUCT',payments:'PAYMENT',users:'USER',marketing:'CAMPAIGN',whatsapp:'WHATSAPP',settings:'SETTINGS'};
  const entityType = names[parts[1]] || (parts[1] || 'SYSTEM').toUpperCase();
  const reading = req.method === 'GET' && parts.length === 3 && ['quotations','orders','invoices'].includes(parts[1]);
  const mutation = ['POST','PUT','PATCH','DELETE'].includes(req.method);
  let recorded = false;
  const capture = data => {
    if (recorded || !req.user || (!reading && !mutation)) return;
    recorded = true;
    const record = ['product','catalogue','quotation','order','invoice','payment','campaign','lead','user','proforma'].map(key => data?.[key]).find(row => row?.id) || data;
    const action = res.statusCode >= 400 ? 'FAILED' : reading ? 'VIEW' : auditPath === '/api/auth/login' ? 'LOGIN' : req.method === 'DELETE' ? 'DELETE' : req.method === 'POST' ? 'CREATE' : 'UPDATE';
    const changes = {method:req.method,path:auditPath,status:res.statusCode};
    if (parts[1] === 'marketing' && parts[3] === 'spend' && res.statusCode < 300) {changes.amount=Number(req.body.amount);changes.date=new Date().toISOString();}
    logActivity(req,action,entityType,record?.id || parts.slice(2).join('/') || 'collection',record?.name || record?.quotationNumber || record?.orderNumber || record?.invoiceNumber || entityType,changes).catch(() => {});
  };
  const original=res.json.bind(res);
  res.json=function(data) {
    if (auditPath === '/api/auth/login' && data?.user?.id && res.statusCode < 300) req.user=data.user;
    capture(data);
    return original(data);
  };
  res.on('finish',()=>capture(null));
  next();
}
module.exports={mutationAudit};
