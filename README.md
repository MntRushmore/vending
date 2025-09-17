# Vending Stream Analytics 🎯

A modern, real-time analytics dashboard for vending machine sales tracking with advanced features and beautiful cyberpunk design.

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![JavaScript](https://img.shields.io/badge/javascript-ES6+-yellow.svg)
![CSS](https://img.shields.io/badge/css-Grid%20%26%20Flexbox-blue.svg)

## ✨ Features

### 🎯 Core Features
- **Real-time Sales Tracking** - WebSocket connection for live purchase updates
- **Advanced Analytics** - Comprehensive statistics and insights
- **Interactive Charts** - Beautiful visualizations with Chart.js
- **Inventory Management** - Track stock levels and get low-stock alerts
- **Data Export** - Export data in CSV, JSON, and PDF formats
- **Responsive Design** - Works perfectly on desktop, tablet, and mobile

### 🚀 Enhanced Features
- **Live Purchase Feed** - Real-time scrolling feed of transactions
- **Celebration Animations** - Confetti and sound effects for new sales
- **Smart Notifications** - Toast notifications and browser alerts
- **Theme Support** - Dark/light theme toggle
- **Offline Support** - IndexedDB storage for offline functionality
- **Search & Filtering** - Advanced filtering and search capabilities
- **Keyboard Shortcuts** - Power user keyboard shortcuts
- **Performance Optimized** - Lazy loading and efficient rendering

## 🏗️ Architecture

### Frontend Stack
- **HTML5** - Semantic markup with modern standards
- **CSS3** - Grid, Flexbox, Custom Properties, and advanced animations
- **Vanilla JavaScript** - ES6+ with modular architecture
- **Chart.js** - Interactive data visualizations
- **IndexedDB** - Client-side data persistence

### Component Architecture
```
├── utils/
│   ├── constants.js      # Application constants and configuration
│   ├── storage.js        # Storage management (localStorage/IndexedDB)
│   └── helpers.js        # Utility functions and helpers
├── components/
│   ├── websocket.js      # WebSocket connection management
│   ├── analytics.js      # Data analysis and statistics
│   ├── charts.js         # Chart management and rendering
│   ├── notifications.js  # Notification system
│   ├── export.js         # Data export functionality
│   └── inventory.js      # Inventory tracking system
└── assets/
    ├── css/
    │   ├── main.css       # Core styles and layout
    │   ├── dashboard.css  # Dashboard-specific styles
    │   └── animations.css # Animation definitions
    └── js/
        └── main.js        # Main application controller
```

## 🚀 Quick Start

### Prerequisites
- Modern web browser with ES6+ support
- WebSocket server for real-time data (optional for demo)

### Installation
1. **Clone or download the project**
   ```bash
   git clone <repository-url>
   cd vending-stream-analytics
   ```

2. **Serve the files**
   ```bash
   # Using Python (recommended)
   python3 -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```

3. **Open in browser**
   ```
   http://localhost:8000
   ```

### WebSocket Configuration
Update the WebSocket URL in the settings panel or modify `CONFIG.WEBSOCKET.DEFAULT_URL` in `utils/constants.js`.

## 📱 Usage

### Basic Operation
1. **Connect WebSocket** - Configure your WebSocket URL in settings
2. **Monitor Sales** - Watch real-time purchase data in the live feed
3. **View Analytics** - Check statistics and charts for insights
4. **Manage Inventory** - Add products and track stock levels
5. **Export Data** - Download sales data in various formats

### Keyboard Shortcuts
- `Ctrl/Cmd + R` - Refresh data
- `Ctrl/Cmd + E` - Export data
- `Ctrl/Cmd + T` - Toggle theme
- `F11` - Toggle fullscreen
- `Escape` - Close modals

### WebSocket Data Format
Send JSON data to the WebSocket in this format:
```json
{
  "productName": "Chocolate Bar",
  "price": 2.50,
  "timestamp": 1640995200000
}
```

## ⚙️ Configuration

### Settings Panel
Access settings via the gear icon in the navigation bar:

- **WebSocket URL** - Your real-time data source
- **Reconnect Delay** - Time between reconnection attempts
- **Sound Effects** - Enable/disable audio notifications
- **Animations** - Enable/disable visual animations
- **Browser Notifications** - Enable native browser notifications
- **Low Stock Alerts** - Get notified when inventory is low
- **Feed Limit** - Maximum items in live feed

### Environment Variables
Modify `utils/constants.js` to customize:

```javascript
const CONFIG = {
  WEBSOCKET: {
    DEFAULT_URL: 'wss://your-websocket-server.com',
    RECONNECT_DELAY: 3000,
    MAX_RECONNECT_ATTEMPTS: 10
  },
  UI: {
    MAX_FEED_ITEMS: 50,
    CELEBRATION_DURATION: 5000,
    TOAST_DURATION: 4000
  }
};
```

## 📊 Data Management

### Storage Options
- **localStorage** - Settings and small data
- **IndexedDB** - Large datasets and offline support
- **sessionStorage** - Temporary data and logs

### Data Export Formats
1. **CSV** - Spreadsheet-compatible format
2. **JSON** - Complete data with metadata
3. **PDF** - Formatted report for printing

### Analytics Features
- Total sales and revenue tracking
- Average purchase calculations
- Product popularity rankings
- Time-based analysis (hourly, daily, weekly)
- Comparison to previous periods
- Automated insights generation

## 🎨 Customization

### Theming
The application supports dark and light themes via CSS custom properties:

```css
:root {
  --bg-primary: #0a0a0a;
  --text-primary: #ffffff;
  --accent-primary: #00d4ff;
  /* ... more variables */
}

[data-theme="light"] {
  --bg-primary: #ffffff;
  --text-primary: #212529;
  /* ... light theme overrides */
}
```

### Product Mapping
Add custom product emojis and categories in `utils/constants.js`:

```javascript
const PRODUCT_MAPPING = {
  'your-product': { 
    emoji: '🎯', 
    category: 'custom', 
    color: '#ff6b6b' 
  }
};
```

### Chart Customization
Modify chart appearance in `components/charts.js` and `utils/constants.js`.

## 🔧 Production Deployment

### Using PM2 (Recommended)

1. **Install PM2**
   ```bash
   npm install -g pm2
   ```

2. **Create ecosystem file**
   ```bash
   # ecosystem.config.js is already included
   ```

3. **Start with PM2**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

### Using Docker

1. **Build image**
   ```bash
   docker build -t vending-stream .
   ```

2. **Run container**
   ```bash
   docker run -d -p 8080:8080 --name vending-stream vending-stream
   ```

### Using Nginx
Configure Nginx to serve static files and proxy WebSocket connections:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    root /path/to/vending-stream;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /ws {
        proxy_pass http://your-websocket-server;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 🐛 Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check WebSocket URL format
   - Verify server is running
   - Check browser console for errors
   - Try different WebSocket endpoint

2. **Data Not Saving**
   - Check browser storage permissions
   - Clear browser cache
   - Try incognito/private mode
   - Check available storage space

3. **Charts Not Displaying**
   - Ensure Chart.js is loaded
   - Check browser console for errors
   - Verify data format is correct
   - Try refreshing the page

4. **Performance Issues**
   - Reduce feed limit in settings
   - Disable animations on mobile
   - Clear old data regularly
   - Check browser memory usage

### Browser Support
- **Chrome** 70+ ✅
- **Firefox** 65+ ✅
- **Safari** 12+ ✅
- **Edge** 79+ ✅

### Debug Mode
Enable debug logging by setting `DEV_CONFIG.DEBUG_MODE = true` in `utils/constants.js`.

## 📈 Performance

### Optimization Features
- **Lazy Loading** - Components load as needed
- **Debounced Events** - Reduced event handler calls
- **Efficient Rendering** - Virtual scrolling for large datasets
- **Memory Management** - Automatic cleanup and cache management
- **Responsive Images** - Optimized assets for different screen sizes

### Monitoring
The application includes built-in performance monitoring:
- Memory usage tracking
- WebSocket connection statistics
- Render time measurement
- Error logging and reporting

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Style
- Use ES6+ features
- Follow existing naming conventions
- Add JSDoc comments for functions
- Maintain consistent indentation
- Use semantic CSS class names

### Testing
- Test on multiple browsers
- Verify mobile responsiveness
- Test WebSocket reconnection
- Validate data export functionality
- Check accessibility compliance

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Chart.js** - Beautiful chart library
- **Font Awesome** - Icon library
- **Google Fonts** - Typography
- **Modern CSS** - Grid and Flexbox layouts

## 🔮 Roadmap

### Upcoming Features
- [ ] Real-time collaboration
- [ ] Advanced reporting
- [ ] API integration
- [ ] Mobile app version
- [ ] Machine learning insights
- [ ] Custom dashboard builder

## 📞 Support

For support, please:
1. Check the troubleshooting section
2. Search existing issues
3. Create a new issue with detailed information
4. Include browser version and error messages

---

**Built with ❤️ for the modern web**

*Vending Stream Analytics v2.0.0 - Transforming vending machine data into actionable insights*