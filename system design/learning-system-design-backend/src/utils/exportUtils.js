const XLSX = require('xlsx');
const { createObjectCsvWriter } = require('csv-writer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Ensure exports directory exists
const exportsDir = path.join(__dirname, '../../exports');
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}

/**
 * Export data to Excel format
 */
exports.exportToExcel = async (data, filename, sheetName = 'Sheet1') => {
  try {
    // Create a new workbook
    const wb = XLSX.utils.book_new();

    // Convert JSON data to worksheet
    const ws = XLSX.utils.json_to_sheet(data);

    // Auto-size columns
    const colWidths = Object.keys(data[0] || {}).map(key => ({
      wch: Math.max(key.length, 15)
    }));
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Generate Excel file buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return buffer;
  } catch (error) {
    console.error('Excel export error:', error);
    throw new Error('Failed to export to Excel');
  }
};

/**
 * Export data to CSV format
 */
exports.exportToCSV = async (data, filename) => {
  try {
    if (!data || data.length === 0) {
      throw new Error('No data to export');
    }

    // Get headers from first object
    const headers = Object.keys(data[0]).map(key => ({
      id: key,
      title: key.toUpperCase().replace(/_/g, ' ')
    }));

    // Create CSV string manually (more reliable than csv-writer for buffers)
    const headerRow = headers.map(h => h.title).join(',');
    const dataRows = data.map(row =>
      headers.map(h => {
        let value = row[h.id] || '';
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );

    const csv = [headerRow, ...dataRows].join('\n');
    return Buffer.from(csv, 'utf-8');
  } catch (error) {
    console.error('CSV export error:', error);
    throw new Error('Failed to export to CSV');
  }
};

/**
 * Export data to PDF format (table)
 */
exports.exportToPDF = async (data, title, filename) => {
  return new Promise((resolve, reject) => {
    try {
      if (!data || data.length === 0) {
        throw new Error('No data to export');
      }

      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      const chunks = [];

      // Collect PDF data
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Add title
      doc.fontSize(16).font('Helvetica-Bold').text(title, { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown();

      // Table headers
      const headers = Object.keys(data[0]);
      const colWidth = (doc.page.width - 60) / headers.length;

      doc.fontSize(9).font('Helvetica-Bold');
      let y = doc.y;
      headers.forEach((header, i) => {
        doc.text(
          header.toUpperCase().replace(/_/g, ' '),
          30 + i * colWidth,
          y,
          { width: colWidth - 5, align: 'left' }
        );
      });

      doc.moveDown();
      y = doc.y;
      doc.moveTo(30, y).lineTo(doc.page.width - 30, y).stroke();
      doc.moveDown(0.5);

      // Table rows
      doc.fontSize(8).font('Helvetica');
      data.forEach((row, rowIndex) => {
        y = doc.y;

        // Check if need new page
        if (y > doc.page.height - 100) {
          doc.addPage();
          y = 50;
        }

        headers.forEach((header, i) => {
          let value = row[header] || '';
          // Format dates
          if (value instanceof Date) {
            value = value.toLocaleDateString();
          }
          // Truncate long strings
          if (typeof value === 'string' && value.length > 30) {
            value = value.substring(0, 27) + '...';
          }

          doc.text(
            String(value),
            30 + i * colWidth,
            y,
            { width: colWidth - 5, align: 'left' }
          );
        });

        doc.moveDown(0.8);
      });

      // Footer
      doc.fontSize(8).text(
        `Total Records: ${data.length}`,
        30,
        doc.page.height - 50,
        { align: 'center' }
      );

      doc.end();
    } catch (error) {
      console.error('PDF export error:', error);
      reject(new Error('Failed to export to PDF'));
    }
  });
};

/**
 * Format data for export (convert dates, numbers, etc.)
 */
exports.formatDataForExport = (data) => {
  return data.map(row => {
    const formatted = {};
    for (const [key, value] of Object.entries(row)) {
      // Skip complex objects
      if (value && typeof value === 'object' && !(value instanceof Date)) {
        if (value.companyName) formatted[key] = value.companyName;
        else if (value.name) formatted[key] = value.name;
        else formatted[key] = JSON.stringify(value);
      } else if (value instanceof Date) {
        formatted[key] = value.toLocaleDateString();
      } else {
        formatted[key] = value;
      }
    }
    return formatted;
  });
};

/**
 * Clean data for export (remove unnecessary fields)
 */
exports.cleanDataForExport = (data, fieldsToRemove = ['password', 'token', '__v']) => {
  return data.map(row => {
    const cleaned = { ...row };
    fieldsToRemove.forEach(field => delete cleaned[field]);
    return cleaned;
  });
};
