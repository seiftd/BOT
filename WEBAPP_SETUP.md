# NAVIGi Telegram Mini App Setup Guide

This guide will help you deploy and configure the NAVIGi Telegram Mini App (WebApp) for a modern, native-like user experience.

## 🌟 Mini App Features

### ✨ Modern Interface
- **Responsive Design**: Optimized for mobile devices
- **Native Feel**: Smooth animations and intuitive navigation
- **Dark/Light Theme**: Automatic adaptation to Telegram theme
- **Real-time Updates**: Live data synchronization

### 🎯 Core Functionality
- **Ad Watching**: Interactive ad viewing with countdown timer
- **Daily Tasks**: Login rewards and channel subscription tracking
- **Contests**: Real-time contest participation and progress tracking
- **VIP Mining**: One-click mining reward claims
- **Profile Management**: Complete user statistics and referral system

### 🔐 Security
- **Telegram Authentication**: Secure WebApp data validation
- **API Protection**: Request authentication via Telegram init data
- **Rate Limiting**: Built-in protection against abuse

## 🚀 Deployment Options

### Option 1: Vercel (Recommended)

1. **Fork the repository** to your GitHub account

2. **Deploy to Vercel**:
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel --prod
   ```

3. **Configure Environment Variables** in Vercel dashboard:
   ```env
   BOT_TOKEN=your_bot_token
   DATABASE_PATH=/tmp/navigi.db
   CHANNEL_USERNAME=@NAVIGI_E
   ADMIN_IDS=123456789,987654321
   TRC20_ADDRESS=TLDsutnxpdLZaRxhGWBJismwsjY3WiTHWX
   TON_ADDRESS=UQBVeJflae5yTTgS6wczgpDkDcyEAnmA88bZyaiB3lYGqWw9
   TON_TO_USDT_RATE=3.6
   JWT_SECRET=your_jwt_secret
   ```

4. **Create vercel.json**:
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "src/webapp/server.js",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "src/webapp/server.js"
       }
     ],
     "env": {
       "NODE_ENV": "production"
     }
   }
   ```

### Option 2: Heroku

1. **Create Heroku app**:
   ```bash
   heroku create navigi-webapp
   ```

2. **Set environment variables**:
   ```bash
   heroku config:set BOT_TOKEN=your_bot_token
   heroku config:set WEBAPP_URL=https://navigi-webapp.herokuapp.com
   # ... other env vars
   ```

3. **Deploy**:
   ```bash
   git push heroku main
   ```

### Option 3: VPS/Docker

1. **Clone repository**:
   ```bash
   git clone <your-repo>
   cd navigi-telegram-bot
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Deploy with Docker**:
   ```bash
   docker-compose up -d
   ```

4. **Setup Nginx reverse proxy**:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

## 🔧 Bot Configuration

### 1. Register Mini App with BotFather

1. **Open @BotFather** in Telegram
2. **Send** `/mybots`
3. **Select your bot**
4. **Choose** "Bot Settings" → "Menu Button"
5. **Configure Web App**:
   - **URL**: Your deployed Mini App URL
   - **Text**: "🚀 Open NAVIGi App"

### 2. Update Bot Code

Ensure your `.env` file includes:
```env
WEBAPP_URL=https://your-deployed-app.com
```

### 3. Test Mini App

1. **Open your bot** in Telegram
2. **Tap the menu button** (bottom left)
3. **Select "🚀 Open NAVIGi App"**
4. **Verify** all functionality works

## 📱 Mini App Structure

```
src/webapp/
├── server.js          # Express server with API endpoints
├── public/
│   ├── index.html     # Main Mini App interface
│   ├── style.css      # Modern responsive styling
│   └── app.js         # JavaScript functionality
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/user/profile` | GET | Get user profile data |
| `/api/user/stats` | GET | Get user statistics |
| `/api/ads/available` | GET | Check ad availability |
| `/api/ads/watch` | POST | Watch advertisement |
| `/api/tasks/status` | GET | Get daily tasks status |
| `/api/tasks/claim` | POST | Claim task rewards |
| `/api/contests/status` | GET | Get contests status |
| `/api/contests/join` | POST | Join contest |
| `/api/contests/watch-ad` | POST | Watch contest ad |
| `/api/vip/mining` | GET | Get VIP mining rewards |
| `/api/vip/claim-mining` | POST | Claim mining rewards |
| `/api/referral/stats` | GET | Get referral statistics |

## 🎨 Customization

### Theme Colors

Modify CSS variables in `style.css`:
```css
:root {
    --primary-color: #007AFF;
    --secondary-color: #34C759;
    --gold-color: #FFD700;
    /* ... other colors */
}
```

### Bot Username

Update in `app.js`:
```javascript
const botUsername = 'YourBot_bot'; // Replace with your bot username
```

### Branding

1. **Update app title** in `index.html`
2. **Modify header text** and emojis
3. **Change color scheme** in CSS
4. **Add your logo** (replace emoji avatars)

## 🔍 Debugging

### Enable Debug Mode

Add to your `.env`:
```env
NODE_ENV=development
DEBUG=webapp:*
```

### Common Issues

1. **"Invalid init data"**:
   - Check BOT_TOKEN is correct
   - Ensure WEBAPP_URL matches deployed URL
   - Verify Telegram WebApp is properly configured

2. **"Failed to load user data"**:
   - Check database connection
   - Verify API endpoints are working
   - Check server logs for errors

3. **UI not responsive**:
   - Clear browser cache
   - Check CSS file loading
   - Verify viewport meta tag

### Testing Outside Telegram

For development, you can test outside Telegram by modifying the mock data in `app.js`:
```javascript
this.tg = {
    initData: 'user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22Test%22%7D&hash=test',
    // ... other mock methods
};
```

## 📊 Analytics

### Track User Engagement

Add analytics to `app.js`:
```javascript
// Track page views
gtag('event', 'page_view', {
    page_title: 'NAVIGi Mini App',
    page_location: window.location.href
});

// Track ad watches
gtag('event', 'ad_watched', {
    event_category: 'engagement',
    value: pointsEarned
});
```

### Monitor Performance

Use Vercel Analytics or Google Analytics to track:
- **User engagement** time
- **Feature usage** patterns
- **Error rates**
- **Performance metrics**

## 🚀 Advanced Features

### Push Notifications

Add service worker for notifications:
```javascript
// Register service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}

// Request notification permission
Notification.requestPermission();
```

### Offline Support

Implement caching strategy:
```javascript
// Cache API responses
const cache = new Map();
const cachedRequest = async (url) => {
    if (cache.has(url)) {
        return cache.get(url);
    }
    const response = await fetch(url);
    cache.set(url, response);
    return response;
};
```

### Real-time Updates

Add WebSocket support:
```javascript
// Connect to WebSocket
const ws = new WebSocket('wss://your-domain.com/ws');
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    updateUI(data);
};
```

## 🔒 Security Best Practices

1. **Validate all inputs** on server side
2. **Use HTTPS** for all connections
3. **Implement rate limiting** for API endpoints
4. **Sanitize user data** before database operations
5. **Keep dependencies updated**

## 📈 Performance Optimization

1. **Minify CSS/JS** files for production
2. **Compress images** and use WebP format
3. **Enable gzip** compression on server
4. **Use CDN** for static assets
5. **Implement lazy loading** for content

## 🎯 User Experience Tips

1. **Fast loading**: Optimize initial page load
2. **Smooth animations**: Use CSS transitions
3. **Clear feedback**: Show loading states and confirmations
4. **Error handling**: Provide helpful error messages
5. **Accessibility**: Support screen readers and keyboard navigation

## 📞 Support

For issues or questions about the Mini App:
1. Check the troubleshooting section
2. Review server logs for errors
3. Test API endpoints individually
4. Verify Telegram WebApp configuration
5. Contact support with specific error messages

## 🔄 Updates

To update the Mini App:
1. **Pull latest changes** from repository
2. **Test locally** before deploying
3. **Deploy to staging** environment first
4. **Update production** after verification
5. **Monitor** for any issues after deployment

The Mini App provides a significantly better user experience compared to traditional bot interactions, with native-like performance and modern UI design.