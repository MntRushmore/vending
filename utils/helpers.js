/**
 * Helper Utilities
 * Common utility functions used throughout the application
 */

/**
 * Debounce function to limit function calls
 */
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * Throttle function to limit function calls
 */
function throttle(func, delay) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      return func.apply(this, args);
    }
  };
}

/**
 * Format currency with proper locale
 */
function formatCurrency(amount, currency = 'USD', locale = 'en-US') {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (e) {
    return `$${parseFloat(amount).toFixed(2)}`;
  }
}

/**
 * Format date with various options
 */
function formatDate(date, options = {}) {
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };

  const formatOptions = { ...defaultOptions, ...options };

  try {
    return new Intl.DateTimeFormat('en-US', formatOptions).format(dateObj);
  } catch (e) {
    return dateObj.toLocaleString();
  }
}

/**
 * Format time only
 */
function formatTime(timestamp) {
  const date = new Date(timestamp);
  
  if (isNaN(date.getTime())) {
    return '--:--';
  }

  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
}

/**
 * Format relative time (e.g., "2 minutes ago")
 */
function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (diff < minute) {
    return 'Just now';
  } else if (diff < hour) {
    const minutes = Math.floor(diff / minute);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diff < day) {
    const hours = Math.floor(diff / hour);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diff < week) {
    const days = Math.floor(diff / day);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return formatDate(timestamp, { month: 'short', day: 'numeric' });
  }
}

/**
 * Get product emoji and metadata
 */
function getProductInfo(productName) {
  if (!productName || typeof productName !== 'string') {
    return PRODUCT_MAPPING.default;
  }

  const product = productName.toLowerCase().trim();
  
  // Check for exact matches first
  if (PRODUCT_MAPPING[product]) {
    return PRODUCT_MAPPING[product];
  }

  // Check for partial matches
  for (const [key, value] of Object.entries(PRODUCT_MAPPING)) {
    if (key !== 'default' && product.includes(key)) {
      return value;
    }
  }

  return PRODUCT_MAPPING.default;
}

/**
 * Extract price from string
 */
function extractPrice(text) {
  if (typeof text === 'number') {
    return parseFloat(text.toFixed(2));
  }

  if (typeof text !== 'string') {
    return 0;
  }

  const match = text.match(REGEX.PRICE);
  return match ? parseFloat(match[1]) : 0;
}

/**
 * Generate unique ID
 */
function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sanitize HTML to prevent XSS
 */
function sanitizeHtml(str) {
  if (typeof str !== 'string') return str;
  
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Deep clone object
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  
  const cloned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

/**
 * Check if object is empty
 */
function isEmpty(obj) {
  if (obj == null) return true;
  if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
}

/**
 * Merge objects deeply
 */
function deepMerge(target, source) {
  const result = deepClone(target);
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (typeof source[key] === 'object' && !Array.isArray(source[key]) && source[key] !== null) {
        result[key] = deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }
  
  return result;
}

/**
 * Calculate percentage change
 */
function calculatePercentageChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Format percentage change for display
 */
function formatPercentageChange(change) {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

/**
 * Get time period boundaries
 */
function getTimePeriod(period) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (period) {
    case TIME_PERIODS.TODAY:
      return {
        start: today.getTime(),
        end: now.getTime(),
        label: 'Today'
      };
    
    case TIME_PERIODS.WEEK:
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - 7);
      return {
        start: weekStart.getTime(),
        end: now.getTime(),
        label: 'This Week'
      };
    
    case TIME_PERIODS.MONTH:
      const monthStart = new Date(today);
      monthStart.setMonth(today.getMonth() - 1);
      return {
        start: monthStart.getTime(),
        end: now.getTime(),
        label: 'This Month'
      };
    
    case TIME_PERIODS.ALL:
    default:
      return {
        start: 0,
        end: now.getTime(),
        label: 'All Time'
      };
  }
}

/**
 * Filter data by time period
 */
function filterByTimePeriod(data, period, timestampKey = 'timestamp') {
  const { start, end } = getTimePeriod(period);
  
  return data.filter(item => {
    const timestamp = item[timestampKey];
    return timestamp >= start && timestamp <= end;
  });
}

/**
 * Group data by time interval
 */
function groupByTimeInterval(data, interval = 'hour', timestampKey = 'timestamp') {
  const groups = {};
  
  data.forEach(item => {
    const date = new Date(item[timestampKey]);
    let key;
    
    switch (interval) {
      case 'hour':
        key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
        break;
      case 'day':
        key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
        break;
      case 'month':
        key = `${date.getFullYear()}-${date.getMonth()}`;
        break;
      default:
        key = date.toDateString();
    }
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
  });
  
  return groups;
}

/**
 * Calculate statistics from array of numbers
 */
function calculateStats(numbers) {
  if (!Array.isArray(numbers) || numbers.length === 0) {
    return {
      count: 0,
      sum: 0,
      average: 0,
      min: 0,
      max: 0,
      median: 0
    };
  }

  const sorted = [...numbers].sort((a, b) => a - b);
  const sum = numbers.reduce((acc, val) => acc + val, 0);
  const count = numbers.length;
  
  return {
    count,
    sum,
    average: sum / count,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median: count % 2 === 0 
      ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2 
      : sorted[Math.floor(count / 2)]
  };
}

/**
 * Validate sale data
 */
function validateSaleData(sale) {
  const errors = [];

  if (!sale || typeof sale !== 'object') {
    errors.push('Sale must be an object');
    return errors;
  }

  if (!sale.productName || typeof sale.productName !== 'string') {
    errors.push('Product name is required and must be a string');
  } else if (!REGEX.PRODUCT_NAME.test(sale.productName)) {
    errors.push('Product name contains invalid characters');
  }

  if (sale.price !== undefined) {
    const price = extractPrice(sale.price);
    if (isNaN(price) || price < 0) {
      errors.push('Price must be a valid positive number');
    }
  }

  if (sale.timestamp !== undefined) {
    const timestamp = new Date(sale.timestamp);
    if (isNaN(timestamp.getTime())) {
      errors.push('Timestamp must be a valid date');
    }
  }

  return errors;
}

/**
 * Generate color palette
 */
function generateColorPalette(count, saturation = 70, lightness = 60) {
  const colors = [];
  const hueStep = 360 / count;
  
  for (let i = 0; i < count; i++) {
    const hue = i * hueStep;
    colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
  }
  
  return colors;
}

/**
 * Convert HSL to Hex
 */
function hslToHex(h, s, l) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Download data as file
 */
function downloadFile(data, filename, type = 'application/json') {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const result = document.execCommand('copy');
      document.body.removeChild(textArea);
      return result;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Check if device is mobile
 */
function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         (window.innerWidth <= 768 && window.innerHeight <= 1024);
}

/**
 * Get browser info
 */
function getBrowserInfo() {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  let version = 'Unknown';

  if (ua.includes('Firefox')) {
    browser = 'Firefox';
    version = ua.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
  } else if (ua.includes('Chrome')) {
    browser = 'Chrome';
    version = ua.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
  } else if (ua.includes('Safari')) {
    browser = 'Safari';
    version = ua.match(/Safari\/(\d+)/)?.[1] || 'Unknown';
  } else if (ua.includes('Edge')) {
    browser = 'Edge';
    version = ua.match(/Edge\/(\d+)/)?.[1] || 'Unknown';
  }

  return { browser, version, userAgent: ua };
}

/**
 * Log with context (for debugging)
 */
function log(level, message, context = {}) {
  if (!DEV_CONFIG.ENABLE_LOGGING && level === 'debug') return;

  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    level: level.toUpperCase(),
    message,
    context
  };

  switch (level) {
    case 'error':
      console.error(`[${timestamp}] ERROR:`, message, context);
      break;
    case 'warn':
      console.warn(`[${timestamp}] WARN:`, message, context);
      break;
    case 'info':
      console.info(`[${timestamp}] INFO:`, message, context);
      break;
    case 'debug':
      console.debug(`[${timestamp}] DEBUG:`, message, context);
      break;
    default:
      console.log(`[${timestamp}] LOG:`, message, context);
  }

  // Store critical logs in session storage for debugging
  if (level === 'error' || level === 'warn') {
    try {
      const logs = JSON.parse(sessionStorage.getItem('app_logs') || '[]');
      logs.push(logData);
      
      // Keep only last 50 logs
      if (logs.length > 50) {
        logs.splice(0, logs.length - 50);
      }
      
      sessionStorage.setItem('app_logs', JSON.stringify(logs));
    } catch (e) {
      // Silently fail if sessionStorage is not available
    }
  }
}

/**
 * Performance monitor
 */
function measurePerformance(label, fn) {
  if (!DEV_CONFIG.PERFORMANCE_MONITORING) return fn();

  const start = performance.now();
  const result = fn();
  const end = performance.now();
  
  log('debug', `Performance: ${label}`, { duration: end - start });
  
  return result;
}

// Export all helper functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    debounce,
    throttle,
    formatCurrency,
    formatDate,
    formatTime,
    formatRelativeTime,
    getProductInfo,
    extractPrice,
    generateId,
    sanitizeHtml,
    deepClone,
    isEmpty,
    deepMerge,
    calculatePercentageChange,
    formatPercentageChange,
    getTimePeriod,
    filterByTimePeriod,
    groupByTimeInterval,
    calculateStats,
    validateSaleData,
    generateColorPalette,
    hslToHex,
    downloadFile,
    copyToClipboard,
    isMobile,
    getBrowserInfo,
    log,
    measurePerformance
  };
}