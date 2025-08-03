require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const database = require('./database/database');
const cron = require('node-cron');

// Models
const User = require('./models/User');
const { Ad, AdView, AdWatchingService } = require('./models/Ad');
const { DailyTask, DailyTasksService } = require('./models/DailyTask');
const { Contest, ContestService } = require('./models/Contest');

// Utils
const localization = require('./utils/localization');

// Bot handlers
const MenuHandler = require('./handlers/menuHandler');
const EarnHandler = require('./handlers/earnHandler');
const ContestHandler = require('./handlers/contestHandler');
const VipHandler = require('./handlers/vipHandler');
const ProfileHandler = require('./handlers/profileHandler');
const ReferralHandler = require('./handlers/referralHandler');
const AdminHandler = require('./handlers/adminHandler');

// WebApp Server
const WebAppServer = require('./webapp/server');

class NAVIGiBot {
    constructor() {
        this.bot = null;
        this.webAppServer = null;
        this.isInitialized = false;
    }

    async init() {
        try {
            console.log('🚀 Starting NAVIGi Bot...');
            
            // Initialize database
            console.log('📊 Initializing database...');
            await database.init();
            
            // Initialize bot
            const token = process.env.BOT_TOKEN;
            if (!token) {
                throw new Error('BOT_TOKEN is not configured in environment variables');
            }
            
            this.bot = new TelegramBot(token, { polling: true });
            console.log('🤖 Bot initialized');
            
            // Initialize handlers
            this.initializeHandlers();
            
            // Set up commands
            this.setupCommands();
            
            // Set up cron jobs
            this.setupCronJobs();
            
            // Create some sample ads if none exist
            await this.createSampleAds();
            
            // Start WebApp server
            this.webAppServer = new WebAppServer();
            this.webAppServer.start(process.env.PORT || 3000);
            
            this.isInitialized = true;
            console.log('✅ NAVIGi Bot is ready!');
            
            // Set bot commands for menu
            await this.setBotCommands();
            
        } catch (error) {
            console.error('❌ Failed to initialize bot:', error);
            process.exit(1);
        }
    }

    initializeHandlers() {
        this.menuHandler = new MenuHandler(this.bot);
        this.earnHandler = new EarnHandler(this.bot);
        this.contestHandler = new ContestHandler(this.bot);
        this.vipHandler = new VipHandler(this.bot);
        this.profileHandler = new ProfileHandler(this.bot);
        this.referralHandler = new ReferralHandler(this.bot);
        this.adminHandler = new AdminHandler(this.bot);
    }

    setupCommands() {
        // Start command
        this.bot.onText(/\/start(.*)/, async (msg, match) => {
            try {
                const chatId = msg.chat.id;
                const referralCode = match[1] ? match[1].trim() : null;
                
                // Get or create user
                let user = await User.findByTelegramId(msg.from.id);
                let isNewUser = false;
                
                if (!user) {
                    // Handle referral
                    let referredBy = null;
                    if (referralCode) {
                        const referrer = await User.findByReferralCode(referralCode);
                        if (referrer) {
                            referredBy = referrer.id;
                        }
                    }
                    
                    user = await User.create(msg.from, referredBy);
                    isNewUser = true;
                    
                    if (referredBy) {
                        // Notify referrer
                        const referrer = await User.findById(referredBy);
                        const lang = localization.getUserLanguage(referrer.language_code);
                        const message = localization.t('referral.reward', lang, { points: 1 });
                        await this.bot.sendMessage(referrer.telegram_id, message);
                    }
                }
                
                // Update user info
                user.username = msg.from.username;
                user.first_name = msg.from.first_name;
                user.last_name = msg.from.last_name;
                user.language_code = msg.from.language_code;
                await user.save();
                
                // Reset daily ads if needed
                await user.resetDailyAdsIfNeeded();
                
                // Process login task
                await DailyTasksService.processLoginTask(user);
                
                const lang = localization.getUserLanguage(user.language_code);
                
                if (isNewUser) {
                    const welcomeMessage = localization.t('welcome.message', lang);
                    await this.bot.sendMessage(chatId, welcomeMessage);
                } else {
                    const welcomeMessage = localization.t('welcome.returning', lang, { 
                        points: user.points 
                    });
                    await this.bot.sendMessage(chatId, welcomeMessage);
                }
                
                // Show main menu
                await this.menuHandler.showMainMenu(chatId, user);
                
            } catch (error) {
                console.error('Error in start command:', error);
                await this.bot.sendMessage(msg.chat.id, 'An error occurred. Please try again.');
            }
        });

        // Help command
        this.bot.onText(/\/help/, async (msg) => {
            const user = await User.findByTelegramId(msg.from.id);
            const lang = localization.getUserLanguage(user?.language_code);
            
            const helpMessage = localization.t('welcome.message', lang);
            await this.bot.sendMessage(msg.chat.id, helpMessage);
        });

        // Admin commands
        this.bot.onText(/\/admin/, async (msg) => {
            await this.adminHandler.handleAdminCommand(msg);
        });

        // Handle callback queries
        this.bot.on('callback_query', async (callbackQuery) => {
            try {
                const data = callbackQuery.data;
                const chatId = callbackQuery.message.chat.id;
                const messageId = callbackQuery.message.message_id;
                const userId = callbackQuery.from.id;
                
                // Get user
                const user = await User.findByTelegramId(userId);
                if (!user) {
                    await this.bot.answerCallbackQuery(callbackQuery.id, 'User not found. Please start the bot first.');
                    return;
                }
                
                // Answer callback query
                await this.bot.answerCallbackQuery(callbackQuery.id);
                
                // Route to appropriate handler
                if (data.startsWith('menu_')) {
                    await this.menuHandler.handleCallback(callbackQuery, user);
                } else if (data.startsWith('earn_')) {
                    await this.earnHandler.handleCallback(callbackQuery, user);
                } else if (data.startsWith('contest_')) {
                    await this.contestHandler.handleCallback(callbackQuery, user);
                } else if (data.startsWith('vip_')) {
                    await this.vipHandler.handleCallback(callbackQuery, user);
                } else if (data.startsWith('profile_')) {
                    await this.profileHandler.handleCallback(callbackQuery, user);
                } else if (data.startsWith('referral_')) {
                    await this.referralHandler.handleCallback(callbackQuery, user);
                } else if (data.startsWith('admin_')) {
                    await this.adminHandler.handleCallback(callbackQuery, user);
                }
                
            } catch (error) {
                console.error('Error handling callback query:', error);
                await this.bot.answerCallbackQuery(callbackQuery.id, 'An error occurred. Please try again.');
            }
        });

        // Handle text messages
        this.bot.on('message', async (msg) => {
            // Skip if it's a command
            if (msg.text && msg.text.startsWith('/')) return;
            
            try {
                const user = await User.findByTelegramId(msg.from.id);
                if (!user) return;
                
                // Handle various text inputs (for admin, VIP payments, etc.)
                if (msg.text && this.adminHandler.isWaitingForInput(user.id)) {
                    await this.adminHandler.handleTextInput(msg, user);
                } else if (msg.text && this.vipHandler.isWaitingForInput(user.id)) {
                    await this.vipHandler.handleTextInput(msg, user);
                }
                
            } catch (error) {
                console.error('Error handling message:', error);
            }
        });

        // Error handling
        this.bot.on('polling_error', (error) => {
            console.error('Polling error:', error);
        });
    }

    setupCronJobs() {
        // Create automatic contests daily at 00:00 UTC
        cron.schedule('0 0 * * *', async () => {
            try {
                console.log('Creating automatic contests...');
                await ContestService.createAutomaticContests();
            } catch (error) {
                console.error('Error creating automatic contests:', error);
            }
        });

        // End expired contests every hour
        cron.schedule('0 * * * *', async () => {
            try {
                console.log('Checking for expired contests...');
                await ContestService.endExpiredContests();
            } catch (error) {
                console.error('Error ending expired contests:', error);
            }
        });

        // Process VIP mining rewards daily at 00:05 UTC
        cron.schedule('5 0 * * *', async () => {
            try {
                console.log('Processing VIP mining rewards...');
                await this.processVipMiningRewards();
            } catch (error) {
                console.error('Error processing VIP mining rewards:', error);
            }
        });

        console.log('✅ Cron jobs set up');
    }

    async processVipMiningRewards() {
        try {
            const vipUsers = await database.all(`
                SELECT * FROM users 
                WHERE vip_level != 'none' 
                AND vip_expires_at > datetime('now')
            `);

            const today = new Date().toISOString().split('T')[0];

            for (const userData of vipUsers) {
                const user = new User(userData);
                const vipDetails = user.getVipDetails();
                
                if (vipDetails) {
                    // Check if mining reward already exists for today
                    const existingReward = await database.get(`
                        SELECT * FROM mining_rewards 
                        WHERE user_id = ? AND date = ?
                    `, [user.id, today]);

                    if (!existingReward) {
                        // Create mining reward
                        await database.run(`
                            INSERT INTO mining_rewards (user_id, vip_level, points_earned, date)
                            VALUES (?, ?, ?, ?)
                        `, [user.id, user.vip_level, vipDetails.miningPoints, today]);
                    }
                }
            }
        } catch (error) {
            console.error('Error processing VIP mining rewards:', error);
        }
    }

    async createSampleAds() {
        try {
            const existingAds = await Ad.getActiveAds();
            if (existingAds.length === 0) {
                console.log('Creating sample ads...');
                
                const sampleAds = [
                    {
                        title: 'Watch and Earn!',
                        description: 'Watch this ad to earn points',
                        url: 'https://example.com/ad1',
                        duration: 30,
                        points_reward: 1
                    },
                    {
                        title: 'Special Offer',
                        description: 'Limited time offer - check it out!',
                        url: 'https://example.com/ad2',
                        duration: 25,
                        points_reward: 1
                    },
                    {
                        title: 'New Product Launch',
                        description: 'Discover our latest product',
                        url: 'https://example.com/ad3',
                        duration: 40,
                        points_reward: 2
                    }
                ];

                for (const adData of sampleAds) {
                    await Ad.create(adData);
                }

                console.log('✅ Sample ads created');
            }
        } catch (error) {
            console.error('Error creating sample ads:', error);
        }
    }

    async setBotCommands() {
        try {
            const commands = [
                { command: 'start', description: 'Start the bot' },
                { command: 'help', description: 'Get help' },
                { command: 'admin', description: 'Admin panel (admin only)' }
            ];

            await this.bot.setMyCommands(commands);
            console.log('✅ Bot commands set');
        } catch (error) {
            console.error('Error setting bot commands:', error);
        }
    }

    // Graceful shutdown
    async shutdown() {
        try {
            console.log('🛑 Shutting down bot...');
            
            if (this.bot) {
                await this.bot.stopPolling();
            }
            
            if (database) {
                await database.close();
            }
            
            console.log('✅ Bot shutdown complete');
        } catch (error) {
            console.error('Error during shutdown:', error);
        }
    }
}

// Handle process termination
process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    if (global.bot) {
        await global.bot.shutdown();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    if (global.bot) {
        await global.bot.shutdown();
    }
    process.exit(0);
});

// Initialize and start the bot
const bot = new NAVIGiBot();
global.bot = bot;

bot.init().catch((error) => {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
});

module.exports = NAVIGiBot;