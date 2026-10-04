import { useState, useEffect } from 'react';
import { reportsAPI } from '../api/reports';
import './Reports.css';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('sales');
  const [salesData, setSalesData] = useState(null);
  const [productData, setProductData] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [gstData, setGSTData] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Date filters
  const [salesFilters, setSalesFilters] = useState({
    startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    groupBy: 'day',
  });

  const [gstFilters, setGSTFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  useEffect(() => {
    loadReport();
  }, [activeTab]);

  const loadReport = async () => {
    setLoading(true);
    try {
      if (activeTab === 'sales') {
        const data = await reportsAPI.getSalesReport(salesFilters);
        setSalesData(data);
      } else if (activeTab === 'products') {
        const data = await reportsAPI.getProductReport();
        setProductData(data);
      } else if (activeTab === 'customers') {
        const data = await reportsAPI.getCustomerReport();
        setCustomerData(data);
      } else if (activeTab === 'gst') {
        const data = await reportsAPI.getGSTReport(gstFilters);
        setGSTData(data);
      } else if (activeTab === 'payments') {
        const data = await reportsAPI.getPaymentReport();
        setPaymentData(data);
      }
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);

    // Helper function to escape CSV values
    const escapeCSVValue = (value) => {
      if (value === null || value === undefined) return '';

      // Convert to string
      let stringValue = String(value);

      // If value contains comma, quotes, or newlines, wrap in quotes and escape quotes
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        stringValue = '"' + stringValue.replace(/"/g, '""') + '"';
      }

      return stringValue;
    };

    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        headers.map((header) => escapeCSVValue(row[header])).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const formatNumber = (num) => {
    return num.toLocaleString('en-IN');
  };

  // Export report with backend API
  const handleExport = async (reportType, format) => {
    try {
      setLoading(true);
      let blob;
      let filename;

      if (reportType === 'sales') {
        blob = await reportsAPI.exportSalesReport(format, salesFilters);
        filename = `Sales_Report`;
      } else if (reportType === 'leads') {
        blob = await reportsAPI.exportLeadsReport(format);
        filename = `Leads_Report`;
      } else if (reportType === 'inventory') {
        blob = await reportsAPI.exportInventoryReport(format);
        filename = `Inventory_Report`;
      } else if (reportType === 'production') {
        blob = await reportsAPI.exportProductionReport(format);
        filename = `Production_Report`;
      } else if (reportType === 'marketing') {
        blob = await reportsAPI.exportMarketingReport(format);
        filename = `Marketing_Report`;
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reports-page">
      {/* Top Bar */}
      <div className="topbar">
        <div>
          <h1>Reports & Analytics</h1>
          <div className="sub">Business insights and compliance reports</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'sales' ? 'active' : ''}`}
          onClick={() => setActiveTab('sales')}
        >
          Sales Report
        </button>
        <button
          className={`tab ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          Product Performance
        </button>
        <button
          className={`tab ${activeTab === 'customers' ? 'active' : ''}`}
          onClick={() => setActiveTab('customers')}
        >
          Customer Analysis
        </button>
        <button
          className={`tab ${activeTab === 'gst' ? 'active' : ''}`}
          onClick={() => setActiveTab('gst')}
        >
          GST Report
        </button>
        <button
          className={`tab ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          Payment Collection
        </button>
      </div>

      {/* Content Area */}
      <div className="report-content">
        {loading ? (
          <div className="loading-state">Loading report...</div>
        ) : (
          <>
            {/* Sales Report */}
            {activeTab === 'sales' && salesData && (
              <div className="report-section">
                <div className="report-header">
                  <h2>Sales Report</h2>
                  <div className="report-actions">
                    <label className="report-field">
                      <span className="field-caption">From</span>
                      <input
                        type="date"
                        value={salesFilters.startDate}
                        onChange={(e) =>
                          setSalesFilters({ ...salesFilters, startDate: e.target.value })
                        }
                      />
                    </label>
                    <label className="report-field">
                      <span className="field-caption">To</span>
                      <input
                        type="date"
                        value={salesFilters.endDate}
                        onChange={(e) =>
                          setSalesFilters({ ...salesFilters, endDate: e.target.value })
                        }
                      />
                    </label>
                    <button className="btn" onClick={loadReport}>
                      Apply Filters
                    </button>
                    <div className="export-buttons">
                      <button
                        className="btn btn-success"
                        onClick={() => handleExport('sales', 'excel')}
                      >
                         Excel
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleExport('sales', 'csv')}
                      >
                         CSV
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleExport('sales', 'pdf')}
                      >
                         PDF
                      </button>
                    </div>
                  </div>
                </div>

                <div className="summary-cards">
                  <div className="summary-card">
                    <div className="label">Total Revenue</div>
                    <div className="value">{formatCurrency(salesData.summary.totalRevenue)}</div>
                  </div>
                  <div className="summary-card">
                    <div className="label">Total Orders</div>
                    <div className="value">{salesData.summary.totalOrders}</div>
                  </div>
                  <div className="summary-card">
                    <div className="label">Avg Order Value</div>
                    <div className="value">
                      {formatCurrency(salesData.summary.averageOrderValue)}
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="label">Total Items Sold</div>
                    <div className="value">{formatNumber(salesData.summary.totalQuantity)}</div>
                  </div>
                </div>

                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Order Number</th>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Status</th>
                      <th className="num">Items</th>
                      <th className="num">Subtotal</th>
                      <th className="num">Tax</th>
                      <th className="num">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesData.orders.map((order, idx) => (
                      <tr key={idx}>
                        <td className="order-num">{order.orderNumber}</td>
                        <td>
                          {new Date(order.date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td>{order.customer}</td>
                        <td>
                          <span className={`status-badge status-${order.status.toLowerCase()}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="num">{order.items}</td>
                        <td className="num">{formatCurrency(order.subtotal)}</td>
                        <td className="num">{formatCurrency(order.tax)}</td>
                        <td className="num">{formatCurrency(order.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Product Report */}
            {activeTab === 'products' && productData && (
              <div className="report-section">
                <div className="report-header">
                  <h2>Product Performance Report</h2>
                  <div className="report-actions">
                    <button
                      className="btn btn-primary"
                      onClick={() => exportToCSV(productData.products, 'product_report')}
                    >
                      Export CSV
                    </button>
                  </div>
                </div>

                <div className="summary-cards">
                  <div className="summary-card">
                    <div className="label">Total Products Sold</div>
                    <div className="value">{productData.summary.totalProducts}</div>
                  </div>
                  <div className="summary-card">
                    <div className="label">Total Revenue</div>
                    <div className="value">{formatCurrency(productData.summary.totalRevenue)}</div>
                  </div>
                  <div className="summary-card">
                    <div className="label">Total Units Sold</div>
                    <div className="value">
                      {formatNumber(productData.summary.totalQuantitySold)}
                    </div>
                  </div>
                </div>

                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>SKU</th>
                      <th>Product Name</th>
                      <th>Category</th>
                      <th className="num">Quantity Sold</th>
                      <th className="num">Avg Price</th>
                      <th className="num">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productData.products.map((product, idx) => (
                      <tr key={idx}>
                        <td className="rank">{idx + 1}</td>
                        <td className="sku">{product.sku}</td>
                        <td>{product.productName}</td>
                        <td>{product.category}</td>
                        <td className="num">{formatNumber(product.totalQuantity)}</td>
                        <td className="num">{formatCurrency(product.averagePrice)}</td>
                        <td className="num">{formatCurrency(product.totalRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Customer Report */}
            {activeTab === 'customers' && customerData && (
              <div className="report-section">
                <div className="report-header">
                  <h2>Customer Analysis Report</h2>
                  <div className="report-actions">
                    <button
                      className="btn btn-primary"
                      onClick={() => exportToCSV(customerData.customers, 'customer_report')}
                    >
                      Export CSV
                    </button>
                  </div>
                </div>

                <div className="summary-cards">
                  <div className="summary-card">
                    <div className="label">Total Customers</div>
                    <div className="value">{customerData.summary.totalCustomers}</div>
                  </div>
                  <div className="summary-card">
                    <div className="label">Total Revenue</div>
                    <div className="value">{formatCurrency(customerData.summary.totalRevenue)}</div>
                  </div>
                  <div className="summary-card">
                    <div className="label">Total Outstanding</div>
                    <div className="value">
                      {formatCurrency(customerData.summary.totalOutstanding)}
                    </div>
                  </div>
                </div>

                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Customer Name</th>
                      <th>Contact Person</th>
                      <th>City</th>
                      <th className="num">Orders</th>
                      <th className="num">Total Revenue</th>
                      <th className="num">Avg Order Value</th>
                      <th className="num">Outstanding</th>
                      <th>Last Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerData.customers.map((customer, idx) => (
                      <tr key={idx}>
                        <td className="rank">{idx + 1}</td>
                        <td>{customer.customerName}</td>
                        <td>{customer.contactPerson}</td>
                        <td>{customer.city}</td>
                        <td className="num">{customer.totalOrders}</td>
                        <td className="num">{formatCurrency(customer.totalRevenue)}</td>
                        <td className="num">{formatCurrency(customer.averageOrderValue)}</td>
                        <td className="num">{formatCurrency(customer.outstandingAmount)}</td>
                        <td>
                          {customer.lastOrderDate
                            ? new Date(customer.lastOrderDate).toLocaleDateString('en-IN')
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* GST Report */}
            {activeTab === 'gst' && gstData && (
              <div className="report-section">
                <div className="report-header">
                  <h2>GST Report (GSTR-1 Format)</h2>
                  <div className="report-actions">
                    <label className="report-field">
                      <span className="field-caption">Month</span>
                      <select
                        value={gstFilters.month}
                        onChange={(e) => setGSTFilters({ ...gstFilters, month: e.target.value })}
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {new Date(2024, i).toLocaleDateString('en-IN', { month: 'long' })}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="report-field">
                      <span className="field-caption">Year</span>
                      <select
                        value={gstFilters.year}
                        onChange={(e) => setGSTFilters({ ...gstFilters, year: e.target.value })}
                      >
                        {[2024, 2025, 2026].map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button className="btn" onClick={loadReport}>
                      Apply Filters
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => exportToCSV(gstData.gstr1Data, 'gst_report')}
                    >
                      Export CSV
                    </button>
                  </div>
                </div>

                <div className="summary-cards">
                  <div className="summary-card">
                    <div className="label">Total Invoices</div>
                    <div className="value">{gstData.summary.totalInvoices}</div>
                  </div>
                  <div className="summary-card">
                    <div className="label">Taxable Value</div>
                    <div className="value">{formatCurrency(gstData.summary.totalTaxableValue)}</div>
                  </div>
                  <div className="summary-card">
                    <div className="label">Total Tax</div>
                    <div className="value">{formatCurrency(gstData.summary.totalTax)}</div>
                  </div>
                  <div className="summary-card">
                    <div className="label">Invoice Value</div>
                    <div className="value">{formatCurrency(gstData.summary.totalInvoiceValue)}</div>
                  </div>
                </div>

                <div className="gst-breakdown">
                  <h3>GST Breakdown</h3>
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>GST Rate</th>
                        <th className="num">Taxable Value</th>
                        <th className="num">CGST</th>
                        <th className="num">SGST</th>
                        <th className="num">IGST</th>
                        <th className="num">Total Tax</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>18%</td>
                        <td className="num">{formatCurrency(gstData.gstByRate['18%'].taxableValue)}</td>
                        <td className="num">{formatCurrency(gstData.gstByRate['18%'].cgst)}</td>
                        <td className="num">{formatCurrency(gstData.gstByRate['18%'].sgst)}</td>
                        <td className="num">{formatCurrency(gstData.gstByRate['18%'].igst)}</td>
                        <td className="num">{formatCurrency(gstData.gstByRate['18%'].totalTax)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Invoice Number</th>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Place of Supply</th>
                      <th className="num">Taxable Value</th>
                      <th className="num">CGST</th>
                      <th className="num">SGST</th>
                      <th className="num">Invoice Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gstData.gstr1Data.map((invoice, idx) => (
                      <tr key={idx}>
                        <td className="invoice-num">{invoice.invoiceNumber}</td>
                        <td>
                          {new Date(invoice.invoiceDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </td>
                        <td>{invoice.customerName}</td>
                        <td>{invoice.placeOfSupply}</td>
                        <td className="num">{formatCurrency(invoice.taxableValue)}</td>
                        <td className="num">{formatCurrency(invoice.cgst)}</td>
                        <td className="num">{formatCurrency(invoice.sgst)}</td>
                        <td className="num">{formatCurrency(invoice.invoiceValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Payment Report */}
            {activeTab === 'payments' && paymentData && (
              <div className="report-section">
                <div className="report-header">
                  <h2>Payment Collection Report</h2>
                  <div className="report-actions">
                    <button
                      className="btn btn-primary"
                      onClick={() => exportToCSV(paymentData.outstandingByCustomer, 'outstanding_invoices')}
                    >
                      Export CSV
                    </button>
                  </div>
                </div>

                <div className="summary-cards">
                  <div className="summary-card">
                    <div className="label">Total Collected</div>
                    <div className="value">{formatCurrency(paymentData.summary.totalCollected)}</div>
                  </div>
                  <div className="summary-card">
                    <div className="label">Total Payments</div>
                    <div className="value">{paymentData.summary.totalPayments}</div>
                  </div>
                  <div className="summary-card">
                    <div className="label">Total Outstanding</div>
                    <div className="value">
                      {formatCurrency(paymentData.summary.totalOutstanding)}
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="label">Collection Efficiency</div>
                    <div className="value">
                      {paymentData.summary.collectionEfficiency.toFixed(1)}%
                    </div>
                  </div>
                </div>

                <h3>Outstanding Invoices</h3>
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Customer</th>
                      <th>Invoice Date</th>
                      <th>Due Date</th>
                      <th className="num">Total</th>
                      <th className="num">Paid</th>
                      <th className="num">Outstanding</th>
                      <th className="num">Days Overdue</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentData.outstandingByCustomer.map((invoice, idx) => (
                      <tr key={idx}>
                        <td className="invoice-num">{invoice.invoiceNumber}</td>
                        <td>{invoice.customerName}</td>
                        <td>
                          {new Date(invoice.invoiceDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </td>
                        <td>
                          {new Date(invoice.dueDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </td>
                        <td className="num">{formatCurrency(invoice.total)}</td>
                        <td className="num">{formatCurrency(invoice.paid)}</td>
                        <td className="num">{formatCurrency(invoice.outstanding)}</td>
                        <td className={`num ${invoice.daysOverdue > 0 ? 'overdue' : ''}`}>
                          {invoice.daysOverdue}
                        </td>
                        <td>
                          <span className={`status-badge status-${invoice.status.toLowerCase()}`}>
                            {invoice.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Reports;
