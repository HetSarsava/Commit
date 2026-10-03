const required = { 'company.name': 'Company name', 'company.address': 'Address', 'company.phone': 'Phone', 'company.email': 'Email' };
function decode(value) { try { return JSON.parse(value); } catch { return value; } }
function validateCompany(settings) {
  for (const [key, label] of Object.entries(required)) {
    const value = settings[key];
    if (typeof value !== 'string' || !value.trim()) throw Object.assign(new Error(`${label} is required.`), { status: 400 });
    if (value.length > (key === 'company.address' ? 1000 : 200)) throw Object.assign(new Error(`${label} is too long.`), { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings['company.email'])) throw Object.assign(new Error('Enter a valid company email.'), { status: 400 });
  if (!/^[+\d\s().-]{7,40}$/.test(settings['company.phone'])) throw Object.assign(new Error('Enter a valid company phone.'), { status: 400 });
}
async function validateChanges(prisma, changes) {
  const current = Object.fromEntries((await prisma.settings.findMany({})).map(row => [row.key, decode(row.value)]));
  validateCompany({ ...current, ...changes });
}
async function getCompany(prisma) {
  const values = Object.fromEntries((await prisma.settings.findMany({})).filter(row => row.key.startsWith('company.')).map(row => [row.key.slice(8), decode(row.value)]));
  return values;
}
module.exports = { required, decode, validateCompany, validateChanges, getCompany };
