/**
 * Analytics Manager
 * Handles data analysis, statistics calculation, and insights generation
 */

class AnalyticsManager {
  constructor() {
    this.salesData = [];
    this.cache = new Map();
    this.cacheExpiry = CONFIG.DATA.CACHE_EXPIRY;
    this.lastUpdate = 0;
    
    log('info', 'Analytics Manager initialized');
  }

  /**
   * Load sales data from storage
   */
  async loadData() {
    try {
      this.salesData = await storage.getSalesData() || [];
      this.lastUpdate = Date.now();
      this.clearExpiredCache();
      
      log('info', 'Analytics data loaded', { count: this.salesData.length });
      return this.salesData;
    } catch (error) {
      log('error', 'Failed to load analytics data', { error: error.message });
      return [];
    }
  }

  /**
   * Add new sale to analytics
   */
  async addSale(sale) {
    try {
      // Validate sale data
      const validationErrors = validateSaleData(sale);
      if (validationErrors.length > 0) {
        log('warn', 'Invalid sale data for analytics', { errors: validationErrors });
        return false;
      }

      // Enrich sale data
      const enrichedSale = this.enrichSaleData(sale);
      
      // Add to local array
      this.salesData.unshift(enrichedSale);
      
      // Persist to storage
      await storage.addSale(enrichedSale);
      
      // Clear relevant cache
      this.invalidateCache();
      
      log('info', 'Sale added to analytics', { sale: enrichedSale });
      return true;
    } catch (error) {
      log('error', 'Failed to add sale to analytics', { error: error.message });
      return false;
    }
  }

  /**
   * Enrich sale data with additional metadata
   */
  enrichSaleData(sale) {
    const timestamp = sale.timestamp || Date.now();
    const date = new Date(timestamp);
    const productInfo = getProductInfo(sale.productName);
    
    return {
      ...sale,
      id: sale.id || generateId('sale'),
      timestamp,
      date: date.toDateString(),
      hour: date.getHours(),
      dayOfWeek: date.getDay(),
      weekOfYear: this.getWeekOfYear(date),
      month: date.getMonth(),
      year: date.getFullYear(),
      price: extractPrice(sale.price) || 0,
      category: productInfo.category,
      emoji: productInfo.emoji,
      color: productInfo.color
    };
  }

  /**
   * Get week of year
   */
  getWeekOfYear(date) {
    const yearStart = new Date(date.getFullYear(), 0, 1);
    const weekStart = new Date(yearStart.getTime() + (7 - yearStart.getDay()) * 24 * 60 * 60 * 1000);
    const daysSinceWeekStart = Math.floor((date.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000));
    return Math.floor(daysSinceWeekStart / 7) + 1;
  }

  /**
   * Get analytics data with caching
   */
  getAnalytics(period = TIME_PERIODS.ALL, useCache = true) {
    const cacheKey = `analytics_${period}`;
    
    // Check cache first
    if (useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }
    }

    // Calculate fresh analytics
    const filteredData = filterByTimePeriod(this.salesData, period);
    const analytics = this.calculateAnalytics(filteredData, period);
    
    // Cache the result
    this.cache.set(cacheKey, {
      data: analytics,
      timestamp: Date.now()
    });

    return analytics;
  }

  /**
   * Calculate comprehensive analytics
   */
  calculateAnalytics(data, period) {
    const analytics = {
      period,
      totalSales: data.length,
      totalRevenue: 0,
      averagePurchase: 0,
      topProducts: [],
      topCategories: [],
      hourlyDistribution: new Array(24).fill(0),
      dailyDistribution: new Array(7).fill(0),
      timeSeriesData: [],
      productStats: {},
      categoryStats: {},
      insights: [],
      comparisonToPrevious: null
    };

    if (data.length === 0) {
      return analytics;
    }

    // Basic calculations
    const prices = data.map(sale => sale.price || 0);
    const stats = calculateStats(prices);
    
    analytics.totalRevenue = stats.sum;
    analytics.averagePurchase = stats.average;
    analytics.minPurchase = stats.min;
    analytics.maxPurchase = stats.max;
    analytics.medianPurchase = stats.median;

    // Product analysis
    const productCounts = {};
    const productRevenue = {};
    
    data.forEach(sale => {
      const product = sale.productName;
      const price = sale.price || 0;
      
      productCounts[product] = (productCounts[product] || 0) + 1;
      productRevenue[product] = (productRevenue[product] || 0) + price;
    });

    // Top products by count
    analytics.topProducts = Object.entries(productCounts)
      .map(([name, count]) => ({
        name,
        count,
        revenue: productRevenue[name] || 0,
        percentage: (count / data.length) * 100,
        emoji: getProductInfo(name).emoji,
        color: getProductInfo(name).color
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Category analysis
    const categoryCounts = {};
    const categoryRevenue = {};
    
    data.forEach(sale => {
      const category = sale.category || 'other';
      const price = sale.price || 0;
      
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      categoryRevenue[category] = (categoryRevenue[category] || 0) + price;
    });

    analytics.topCategories = Object.entries(categoryCounts)
      .map(([name, count]) => ({
        name,
        count,
        revenue: categoryRevenue[name] || 0,
        percentage: (count / data.length) * 100
      }))
      .sort((a, b) => b.count - a.count);

    // Time distribution analysis
    data.forEach(sale => {
      if (sale.hour !== undefined) {
        analytics.hourlyDistribution[sale.hour]++;
      }
      if (sale.dayOfWeek !== undefined) {
        analytics.dailyDistribution[sale.dayOfWeek]++;
      }
    });

    // Time series data
    analytics.timeSeriesData = this.generateTimeSeriesData(data, period);

    // Generate insights
    analytics.insights = this.generateInsights(analytics, data);

    // Comparison to previous period
    analytics.comparisonToPrevious = this.getComparisonToPrevious(period);

    return analytics;
  }

  /**
   * Generate time series data for charts
   */
  generateTimeSeriesData(data, period) {
    let interval, format;
    
    switch (period) {
      case TIME_PERIODS.TODAY:
        interval = 'hour';
        format = (date) => date.getHours() + ':00';
        break;
      case TIME_PERIODS.WEEK:
        interval = 'day';
        format = (date) => date.toLocaleDateString('en-US', { weekday: 'short' });
        break;
      case TIME_PERIODS.MONTH:
        interval = 'day';
        format = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        break;
      default:
        interval = 'week';
        format = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    const groups = groupByTimeInterval(data, interval);
    const timeSeriesData = [];

    Object.entries(groups).forEach(([key, sales]) => {
      const firstSale = sales[0];
      const date = new Date(firstSale.timestamp);
      const revenue = sales.reduce((sum, sale) => sum + (sale.price || 0), 0);
      
      timeSeriesData.push({
        label: format(date),
        date: date.toDateString(),
        timestamp: date.getTime(),
        sales: sales.length,
        revenue: revenue,
        averagePrice: revenue / sales.length || 0
      });
    });

    // Sort by timestamp
    timeSeriesData.sort((a, b) => a.timestamp - b.timestamp);

    return timeSeriesData;
  }

  /**
   * Generate insights from analytics data
   */
  generateInsights(analytics, rawData) {
    const insights = [];

    // Sales volume insights
    if (analytics.totalSales > 0) {
      if (analytics.totalSales === 1) {
        insights.push({
          type: 'info',
          title: 'First Sale!',
          message: 'Your first sale has been recorded. More analytics will be available as data grows.',
          icon: '🎉'
        });
      } else if (analytics.totalSales >= 100) {
        insights.push({
          type: 'success',
          title: 'Sales Milestone',
          message: `Congratulations! You've reached ${analytics.totalSales} sales.`,
          icon: '🏆'
        });
      }
    }

    // Popular product insights
    if (analytics.topProducts.length > 0) {
      const topProduct = analytics.topProducts[0];
      if (topProduct.percentage > 30) {
        insights.push({
          type: 'warning',
          title: 'Product Dominance',
          message: `${topProduct.name} accounts for ${topProduct.percentage.toFixed(1)}% of sales. Consider diversifying your product mix.`,
          icon: '⚠️'
        });
      }
    }

    // Revenue insights
    if (analytics.totalRevenue > 0) {
      if (analytics.averagePurchase > 5) {
        insights.push({
          type: 'success',
          title: 'High Average Purchase',
          message: `Average purchase of ${formatCurrency(analytics.averagePurchase)} indicates good pricing strategy.`,
          icon: '💰'
        });
      }
    }

    // Time pattern insights
    const peakHour = analytics.hourlyDistribution.indexOf(Math.max(...analytics.hourlyDistribution));
    if (peakHour >= 0 && analytics.hourlyDistribution[peakHour] > 0) {
      const hourFormatted = peakHour === 0 ? '12:00 AM' : 
                           peakHour < 12 ? `${peakHour}:00 AM` : 
                           peakHour === 12 ? '12:00 PM' : `${peakHour - 12}:00 PM`;
      
      insights.push({
        type: 'info',
        title: 'Peak Sales Time',
        message: `Most sales occur around ${hourFormatted}. Consider stocking accordingly.`,
        icon: '⏰'
      });
    }

    // Category insights
    if (analytics.topCategories.length > 1) {
      const topCategory = analytics.topCategories[0];
      insights.push({
        type: 'info',
        title: 'Popular Category',
        message: `${topCategory.name} category leads with ${topCategory.percentage.toFixed(1)}% of sales.`,
        icon: '📊'
      });
    }

    return insights.slice(0, 5); // Limit to top 5 insights
  }

  /**
   * Get comparison to previous period
   */
  getComparisonToPrevious(period) {
    try {
      const currentData = filterByTimePeriod(this.salesData, period);
      const previousPeriodData = this.getPreviousPeriodData(period);
      
      if (previousPeriodData.length === 0) {
        return null;
      }

      const currentStats = this.calculateBasicStats(currentData);
      const previousStats = this.calculateBasicStats(previousPeriodData);

      return {
        sales: {
          current: currentStats.count,
          previous: previousStats.count,
          change: calculatePercentageChange(currentStats.count, previousStats.count),
          changeFormatted: formatPercentageChange(calculatePercentageChange(currentStats.count, previousStats.count))
        },
        revenue: {
          current: currentStats.revenue,
          previous: previousStats.revenue,
          change: calculatePercentageChange(currentStats.revenue, previousStats.revenue),
          changeFormatted: formatPercentageChange(calculatePercentageChange(currentStats.revenue, previousStats.revenue))
        },
        averagePurchase: {
          current: currentStats.average,
          previous: previousStats.average,
          change: calculatePercentageChange(currentStats.average, previousStats.average),
          changeFormatted: formatPercentageChange(calculatePercentageChange(currentStats.average, previousStats.average))
        }
      };
    } catch (error) {
      log('error', 'Failed to calculate comparison', { error: error.message });
      return null;
    }
  }

  /**
   * Get data for previous period
   */
  getPreviousPeriodData(period) {
    const now = Date.now();
    let startTime, endTime;

    switch (period) {
      case TIME_PERIODS.TODAY:
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        startTime = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).getTime();
        endTime = startTime + 24 * 60 * 60 * 1000;
        break;
        
      case TIME_PERIODS.WEEK:
        endTime = now - 7 * 24 * 60 * 60 * 1000;
        startTime = endTime - 7 * 24 * 60 * 60 * 1000;
        break;
        
      case TIME_PERIODS.MONTH:
        endTime = now - 30 * 24 * 60 * 60 * 1000;
        startTime = endTime - 30 * 24 * 60 * 60 * 1000;
        break;
        
      default:
        return [];
    }

    return this.salesData.filter(sale => 
      sale.timestamp >= startTime && sale.timestamp < endTime
    );
  }

  /**
   * Calculate basic statistics
   */
  calculateBasicStats(data) {
    const count = data.length;
    const revenue = data.reduce((sum, sale) => sum + (sale.price || 0), 0);
    const average = count > 0 ? revenue / count : 0;

    return { count, revenue, average };
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheExpiry) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalidate all cache
   */
  invalidateCache() {
    this.cache.clear();
    log('debug', 'Analytics cache cleared');
  }

  /**
   * Get real-time statistics
   */
  getRealTimeStats() {
    const now = Date.now();
    const last24Hours = this.salesData.filter(sale => now - sale.timestamp < 24 * 60 * 60 * 1000);
    const lastHour = this.salesData.filter(sale => now - sale.timestamp < 60 * 60 * 1000);
    
    return {
      totalSales: this.salesData.length,
      salesLast24Hours: last24Hours.length,
      salesLastHour: lastHour.length,
      totalRevenue: this.salesData.reduce((sum, sale) => sum + (sale.price || 0), 0),
      revenueLast24Hours: last24Hours.reduce((sum, sale) => sum + (sale.price || 0), 0),
      lastSaleTime: this.salesData.length > 0 ? this.salesData[0].timestamp : null,
      isActive: lastHour.length > 0
    };
  }

  /**
   * Export analytics data
   */
  async exportData(format = 'json') {
    try {
      const analytics = this.getAnalytics(TIME_PERIODS.ALL, false);
      const exportData = {
        ...analytics,
        rawData: this.salesData,
        exportedAt: new Date().toISOString(),
        version: CONFIG.APP_VERSION
      };

      switch (format) {
        case 'csv':
          return this.convertToCSV(this.salesData);
        case 'json':
          return JSON.stringify(exportData, null, 2);
        default:
          return exportData;
      }
    } catch (error) {
      log('error', 'Failed to export analytics data', { error: error.message });
      throw error;
    }
  }

  /**
   * Convert sales data to CSV
   */
  convertToCSV(data) {
    if (!data || data.length === 0) return '';

    const headers = ['Date', 'Time', 'Product Name', 'Price', 'Category'];
    const rows = data.map(sale => [
      formatDate(sale.timestamp, { year: 'numeric', month: '2-digit', day: '2-digit' }),
      formatTime(sale.timestamp),
      sale.productName || '',
      sale.price || 0,
      sale.category || ''
    ]);

    return [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
  }

  /**
   * Get memory usage info
   */
  getMemoryUsage() {
    return {
      salesDataCount: this.salesData.length,
      cacheSize: this.cache.size,
      lastUpdate: this.lastUpdate,
      memoryEstimate: JSON.stringify(this.salesData).length + 
                     JSON.stringify([...this.cache.entries()]).length
    };
  }
}

// Create global analytics manager instance
const analytics = new AnalyticsManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    AnalyticsManager,
    analytics
  };
}