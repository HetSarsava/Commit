const PDFDocument = require('pdfkit');
function cataloguePdf(company, products, title = 'Product catalogue') {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 45 });
    const chunks = []; doc.on('data', chunk => chunks.push(chunk)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject);
    doc.fontSize(22).fillColor('#20352b').text(company.name || 'Company');
    doc.fontSize(10).fillColor('#555').text(company.address || '').text([company.phone, company.email].filter(Boolean).join(' | '));
    doc.moveDown().fontSize(18).fillColor('#20352b').text(title);
    for (const product of products) {
      if (doc.y > 680) doc.addPage();
      doc.moveDown().fontSize(13).fillColor('#20352b').text(product.name);
      doc.fontSize(10).fillColor('#555').text(`SKU: ${product.sku || '-'} | Price: INR ${Number(product.basePrice || 0).toLocaleString('en-IN')} | Minimum order: ${product.moq || product.minOrderQuantity || 1}`);
      if (product.description) doc.text(product.description);
    }
    doc.end();
  });
}
module.exports = { cataloguePdf };
