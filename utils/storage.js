/**
 * Storage Utility
 * Handles localStorage, sessionStorage, and IndexedDB operations
 */

class StorageManager {
  constructor() {
    this.isLocalStorageSupported = this.checkLocalStorageSupport();
    this.isIndexedDBSupported = this.checkIndexedDBSupport();
    this.dbName = 'VendingStreamDB';
    this.dbVersion = 1;
    this.db = null;
    
    if (this.isIndexedDBSupported) {
      this.initIndexedDB();
    }
  }

  /**
   * Check if localStorage is supported
   */
  checkLocalStorageSupport() {
    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      console.warn('localStorage not supported:', e);
      return false;
    }
  }

  /**
   * Check if IndexedDB is supported
   */
  checkIndexedDBSupport() {
    return 'indexedDB' in window && indexedDB !== null;
  }

  /**
   * Initialize IndexedDB
   */
  async initIndexedDB() {
    if (!this.isIndexedDBSupported) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('IndexedDB failed to open:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Sales data store
        if (!db.objectStoreNames.contains('sales')) {
          const salesStore = db.createObjectStore('sales', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          salesStore.createIndex('timestamp', 'timestamp', { unique: false });
          salesStore.createIndex('productName', 'productName', { unique: false });
          salesStore.createIndex('date', 'date', { unique: false });
        }

        // Inventory data store
        if (!db.objectStoreNames.contains('inventory')) {
          const inventoryStore = db.createObjectStore('inventory', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          inventoryStore.createIndex('productName', 'productName', { unique: true });
        }

        // Analytics cache store
        if (!db.objectStoreNames.contains('analytics')) {
          const analyticsStore = db.createObjectStore('analytics', { 
            keyPath: 'key' 
          });
        }

        console.log('IndexedDB schema updated');
      };
    });
  }

  /**
   * Get data from localStorage with JSON parsing
   */
  getItem(key, defaultValue = null) {
    if (!this.isLocalStorageSupported) return defaultValue;

    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error('Error getting item from localStorage:', e);
      return defaultValue;
    }
  }

  /**
   * Set data to localStorage with JSON stringification
   */
  setItem(key, value) {
    if (!this.isLocalStorageSupported) return false;

    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Error setting item to localStorage:', e);
      // Handle quota exceeded error
      if (e.name === 'QuotaExceededError') {
        this.handleStorageQuotaExceeded();
      }
      return false;
    }
  }

  /**
   * Remove item from localStorage
   */
  removeItem(key) {
    if (!this.isLocalStorageSupported) return false;

    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error('Error removing item from localStorage:', e);
      return false;
    }
  }

  /**
   * Clear all localStorage data (with confirmation)
   */
  clear() {
    if (!this.isLocalStorageSupported) return false;

    try {
      localStorage.clear();
      return true;
    } catch (e) {
      console.error('Error clearing localStorage:', e);
      return false;
    }
  }

  /**
   * Handle storage quota exceeded
   */
  handleStorageQuotaExceeded() {
    console.warn('localStorage quota exceeded, clearing old data');
    
    // Try to clear old sales data
    const salesData = this.getItem(STORAGE_KEYS.SALES_DATA, []);
    if (salesData.length > 100) {
      // Keep only the latest 50 items
      const recentSales = salesData.slice(-50);
      this.setItem(STORAGE_KEYS.SALES_DATA, recentSales);
    }

    // Clear analytics cache
    this.removeItem(STORAGE_KEYS.ANALYTICS_CACHE);
  }

  /**
   * Get storage usage information
   */
  getStorageInfo() {
    if (!this.isLocalStorageSupported) return null;

    try {
      let totalSize = 0;
      const keys = [];

      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          const size = (localStorage[key].length + key.length) * 2; // UTF-16 encoding
          keys.push({ key, size });
          totalSize += size;
        }
      }

      return {
        totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        keys: keys.sort((a, b) => b.size - a.size),
        available: this.getAvailableStorage()
      };
    } catch (e) {
      console.error('Error getting storage info:', e);
      return null;
    }
  }

  /**
   * Estimate available storage space
   */
  getAvailableStorage() {
    try {
      const testKey = '__storage_test__';
      let testSize = 1024; // 1KB
      let maxSize = 0;

      while (testSize <= 10 * 1024 * 1024) { // Max 10MB test
        try {
          localStorage.setItem(testKey, 'x'.repeat(testSize));
          localStorage.removeItem(testKey);
          maxSize = testSize;
          testSize *= 2;
        } catch (e) {
          break;
        }
      }

      return {
        estimated: maxSize,
        estimatedMB: (maxSize / (1024 * 1024)).toFixed(2)
      };
    } catch (e) {
      return { estimated: 0, estimatedMB: '0' };
    }
  }

  // IndexedDB Methods

  /**
   * Add data to IndexedDB store
   */
  async addToIndexedDB(storeName, data) {
    if (!this.db) return false;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get data from IndexedDB store
   */
  async getFromIndexedDB(storeName, key) {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all data from IndexedDB store
   */
  async getAllFromIndexedDB(storeName) {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update data in IndexedDB store
   */
  async updateIndexedDB(storeName, data) {
    if (!this.db) return false;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete data from IndexedDB store
   */
  async deleteFromIndexedDB(storeName, key) {
    if (!this.db) return false;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear IndexedDB store
   */
  async clearIndexedDBStore(storeName) {
    if (!this.db) return false;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Query IndexedDB with filters
   */
  async queryIndexedDB(storeName, indexName, query, options = {}) {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = indexName ? store.index(indexName) : store;
      
      let request;
      if (query) {
        request = index.getAll(query);
      } else {
        request = index.getAll();
      }

      request.onsuccess = () => {
        let results = request.result || [];
        
        // Apply additional filtering
        if (options.filter) {
          results = results.filter(options.filter);
        }
        
        // Apply sorting
        if (options.sort) {
          results.sort(options.sort);
        }
        
        // Apply limit
        if (options.limit) {
          results = results.slice(0, options.limit);
        }
        
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // High-level data methods

  /**
   * Save sales data (uses IndexedDB if available, fallback to localStorage)
   */
  async saveSalesData(salesArray) {
    if (this.isIndexedDBSupported && this.db) {
      try {
        // Clear existing sales data
        await this.clearIndexedDBStore('sales');
        
        // Add new sales data
        for (const sale of salesArray) {
          await this.addToIndexedDB('sales', {
            ...sale,
            timestamp: sale.timestamp || Date.now(),
            date: new Date(sale.timestamp || Date.now()).toDateString()
          });
        }
        return true;
      } catch (e) {
        console.error('Error saving to IndexedDB, falling back to localStorage:', e);
      }
    }

    // Fallback to localStorage
    return this.setItem(STORAGE_KEYS.SALES_DATA, salesArray);
  }

  /**
   * Get sales data
   */
  async getSalesData() {
    if (this.isIndexedDBSupported && this.db) {
      try {
        return await this.getAllFromIndexedDB('sales');
      } catch (e) {
        console.error('Error reading from IndexedDB, falling back to localStorage:', e);
      }
    }

    // Fallback to localStorage
    return this.getItem(STORAGE_KEYS.SALES_DATA, []);
  }

  /**
   * Add single sale
   */
  async addSale(sale) {
    const saleData = {
      ...sale,
      id: Date.now() + Math.random(),
      timestamp: sale.timestamp || Date.now(),
      date: new Date(sale.timestamp || Date.now()).toDateString()
    };

    if (this.isIndexedDBSupported && this.db) {
      try {
        await this.addToIndexedDB('sales', saleData);
        return true;
      } catch (e) {
        console.error('Error adding sale to IndexedDB:', e);
      }
    }

    // Fallback to localStorage
    const salesData = this.getItem(STORAGE_KEYS.SALES_DATA, []);
    salesData.push(saleData);
    
    // Keep only recent items to prevent storage bloat
    if (salesData.length > CONFIG.UI.MAX_FEED_ITEMS * 2) {
      salesData.splice(0, salesData.length - CONFIG.UI.MAX_FEED_ITEMS);
    }
    
    return this.setItem(STORAGE_KEYS.SALES_DATA, salesData);
  }

  /**
   * Get sales data with filtering
   */
  async getSalesWithFilter(options = {}) {
    if (this.isIndexedDBSupported && this.db) {
      try {
        return await this.queryIndexedDB('sales', null, null, options);
      } catch (e) {
        console.error('Error querying IndexedDB:', e);
      }
    }

    // Fallback to localStorage with manual filtering
    let salesData = this.getItem(STORAGE_KEYS.SALES_DATA, []);
    
    if (options.filter) {
      salesData = salesData.filter(options.filter);
    }
    
    if (options.sort) {
      salesData.sort(options.sort);
    }
    
    if (options.limit) {
      salesData = salesData.slice(0, options.limit);
    }
    
    return salesData;
  }

  /**
   * Export all data
   */
  async exportAllData() {
    const data = {
      sales: await this.getSalesData(),
      inventory: this.getItem(STORAGE_KEYS.INVENTORY_DATA, []),
      settings: this.getItem(STORAGE_KEYS.SETTINGS, {}),
      preferences: this.getItem(STORAGE_KEYS.USER_PREFERENCES, {}),
      exportedAt: new Date().toISOString(),
      version: CONFIG.APP_VERSION
    };

    return data;
  }

  /**
   * Import data
   */
  async importData(data) {
    try {
      if (data.sales) {
        await this.saveSalesData(data.sales);
      }
      
      if (data.inventory) {
        this.setItem(STORAGE_KEYS.INVENTORY_DATA, data.inventory);
      }
      
      if (data.settings) {
        this.setItem(STORAGE_KEYS.SETTINGS, data.settings);
      }
      
      if (data.preferences) {
        this.setItem(STORAGE_KEYS.USER_PREFERENCES, data.preferences);
      }
      
      return true;
    } catch (e) {
      console.error('Error importing data:', e);
      return false;
    }
  }
}

// Create global instance
const storage = new StorageManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
}