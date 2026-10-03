const { WhatsAppError, normalizePhone } = require('./metaProvider');

function integerQuery(value, fallback, max, field) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) throw new WhatsAppError(`Invalid ${field}.`);
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number > max) throw new WhatsAppError(`Invalid ${field}.`);
  return number;
}

function parseHistoryQuery(query) {
  if (query.type !== undefined && (typeof query.type !== 'string' || !/^[A-Z_]{1,50}$/.test(query.type))) throw new WhatsAppError('Invalid message type.');
  return {
    page: integerQuery(query.page, 1, 1000000, 'page'),
    limit: integerQuery(query.limit, 50, 100, 'limit'),
    type: query.type,
    phone: query.phone === undefined ? undefined : normalizePhone(query.phone),
  };
}

module.exports = { parseHistoryQuery };
