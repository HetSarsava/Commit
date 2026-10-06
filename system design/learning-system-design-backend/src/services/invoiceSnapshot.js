const number = value => Number(value || 0);
function snapshot(record) {
  return JSON.stringify({ customerId: record.customerId, subtotal: number(record.subtotal), discountAmount: number(record.discountAmount), taxAmount: number(record.taxAmount), total: number(record.total), notes: record.notes || '',
    items: (record.items || []).map(item => ({ productId: item.productId, description:item.description || '', quantity: number(item.quantity), unitPrice: number(item.unitPrice), discount: number(item.discount), total: number(item.total), customization: item.customization || '' })).sort((a,b) => String(a.productId || a.description).localeCompare(String(b.productId || b.description))) });
}
function invoiceData(order, invoice) {
  const paid = number(invoice.amountPaid);
  if (number(order.total) < paid) throw Object.assign(new Error('The revised total is below recorded payments. Review the payments first.'), { status: 409 });
  return { customerId: order.customerId, subtotal: number(order.subtotal), discountPercent: number(order.discountPercent), discountAmount: number(order.discountAmount), taxAmount: number(order.taxAmount), total: number(order.total),
    cgst: number(order.taxAmount) / 2, sgst: number(order.taxAmount) / 2, igst: 0, balanceDue: number(order.total) - paid, notes: order.notes || '',
    items: { deleteMany: {}, create: order.items.map(({productId,description,quantity,unitPrice,discount,total,customization}) => ({productId,description,quantity,unitPrice,discount:discount || 0,total,customization})) } };
}
module.exports = { snapshot, invoiceData };
