/**
 * WebSocket Manager
 * Handles WebSocket connections, reconnection, and message processing
 */

class WebSocketManager extends EventTarget {
  constructor(url = CONFIG.WEBSOCKET.DEFAULT_URL) {
    super();
    this.url = url;
    this.ws = null;
    this.connectionState = CONNECTION_STATES.DISCONNECTED;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = CONFIG.WEBSOCKET.MAX_RECONNECT_ATTEMPTS;
    this.reconnectDelay = CONFIG.WEBSOCKET.RECONNECT_DELAY;
    this.heartbeatInterval = null;
    this.heartbeatTimer = null;
    this.messageQueue = [];
    this.isManualClose = false;
    
    // Bind methods
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.send = this.send.bind(this);
    this.onOpen = this.onOpen.bind(this);
    this.onMessage = this.onMessage.bind(this);
    this.onError = this.onError.bind(this);
    this.onClose = this.onClose.bind(this);
    this.startHeartbeat = this.startHeartbeat.bind(this);
    this.stopHeartbeat = this.stopHeartbeat.bind(this);
    
    log('info', 'WebSocket Manager initialized', { url: this.url });
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      log('warn', 'WebSocket already connected or connecting');
      return;
    }

    this.isManualClose = false;
    this.setConnectionState(CONNECTION_STATES.CONNECTING);
    
    try {
      log('info', 'Attempting WebSocket connection', { url: this.url, attempt: this.reconnectAttempts + 1 });
      
      this.ws = new WebSocket(this.url);
      this.ws.onopen = this.onOpen;
      this.ws.onmessage = this.onMessage;
      this.ws.onerror = this.onError;
      this.ws.onclose = this.onClose;

      // Set connection timeout
      this.connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          log('error', 'WebSocket connection timeout');
          this.ws.close();
          this.handleReconnect();
        }
      }, 10000); // 10 second timeout

    } catch (error) {
      log('error', 'WebSocket connection failed', { error: error.message });
      this.handleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    this.isManualClose = true;
    this.stopHeartbeat();
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setConnectionState(CONNECTION_STATES.DISCONNECTED);
    log('info', 'WebSocket manually disconnected');
  }

  /**
   * Send message through WebSocket
   */
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        const message = typeof data === 'string' ? data : JSON.stringify(data);
        this.ws.send(message);
        log('debug', 'Message sent', { data });
        return true;
      } catch (error) {
        log('error', 'Failed to send message', { error: error.message, data });
        return false;
      }
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push(data);
      log('warn', 'Message queued (connection not ready)', { data });
      return false;
    }
  }

  /**
   * Handle WebSocket open event
   */
  onOpen(event) {
    log('info', 'WebSocket connected successfully');
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    this.setConnectionState(CONNECTION_STATES.CONNECTED);
    this.reconnectAttempts = 0;
    this.startHeartbeat();

    // Send queued messages
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }

    // Emit connection event
    this.dispatchEvent(new CustomEvent('connected', { detail: event }));
  }

  /**
   * Handle WebSocket message event
   */
  onMessage(event) {
    try {
      let data;
      
      // Try to parse JSON data
      try {
        data = JSON.parse(event.data);
      } catch (e) {
        // If not JSON, use raw data
        data = event.data;
      }

      log('debug', 'Message received', { data });

      // Validate sale data if it looks like a sale
      if (data && typeof data === 'object' && data.productName) {
        const validationErrors = validateSaleData(data);
        if (validationErrors.length > 0) {
          log('warn', 'Invalid sale data received', { errors: validationErrors, data });
          return;
        }
      }

      // Emit message event
      this.dispatchEvent(new CustomEvent('message', { 
        detail: { data, raw: event.data, timestamp: Date.now() }
      }));

    } catch (error) {
      log('error', 'Failed to process message', { error: error.message, raw: event.data });
    }
  }

  /**
   * Handle WebSocket error event
   */
  onError(event) {
    log('error', 'WebSocket error occurred', { event });
    
    // Emit error event
    this.dispatchEvent(new CustomEvent('error', { detail: event }));
  }

  /**
   * Handle WebSocket close event
   */
  onClose(event) {
    log('info', 'WebSocket connection closed', { 
      code: event.code, 
      reason: event.reason, 
      wasClean: event.wasClean 
    });

    this.stopHeartbeat();
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    // Emit close event
    this.dispatchEvent(new CustomEvent('close', { detail: event }));

    // Handle reconnection if not manually closed
    if (!this.isManualClose) {
      this.handleReconnect();
    }
  }

  /**
   * Handle reconnection logic
   */
  handleReconnect() {
    if (this.isManualClose) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      log('error', 'Max reconnection attempts reached', { attempts: this.reconnectAttempts });
      this.setConnectionState(CONNECTION_STATES.DISCONNECTED);
      this.dispatchEvent(new CustomEvent('maxReconnectAttemptsReached'));
      return;
    }

    this.reconnectAttempts++;
    this.setConnectionState(CONNECTION_STATES.RECONNECTING);

    // Exponential backoff with jitter
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1) + Math.random() * 1000,
      30000 // Max 30 seconds
    );

    log('info', 'Scheduling reconnection', { 
      attempt: this.reconnectAttempts, 
      delay, 
      maxAttempts: this.maxReconnectAttempts 
    });

    setTimeout(() => {
      if (!this.isManualClose) {
        this.connect();
      }
    }, delay);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  startHeartbeat() {
    if (!CONFIG.WEBSOCKET.HEARTBEAT_INTERVAL) return;

    this.stopHeartbeat(); // Clear any existing heartbeat

    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping', timestamp: Date.now() });
      }
    }, CONFIG.WEBSOCKET.HEARTBEAT_INTERVAL);

    log('debug', 'Heartbeat started', { interval: CONFIG.WEBSOCKET.HEARTBEAT_INTERVAL });
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      log('debug', 'Heartbeat stopped');
    }

    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Set connection state and emit event
   */
  setConnectionState(state) {
    if (this.connectionState !== state) {
      const previousState = this.connectionState;
      this.connectionState = state;
      
      log('info', 'Connection state changed', { from: previousState, to: state });
      
      this.dispatchEvent(new CustomEvent('stateChange', { 
        detail: { state, previousState }
      }));
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState() {
    return this.connectionState;
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connectionState === CONNECTION_STATES.CONNECTED &&
           this.ws && 
           this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Update WebSocket URL
   */
  updateUrl(newUrl) {
    if (newUrl !== this.url) {
      log('info', 'Updating WebSocket URL', { from: this.url, to: newUrl });
      
      const wasConnected = this.isConnected();
      this.url = newUrl;
      
      if (wasConnected) {
        this.disconnect();
        setTimeout(() => this.connect(), 1000);
      }
    }
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      url: this.url,
      connectionState: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      isConnected: this.isConnected(),
      queuedMessages: this.messageQueue.length,
      hasHeartbeat: !!this.heartbeatInterval
    };
  }

  /**
   * Reset connection (disconnect and reconnect)
   */
  reset() {
    log('info', 'Resetting WebSocket connection');
    this.reconnectAttempts = 0;
    this.messageQueue = [];
    
    if (this.isConnected()) {
      this.disconnect();
      setTimeout(() => this.connect(), 1000);
    } else {
      this.connect();
    }
  }

  /**
   * Destroy WebSocket manager
   */
  destroy() {
    log('info', 'Destroying WebSocket manager');
    
    this.isManualClose = true;
    this.stopHeartbeat();
    this.disconnect();
    this.messageQueue = [];
    
    // Remove all event listeners
    this.removeAllListeners();
  }

  /**
   * Remove all event listeners (helper method)
   */
  removeAllListeners() {
    // This is a simplified version - in a real implementation,
    // you might want to track listeners and remove them properly
    const events = ['connected', 'message', 'error', 'close', 'stateChange', 'maxReconnectAttemptsReached'];
    events.forEach(event => {
      // Remove listeners (this is browser-specific and might need adjustment)
      try {
        this.removeEventListener(event, () => {});
      } catch (e) {
        // Ignore errors when removing listeners
      }
    });
  }
}

// Create global WebSocket manager instance
let wsManager = null;

/**
 * Initialize WebSocket manager
 */
function initWebSocket(url) {
  if (wsManager) {
    wsManager.destroy();
  }
  
  wsManager = new WebSocketManager(url);
  log('info', 'WebSocket manager created', { url });
  
  return wsManager;
}

/**
 * Get current WebSocket manager
 */
function getWebSocketManager() {
  return wsManager;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    WebSocketManager,
    initWebSocket,
    getWebSocketManager
  };
}