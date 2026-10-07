const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
export const formatINR = value => '₹' + value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Follow the server's calculation order: round each discounted line, sum,
// subtract the document discount, then round GST and the final amount.
export function calculateDocument(form) {
  const errors = [];
  const number = (value, label, max) => {
    const n = Number(value);
    if (value === '' || value == null || !Number.isFinite(n) || n < 0 || n > max) {
      errors.push('Enter a valid ' + label + '.');
      return 0;
    }
    return n;
  };
  const items = form.items.map((item, index) => {
    const errorCount = errors.length;
    const quantity = number(item.quantity, 'quantity for item ' + (index + 1), 1e6);
    if (quantity === 0) errors.push('Item ' + (index + 1) + ' needs a quantity greater than zero.');
    const unitPrice = number(item.unitPrice, 'price for item ' + (index + 1), 1e7);
    const gross = round(quantity * unitPrice);
    const discount = number(item.discount ?? 0, 'discount for item ' + (index + 1) + ' (up to ' + formatINR(gross) + ')', gross);
    return { description: item.description || 'Item ' + (index + 1), quantity, unitPrice, gross, discount, total: round(quantity * unitPrice - discount), valid: errors.length === errorCount };
  });
  const subtotal = round(items.reduce((sum, item) => sum + item.total, 0));
  const discountAmount = number(form.discountAmount ?? 0, 'overall discount (up to ' + formatINR(subtotal) + ')', subtotal);
  const taxPercent = number(form.taxPercent ?? 18, 'GST percentage', 100);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = round((taxableAmount * taxPercent) / 100);
  const total = round(taxableAmount + taxAmount);
  return { items, subtotal, discountAmount, taxableAmount, taxPercent, taxAmount, total, errors: [...new Set(errors)] };
}
