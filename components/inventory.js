/**
 * Inventory Manager
 * Handles product inventory tracking, stock levels, and alerts
 */

class InventoryManager {
  constructor() {
    this.inventory = new Map();
    this.stockAlerts = new Map();
    this.lowStockThreshold = 5;
    this.outOfStockThreshold = 0;
    this.autoTrackEnabled = true;
    
    this.init();
    log('info', 'Inventory Manager initialized');
  }

  /**
   * Initialize inventory manager
   */
  async init() {
    await this.loadInventoryData();
    this.setupEventListeners();
  }

  /**
   * Load inventory data from storage
   */
  async loadInventoryData() {
    try {
      const inventoryData = storage.getItem(STORAGE_KEYS.INVENTORY_DATA, []);
      
      this.inventory.clear();
      inventoryData.forEach(item => {
        this.inventory.set(item.id || item.name, {
          ...item,
          lastUpdated: item.lastUpdated || Date.now()
        });
      });

      log('info', 'Inventory data loaded', { count: this.inventory.size });
      this.updateInventoryDisplay();
      
    } catch (error) {
      log('error', 'Failed to load inventory data', { error: error.message });
    }
  }

  /**
   * Save inventory data to storage
   */
  async saveInventoryData() {
    try {
      const inventoryArray = Array.from(this.inventory.values());
      storage.setItem(STORAGE_KEYS.INVENTORY_DATA, inventoryArray);
      
      log('debug', 'Inventory data saved', { count: inventoryArray.length });
      return true;
      
    } catch (error) {
      log('error', 'Failed to save inventory data', { error: error.message });
      return false;
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for new sales to auto-update inventory
    document.addEventListener('new-sale', (event) => {
      if (this.autoTrackEnabled) {
        this.handleSaleEvent(event.detail);
      }
    });

    // Listen for restock requests
    document.addEventListener('restock-request', (event) => {
      this.handleRestockRequest(event.detail);
    });
  }

  /**
   * Add or update product in inventory
   */
  async addProduct(productData) {
    try {
      const product = {
        id: productData.id || generateId('product'),
        name: productData.name,
        currentStock: parseInt(productData.currentStock) || 0,
        minStock: parseInt(productData.minStock) || this.lowStockThreshold,
        maxStock: parseInt(productData.maxStock) || 100,
        price: parseFloat(productData.price) || 0,
        category: productData.category || 'other',
        supplier: productData.supplier || '',
        lastRestocked: productData.lastRestocked || Date.now(),
        lastUpdated: Date.now(),
        isActive: productData.isActive !== false,
        totalSales: productData.totalSales || 0,
        ...getProductInfo(productData.name)
      };

      // Validate product data
      const validationErrors = this.validateProductData(product);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      this.inventory.set(product.id, product);
      await this.saveInventoryData();
      this.updateInventoryDisplay();
      
      // Check stock level
      this.checkStockLevel(product);

      notifications.showSuccess(`Product "${product.name}" added to inventory`);
      log('info', 'Product added to inventory', { product });
      
      return product;
      
    } catch (error) {
      notifications.showError(`Failed to add product: ${error.message}`);
      log('error', 'Failed to add product', { error: error.message });
      return null;
    }
  }

  /**
   * Update product stock
   */
  async updateStock(productId, newStock, reason = 'manual') {
    try {
      const product = this.inventory.get(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      const previousStock = product.currentStock;
      const stockChange = newStock - previousStock;
      
      product.currentStock = Math.max(0, parseInt(newStock));
      product.lastUpdated = Date.now();
      
      // Track restock if stock increased
      if (stockChange > 0 && reason === 'restock') {
        product.lastRestocked = Date.now();
      }

      this.inventory.set(productId, product);
      await this.saveInventoryData();
      this.updateInventoryDisplay();
      
      // Check stock level and send alerts
      this.checkStockLevel(product);

      // Log the change
      log('info', 'Stock updated', { 
        product: product.name, 
        previousStock, 
        newStock: product.currentStock, 
        change: stockChange, 
        reason 
      });

      return product;
      
    } catch (error) {
      notifications.showError(`Failed to update stock: ${error.message}`);
      log('error', 'Failed to update stock', { error: error.message });
      return null;
    }
  }

  /**
   * Remove product from inventory
   */
  async removeProduct(productId) {
    try {
      const product = this.inventory.get(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      this.inventory.delete(productId);
      this.stockAlerts.delete(productId);
      
      await this.saveInventoryData();
      this.updateInventoryDisplay();

      notifications.showSuccess(`Product "${product.name}" removed from inventory`);
      log('info', 'Product removed from inventory', { product: product.name });
      
      return true;
      
    } catch (error) {
      notifications.showError(`Failed to remove product: ${error.message}`);
      log('error', 'Failed to remove product', { error: error.message });
      return false;
    }
  }

  /**
   * Handle sale event for auto-tracking
   */
  handleSaleEvent(saleData) {
    if (!saleData.productName) return;

    // Find matching product in inventory
    const product = this.findProductByName(saleData.productName);
    
    if (product) {
      // Decrease stock by 1
      const newStock = Math.max(0, product.currentStock - 1);
      product.totalSales = (product.totalSales || 0) + 1;
      
      this.updateStock(product.id, newStock, 'sale');
      
      log('debug', 'Auto-tracked sale in inventory', { 
        product: product.name, 
        remainingStock: newStock 
      });
    } else if (this.autoTrackEnabled) {
      // Auto-create product if it doesn't exist
      this.addProduct({
        name: saleData.productName,
        currentStock: 0, // Assuming it's now out of stock
        price: extractPrice(saleData.price) || 0,
        category: getProductInfo(saleData.productName).category
      });
    }
  }

  /**
   * Handle restock request
   */
  handleRestockRequest(requestData) {
    const { product, currentStock } = requestData;
    
    // Show restock modal or form
    this.showRestockModal(product, currentStock);
  }

  /**
   * Show restock modal
   */
  showRestockModal(product, currentStock) {
    // Create modal HTML
    const modalHtml = `
      <div class="restock-modal">
        <h3>Restock ${product.name}</h3>
        <p>Current stock: <strong>${currentStock}</strong></p>
        <div class="form-group">
          <label for="restock-quantity">Add quantity:</label>
          <input type="number" id="restock-quantity" min="1" value="10" class="form-input">
        </div>
        <div class="form-group">
          <label for="restock-reason">Reason:</label>
          <select id="restock-reason" class="form-input">
            <option value="restock">Regular restock</option>
            <option value="low-stock">Low stock alert</option>
            <option value="manual">Manual adjustment</option>
          </select>
        </div>
        <div class="modal-actions">
          <button id="confirm-restock" class="btn btn-primary">Restock</button>
          <button id="cancel-restock" class="btn btn-secondary">Cancel</button>
        </div>
      </div>
    `;

    // Show modal using notification system
    notifications.showToast(`Restock ${product.name}?`, NOTIFICATION_TYPES.INFO, {
      persistent: true,
      actions: [
        {
          text: 'Quick +10',
          handler: () => {
            this.updateStock(product.id, currentStock + 10, 'restock');
          }
        },
        {
          text: 'Custom Amount',
          handler: () => {
            const quantity = prompt('Enter quantity to add:', '10');
            if (quantity && !isNaN(quantity)) {
              this.updateStock(product.id, currentStock + parseInt(quantity), 'restock');
            }
          }
        }
      ]
    });
  }

  /**
   * Check stock level and send alerts
   */
  checkStockLevel(product) {
    const { id, name, currentStock, minStock } = product;
    const settings = storage.getItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    
    if (!settings.lowStockAlerts) return;

    // Check if already alerted recently
    const lastAlert = this.stockAlerts.get(id);
    const alertCooldown = 30 * 60 * 1000; // 30 minutes
    
    if (lastAlert && (Date.now() - lastAlert) < alertCooldown) {
      return;
    }

    // Out of stock alert
    if (currentStock <= this.outOfStockThreshold) {
      notifications.showError(`Out of stock: ${name}`, {
        persistent: true,
        actions: [{
          text: 'Restock Now',
          handler: () => this.handleRestockRequest({ product, currentStock })
        }]
      });
      
      this.stockAlerts.set(id, Date.now());
      log('warn', 'Out of stock alert', { product: name, stock: currentStock });
      
    // Low stock alert
    } else if (currentStock <= (minStock || this.lowStockThreshold)) {
      notifications.showLowStockAlert(product, currentStock);
      this.stockAlerts.set(id, Date.now());
      log('warn', 'Low stock alert', { product: name, stock: currentStock, threshold: minStock });
    }
  }

  /**
   * Find product by name (fuzzy matching)
   */
  findProductByName(productName) {
    const normalizedName = productName.toLowerCase().trim();
    
    // Exact match first
    for (const product of this.inventory.values()) {
      if (product.name.toLowerCase().trim() === normalizedName) {
        return product;
      }
    }

    // Partial match
    for (const product of this.inventory.values()) {
      if (product.name.toLowerCase().includes(normalizedName) || 
          normalizedName.includes(product.name.toLowerCase())) {
        return product;
      }
    }

    return null;
  }

  /**
   * Get inventory statistics
   */
  getInventoryStats() {
    const products = Array.from(this.inventory.values()).filter(p => p.isActive);
    
    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + p.currentStock, 0);
    const totalValue = products.reduce((sum, p) => sum + (p.currentStock * p.price), 0);
    
    const lowStockProducts = products.filter(p => 
      p.currentStock <= (p.minStock || this.lowStockThreshold)
    );
    
    const outOfStockProducts = products.filter(p => 
      p.currentStock <= this.outOfStockThreshold
    );

    const categories = {};
    products.forEach(p => {
      categories[p.category] = (categories[p.category] || 0) + 1;
    });

    return {
      totalProducts,
      totalStock,
      totalValue,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStockProducts.length,
      lowStockProducts: lowStockProducts.map(p => ({
        name: p.name,
        currentStock: p.currentStock,
        minStock: p.minStock
      })),
      outOfStockProducts: outOfStockProducts.map(p => p.name),
      categories,
      lastUpdated: Math.max(...products.map(p => p.lastUpdated))
    };
  }

  /**
   * Update inventory display in UI
   */
  updateInventoryDisplay() {
    const inventoryList = document.getElementById('inventory-list');
    if (!inventoryList) return;

    const products = Array.from(this.inventory.values())
      .filter(p => p.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));

    if (products.length === 0) {
      inventoryList.innerHTML = `
        <div class="inventory-item no-data">
          <i class="fas fa-box-open"></i>
          <span>No products in inventory</span>
        </div>
      `;
      return;
    }

    inventoryList.innerHTML = products.map(product => {
      const stockLevel = this.getStockLevel(product);
      const statusClass = stockLevel === 'out' ? 'out-of-stock' : 
                         stockLevel === 'low' ? 'low-stock' : '';
      
      return `
        <div class="inventory-item ${statusClass}" data-product-id="${product.id}">
          <div class="inventory-info">
            <div class="inventory-name">
              ${product.emoji || '📦'} ${product.name}
            </div>
            <div class="inventory-stock ${stockLevel}">
              ${product.currentStock} in stock
              ${product.minStock ? ` (min: ${product.minStock})` : ''}
            </div>
          </div>
          <div class="inventory-actions">
            <div class="inventory-price">${formatCurrency(product.price)}</div>
            <button class="inventory-action restock-btn" title="Restock">
              <i class="fas fa-plus"></i>
            </button>
            <button class="inventory-action edit-btn" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Add event listeners to inventory items
    this.addInventoryEventListeners();
  }

  /**
   * Add event listeners to inventory items
   */
  addInventoryEventListeners() {
    const inventoryList = document.getElementById('inventory-list');
    if (!inventoryList) return;

    // Restock buttons
    inventoryList.addEventListener('click', (event) => {
      if (event.target.closest('.restock-btn')) {
        const productId = event.target.closest('.inventory-item').dataset.productId;
        const product = this.inventory.get(productId);
        if (product) {
          this.handleRestockRequest({ product, currentStock: product.currentStock });
        }
      }
      
      // Edit buttons
      if (event.target.closest('.edit-btn')) {
        const productId = event.target.closest('.inventory-item').dataset.productId;
        this.showEditProductModal(productId);
      }
    });
  }

  /**
   * Show edit product modal
   */
  showEditProductModal(productId) {
    const product = this.inventory.get(productId);
    if (!product) return;

    notifications.showToast(`Edit ${product.name}`, NOTIFICATION_TYPES.INFO, {
      persistent: true,
      actions: [
        {
          text: 'Edit Stock',
          handler: () => {
            const newStock = prompt(`Current stock: ${product.currentStock}. Enter new stock:`, product.currentStock);
            if (newStock !== null && !isNaN(newStock)) {
              this.updateStock(productId, parseInt(newStock), 'manual');
            }
          }
        },
        {
          text: 'Edit Price',
          handler: () => {
            const newPrice = prompt(`Current price: ${product.price}. Enter new price:`, product.price);
            if (newPrice !== null && !isNaN(newPrice)) {
              product.price = parseFloat(newPrice);
              product.lastUpdated = Date.now();
              this.inventory.set(productId, product);
              this.saveInventoryData();
              this.updateInventoryDisplay();
              notifications.showSuccess('Price updated successfully');
            }
          }
        },
        {
          text: 'Remove Product',
          handler: () => {
            if (confirm(`Are you sure you want to remove "${product.name}" from inventory?`)) {
              this.removeProduct(productId);
            }
          }
        }
      ]
    });
  }

  /**
   * Get stock level status
   */
  getStockLevel(product) {
    if (product.currentStock <= this.outOfStockThreshold) {
      return 'out';
    } else if (product.currentStock <= (product.minStock || this.lowStockThreshold)) {
      return 'low';
    } else {
      return 'normal';
    }
  }

  /**
   * Validate product data
   */
  validateProductData(product) {
    const errors = [];

    if (!product.name || product.name.trim().length === 0) {
      errors.push('Product name is required');
    }

    if (product.currentStock < 0) {
      errors.push('Current stock cannot be negative');
    }

    if (product.price < 0) {
      errors.push('Price cannot be negative');
    }

    if (product.minStock < 0) {
      errors.push('Minimum stock cannot be negative');
    }

    return errors;
  }

  /**
   * Export inventory data
   */
  exportInventory() {
    const inventoryData = Array.from(this.inventory.values());
    return {
      inventory: inventoryData,
      stats: this.getInventoryStats(),
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Import inventory data
   */
  async importInventory(data) {
    try {
      if (data.inventory && Array.isArray(data.inventory)) {
        this.inventory.clear();
        
        data.inventory.forEach(product => {
          this.inventory.set(product.id || product.name, {
            ...product,
            lastUpdated: Date.now()
          });
        });
        
        await this.saveInventoryData();
        this.updateInventoryDisplay();
        
        notifications.showSuccess('Inventory imported successfully');
        return true;
      } else {
        throw new Error('Invalid inventory data format');
      }
    } catch (error) {
      notifications.showError(`Import failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get product by ID
   */
  getProduct(productId) {
    return this.inventory.get(productId);
  }

  /**
   * Get all products
   */
  getAllProducts() {
    return Array.from(this.inventory.values());
  }

  /**
   * Search products
   */
  searchProducts(query) {
    const normalizedQuery = query.toLowerCase().trim();
    return Array.from(this.inventory.values()).filter(product =>
      product.name.toLowerCase().includes(normalizedQuery) ||
      product.category.toLowerCase().includes(normalizedQuery)
    );
  }

  /**
   * Destroy inventory manager
   */
  destroy() {
    this.inventory.clear();
    this.stockAlerts.clear();
    log('info', 'Inventory manager destroyed');
  }
}

// Create global inventory manager instance
const inventory = new InventoryManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    InventoryManager,
    inventory
  };
}