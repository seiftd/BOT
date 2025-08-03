const express = require('express');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');
const database = require('../database/database');
const User = require('../models/User');
const { AdWatchingService, AdView } = require('../models/Ad');
const { DailyTasksService } = require('../models/DailyTask');
const { ContestService } = require('../models/Contest');
const localization = require('../utils/localization');

class WebAppServer {
    constructor() {
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        // Enable CORS for Telegram WebApp
        this.app.use(cors({
            origin: '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Telegram-Init-Data']
        }));

        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        
        // Serve static files
        this.app.use('/static', express.static(path.join(__dirname, 'public')));
        
        // Authentication middleware
        this.app.use('/api', this.authenticateWebApp.bind(this));
    }

    setupRoutes() {
        // Serve the main Mini App
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });

        // API Routes
        this.app.get('/api/user/profile', this.getUserProfile.bind(this));
        this.app.get('/api/user/stats', this.getUserStats.bind(this));
        this.app.get('/api/ads/available', this.getAvailableAds.bind(this));
        this.app.post('/api/ads/watch', this.watchAd.bind(this));
        this.app.get('/api/tasks/status', this.getTasksStatus.bind(this));
        this.app.post('/api/tasks/claim', this.claimTask.bind(this));
        this.app.get('/api/contests/status', this.getContestsStatus.bind(this));
        this.app.post('/api/contests/join', this.joinContest.bind(this));
        this.app.post('/api/contests/watch-ad', this.watchContestAd.bind(this));
        this.app.get('/api/vip/mining', this.getVipMining.bind(this));
        this.app.post('/api/vip/claim-mining', this.claimVipMining.bind(this));
        this.app.get('/api/referral/stats', this.getReferralStats.bind(this));
        this.app.get('/api/referral/leaderboard', this.getReferralLeaderboard.bind(this));

        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ status: 'OK', timestamp: new Date().toISOString() });
        });
    }

    // Authenticate Telegram WebApp requests
    async authenticateWebApp(req, res, next) {
        try {
            const initData = req.headers['x-telegram-init-data'];
            if (!initData) {
                return res.status(401).json({ error: 'Missing Telegram init data' });
            }

            // Validate Telegram WebApp init data
            const isValid = this.validateTelegramWebAppData(initData);
            if (!isValid) {
                return res.status(401).json({ error: 'Invalid Telegram init data' });
            }

            // Parse user data from init data
            const userData = this.parseInitData(initData);
            if (!userData.user) {
                return res.status(401).json({ error: 'No user data in init data' });
            }

            // Get or create user
            let user = await User.findByTelegramId(userData.user.id);
            if (!user) {
                user = await User.create(userData.user);
            } else {
                // Update user info
                user.username = userData.user.username;
                user.first_name = userData.user.first_name;
                user.last_name = userData.user.last_name;
                user.language_code = userData.user.language_code;
                await user.save();
            }

            // Reset daily ads if needed
            await user.resetDailyAdsIfNeeded();

            req.user = user;
            req.lang = localization.getUserLanguage(user.language_code);
            next();
        } catch (error) {
            console.error('Authentication error:', error);
            res.status(500).json({ error: 'Authentication failed' });
        }
    }

    validateTelegramWebAppData(initData) {
        try {
            const botToken = process.env.BOT_TOKEN;
            if (!botToken) return false;

            const urlParams = new URLSearchParams(initData);
            const hash = urlParams.get('hash');
            urlParams.delete('hash');

            const dataCheckString = Array.from(urlParams.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, value]) => `${key}=${value}`)
                .join('\n');

            const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
            const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

            return calculatedHash === hash;
        } catch (error) {
            console.error('Validation error:', error);
            return false;
        }
    }

    parseInitData(initData) {
        const urlParams = new URLSearchParams(initData);
        const result = {};

        for (const [key, value] of urlParams) {
            if (key === 'user') {
                result.user = JSON.parse(decodeURIComponent(value));
            } else if (key !== 'hash') {
                result[key] = value;
            }
        }

        return result;
    }

    // API Endpoints
    async getUserProfile(req, res) {
        try {
            const user = req.user;
            res.json({
                id: user.id,
                telegram_id: user.telegram_id,
                username: user.username,
                first_name: user.first_name,
                last_name: user.last_name,
                points: user.points,
                vip_level: user.vip_level,
                vip_expires_at: user.vip_expires_at,
                referral_code: user.referral_code,
                total_referrals: user.total_referrals
            });
        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({ error: 'Failed to get profile' });
        }
    }

    async getUserStats(req, res) {
        try {
            const stats = await req.user.getStats();
            res.json(stats);
        } catch (error) {
            console.error('Get stats error:', error);
            res.status(500).json({ error: 'Failed to get stats' });
        }
    }

    async getAvailableAds(req, res) {
        try {
            const user = req.user;
            const canWatch = user.canWatchAds();
            const remainingTime = await AdView.getRemainingTime(user.id, 'earn');

            res.json({
                canWatch,
                remainingTime,
                dailyWatched: user.daily_ads_watched,
                dailyLimit: user.getDailyAdsLimit()
            });
        } catch (error) {
            console.error('Get ads error:', error);
            res.status(500).json({ error: 'Failed to get ads info' });
        }
    }

    async watchAd(req, res) {
        try {
            const user = req.user;
            const ad = await AdWatchingService.getNextAd();

            if (!ad) {
                return res.status(404).json({ error: 'No ads available' });
            }

            const result = await AdWatchingService.watchAdForEarning(user, ad);
            res.json(result);
        } catch (error) {
            console.error('Watch ad error:', error);
            if (error.message === 'DAILY_LIMIT_REACHED') {
                res.status(400).json({ error: 'Daily limit reached' });
            } else if (error.message.startsWith('TIMER_WAIT:')) {
                const remainingTime = parseInt(error.message.split(':')[1]);
                res.status(400).json({ error: 'Timer wait', remainingTime });
            } else {
                res.status(500).json({ error: 'Failed to watch ad' });
            }
        }
    }

    async getTasksStatus(req, res) {
        try {
            const user = req.user;
            const tasksStatus = await DailyTasksService.getUserTasksStatus(user.id);
            res.json(tasksStatus);
        } catch (error) {
            console.error('Get tasks error:', error);
            res.status(500).json({ error: 'Failed to get tasks status' });
        }
    }

    async claimTask(req, res) {
        try {
            const user = req.user;
            const { taskType } = req.body;

            if (taskType === 'login') {
                const result = await DailyTasksService.claimTaskReward(user, 'login');
                res.json(result);
            } else if (taskType === 'channel_subscription') {
                // Note: Channel subscription checking would need bot instance
                res.status(400).json({ error: 'Channel subscription must be done through bot' });
            } else {
                res.status(400).json({ error: 'Invalid task type' });
            }
        } catch (error) {
            console.error('Claim task error:', error);
            res.status(500).json({ error: 'Failed to claim task' });
        }
    }

    async getContestsStatus(req, res) {
        try {
            const user = req.user;
            const contestStatus = await ContestService.getUserContestStatus(user.id);
            res.json(contestStatus);
        } catch (error) {
            console.error('Get contests error:', error);
            res.status(500).json({ error: 'Failed to get contests status' });
        }
    }

    async joinContest(req, res) {
        try {
            const user = req.user;
            const { contestType } = req.body;

            const result = await ContestService.joinContest(user, contestType);
            res.json(result);
        } catch (error) {
            console.error('Join contest error:', error);
            res.status(500).json({ error: 'Failed to join contest' });
        }
    }

    async watchContestAd(req, res) {
        try {
            const user = req.user;
            const { contestType } = req.body;

            const result = await ContestService.watchAdForContest(user, contestType);
            res.json(result);
        } catch (error) {
            console.error('Watch contest ad error:', error);
            if (error.message.startsWith('TIMER_WAIT:')) {
                const remainingTime = parseInt(error.message.split(':')[1]);
                res.status(400).json({ error: 'Timer wait', remainingTime });
            } else {
                res.status(500).json({ error: 'Failed to watch contest ad' });
            }
        }
    }

    async getVipMining(req, res) {
        try {
            const user = req.user;
            
            if (!user.isVip()) {
                return res.json({ hasRewards: false, totalPoints: 0, rewards: [] });
            }

            const unclaimedRewards = await database.all(`
                SELECT * FROM mining_rewards 
                WHERE user_id = ? AND claimed = 0
            `, [user.id]);

            const totalPoints = unclaimedRewards.reduce((sum, reward) => sum + reward.points_earned, 0);

            res.json({
                hasRewards: unclaimedRewards.length > 0,
                totalPoints,
                rewards: unclaimedRewards
            });
        } catch (error) {
            console.error('Get VIP mining error:', error);
            res.status(500).json({ error: 'Failed to get VIP mining info' });
        }
    }

    async claimVipMining(req, res) {
        try {
            const user = req.user;

            if (!user.isVip()) {
                return res.status(400).json({ error: 'VIP membership required' });
            }

            const unclaimedRewards = await database.all(`
                SELECT * FROM mining_rewards 
                WHERE user_id = ? AND claimed = 0
            `, [user.id]);

            if (unclaimedRewards.length === 0) {
                return res.status(400).json({ error: 'No rewards to claim' });
            }

            const totalPoints = unclaimedRewards.reduce((sum, reward) => sum + reward.points_earned, 0);

            // Mark rewards as claimed and add points
            await database.run(`
                UPDATE mining_rewards 
                SET claimed = 1 
                WHERE user_id = ? AND claimed = 0
            `, [user.id]);

            await user.addPoints(totalPoints, 'VIP mining rewards');

            res.json({
                success: true,
                pointsEarned: totalPoints,
                totalPoints: user.points
            });
        } catch (error) {
            console.error('Claim VIP mining error:', error);
            res.status(500).json({ error: 'Failed to claim VIP mining rewards' });
        }
    }

    async getReferralStats(req, res) {
        try {
            const user = req.user;
            
            // Get referral stats
            const referralData = await database.get(`
                SELECT COUNT(*) as active_referrals
                FROM users 
                WHERE referred_by = ?
            `, [user.id]);

            res.json({
                totalReferrals: user.total_referrals,
                activeReferrals: referralData.active_referrals || 0,
                pointsEarned: user.total_referrals, // 1 point per referral
                referralCode: user.referral_code
            });
        } catch (error) {
            console.error('Get referral stats error:', error);
            res.status(500).json({ error: 'Failed to get referral stats' });
        }
    }

    async getReferralLeaderboard(req, res) {
        try {
            const topReferrers = await database.all(`
                SELECT u.first_name, u.last_name, u.total_referrals
                FROM users u
                WHERE u.total_referrals > 0
                ORDER BY u.total_referrals DESC
                LIMIT 10
            `);

            res.json(topReferrers);
        } catch (error) {
            console.error('Get leaderboard error:', error);
            res.status(500).json({ error: 'Failed to get leaderboard' });
        }
    }

    start(port = 3000) {
        this.app.listen(port, () => {
            console.log(`🌐 WebApp server running on port ${port}`);
        });
    }
}

module.exports = WebAppServer;