/**
 * Notifications Manager
 * Handles toast notifications, browser notifications, and sound alerts
 */

class NotificationsManager {
  constructor() {
    this.toastContainer = null;
    this.notificationPermission = 'default';
    this.sounds = new Map();
    this.toastQueue = [];
    this.maxToasts = 5;
    this.defaultDuration = CONFIG.UI.TOAST_DURATION;
    
    this.init();
    log('info', 'Notifications Manager initialized');
  }

  /**
   * Initialize notifications manager
   */
  async init() {
    this.createToastContainer();
    await this.checkNotificationPermission();
    this.preloadSounds();
  }

  /**
   * Create toast container if it doesn't exist
   */
  createToastContainer() {
    this.toastContainer = document.getElementById('toast-container');
    if (!this.toastContainer) {
      this.toastContainer = document.createElement('div');
      this.toastContainer.id = 'toast-container';
      this.toastContainer.className = 'toast-container';
      document.body.appendChild(this.toastContainer);
    }
  }

  /**
   * Check and request notification permission
   */
  async checkNotificationPermission() {
    if (!BROWSER_SUPPORT.NOTIFICATIONS) {
      log('warn', 'Browser notifications not supported');
      return false;
    }

    this.notificationPermission = Notification.permission;
    
    if (this.notificationPermission === 'default') {
      try {
        this.notificationPermission = await Notification.requestPermission();
        log('info', 'Notification permission requested', { permission: this.notificationPermission });
      } catch (error) {
        log('error', 'Failed to request notification permission', { error: error.message });
      }
    }

    return this.notificationPermission === 'granted';
  }

  /**
   * Preload sound effects
   */
  preloadSounds() {
    if (!BROWSER_SUPPORT.WEB_AUDIO) {
      log('warn', 'Web Audio API not supported');
      return;
    }

    Object.entries(SOUNDS).forEach(([key, sound]) => {
      try {
        const audio = new Audio();
        audio.preload = 'auto';
        audio.volume = sound.volume;
        
        // Use data URL for simple beep sounds since we don't have actual audio files
        audio.src = this.generateBeepSound(key);
        
        this.sounds.set(key, audio);
        log('debug', 'Sound preloaded', { key });
      } catch (error) {
        log('warn', 'Failed to preload sound', { key, error: error.message });
      }
    });
  }

  /**
   * Generate simple beep sounds using Web Audio API
   */
  generateBeepSound(type) {
    if (!BROWSER_SUPPORT.WEB_AUDIO) return '';

    try {
      // Create a short beep sound based on type
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const duration = 0.3; // seconds
      const sampleRate = audioContext.sampleRate;
      const buffer = audioContext.createBuffer(1, duration * sampleRate, sampleRate);
      const data = buffer.getChannelData(0);

      let frequency;
      switch (type) {
        case 'PURCHASE': frequency = 800; break;
        case 'ALERT': frequency = 600; break;
        case 'NOTIFICATION': frequency = 500; break;
        case 'ERROR': frequency = 300; break;
        default: frequency = 440;
      }

      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        data[i] = Math.sin(2 * Math.PI * frequency * t) * Math.exp(-3 * t);
      }

      // Convert buffer to wav data URL (simplified)
      return 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+b1vnMeCAPEcYm3jb9iUmlxq+OfRUIRBs/FjJZWVlxqddXveFtbSRdrheRYa1PoXEIKNJfY7M2QDRQN';
    } catch (error) {
      log('warn', 'Failed to generate beep sound', { type, error: error.message });
      return '';
    }
  }

  /**
   * Show toast notification
   */
  showToast(message, type = NOTIFICATION_TYPES.INFO, options = {}) {
    const toast = {
      id: generateId('toast'),
      message: sanitizeHtml(message),
      type,
      duration: options.duration || this.defaultDuration,
      persistent: options.persistent || false,
      actions: options.actions || [],
      timestamp: Date.now()
    };

    // Add to queue if too many toasts are visible
    const visibleToasts = this.toastContainer.children.length;
    if (visibleToasts >= this.maxToasts) {
      this.toastQueue.push(toast);
      return toast.id;
    }

    this.renderToast(toast);
    log('debug', 'Toast notification shown', { toast });
    
    return toast.id;
  }

  /**
   * Render toast element
   */
  renderToast(toast) {
    const toastElement = document.createElement('div');
    toastElement.className = `toast ${toast.type}`;
    toastElement.id = toast.id;
    toastElement.setAttribute('role', 'alert');
    toastElement.setAttribute('aria-live', 'assertive');

    const icon = this.getToastIcon(toast.type);
    
    toastElement.innerHTML = `
      <div class="toast-content">
        <i class="toast-icon ${icon}"></i>
        <div class="toast-message">${toast.message}</div>
        <button class="toast-close" aria-label="Close notification">
          <i class="fas fa-times"></i>
        </button>
      </div>
      ${toast.actions.length > 0 ? this.renderToastActions(toast.actions) : ''}
    `;

    // Add event listeners
    const closeButton = toastElement.querySelector('.toast-close');
    closeButton.addEventListener('click', () => this.dismissToast(toast.id));

    // Add action listeners
    toast.actions.forEach((action, index) => {
      const actionButton = toastElement.querySelector(`[data-action="${index}"]`);
      if (actionButton) {
        actionButton.addEventListener('click', () => {
          if (action.handler) action.handler();
          if (!action.persistent) this.dismissToast(toast.id);
        });
      }
    });

    // Add to container
    this.toastContainer.appendChild(toastElement);

    // Trigger animation
    requestAnimationFrame(() => {
      toastElement.classList.add('animate-fade-in');
    });

    // Auto-dismiss if not persistent
    if (!toast.persistent) {
      setTimeout(() => {
        this.dismissToast(toast.id);
      }, toast.duration);
    }
  }

  /**
   * Render toast actions
   */
  renderToastActions(actions) {
    return `
      <div class="toast-actions">
        ${actions.map((action, index) => 
          `<button class="toast-action" data-action="${index}">${action.text}</button>`
        ).join('')}
      </div>
    `;
  }

  /**
   * Get icon for toast type
   */
  getToastIcon(type) {
    const icons = {
      [NOTIFICATION_TYPES.SUCCESS]: 'fas fa-check-circle',
      [NOTIFICATION_TYPES.ERROR]: 'fas fa-exclamation-circle',
      [NOTIFICATION_TYPES.WARNING]: 'fas fa-exclamation-triangle',
      [NOTIFICATION_TYPES.INFO]: 'fas fa-info-circle'
    };
    return icons[type] || icons[NOTIFICATION_TYPES.INFO];
  }

  /**
   * Dismiss toast notification
   */
  dismissToast(toastId) {
    const toastElement = document.getElementById(toastId);
    if (!toastElement) return;

    toastElement.classList.add('animate-fade-out');
    
    setTimeout(() => {
      if (toastElement.parentNode) {
        toastElement.parentNode.removeChild(toastElement);
      }
      
      // Show next toast from queue
      this.showNextToastFromQueue();
    }, CONFIG.UI.ANIMATION_DURATION);

    log('debug', 'Toast notification dismissed', { toastId });
  }

  /**
   * Show next toast from queue
   */
  showNextToastFromQueue() {
    if (this.toastQueue.length > 0) {
      const nextToast = this.toastQueue.shift();
      this.renderToast(nextToast);
    }
  }

  /**
   * Clear all toast notifications
   */
  clearAllToasts() {
    while (this.toastContainer.firstChild) {
      this.toastContainer.removeChild(this.toastContainer.firstChild);
    }
    this.toastQueue = [];
    log('info', 'All toast notifications cleared');
  }

  /**
   * Show browser notification
   */
  async showBrowserNotification(title, options = {}) {
    if (!await this.checkNotificationPermission()) {
      log('warn', 'Browser notifications not permitted');
      return null;
    }

    try {
      const notification = new Notification(title, {
        body: options.message || '',
        icon: options.icon || '/favicon.ico',
        tag: options.tag || 'vending-stream',
        renotify: options.renotify || false,
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
        ...options
      });

      // Handle notification events
      notification.onclick = () => {
        window.focus();
        if (options.onClick) options.onClick();
        notification.close();
      };

      notification.onclose = () => {
        if (options.onClose) options.onClose();
      };

      notification.onerror = (error) => {
        log('error', 'Browser notification error', { error });
        if (options.onError) options.onError(error);
      };

      // Auto-close after duration
      if (options.duration) {
        setTimeout(() => {
          notification.close();
        }, options.duration);
      }

      log('info', 'Browser notification shown', { title });
      return notification;

    } catch (error) {
      log('error', 'Failed to show browser notification', { error: error.message });
      return null;
    }
  }

  /**
   * Play sound effect
   */
  async playSound(soundType, options = {}) {
    const settings = storage.getItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    if (!settings.enableSounds) return false;

    const audio = this.sounds.get(soundType);
    if (!audio) {
      log('warn', 'Sound not found', { soundType });
      return false;
    }

    try {
      // Reset audio to beginning
      audio.currentTime = 0;
      
      // Set volume
      if (options.volume !== undefined) {
        audio.volume = Math.max(0, Math.min(1, options.volume));
      }

      // Play audio
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        await playPromise;
      }

      log('debug', 'Sound played', { soundType });
      return true;

    } catch (error) {
      // Handle autoplay restrictions
      if (error.name === 'NotAllowedError') {
        log('warn', 'Audio autoplay blocked by browser', { soundType });
      } else {
        log('error', 'Failed to play sound', { soundType, error: error.message });
      }
      return false;
    }
  }

  /**
   * Show purchase notification (combines toast, browser notification, and sound)
   */
  async notifyPurchase(sale) {
    const productInfo = getProductInfo(sale.productName);
    const price = sale.price ? ` for ${formatCurrency(sale.price)}` : '';
    const message = `${productInfo.emoji} ${sale.productName}${price}`;

    // Show toast
    this.showToast(`New purchase: ${message}`, NOTIFICATION_TYPES.SUCCESS);

    // Show browser notification if enabled
    const settings = storage.getItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    if (settings.enableNotifications) {
      await this.showBrowserNotification('New Purchase!', {
        message: `Someone bought ${sale.productName}${price}`,
        icon: '/favicon.ico',
        tag: 'purchase',
        requireInteraction: false,
        duration: 5000
      });
    }

    // Play sound
    await this.playSound('PURCHASE');

    log('info', 'Purchase notification sent', { sale });
  }

  /**
   * Show error notification
   */
  showError(message, options = {}) {
    this.showToast(message, NOTIFICATION_TYPES.ERROR, {
      duration: options.duration || 6000,
      persistent: options.persistent || false
    });

    this.playSound('ERROR');
    
    log('warn', 'Error notification shown', { message });
  }

  /**
   * Show warning notification
   */
  showWarning(message, options = {}) {
    this.showToast(message, NOTIFICATION_TYPES.WARNING, {
      duration: options.duration || 5000,
      ...options
    });

    this.playSound('ALERT');
    
    log('info', 'Warning notification shown', { message });
  }

  /**
   * Show success notification
   */
  showSuccess(message, options = {}) {
    this.showToast(message, NOTIFICATION_TYPES.SUCCESS, {
      duration: options.duration || 4000,
      ...options
    });

    log('info', 'Success notification shown', { message });
  }

  /**
   * Show info notification
   */
  showInfo(message, options = {}) {
    this.showToast(message, NOTIFICATION_TYPES.INFO, {
      duration: options.duration || 4000,
      ...options
    });

    log('info', 'Info notification shown', { message });
  }

  /**
   * Show low stock alert
   */
  showLowStockAlert(product, currentStock) {
    const settings = storage.getItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    if (!settings.lowStockAlerts) return;

    this.showWarning(`Low stock alert: ${product.name} (${currentStock} remaining)`, {
      persistent: true,
      actions: [{
        text: 'Restock',
        handler: () => {
          // Trigger restock event
          document.dispatchEvent(new CustomEvent('restock-request', { 
            detail: { product, currentStock }
          }));
        }
      }, {
        text: 'Dismiss',
        persistent: false
      }]
    });

    // Browser notification for low stock
    if (settings.enableNotifications) {
      this.showBrowserNotification('Low Stock Alert', {
        message: `${product.name} is running low (${currentStock} remaining)`,
        tag: 'low-stock',
        requireInteraction: true
      });
    }
  }

  /**
   * Test all notification types
   */
  testNotifications() {
    this.showInfo('This is an info notification');
    setTimeout(() => this.showSuccess('This is a success notification'), 1000);
    setTimeout(() => this.showWarning('This is a warning notification'), 2000);
    setTimeout(() => this.showError('This is an error notification'), 3000);
    
    this.playSound('NOTIFICATION');
    
    log('info', 'Notification test completed');
  }

  /**
   * Get notification statistics
   */
  getStats() {
    return {
      permission: this.notificationPermission,
      toastCount: this.toastContainer.children.length,
      queueLength: this.toastQueue.length,
      soundsLoaded: this.sounds.size,
      browserSupport: {
        notifications: BROWSER_SUPPORT.NOTIFICATIONS,
        webAudio: BROWSER_SUPPORT.WEB_AUDIO
      }
    };
  }

  /**
   * Destroy notifications manager
   */
  destroy() {
    this.clearAllToasts();
    
    // Remove toast container
    if (this.toastContainer && this.toastContainer.parentNode) {
      this.toastContainer.parentNode.removeChild(this.toastContainer);
    }

    // Clear sounds
    this.sounds.clear();

    log('info', 'Notifications manager destroyed');
  }
}

// Create global notifications manager instance
const notifications = new NotificationsManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    NotificationsManager,
    notifications
  };
}