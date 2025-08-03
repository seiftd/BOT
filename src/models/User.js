const database = require('../database/database');
const crypto = require('crypto');
const moment = require('moment');

class User {
    constructor(data = {}) {
        this.id = data.id;
        this.telegram_id = data.telegram_id;
        this.username = data.username;
        this.first_name = data.first_name;
        this.last_name = data.last_name;
        this.language_code = data.language_code || 'en';
        this.points = data.points || 0;
        this.vip_level = data.vip_level || 'none';
        this.vip_expires_at = data.vip_expires_at;
        this.daily_ads_watched = data.daily_ads_watched || 0;
        this.last_daily_reset = data.last_daily_reset;
        this.last_login = data.last_login;
        this.login_streak = data.login_streak || 0;
        this.channel_subscribed = data.channel_subscribed || false;
        this.channel_sub_claimed = data.channel_sub_claimed || false;
        this.referral_code = data.referral_code;
        this.referred_by = data.referred_by;
        this.total_referrals = data.total_referrals || 0;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Generate unique referral code
    static generateReferralCode() {
        return crypto.randomBytes(4).toString('hex').toUpperCase();
    }

    // Create new user
    static async create(telegramUser, referredBy = null) {
        try {
            let referralCode;
            let attempts = 0;
            
            // Generate unique referral code
            do {
                referralCode = this.generateReferralCode();
                const existing = await database.get(
                    'SELECT id FROM users WHERE referral_code = ?',
                    [referralCode]
                );
                if (!existing) break;
                attempts++;
            } while (attempts < 10);

            const userData = {
                telegram_id: telegramUser.id,
                username: telegramUser.username,
                first_name: telegramUser.first_name,
                last_name: telegramUser.last_name,
                language_code: telegramUser.language_code || 'en',
                referral_code: referralCode,
                referred_by: referredBy,
                last_login: new Date().toISOString()
            };

            const result = await database.run(`
                INSERT INTO users (
                    telegram_id, username, first_name, last_name, 
                    language_code, referral_code, referred_by, last_login
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                userData.telegram_id,
                userData.username,
                userData.first_name,
                userData.last_name,
                userData.language_code,
                userData.referral_code,
                userData.referred_by,
                userData.last_login
            ]);

            // If referred by someone, increment their referral count and give points
            if (referredBy) {
                await database.run(
                    'UPDATE users SET total_referrals = total_referrals + 1, points = points + 1 WHERE id = ?',
                    [referredBy]
                );
            }

            const user = await this.findById(result.id);
            return user;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    // Find user by ID
    static async findById(id) {
        try {
            const userData = await database.get(
                'SELECT * FROM users WHERE id = ?',
                [id]
            );
            return userData ? new User(userData) : null;
        } catch (error) {
            console.error('Error finding user by ID:', error);
            throw error;
        }
    }

    // Find user by Telegram ID
    static async findByTelegramId(telegramId) {
        try {
            const userData = await database.get(
                'SELECT * FROM users WHERE telegram_id = ?',
                [telegramId]
            );
            return userData ? new User(userData) : null;
        } catch (error) {
            console.error('Error finding user by Telegram ID:', error);
            throw error;
        }
    }

    // Find user by referral code
    static async findByReferralCode(referralCode) {
        try {
            const userData = await database.get(
                'SELECT * FROM users WHERE referral_code = ?',
                [referralCode]
            );
            return userData ? new User(userData) : null;
        } catch (error) {
            console.error('Error finding user by referral code:', error);
            throw error;
        }
    }

    // Update user
    async save() {
        try {
            this.updated_at = new Date().toISOString();
            
            await database.run(`
                UPDATE users SET 
                    username = ?, first_name = ?, last_name = ?, language_code = ?,
                    points = ?, vip_level = ?, vip_expires_at = ?, daily_ads_watched = ?,
                    last_daily_reset = ?, last_login = ?, login_streak = ?,
                    channel_subscribed = ?, channel_sub_claimed = ?, total_referrals = ?,
                    updated_at = ?
                WHERE id = ?
            `, [
                this.username, this.first_name, this.last_name, this.language_code,
                this.points, this.vip_level, this.vip_expires_at, this.daily_ads_watched,
                this.last_daily_reset, this.last_login, this.login_streak,
                this.channel_subscribed, this.channel_sub_claimed, this.total_referrals,
                this.updated_at, this.id
            ]);
            
            return true;
        } catch (error) {
            console.error('Error saving user:', error);
            throw error;
        }
    }

    // Add points to user
    async addPoints(amount, description = 'Points earned') {
        try {
            this.points += amount;
            await this.save();
            
            // Log the transaction (you might want to create a separate table for this)
            console.log(`User ${this.telegram_id} earned ${amount} points: ${description}`);
            
            return this.points;
        } catch (error) {
            console.error('Error adding points:', error);
            throw error;
        }
    }

    // Deduct points from user
    async deductPoints(amount, description = 'Points deducted') {
        try {
            if (this.points < amount) {
                throw new Error('Insufficient points');
            }
            
            this.points -= amount;
            await this.save();
            
            console.log(`User ${this.telegram_id} spent ${amount} points: ${description}`);
            
            return this.points;
        } catch (error) {
            console.error('Error deducting points:', error);
            throw error;
        }
    }

    // Check if user is VIP
    isVip() {
        if (this.vip_level === 'none') return false;
        if (!this.vip_expires_at) return false;
        return new Date(this.vip_expires_at) > new Date();
    }

    // Get VIP level details
    getVipDetails() {
        const vipLevels = {
            king: {
                name: 'King VIP',
                price: 2.5,
                miningPoints: 10,
                adsLimit: 30,
                benefits: ['10 points daily mining', '30 ads daily limit', 'VIP contests access']
            },
            emperor: {
                name: 'Emperor VIP',
                price: 9,
                miningPoints: 25,
                adsLimit: 40,
                benefits: ['25 points daily mining', '40 ads daily limit', 'VIP contests access', 'VIP leaderboard']
            },
            lord: {
                name: 'Lord VIP',
                price: 20,
                miningPoints: 40,
                adsLimit: 60,
                benefits: ['40 points daily mining', '60 ads daily limit', 'VIP contests access', 'Withdrawal minimum: $2 USDT', 'VIP leaderboard']
            }
        };

        return vipLevels[this.vip_level] || null;
    }

    // Get daily ads limit based on VIP level
    getDailyAdsLimit() {
        if (!this.isVip()) return 20; // Default limit
        
        const vipDetails = this.getVipDetails();
        return vipDetails ? vipDetails.adsLimit : 20;
    }

    // Reset daily ads if needed
    async resetDailyAdsIfNeeded() {
        try {
            const today = moment().format('YYYY-MM-DD');
            const lastReset = this.last_daily_reset ? moment(this.last_daily_reset).format('YYYY-MM-DD') : null;
            
            if (lastReset !== today) {
                this.daily_ads_watched = 0;
                this.last_daily_reset = new Date().toISOString();
                await this.save();
            }
        } catch (error) {
            console.error('Error resetting daily ads:', error);
            throw error;
        }
    }

    // Update login streak
    async updateLoginStreak() {
        try {
            const today = moment();
            const lastLogin = this.last_login ? moment(this.last_login) : null;
            
            if (!lastLogin || !lastLogin.isSame(today, 'day')) {
                if (lastLogin && lastLogin.isSame(today.clone().subtract(1, 'day'), 'day')) {
                    // Consecutive day login
                    this.login_streak += 1;
                } else if (lastLogin && lastLogin.isBefore(today.clone().subtract(1, 'day'), 'day')) {
                    // Missed days, reset streak
                    this.login_streak = 1;
                } else if (!lastLogin) {
                    // First login
                    this.login_streak = 1;
                }
                
                this.last_login = today.toISOString();
                await this.save();
            }
        } catch (error) {
            console.error('Error updating login streak:', error);
            throw error;
        }
    }

    // Check if user can watch ads
    canWatchAds() {
        const limit = this.getDailyAdsLimit();
        return this.daily_ads_watched < limit;
    }

    // Increment ads watched count
    async incrementAdsWatched() {
        try {
            this.daily_ads_watched += 1;
            await this.save();
        } catch (error) {
            console.error('Error incrementing ads watched:', error);
            throw error;
        }
    }

    // Get referral link
    getReferralLink(botUsername) {
        return `https://t.me/${botUsername}?start=${this.referral_code}`;
    }

    // Get user stats
    async getStats() {
        try {
            // Get total ads watched
            const adsStats = await database.get(`
                SELECT COUNT(*) as total_ads_watched
                FROM ad_views 
                WHERE user_id = ?
            `, [this.id]);

            // Get withdrawal history
            const withdrawalStats = await database.get(`
                SELECT COUNT(*) as total_withdrawals, COALESCE(SUM(amount_usdt), 0) as total_withdrawn
                FROM withdrawals 
                WHERE user_id = ? AND status = 'completed'
            `, [this.id]);

            // Get referral earnings
            const referralStats = await database.get(`
                SELECT COUNT(*) as active_referrals
                FROM users 
                WHERE referred_by = ?
            `, [this.id]);

            return {
                points: this.points,
                pointsValue: (this.points / 100).toFixed(2), // 100 points = 1 USDT
                vipLevel: this.vip_level,
                vipExpires: this.vip_expires_at,
                totalAdsWatched: adsStats.total_ads_watched || 0,
                dailyAdsWatched: this.daily_ads_watched,
                dailyAdsLimit: this.getDailyAdsLimit(),
                totalWithdrawals: withdrawalStats.total_withdrawals || 0,
                totalWithdrawn: withdrawalStats.total_withdrawn || 0,
                totalReferrals: this.total_referrals,
                activeReferrals: referralStats.active_referrals || 0,
                loginStreak: this.login_streak
            };
        } catch (error) {
            console.error('Error getting user stats:', error);
            throw error;
        }
    }

    // Get all users count (for admin)
    static async getTotalUsersCount() {
        try {
            const result = await database.get('SELECT COUNT(*) as count FROM users');
            return result.count || 0;
        } catch (error) {
            console.error('Error getting total users count:', error);
            throw error;
        }
    }

    // Get VIP users count (for admin)
    static async getVipUsersCount() {
        try {
            const result = await database.get(`
                SELECT COUNT(*) as count 
                FROM users 
                WHERE vip_level != 'none' AND vip_expires_at > datetime('now')
            `);
            return result.count || 0;
        } catch (error) {
            console.error('Error getting VIP users count:', error);
            throw error;
        }
    }

    // Upgrade user to VIP
    async upgradeToVip(level, duration = 30) {
        try {
            this.vip_level = level;
            this.vip_expires_at = moment().add(duration, 'days').toISOString();
            await this.save();
            
            console.log(`User ${this.telegram_id} upgraded to ${level} VIP`);
            return true;
        } catch (error) {
            console.error('Error upgrading user to VIP:', error);
            throw error;
        }
    }
}

module.exports = User;