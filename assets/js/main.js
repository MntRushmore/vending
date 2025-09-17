/**
 * Main Application Controller
 * Initializes and coordinates all components
 */

class VendingStreamApp {
  constructor() {
    this.wsManager = null;
    this.currentTheme = 'dark';
    this.isFullscreen = false;
    this.settings = {};
    this.isPaused = false;
    
    // Bind methods
    this.init = this.init.bind(this);
    this.initWebSocket = this.initWebSocket.bind(this);
    this.handleSale = this.handleSale.bind(this);
    this.updateUI = this.updateUI.bind(this);
    this.toggleTheme = this.toggleTheme.bind(this);
    this.toggleFullscreen = this.toggleFullscreen.bind(this);
    
    log('info', 'Vending Stream App initialized');
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      log('info', 'Starting application initialization');

      // Load settings
      await this.loadSettings();

      // Initialize components
      await this.initializeComponents();

      // Setup UI event listeners
      this.setupEventListeners();

      // Initialize WebSocket connection
      this.initWebSocket();

      // Load and display initial data
      await this.loadInitialData();

      // Setup auto-refresh
      this.setupAutoRefresh();

      // Show welcome message
      this.showWelcomeMessage();

      log('info', 'Application initialization completed successfully');

    } catch (error) {
      log('error', 'Application initialization failed', { error: error.message });
      notifications.showError('Failed to initialize application. Please refresh the page.');
    }
  }

  /**
   * Load user settings
   */
  async loadSettings() {
    this.settings = storage.getItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    
    // Apply theme
    this.currentTheme = this.settings.theme || 'dark';
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    
    // Update UI elements with settings
    this.updateSettingsUI();
    
    log('info', 'Settings loaded', { settings: this.settings });
  }

  /**
   * Initialize all components
   */
  async initializeComponents() {
    // Initialize analytics
    await analytics.loadData();
    
    // Initialize charts
    await chartManager.init();
    
    // Initialize notifications
    // (already initialized in constructor)
    
    // Initialize inventory
    await inventory.init();
    
    log('info', 'All components initialized');
  }

  /**
   * Setup UI event listeners
   */
  setupEventListeners() {
    // Navigation controls
    document.getElementById('theme-toggle')?.addEventListener('click', this.toggleTheme);
    document.getElementById('fullscreen-btn')?.addEventListener('click', this.toggleFullscreen);
    document.getElementById('settings-btn')?.addEventListener('click', this.showSettingsModal);
    document.getElementById('refresh-btn')?.addEventListener('click', this.refreshData.bind(this));

    // Time filter
    document.getElementById('time-filter')?.addEventListener('change', this.handleTimeFilterChange.bind(this));
    
    // Chart controls
    document.getElementById('chart-period')?.addEventListener('change', this.handleChartPeriodChange.bind(this));
    
    // Export functionality
    document.getElementById('export-btn')?.addEventListener('click', this.showExportModal);
    
    // Feed controls
    document.getElementById('clear-feed-btn')?.addEventListener('click', this.clearFeed.bind(this));
    document.getElementById('pause-feed-btn')?.addEventListener('click', this.toggleFeedPause.bind(this));
    
    // Search functionality
    document.getElementById('feed-search')?.addEventListener('input', 
      debounce(this.handleFeedSearch.bind(this), 300));
    
    // Inventory controls
    document.getElementById('add-product-btn')?.addEventListener('click', this.showAddProductModal);
    
    // Modal controls
    this.setupModalEventListeners();
    
    // Keyboard shortcuts
    this.setupKeyboardShortcuts();
    
    // Window events
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    log('info', 'Event listeners setup completed');
  }

  /**
   * Setup modal event listeners
   */
  setupModalEventListeners() {
    // Settings modal
    document.getElementById('save-settings')?.addEventListener('click', this.saveSettings.bind(this));
    document.getElementById('reset-settings')?.addEventListener('click', this.resetSettings.bind(this));
    
    // Export modal
    document.getElementById('download-export')?.addEventListener('click', this.handleExport.bind(this));
    
    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', this.closeModal.bind(this));
    });
    
    // Modal overlay clicks
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', this.closeModal.bind(this));
    });
  }

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Ctrl/Cmd + R: Refresh data
      if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        event.preventDefault();
        this.refreshData();
      }
      
      // Ctrl/Cmd + E: Export data
      if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
        event.preventDefault();
        this.showExportModal();
      }
      
      // Ctrl/Cmd + T: Toggle theme
      if ((event.ctrlKey || event.metaKey) && event.key === 't') {
        event.preventDefault();
        this.toggleTheme();
      }
      
      // F11: Toggle fullscreen
      if (event.key === 'F11') {
        event.preventDefault();
        this.toggleFullscreen();
      }
      
      // Escape: Close modals
      if (event.key === 'Escape') {
        this.closeModal();
      }
    });
  }

  /**
   * Initialize WebSocket connection
   */
  initWebSocket() {
    const wsUrl = this.settings.websocketUrl || CONFIG.WEBSOCKET.DEFAULT_URL;
    this.wsManager = initWebSocket(wsUrl);

    // Setup WebSocket event listeners
    this.wsManager.addEventListener('connected', this.handleWebSocketConnected.bind(this));
    this.wsManager.addEventListener('message', this.handleWebSocketMessage.bind(this));
    this.wsManager.addEventListener('error', this.handleWebSocketError.bind(this));
    this.wsManager.addEventListener('close', this.handleWebSocketClose.bind(this));
    this.wsManager.addEventListener('stateChange', this.handleWebSocketStateChange.bind(this));

    // Start connection
    this.wsManager.connect();
    
    log('info', 'WebSocket initialization started', { url: wsUrl });
  }

  /**
   * Handle WebSocket connected event
   */
  handleWebSocketConnected(event) {
    log('info', 'WebSocket connected');
    notifications.showSuccess('Connected to vending stream');
    this.updateConnectionStatus(CONNECTION_STATES.CONNECTED);
  }

  /**
   * Handle WebSocket message event
   */
  handleWebSocketMessage(event) {
    const { data, timestamp } = event.detail;
    log('debug', 'WebSocket message received', { data });
    
    // Process as sale data
    if (data && typeof data === 'object' && data.productName) {
      this.handleSale(data, timestamp);
    }
  }

  /**
   * Handle WebSocket error event
   */
  handleWebSocketError(event) {
    log('error', 'WebSocket error', { event });
    notifications.showError('WebSocket connection error');
    this.updateConnectionStatus(CONNECTION_STATES.DISCONNECTED);
  }

  /**
   * Handle WebSocket close event
   */
  handleWebSocketClose(event) {
    log('warn', 'WebSocket disconnected', { event });
    notifications.showWarning('Disconnected from vending stream. Attempting to reconnect...');
  }

  /**
   * Handle WebSocket state change
   */
  handleWebSocketStateChange(event) {
    const { state } = event.detail;
    this.updateConnectionStatus(state);
  }

  /**
   * Handle new sale data
   */
  async handleSale(saleData, timestamp) {
    if (this.isPaused) return;

    try {
      // Enrich sale data
      const enrichedSale = {
        ...saleData,
        timestamp: timestamp || Date.now(),
        id: generateId('sale')
      };

      // Add to analytics
      await analytics.addSale(enrichedSale);

      // Update live feed
      this.addToLiveFeed(enrichedSale);

      // Show celebration
      this.showCelebration(enrichedSale);

      // Send notifications
      await notifications.notifyPurchase(enrichedSale);

      // Update statistics
      this.updateStatistics();

      // Update charts
      await chartManager.updateCharts();

      // Dispatch custom event
      document.dispatchEvent(new CustomEvent('new-sale', { detail: enrichedSale }));

      log('info', 'Sale processed successfully', { sale: enrichedSale });

    } catch (error) {
      log('error', 'Failed to process sale', { error: error.message, saleData });
      notifications.showError('Failed to process sale data');
    }
  }

  /**
   * Add sale to live feed
   */
  addToLiveFeed(sale) {
    const liveFeed = document.getElementById('live-feed');
    if (!liveFeed) return;

    // Remove "no data" message
    const noDataItem = liveFeed.querySelector('.no-data');
    if (noDataItem) {
      noDataItem.remove();
    }

    // Create feed item
    const feedItem = document.createElement('li');
    feedItem.className = 'feed-item new-sale';
    feedItem.innerHTML = `
      <div class="feed-content">
        <i class="feed-emoji">${sale.emoji || '🍿'}</i>
        <div class="feed-details">
          <span class="feed-product">${sale.productName}</span>
          <div>
            <span class="feed-time">${formatTime(sale.timestamp)}</span>
            ${sale.price ? `<span class="feed-price">${formatCurrency(sale.price)}</span>` : ''}
          </div>
        </div>
      </div>
    `;

    // Add to top of feed
    liveFeed.insertBefore(feedItem, liveFeed.firstChild);

    // Limit feed items
    const feedItems = liveFeed.querySelectorAll('.feed-item');
    const maxItems = this.settings.feedLimit || CONFIG.UI.MAX_FEED_ITEMS;
    
    if (feedItems.length > maxItems) {
      feedItems[feedItems.length - 1].remove();
    }

    // Scroll to top
    liveFeed.scrollTop = 0;
  }

  /**
   * Show purchase celebration
   */
  showCelebration(sale) {
    const celebrationSection = document.getElementById('celebration-section');
    const celebrationDetails = document.getElementById('celebration-details');
    
    if (!celebrationSection || !celebrationDetails) return;

    const productInfo = getProductInfo(sale.productName);
    const price = sale.price ? ` for ${formatCurrency(sale.price)}` : '';
    
    celebrationDetails.innerHTML = `${productInfo.emoji} Someone just bought <strong>${sale.productName}</strong>${price}!`;
    
    // Show celebration
    celebrationSection.classList.remove('hidden');
    celebrationSection.classList.add('animate-bounce-in');

    // Generate confetti
    this.generateConfetti();

    // Hide after duration
    setTimeout(() => {
      celebrationSection.classList.add('animate-fade-out');
      setTimeout(() => {
        celebrationSection.classList.add('hidden');
        celebrationSection.classList.remove('animate-bounce-in', 'animate-fade-out');
      }, CONFIG.UI.ANIMATION_DURATION);
    }, CONFIG.UI.CELEBRATION_DURATION);
  }

  /**
   * Generate confetti animation
   */
  generateConfetti() {
    if (!this.settings.enableAnimations) return;

    const confettiContainer = document.querySelector('.confetti-container');
    if (!confettiContainer) return;

    // Clear existing confetti
    confettiContainer.innerHTML = '';

    // Generate confetti pieces
    for (let i = 0; i < 20; i++) {
      const confetti = document.createElement('div');
      confetti.className = Math.random() > 0.5 ? 'confetti confetti-circle' : 'confetti confetti-square';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.backgroundColor = this.getRandomColor();
      confetti.style.animationDelay = Math.random() * 2 + 's';
      confetti.style.animationDuration = (2 + Math.random() * 2) + 's';
      
      confettiContainer.appendChild(confetti);
    }

    // Clean up confetti after animation
    setTimeout(() => {
      confettiContainer.innerHTML = '';
    }, 5000);
  }

  /**
   * Get random color for confetti
   */
  getRandomColor() {
    const colors = ['#ff00ff', '#00ffff', '#ffff00', '#ff0080', '#00ff80', '#8000ff', '#ff8000', '#0080ff'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Update connection status UI
   */
  updateConnectionStatus(state) {
    const statusElement = document.getElementById('connection-status');
    if (!statusElement) return;

    const statusIcon = statusElement.querySelector('.status-indicator');
    const statusText = statusElement.querySelector('.status-text');

    statusElement.className = `connection-status ${state}`;

    switch (state) {
      case CONNECTION_STATES.CONNECTED:
        statusText.textContent = 'Connected';
        break;
      case CONNECTION_STATES.CONNECTING:
        statusText.textContent = 'Connecting...';
        break;
      case CONNECTION_STATES.DISCONNECTED:
        statusText.textContent = 'Disconnected';
        break;
      case CONNECTION_STATES.RECONNECTING:
        statusText.textContent = 'Reconnecting...';
        break;
    }
  }

  /**
   * Update statistics display
   */
  async updateStatistics() {
    const analyticsData = analytics.getAnalytics(TIME_PERIODS.ALL);
    const stats = analytics.getRealTimeStats();

    // Update stat cards
    this.updateStatCard('total-sales', stats.totalSales);
    this.updateStatCard('total-revenue', formatCurrency(analyticsData.totalRevenue));
    this.updateStatCard('avg-purchase', formatCurrency(analyticsData.averagePurchase));
    
    if (analyticsData.topProducts.length > 0) {
      const topProduct = analyticsData.topProducts[0];
      this.updateStatCard('popular-item', topProduct.name);
      this.updateStatText('popular-count', `${topProduct.count} sales`);
    }

    // Update comparison indicators
    if (analyticsData.comparisonToPrevious) {
      this.updateChangeIndicator('sales-change', analyticsData.comparisonToPrevious.sales);
      this.updateChangeIndicator('revenue-change', analyticsData.comparisonToPrevious.revenue);
      this.updateChangeIndicator('avg-change', analyticsData.comparisonToPrevious.averagePurchase);
    }
  }

  /**
   * Update stat card value
   */
  updateStatCard(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value;
      element.classList.add('roll-number');
      setTimeout(() => element.classList.remove('roll-number'), 600);
    }
  }

  /**
   * Update stat text
   */
  updateStatText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = text;
    }
  }

  /**
   * Update change indicator
   */
  updateChangeIndicator(elementId, changeData) {
    const element = document.getElementById(elementId);
    if (element && changeData) {
      element.textContent = changeData.changeFormatted;
      element.className = `change-value ${changeData.change >= 0 ? 'positive' : 'negative'}`;
    }
  }

  /**
   * Load and display initial data
   */
  async loadInitialData() {
    try {
      // Update statistics
      await this.updateStatistics();
      
      // Update charts
      await chartManager.updateCharts();
      
      // Load recent sales to feed
      await this.loadRecentSales();
      
      log('info', 'Initial data loaded successfully');
      
    } catch (error) {
      log('error', 'Failed to load initial data', { error: error.message });
    }
  }

  /**
   * Load recent sales to feed
   */
  async loadRecentSales() {
    const liveFeed = document.getElementById('live-feed');
    if (!liveFeed) return;

    const recentSales = await analytics.getSalesWithFilter({
      sort: (a, b) => b.timestamp - a.timestamp,
      limit: 10
    });

    if (recentSales.length === 0) return;

    // Clear current feed
    liveFeed.innerHTML = '';

    // Add recent sales
    recentSales.forEach(sale => {
      this.addToLiveFeedSilent(sale);
    });
  }

  /**
   * Add to live feed without animations (for loading)
   */
  addToLiveFeedSilent(sale) {
    const liveFeed = document.getElementById('live-feed');
    if (!liveFeed) return;

    const feedItem = document.createElement('li');
    feedItem.className = 'feed-item';
    feedItem.innerHTML = `
      <div class="feed-content">
        <i class="feed-emoji">${sale.emoji || '🍿'}</i>
        <div class="feed-details">
          <span class="feed-product">${sale.productName}</span>
          <div>
            <span class="feed-time">${formatRelativeTime(sale.timestamp)}</span>
            ${sale.price ? `<span class="feed-price">${formatCurrency(sale.price)}</span>` : ''}
          </div>
        </div>
      </div>
    `;

    liveFeed.appendChild(feedItem);
  }

  /**
   * Event Handlers
   */

  toggleTheme() {
    this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    
    // Update charts theme
    chartManager.updateTheme(this.currentTheme === 'dark');
    
    // Update theme toggle icon
    const themeIcon = document.querySelector('#theme-toggle i');
    if (themeIcon) {
      themeIcon.className = this.currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    // Save setting
    this.settings.theme = this.currentTheme;
    storage.setItem(STORAGE_KEYS.SETTINGS, this.settings);
    
    notifications.showInfo(`Switched to ${this.currentTheme} theme`);
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        notifications.showError('Fullscreen not supported');
      });
    } else {
      document.exitFullscreen();
    }
  }

  async refreshData() {
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = refreshBtn?.querySelector('i');
    
    if (refreshIcon) {
      refreshIcon.classList.add('fa-spin');
    }

    try {
      await analytics.loadData();
      await this.updateStatistics();
      await chartManager.updateCharts();
      await this.loadRecentSales();
      
      notifications.showSuccess('Data refreshed successfully');
      
    } catch (error) {
      notifications.showError('Failed to refresh data');
    } finally {
      if (refreshIcon) {
        refreshIcon.classList.remove('fa-spin');
      }
    }
  }

  handleTimeFilterChange(event) {
    const period = event.target.value;
    chartManager.updateCharts(period);
    this.updateStatistics();
  }

  handleChartPeriodChange(event) {
    const period = event.target.value;
    chartManager.updateChartPeriod('sales', period);
  }

  clearFeed() {
    if (confirm('Clear all items from the live feed?')) {
      const liveFeed = document.getElementById('live-feed');
      if (liveFeed) {
        liveFeed.innerHTML = `
          <li class="feed-item no-data">
            <div class="feed-content">
              <i class="fas fa-robot feed-emoji"></i>
              <div class="feed-details">
                <span class="feed-product">Feed cleared. Waiting for new purchases...</span>
                <span class="feed-time">--</span>
              </div>
            </div>
          </li>
        `;
      }
      notifications.showInfo('Live feed cleared');
    }
  }

  toggleFeedPause() {
    this.isPaused = !this.isPaused;
    const pauseBtn = document.getElementById('pause-feed-btn');
    const pauseIcon = pauseBtn?.querySelector('i');
    
    if (pauseIcon) {
      pauseIcon.className = this.isPaused ? 'fas fa-play' : 'fas fa-pause';
    }
    
    pauseBtn.title = this.isPaused ? 'Resume Feed' : 'Pause Feed';
    
    notifications.showInfo(`Live feed ${this.isPaused ? 'paused' : 'resumed'}`);
  }

  handleFeedSearch(event) {
    const query = event.target.value.toLowerCase().trim();
    const feedItems = document.querySelectorAll('#live-feed .feed-item:not(.no-data)');
    
    feedItems.forEach(item => {
      const productName = item.querySelector('.feed-product')?.textContent.toLowerCase() || '';
      const isVisible = productName.includes(query);
      item.style.display = isVisible ? 'block' : 'none';
    });
  }

  /**
   * Modal Management
   */

  showSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
      // Populate settings form
      this.populateSettingsForm();
      modal.classList.remove('hidden');
    }
  }

  showExportModal() {
    const modal = document.getElementById('export-modal');
    if (modal) {
      // Set default date range
      const today = new Date().toISOString().split('T')[0];
      const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      document.getElementById('export-start-date').value = lastWeek;
      document.getElementById('export-end-date').value = today;
      
      modal.classList.remove('hidden');
    }
  }

  showAddProductModal() {
    notifications.showToast('Add New Product', NOTIFICATION_TYPES.INFO, {
      persistent: true,
      actions: [{
        text: 'Quick Add',
        handler: () => {
          const name = prompt('Product name:');
          const stock = prompt('Initial stock:', '10');
          const price = prompt('Price:', '2.50');
          
          if (name && stock && price) {
            inventory.addProduct({
              name,
              currentStock: parseInt(stock),
              price: parseFloat(price)
            });
          }
        }
      }]
    });
  }

  closeModal() {
    document.querySelectorAll('.modal:not(.hidden)').forEach(modal => {
      modal.classList.add('hidden');
    });
  }

  populateSettingsForm() {
    document.getElementById('websocket-url').value = this.settings.websocketUrl || '';
    document.getElementById('reconnect-delay').value = this.settings.reconnectDelay || 3;
    document.getElementById('enable-sounds').checked = this.settings.enableSounds !== false;
    document.getElementById('enable-animations').checked = this.settings.enableAnimations !== false;
    document.getElementById('enable-notifications').checked = this.settings.enableNotifications || false;
    document.getElementById('low-stock-alerts').checked = this.settings.lowStockAlerts !== false;
    document.getElementById('feed-limit').value = this.settings.feedLimit || 50;
  }

  saveSettings() {
    this.settings = {
      ...this.settings,
      websocketUrl: document.getElementById('websocket-url').value,
      reconnectDelay: parseInt(document.getElementById('reconnect-delay').value),
      enableSounds: document.getElementById('enable-sounds').checked,
      enableAnimations: document.getElementById('enable-animations').checked,
      enableNotifications: document.getElementById('enable-notifications').checked,
      lowStockAlerts: document.getElementById('low-stock-alerts').checked,
      feedLimit: parseInt(document.getElementById('feed-limit').value)
    };

    storage.setItem(STORAGE_KEYS.SETTINGS, this.settings);
    
    // Update WebSocket URL if changed
    if (this.wsManager && this.wsManager.url !== this.settings.websocketUrl) {
      this.wsManager.updateUrl(this.settings.websocketUrl);
    }

    this.closeModal();
    notifications.showSuccess('Settings saved successfully');
  }

  resetSettings() {
    if (confirm('Reset all settings to defaults?')) {
      this.settings = { ...DEFAULT_SETTINGS };
      storage.setItem(STORAGE_KEYS.SETTINGS, this.settings);
      this.populateSettingsForm();
      notifications.showInfo('Settings reset to defaults');
    }
  }

  async handleExport() {
    const format = document.querySelector('input[name="export-format"]:checked')?.value || 'json';
    const startDate = document.getElementById('export-start-date').value;
    const endDate = document.getElementById('export-end-date').value;

    const options = {
      startDate: startDate || null,
      endDate: endDate || null,
      includeAnalytics: true,
      includeInventory: true
    };

    this.closeModal();
    
    const success = await exportManager.exportData(format, options);
    if (success) {
      log('info', 'Export completed', { format, options });
    }
  }

  /**
   * Window Event Handlers
   */

  handleBeforeUnload(event) {
    // Save any pending data
    this.saveSettings();
  }

  handleOnline() {
    notifications.showSuccess('Connection restored');
    if (this.wsManager && !this.wsManager.isConnected()) {
      this.wsManager.connect();
    }
  }

  handleOffline() {
    notifications.showWarning('You are now offline');
  }

  /**
   * Utility Methods
   */

  updateSettingsUI() {
    // Update theme toggle icon
    const themeIcon = document.querySelector('#theme-toggle i');
    if (themeIcon) {
      themeIcon.className = this.currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
  }

  setupAutoRefresh() {
    if (this.settings.autoRefresh !== false) {
      setInterval(() => {
        this.updateStatistics();
      }, 30000); // Update every 30 seconds
    }
  }

  showWelcomeMessage() {
    const isFirstVisit = !storage.getItem('vending_stream_visited', false);
    
    if (isFirstVisit) {
      setTimeout(() => {
        notifications.showInfo('Welcome to Vending Stream Analytics! 🎉', {
          duration: 6000,
          actions: [{
            text: 'Take Tour',
            handler: () => {
              notifications.showInfo('Connect your vending machine WebSocket to start tracking sales in real-time!');
            }
          }]
        });
      }, 2000);
      
      storage.setItem('vending_stream_visited', true);
    }
  }

  /**
   * Destroy application
   */
  destroy() {
    if (this.wsManager) {
      this.wsManager.destroy();
    }
    
    chartManager.destroy();
    notifications.destroy();
    inventory.destroy();
    
    log('info', 'Application destroyed');
  }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.vendingStreamApp = new VendingStreamApp();
  window.vendingStreamApp.init();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && window.vendingStreamApp) {
    // Page became visible, refresh data
    setTimeout(() => {
      window.vendingStreamApp.refreshData();
    }, 1000);
  }
});

// Export for global access
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VendingStreamApp;
}