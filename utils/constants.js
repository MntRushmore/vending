/**
 * Application Constants
 * Global configuration and constant values
 */

// Application Configuration
const CONFIG = {
  APP_NAME: 'Vending Stream Analytics',
  APP_VERSION: '2.0.0',
  
  // WebSocket Configuration
  WEBSOCKET: {
    DEFAULT_URL: 'wss://pb69dl7oeb.execute-api.us-west-1.amazonaws.com/production',
    RECONNECT_DELAY: 3000,
    MAX_RECONNECT_ATTEMPTS: 10,
    HEARTBEAT_INTERVAL: 30000
  },
  
  // UI Configuration
  UI: {
    MAX_FEED_ITEMS: 50,
    CELEBRATION_DURATION: 5000,
    TOAST_DURATION: 4000,
    CHART_UPDATE_INTERVAL: 5000,
    ANIMATION_DURATION: 300
  },
  
  // Data Configuration
  DATA: {
    STORAGE_KEY: 'vendingstream_data',
    SETTINGS_KEY: 'vendingstream_settings',
    CACHE_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
    MAX_HISTORY_DAYS: 365
  },
  
  // Chart Configuration
  CHARTS: {
    COLORS: {
      PRIMARY: '#00d4ff',
      SECONDARY: '#ff006e',
      SUCCESS: '#00ff88',
      WARNING: '#ffaa00',
      ERROR: '#ff4757',
      GRADIENT: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe']
    },
    DEFAULT_OPTIONS: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#ffffff',
            font: {
              family: 'JetBrains Mono'
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(0, 212, 255, 0.1)'
          },
          ticks: {
            color: '#b3b3b3',
            font: {
              family: 'JetBrains Mono'
            }
          }
        },
        y: {
          grid: {
            color: 'rgba(0, 212, 255, 0.1)'
          },
          ticks: {
            color: '#b3b3b3',
            font: {
              family: 'JetBrains Mono'
            }
          }
        }
      }
    }
  }
};

// Product Categories and Emojis
const PRODUCT_MAPPING = {
  // Beverages
  'energy drink': { emoji: '⚡', category: 'beverages', color: '#ff6b6b' },
  'soda': { emoji: '🥤', category: 'beverages', color: '#4ecdc4' },
  'cola': { emoji: '🥤', category: 'beverages', color: '#45b7d1' },
  'pepsi': { emoji: '🥤', category: 'beverages', color: '#96ceb4' },
  'coke': { emoji: '🥤', category: 'beverages', color: '#feca57' },
  'water': { emoji: '💧', category: 'beverages', color: '#74b9ff' },
  'juice': { emoji: '🧃', category: 'beverages', color: '#fd79a8' },
  'coffee': { emoji: '☕', category: 'beverages', color: '#6c5ce7' },
  'tea': { emoji: '🍵', category: 'beverages', color: '#a29bfe' },
  
  // Snacks
  'chocolate': { emoji: '🍫', category: 'snacks', color: '#8b4513' },
  'candy': { emoji: '🍬', category: 'snacks', color: '#ff69b4' },
  'chips': { emoji: '🍿', category: 'snacks', color: '#ffa500' },
  'popcorn': { emoji: '🍿', category: 'snacks', color: '#ffeb3b' },
  'pretzels': { emoji: '🥨', category: 'snacks', color: '#8bc34a' },
  'cookies': { emoji: '🍪', category: 'snacks', color: '#795548' },
  'nuts': { emoji: '🥜', category: 'snacks', color: '#ff9800' },
  'crackers': { emoji: '🍘', category: 'snacks', color: '#607d8b' },
  'gum': { emoji: '🍬', category: 'snacks', color: '#e91e63' },
  
  // Food
  'sandwich': { emoji: '🥪', category: 'food', color: '#ff5722' },
  'salad': { emoji: '🥗', category: 'food', color: '#4caf50' },
  'fruit': { emoji: '🍎', category: 'food', color: '#f44336' },
  'yogurt': { emoji: '🥛', category: 'food', color: '#2196f3' },
  'protein': { emoji: '💪', category: 'food', color: '#9c27b0' },
  'granola': { emoji: '🌾', category: 'food', color: '#795548' },
  
  // Default
  'default': { emoji: '🍿', category: 'other', color: '#666666' }
};

// Notification Types
const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// Connection States
const CONNECTION_STATES = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting'
};

// Export Formats
const EXPORT_FORMATS = {
  CSV: 'csv',
  JSON: 'json',
  PDF: 'pdf'
};

// Time Periods
const TIME_PERIODS = {
  TODAY: 'today',
  WEEK: 'week',
  MONTH: 'month',
  ALL: 'all'
};

// Chart Types
const CHART_TYPES = {
  LINE: 'line',
  BAR: 'bar',
  PIE: 'pie',
  DOUGHNUT: 'doughnut'
};

// Local Storage Keys
const STORAGE_KEYS = {
  SETTINGS: 'vendingstream_settings',
  SALES_DATA: 'vendingstream_sales',
  INVENTORY_DATA: 'vendingstream_inventory',
  USER_PREFERENCES: 'vendingstream_preferences',
  ANALYTICS_CACHE: 'vendingstream_analytics'
};

// Default Settings
const DEFAULT_SETTINGS = {
  websocketUrl: CONFIG.WEBSOCKET.DEFAULT_URL,
  reconnectDelay: CONFIG.WEBSOCKET.RECONNECT_DELAY,
  enableSounds: true,
  enableAnimations: true,
  enableNotifications: false,
  lowStockAlerts: true,
  feedLimit: CONFIG.UI.MAX_FEED_ITEMS,
  theme: 'dark',
  chartUpdateInterval: CONFIG.UI.CHART_UPDATE_INTERVAL,
  autoRefresh: true
};

// Sound Effects
const SOUNDS = {
  PURCHASE: {
    url: '/assets/sounds/purchase.mp3',
    volume: 0.7
  },
  ALERT: {
    url: '/assets/sounds/alert.mp3',
    volume: 0.5
  },
  NOTIFICATION: {
    url: '/assets/sounds/notification.mp3',
    volume: 0.6
  },
  ERROR: {
    url: '/assets/sounds/error.mp3',
    volume: 0.8
  }
};

// API Endpoints (if needed for future expansion)
const API_ENDPOINTS = {
  SALES: '/api/sales',
  INVENTORY: '/api/inventory',
  ANALYTICS: '/api/analytics',
  EXPORT: '/api/export'
};

// Regular Expressions
const REGEX = {
  PRICE: /\$?(\d+\.?\d*)/,
  TIME: /(\d{1,2}):(\d{2})\s?(AM|PM)/i,
  PRODUCT_NAME: /^[a-zA-Z0-9\s\-_]{1,50}$/
};

// Error Messages
const ERROR_MESSAGES = {
  WEBSOCKET_CONNECTION: 'Failed to connect to WebSocket server',
  WEBSOCKET_TIMEOUT: 'Connection timeout. Please check your network.',
  INVALID_DATA: 'Received invalid data from server',
  STORAGE_FULL: 'Local storage is full. Please clear some data.',
  EXPORT_FAILED: 'Failed to export data. Please try again.',
  NOTIFICATION_PERMISSION: 'Notification permission denied',
  AUDIO_PLAYBACK: 'Could not play audio. Check browser settings.'
};

// Success Messages
const SUCCESS_MESSAGES = {
  SETTINGS_SAVED: 'Settings saved successfully',
  DATA_EXPORTED: 'Data exported successfully',
  CONNECTION_RESTORED: 'Connection restored',
  NOTIFICATION_ENABLED: 'Notifications enabled'
};

// Feature Flags (for future development)
const FEATURE_FLAGS = {
  INVENTORY_MANAGEMENT: true,
  ADVANCED_ANALYTICS: true,
  REAL_TIME_ALERTS: true,
  EXPORT_FUNCTIONALITY: true,
  SOUND_EFFECTS: true,
  DARK_MODE: true,
  MOBILE_OPTIMIZATION: true
};

// Performance Configuration
const PERFORMANCE = {
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 100,
  LAZY_LOAD_THRESHOLD: 0.1,
  ANIMATION_FRAME_BUDGET: 16.67 // 60fps
};

// Browser Compatibility
const BROWSER_SUPPORT = {
  WEBSOCKETS: typeof WebSocket !== 'undefined',
  LOCAL_STORAGE: typeof Storage !== 'undefined',
  NOTIFICATIONS: 'Notification' in window,
  WEB_AUDIO: 'AudioContext' in window || 'webkitAudioContext' in window,
  CANVAS: document.createElement('canvas').getContext !== undefined,
  WEBGL: (() => {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  })()
};

// Development Configuration
const DEV_CONFIG = {
  DEBUG_MODE: false,
  ENABLE_LOGGING: true,
  MOCK_DATA: false,
  PERFORMANCE_MONITORING: true
};

// Export all constants
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CONFIG,
    PRODUCT_MAPPING,
    NOTIFICATION_TYPES,
    CONNECTION_STATES,
    EXPORT_FORMATS,
    TIME_PERIODS,
    CHART_TYPES,
    STORAGE_KEYS,
    DEFAULT_SETTINGS,
    SOUNDS,
    API_ENDPOINTS,
    REGEX,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    FEATURE_FLAGS,
    PERFORMANCE,
    BROWSER_SUPPORT,
    DEV_CONFIG
  };
}