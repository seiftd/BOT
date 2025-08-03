# NAVIGi - Telegram Bot for Watching Ads and Earning Rewards

NAVIGi is a comprehensive Telegram bot that allows users to watch advertisements and earn rewards. The bot features a complete ecosystem with contests, VIP memberships, referral system, and multiple withdrawal methods.

## Features

### 🎯 Core Features
- **Ad Watching System**: Users can watch up to 20 ads daily (more for VIP users)
- **Point System**: 100 points = 1 USDT
- **Timer System**: 2-minute intervals between regular ads
- **Daily Reset**: Ad counters reset daily

### 🏆 Contest System
- **Daily Contest**: Watch 10 ads with 2-minute intervals (Winner gets X points)
- **Weekly Contest**: Watch 30 ads with 5-minute intervals (3 winners get X points each)
- **Monthly Contest**: Watch 200 ads with 15-minute intervals (3 winners get King VIP promotion)
- **VIP Contest**: Exclusive for VIP members - 50 ads in 10 days (Winner gets X points)

### 💎 VIP System
- **King VIP ($2.5 USDT)**: 10 daily mining points, 30 ads limit, VIP contests
- **Emperor VIP ($9 USDT)**: 25 daily mining points, 40 ads limit, VIP contests, leaderboard
- **Lord VIP ($20 USDT)**: 40 daily mining points, 60 ads limit, VIP contests, $2 withdrawal minimum, leaderboard

### 📋 Daily Tasks
- **Daily Login**: 1 point reward with 24-hour claiming period
- **Channel Subscription**: 1 point reward for subscribing to @NAVIGI_E

### 💸 Withdrawal System
- **Binance Pay**: Minimum $3 USDT ($2 for Lord VIP)
- **TON Wallet**: Minimum 1 TON
- **USDT TRC20**: Minimum $4 USDT

### 👥 Referral System
- **Basic Referral**: 1 point for each new user
- **VIP Referral Bonus**: 5 points when referred user purchases VIP
- **Weekly Leaderboard**: Top referrer gets X points

### 🌐 Multi-language Support
- **English** and **Arabic** interfaces
- Automatic language detection from user's Telegram settings

### 👨‍💼 Admin Dashboard
- User management and statistics
- Contest management
- Ad management
- Payment approvals
- Notification system

## Installation

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Telegram Bot Token (from @BotFather)

### Setup Instructions

1. **Clone the repository**
```bash
git clone <repository-url>
cd navigi-telegram-bot
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` file with your configuration:
```env
# Telegram Bot Configuration
BOT_TOKEN=your_telegram_bot_token_here
CHANNEL_USERNAME=@NAVIGI_E

# Database
DATABASE_PATH=./data/navigi.db

# Admin Configuration (comma-separated Telegram user IDs)
ADMIN_IDS=123456789,987654321

# Payment Addresses
TRC20_ADDRESS=TLDsutnxpdLZaRxhGWBJismwsjY3WiTHWX
TON_ADDRESS=UQBVeJflae5yTTgS6wczgpDkDcyEAnmA88bZyaiB3lYGqWw9

# Exchange Rates
TON_TO_USDT_RATE=3.6

# Contest Settings
DAILY_CONTEST_TIME=23:30
WEEKLY_CONTEST_DAY=1
MONTHLY_CONTEST_DAY=1

# Server Configuration
PORT=3000
JWT_SECRET=your_jwt_secret_here

# Notification Settings
NOTIFICATION_CHANNEL_ID=-1001234567890
```

4. **Initialize the database**
```bash
npm run db:migrate
```

5. **Start the bot**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## Bot Commands

### User Commands
- `/start` - Start the bot and register user
- `/help` - Show help information

### Admin Commands
- `/admin` - Access admin panel (admin only)

## File Structure

```
src/
├── database/           # Database configuration and schema
│   ├── database.js    # Database connection and utilities
│   └── schema.sql     # Database schema
├── handlers/          # Bot command and callback handlers
│   ├── menuHandler.js # Main menu navigation
│   ├── earnHandler.js # Ad watching and earning
│   ├── contestHandler.js # Contest system
│   ├── vipHandler.js  # VIP management
│   ├── profileHandler.js # User profile and withdrawal
│   ├── referralHandler.js # Referral system
│   └── adminHandler.js # Admin dashboard
├── locales/           # Language files
│   ├── en.json       # English translations
│   └── ar.json       # Arabic translations
├── models/            # Data models
│   ├── User.js       # User model and authentication
│   ├── Ad.js         # Advertisement and viewing system
│   ├── DailyTask.js  # Daily tasks management
│   └── Contest.js    # Contest system
├── utils/             # Utility functions
│   └── localization.js # Multi-language support
└── index.js          # Main bot entry point
```

## Database Schema

The bot uses SQLite database with the following main tables:
- `users` - User accounts and profiles
- `ads` - Advertisement listings
- `ad_views` - Ad viewing history
- `daily_tasks` - Daily task completions
- `contests` - Contest definitions
- `contest_participants` - Contest participation
- `vip_purchases` - VIP membership purchases
- `withdrawals` - Withdrawal requests
- `mining_rewards` - VIP mining rewards

## Admin Features

### User Management
- View total users and statistics
- Manage user VIP status
- Handle user issues

### Contest Management
- Create and manage contests
- View contest statistics
- Select winners manually if needed

### Payment Management
- Approve VIP purchases
- Process withdrawal requests
- View payment statistics

### Ad Management
- Add/edit/remove advertisements
- View ad performance statistics
- Toggle ad active status

### Notification System
- Send notifications to all users
- Send targeted notifications to VIP users
- Send notifications to specific users

## API Integration

The bot supports integration with:
- **Binance Pay** for USD payments
- **TON Blockchain** for TON payments
- **TRON Network** for USDT TRC20 payments

## Scheduled Tasks

The bot runs automated tasks:
- **Daily 00:00 UTC**: Create new contests, reset daily limits
- **Daily 00:05 UTC**: Process VIP mining rewards
- **Hourly**: End expired contests, select winners

## Security Features

- **Admin Authentication**: Only configured admin IDs can access admin features
- **Rate Limiting**: Built-in timers prevent spam
- **Transaction Verification**: All payments require transaction hash verification
- **Data Validation**: Input validation and sanitization

## Monitoring and Logging

- Comprehensive error logging
- Performance monitoring
- User activity tracking
- Payment audit trails

## Deployment

### Using PM2 (Recommended)
```bash
npm install -g pm2
pm2 start src/index.js --name navigi-bot
pm2 save
pm2 startup
```

### Using Docker
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables for Production
```env
NODE_ENV=production
BOT_TOKEN=your_production_bot_token
DATABASE_PATH=/app/data/navigi.db
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Join the official Telegram channel: @NAVIGI_E

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Changelog

### Version 1.0.0
- Initial release
- Complete ad watching system
- Contest system implementation
- VIP membership features
- Multi-language support
- Admin dashboard
- Referral system
- Withdrawal system