/**
 * Charts Manager
 * Handles Chart.js visualization and real-time updates
 */

class ChartsManager {
  constructor() {
    this.charts = new Map();
    this.defaultColors = CONFIG.CHARTS.COLORS.GRADIENT;
    this.updateInterval = null;
    this.isInitialized = false;
    
    log('info', 'Charts Manager initialized');
  }

  /**
   * Initialize all charts
   */
  async init() {
    if (this.isInitialized) return;

    try {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve);
        });
      }

      // Initialize individual charts
      await this.initSalesChart();
      await this.initProductsChart();
      
      // Start auto-refresh
      this.startAutoRefresh();
      
      this.isInitialized = true;
      log('info', 'All charts initialized successfully');
      
    } catch (error) {
      log('error', 'Failed to initialize charts', { error: error.message });
    }
  }

  /**
   * Initialize sales over time chart (line chart)
   */
  async initSalesChart() {
    const canvas = document.getElementById('sales-chart');
    if (!canvas) {
      log('warn', 'Sales chart canvas not found');
      return;
    }

    const ctx = canvas.getContext('2d');
    
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Sales Count',
          data: [],
          borderColor: CONFIG.CHARTS.COLORS.PRIMARY,
          backgroundColor: this.hexToRgba(CONFIG.CHARTS.COLORS.PRIMARY, 0.1),
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: CONFIG.CHARTS.COLORS.PRIMARY,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 8
        }, {
          label: 'Revenue ($)',
          data: [],
          borderColor: CONFIG.CHARTS.COLORS.SECONDARY,
          backgroundColor: this.hexToRgba(CONFIG.CHARTS.COLORS.SECONDARY, 0.1),
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: CONFIG.CHARTS.COLORS.SECONDARY,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 8,
          yAxisID: 'y1'
        }]
      },
      options: {
        ...CONFIG.CHARTS.DEFAULT_OPTIONS,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          ...CONFIG.CHARTS.DEFAULT_OPTIONS.plugins,
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: CONFIG.CHARTS.COLORS.PRIMARY,
            borderWidth: 1,
            cornerRadius: 8,
            callbacks: {
              label: function(context) {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                
                if (label.includes('Revenue')) {
                  return `${label}: ${formatCurrency(value)}`;
                } else {
                  return `${label}: ${value}`;
                }
              }
            }
          },
          legend: {
            labels: {
              color: '#ffffff',
              font: {
                family: 'JetBrains Mono'
              },
              usePointStyle: true,
              padding: 20
            }
          }
        },
        scales: {
          x: {
            ...CONFIG.CHARTS.DEFAULT_OPTIONS.scales.x,
            title: {
              display: true,
              text: 'Time Period',
              color: '#b3b3b3'
            }
          },
          y: {
            ...CONFIG.CHARTS.DEFAULT_OPTIONS.scales.y,
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Sales Count',
              color: '#b3b3b3'
            }
          },
          y1: {
            ...CONFIG.CHARTS.DEFAULT_OPTIONS.scales.y,
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Revenue ($)',
              color: '#b3b3b3'
            },
            grid: {
              drawOnChartArea: false,
            },
          }
        },
        animations: {
          tension: {
            duration: 1000,
            easing: 'easeInOutCubic',
            from: 1,
            to: 0.4,
            loop: false
          }
        }
      }
    });

    this.charts.set('sales', chart);
    log('info', 'Sales chart initialized');
  }

  /**
   * Initialize products chart (doughnut chart)
   */
  async initProductsChart() {
    const canvas = document.getElementById('products-chart');
    if (!canvas) {
      log('warn', 'Products chart canvas not found');
      return;
    }

    const ctx = canvas.getContext('2d');
    
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [],
          borderColor: [],
          borderWidth: 2,
          hoverBorderWidth: 4,
          hoverOffset: 10
        }]
      },
      options: {
        ...CONFIG.CHARTS.DEFAULT_OPTIONS,
        cutout: '60%',
        plugins: {
          ...CONFIG.CHARTS.DEFAULT_OPTIONS.plugins,
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: CONFIG.CHARTS.COLORS.PRIMARY,
            borderWidth: 1,
            cornerRadius: 8,
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed;
                const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          },
          legend: {
            position: 'bottom',
            labels: {
              color: '#ffffff',
              font: {
                family: 'JetBrains Mono'
              },
              usePointStyle: true,
              padding: 15,
              generateLabels: function(chart) {
                const data = chart.data;
                if (data.labels.length && data.datasets.length) {
                  return data.labels.map((label, index) => {
                    const dataset = data.datasets[0];
                    const value = dataset.data[index];
                    const total = dataset.data.reduce((sum, val) => sum + val, 0);
                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                    
                    return {
                      text: `${label} (${percentage}%)`,
                      fillStyle: dataset.backgroundColor[index],
                      strokeStyle: dataset.borderColor[index],
                      pointStyle: 'circle',
                      hidden: isNaN(value) || value === 0
                    };
                  });
                }
                return [];
              }
            }
          }
        },
        animations: {
          animateRotate: true,
          animateScale: true,
          rotation: {
            duration: 2000,
            easing: 'easeInOutElastic'
          }
        }
      }
    });

    this.charts.set('products', chart);
    log('info', 'Products chart initialized');
  }

  /**
   * Update all charts with new data
   */
  async updateCharts(period = TIME_PERIODS.ALL) {
    try {
      const analyticsData = analytics.getAnalytics(period);
      
      await this.updateSalesChart(analyticsData);
      await this.updateProductsChart(analyticsData);
      
      log('debug', 'Charts updated', { period });
      
    } catch (error) {
      log('error', 'Failed to update charts', { error: error.message });
    }
  }

  /**
   * Update sales chart data
   */
  async updateSalesChart(analyticsData) {
    const chart = this.charts.get('sales');
    if (!chart) return;

    const timeSeriesData = analyticsData.timeSeriesData || [];
    
    // Extract labels and data
    const labels = timeSeriesData.map(item => item.label);
    const salesData = timeSeriesData.map(item => item.sales);
    const revenueData = timeSeriesData.map(item => item.revenue);

    // Update chart data with animation
    this.animateDataUpdate(chart, {
      labels,
      datasets: [{
        ...chart.data.datasets[0],
        data: salesData
      }, {
        ...chart.data.datasets[1],
        data: revenueData
      }]
    });
  }

  /**
   * Update products chart data
   */
  async updateProductsChart(analyticsData) {
    const chart = this.charts.get('products');
    if (!chart) return;

    const topProducts = analyticsData.topProducts || [];
    const maxProducts = 8; // Show top 8 products
    
    if (topProducts.length === 0) {
      // Show "No data" state
      this.animateDataUpdate(chart, {
        labels: ['No sales data'],
        datasets: [{
          data: [1],
          backgroundColor: ['#666666'],
          borderColor: ['#888888']
        }]
      });
      return;
    }

    // Prepare data
    let products = topProducts.slice(0, maxProducts);
    
    // If there are more products, group them as "Others"
    if (topProducts.length > maxProducts) {
      const others = topProducts.slice(maxProducts);
      const othersCount = others.reduce((sum, product) => sum + product.count, 0);
      
      products.push({
        name: 'Others',
        count: othersCount,
        emoji: '📦',
        color: '#666666'
      });
    }

    const labels = products.map(product => `${product.emoji} ${product.name}`);
    const data = products.map(product => product.count);
    const backgroundColors = products.map(product => product.color || this.getRandomColor());
    const borderColors = backgroundColors.map(color => this.adjustBrightness(color, 20));

    // Update chart data with animation
    this.animateDataUpdate(chart, {
      labels,
      datasets: [{
        ...chart.data.datasets[0],
        data,
        backgroundColor: backgroundColors,
        borderColor: borderColors
      }]
    });
  }

  /**
   * Animate data update for chart
   */
  animateDataUpdate(chart, newData) {
    // Update data
    chart.data = newData;
    
    // Trigger update with animation
    chart.update('active');
  }

  /**
   * Update chart period (hourly, daily, weekly)
   */
  async updateChartPeriod(chartType, period) {
    try {
      const analyticsData = analytics.getAnalytics(period);
      
      switch (chartType) {
        case 'sales':
          await this.updateSalesChart(analyticsData);
          break;
        case 'products':
          await this.updateProductsChart(analyticsData);
          break;
        default:
          await this.updateCharts(period);
      }
      
      log('debug', 'Chart period updated', { chartType, period });
      
    } catch (error) {
      log('error', 'Failed to update chart period', { error: error.message });
    }
  }

  /**
   * Start auto-refresh of charts
   */
  startAutoRefresh() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(async () => {
      const settings = storage.getItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
      if (settings.autoRefresh) {
        await this.updateCharts();
      }
    }, CONFIG.UI.CHART_UPDATE_INTERVAL);

    log('info', 'Chart auto-refresh started', { interval: CONFIG.UI.CHART_UPDATE_INTERVAL });
  }

  /**
   * Stop auto-refresh of charts
   */
  stopAutoRefresh() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      log('info', 'Chart auto-refresh stopped');
    }
  }

  /**
   * Resize all charts (useful for responsive design)
   */
  resizeCharts() {
    this.charts.forEach((chart, name) => {
      try {
        chart.resize();
        log('debug', 'Chart resized', { name });
      } catch (error) {
        log('error', 'Failed to resize chart', { name, error: error.message });
      }
    });
  }

  /**
   * Destroy all charts
   */
  destroy() {
    this.stopAutoRefresh();
    
    this.charts.forEach((chart, name) => {
      try {
        chart.destroy();
        log('debug', 'Chart destroyed', { name });
      } catch (error) {
        log('error', 'Failed to destroy chart', { name, error: error.message });
      }
    });
    
    this.charts.clear();
    this.isInitialized = false;
    log('info', 'Charts manager destroyed');
  }

  /**
   * Export chart as image
   */
  exportChart(chartName, format = 'png') {
    const chart = this.charts.get(chartName);
    if (!chart) {
      log('error', 'Chart not found for export', { chartName });
      return null;
    }

    try {
      const canvas = chart.canvas;
      const dataURL = canvas.toDataURL(`image/${format}`);
      
      // Create download link
      const link = document.createElement('a');
      link.download = `${chartName}-chart-${new Date().toISOString().split('T')[0]}.${format}`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      log('info', 'Chart exported', { chartName, format });
      return dataURL;
      
    } catch (error) {
      log('error', 'Failed to export chart', { chartName, error: error.message });
      return null;
    }
  }

  /**
   * Get chart data for external use
   */
  getChartData(chartName) {
    const chart = this.charts.get(chartName);
    if (!chart) return null;

    return {
      labels: chart.data.labels,
      datasets: chart.data.datasets.map(dataset => ({
        label: dataset.label,
        data: dataset.data,
        backgroundColor: dataset.backgroundColor,
        borderColor: dataset.borderColor
      }))
    };
  }

  /**
   * Update chart theme (for dark/light mode)
   */
  updateTheme(isDark = true) {
    const textColor = isDark ? '#ffffff' : '#000000';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

    this.charts.forEach(chart => {
      // Update scales colors
      if (chart.options.scales) {
        Object.keys(chart.options.scales).forEach(scaleId => {
          const scale = chart.options.scales[scaleId];
          if (scale.ticks) scale.ticks.color = textColor;
          if (scale.grid) scale.grid.color = gridColor;
          if (scale.title) scale.title.color = textColor;
        });
      }

      // Update legend colors
      if (chart.options.plugins?.legend?.labels) {
        chart.options.plugins.legend.labels.color = textColor;
      }

      chart.update();
    });

    log('info', 'Chart theme updated', { isDark });
  }

  // Utility Methods

  /**
   * Convert hex to rgba
   */
  hexToRgba(hex, alpha = 1) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Adjust color brightness
   */
  adjustBrightness(color, amount) {
    const usePound = color[0] === '#';
    const col = usePound ? color.slice(1) : color;
    
    const num = parseInt(col, 16);
    let r = (num >> 16) + amount;
    let g = (num >> 8 & 0x00FF) + amount;
    let b = (num & 0x0000FF) + amount;
    
    r = r > 255 ? 255 : r < 0 ? 0 : r;
    g = g > 255 ? 255 : g < 0 ? 0 : g;
    b = b > 255 ? 255 : b < 0 ? 0 : b;
    
    return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16);
  }

  /**
   * Get random color from palette
   */
  getRandomColor() {
    return this.defaultColors[Math.floor(Math.random() * this.defaultColors.length)];
  }

  /**
   * Generate color palette for chart
   */
  generatePalette(count) {
    return generateColorPalette(count, 70, 60);
  }

  /**
   * Get chart status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      chartCount: this.charts.size,
      autoRefresh: !!this.updateInterval,
      charts: [...this.charts.keys()]
    };
  }
}

// Create global charts manager instance
const chartManager = new ChartsManager();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  chartManager.init();
});

// Handle window resize
window.addEventListener('resize', debounce(() => {
  chartManager.resizeCharts();
}, 250));

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ChartsManager,
    chartManager
  };
}