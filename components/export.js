/**
 * Export Manager
 * Handles data export in various formats (CSV, JSON, PDF)
 */

class ExportManager {
  constructor() {
    this.supportedFormats = [EXPORT_FORMATS.CSV, EXPORT_FORMATS.JSON, EXPORT_FORMATS.PDF];
    this.isExporting = false;
    
    log('info', 'Export Manager initialized');
  }

  /**
   * Export data in specified format
   */
  async exportData(format, options = {}) {
    if (this.isExporting) {
      notifications.showWarning('Export already in progress');
      return false;
    }

    if (!this.supportedFormats.includes(format)) {
      notifications.showError(`Unsupported export format: ${format}`);
      return false;
    }

    this.isExporting = true;

    try {
      log('info', 'Starting data export', { format, options });

      // Show loading state
      const loadingToast = notifications.showToast('Preparing export...', NOTIFICATION_TYPES.INFO, {
        persistent: true
      });

      // Get data based on options
      const data = await this.prepareExportData(options);
      
      // Generate filename
      const filename = this.generateFilename(format, options);

      // Export based on format
      let result;
      switch (format) {
        case EXPORT_FORMATS.CSV:
          result = await this.exportCSV(data, filename, options);
          break;
        case EXPORT_FORMATS.JSON:
          result = await this.exportJSON(data, filename, options);
          break;
        case EXPORT_FORMATS.PDF:
          result = await this.exportPDF(data, filename, options);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      // Dismiss loading toast
      notifications.dismissToast(loadingToast);

      if (result) {
        notifications.showSuccess(`Data exported successfully as ${format.toUpperCase()}`);
        log('info', 'Export completed successfully', { format, filename });
      }

      return result;

    } catch (error) {
      notifications.showError(`Export failed: ${error.message}`);
      log('error', 'Export failed', { format, error: error.message });
      return false;
    } finally {
      this.isExporting = false;
    }
  }

  /**
   * Prepare data for export based on options
   */
  async prepareExportData(options = {}) {
    const { 
      startDate, 
      endDate, 
      includeAnalytics = true, 
      includeInventory = false,
      includeSettings = false 
    } = options;

    let salesData = await analytics.getSalesData();

    // Filter by date range if specified
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate).getTime() : 0;
      const end = endDate ? new Date(endDate).getTime() : Date.now();
      
      salesData = salesData.filter(sale => {
        const saleTime = sale.timestamp;
        return saleTime >= start && saleTime <= end;
      });
    }

    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        version: CONFIG.APP_VERSION,
        recordCount: salesData.length,
        dateRange: {
          start: startDate || null,
          end: endDate || null
        }
      },
      sales: salesData
    };

    // Include analytics if requested
    if (includeAnalytics) {
      const period = this.getTimePeriodFromDates(startDate, endDate);
      exportData.analytics = analytics.getAnalytics(period);
    }

    // Include inventory if requested
    if (includeInventory) {
      exportData.inventory = storage.getItem(STORAGE_KEYS.INVENTORY_DATA, []);
    }

    // Include settings if requested (sanitized)
    if (includeSettings) {
      const settings = storage.getItem(STORAGE_KEYS.SETTINGS, {});
      // Remove sensitive data
      const { websocketUrl, ...sanitizedSettings } = settings;
      exportData.settings = sanitizedSettings;
    }

    return exportData;
  }

  /**
   * Export as CSV format
   */
  async exportCSV(data, filename, options = {}) {
    try {
      let csvContent = '';

      // Export sales data as main CSV
      if (data.sales && data.sales.length > 0) {
        const headers = [
          'Date',
          'Time', 
          'Product Name',
          'Price',
          'Category',
          'Hour',
          'Day of Week'
        ];

        const rows = data.sales.map(sale => [
          formatDate(sale.timestamp, { year: 'numeric', month: '2-digit', day: '2-digit' }),
          formatTime(sale.timestamp),
          this.escapeCsvField(sale.productName || ''),
          sale.price || 0,
          sale.category || '',
          sale.hour !== undefined ? sale.hour : '',
          sale.dayOfWeek !== undefined ? this.getDayName(sale.dayOfWeek) : ''
        ]);

        csvContent = this.arrayToCSV([headers, ...rows]);
      } else {
        csvContent = 'No sales data available for the selected period.';
      }

      // Create and download file
      this.downloadFile(csvContent, filename, 'text/csv');
      
      return true;
    } catch (error) {
      log('error', 'CSV export failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Export as JSON format
   */
  async exportJSON(data, filename, options = {}) {
    try {
      const jsonContent = JSON.stringify(data, null, 2);
      
      // Create and download file
      this.downloadFile(jsonContent, filename, 'application/json');
      
      return true;
    } catch (error) {
      log('error', 'JSON export failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Export as PDF format
   */
  async exportPDF(data, filename, options = {}) {
    try {
      // For PDF export, we'll create an HTML report and use the browser's print functionality
      // In a real implementation, you might want to use libraries like jsPDF or Puppeteer
      
      const reportHtml = this.generatePDFReport(data, options);
      
      // Create a new window/tab for the report
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      
      if (!printWindow) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      printWindow.document.write(reportHtml);
      printWindow.document.close();
      
      // Wait a moment for content to load, then trigger print
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        
        // Close the window after printing (user can cancel this)
        printWindow.addEventListener('afterprint', () => {
          printWindow.close();
        });
      }, 1000);

      return true;
    } catch (error) {
      log('error', 'PDF export failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate HTML report for PDF export
   */
  generatePDFReport(data, options = {}) {
    const { sales, analytics, metadata } = data;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Vending Stream Analytics Report</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 20px;
          color: #333;
          background: white;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #00d4ff;
          padding-bottom: 20px;
        }
        .header h1 {
          color: #00d4ff;
          margin: 0 0 10px 0;
        }
        .header .subtitle {
          color: #666;
          font-size: 14px;
        }
        .section {
          margin-bottom: 30px;
        }
        .section h2 {
          color: #333;
          border-left: 4px solid #00d4ff;
          padding-left: 10px;
          margin-bottom: 15px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }
        .stat-card {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          border-left: 4px solid #00d4ff;
        }
        .stat-title {
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
          margin-bottom: 5px;
        }
        .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: #333;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        th, td {
          padding: 8px 12px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        th {
          background: #f8f9fa;
          font-weight: 600;
          color: #333;
        }
        tr:hover {
          background: #f5f5f5;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          text-align: center;
          color: #666;
          font-size: 12px;
        }
        @media print {
          body { margin: 0; padding: 15px; }
          .section { page-break-inside: avoid; }
          .header { page-break-after: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎯 Vending Stream Analytics Report</h1>
        <div class="subtitle">
          Generated on ${formatDate(metadata.exportDate)} | 
          Records: ${metadata.recordCount} | 
          Version: ${metadata.version}
        </div>
      </div>

      ${analytics ? this.generateAnalyticsSection(analytics) : ''}
      
      <div class="section">
        <h2>📋 Sales Data</h2>
        ${this.generateSalesTable(sales)}
      </div>

      <div class="footer">
        <p>This report was generated by Vending Stream Analytics v${CONFIG.APP_VERSION}</p>
        <p>Export Date: ${formatDate(metadata.exportDate)}</p>
      </div>
    </body>
    </html>
    `;
  }

  /**
   * Generate analytics section for PDF
   */
  generateAnalyticsSection(analytics) {
    return `
      <div class="section">
        <h2>📊 Analytics Summary</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-title">Total Sales</div>
            <div class="stat-value">${analytics.totalSales}</div>
          </div>
          <div class="stat-card">
            <div class="stat-title">Total Revenue</div>
            <div class="stat-value">${formatCurrency(analytics.totalRevenue)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-title">Average Purchase</div>
            <div class="stat-value">${formatCurrency(analytics.averagePurchase)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-title">Top Product</div>
            <div class="stat-value">${analytics.topProducts[0]?.name || 'N/A'}</div>
          </div>
        </div>
        
        ${analytics.topProducts.length > 0 ? `
          <h3>Top Products</h3>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Sales Count</th>
                <th>Revenue</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              ${analytics.topProducts.slice(0, 10).map(product => `
                <tr>
                  <td>${product.emoji} ${product.name}</td>
                  <td>${product.count}</td>
                  <td>${formatCurrency(product.revenue)}</td>
                  <td>${product.percentage.toFixed(1)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}
      </div>
    `;
  }

  /**
   * Generate sales table for PDF
   */
  generateSalesTable(sales) {
    if (!sales || sales.length === 0) {
      return '<p>No sales data available for the selected period.</p>';
    }

    const maxRows = 50; // Limit for PDF readability
    const displaySales = sales.slice(0, maxRows);
    
    return `
      <table>
        <thead>
          <tr>
            <th>Date & Time</th>
            <th>Product</th>
            <th>Price</th>
            <th>Category</th>
          </tr>
        </thead>
        <tbody>
          ${displaySales.map(sale => `
            <tr>
              <td>${formatDate(sale.timestamp)}</td>
              <td>${sale.emoji || ''} ${sale.productName || 'Unknown'}</td>
              <td>${formatCurrency(sale.price || 0)}</td>
              <td>${sale.category || 'Other'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${sales.length > maxRows ? `<p><em>Showing first ${maxRows} of ${sales.length} records</em></p>` : ''}
    `;
  }

  /**
   * Convert array to CSV string
   */
  arrayToCSV(data) {
    return data.map(row => 
      row.map(field => this.escapeCsvField(field)).join(',')
    ).join('\n');
  }

  /**
   * Escape CSV field
   */
  escapeCsvField(field) {
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * Generate filename for export
   */
  generateFilename(format, options = {}) {
    const timestamp = new Date().toISOString().split('T')[0];
    const { startDate, endDate } = options;
    
    let dateRange = '';
    if (startDate && endDate) {
      const start = new Date(startDate).toISOString().split('T')[0];
      const end = new Date(endDate).toISOString().split('T')[0];
      dateRange = `_${start}_to_${end}`;
    } else if (startDate) {
      const start = new Date(startDate).toISOString().split('T')[0];
      dateRange = `_from_${start}`;
    } else if (endDate) {
      const end = new Date(endDate).toISOString().split('T')[0];
      dateRange = `_until_${end}`;
    }

    return `vending-stream-export${dateRange}_${timestamp}.${format}`;
  }

  /**
   * Download file helper
   */
  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    log('info', 'File downloaded', { filename, mimeType, size: blob.size });
  }

  /**
   * Get time period from dates
   */
  getTimePeriodFromDates(startDate, endDate) {
    if (!startDate && !endDate) return TIME_PERIODS.ALL;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (startDate) {
      const start = new Date(startDate);
      const daysDiff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 1) return TIME_PERIODS.TODAY;
      if (daysDiff <= 7) return TIME_PERIODS.WEEK;
      if (daysDiff <= 30) return TIME_PERIODS.MONTH;
    }
    
    return TIME_PERIODS.ALL;
  }

  /**
   * Get day name from day index
   */
  getDayName(dayIndex) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayIndex] || '';
  }

  /**
   * Check if export is in progress
   */
  isExportInProgress() {
    return this.isExporting;
  }

  /**
   * Get supported export formats
   */
  getSupportedFormats() {
    return [...this.supportedFormats];
  }

  /**
   * Import data from file
   */
  async importData(file) {
    if (!file) {
      notifications.showError('No file selected');
      return false;
    }

    try {
      const content = await this.readFile(file);
      let importedData;

      // Parse based on file type
      if (file.name.endsWith('.json')) {
        importedData = JSON.parse(content);
      } else if (file.name.endsWith('.csv')) {
        importedData = this.parseCSV(content);
      } else {
        throw new Error('Unsupported file format. Please use JSON or CSV files.');
      }

      // Validate and import
      const success = await storage.importData(importedData);
      
      if (success) {
        notifications.showSuccess('Data imported successfully');
        // Refresh analytics
        await analytics.loadData();
        return true;
      } else {
        throw new Error('Failed to import data');
      }

    } catch (error) {
      notifications.showError(`Import failed: ${error.message}`);
      log('error', 'Import failed', { error: error.message });
      return false;
    }
  }

  /**
   * Read file content
   */
  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Parse CSV content
   */
  parseCSV(content) {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) throw new Error('Invalid CSV format');

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const sales = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length >= 3) {
        const sale = {
          timestamp: new Date(values[0] + ' ' + values[1]).getTime(),
          productName: values[2],
          price: parseFloat(values[3]) || 0,
          category: values[4] || 'other'
        };
        sales.push(sale);
      }
    }

    return { sales };
  }
}

// Create global export manager instance
const exportManager = new ExportManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ExportManager,
    exportManager
  };
}