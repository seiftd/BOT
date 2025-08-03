const database = require('../database/database');
const moment = require('moment');

class Ad {
    constructor(data = {}) {
        this.id = data.id;
        this.title = data.title;
        this.description = data.description;
        this.url = data.url;
        this.duration = data.duration || 30;
        this.points_reward = data.points_reward || 1;
        this.is_active = data.is_active !== undefined ? data.is_active : true;
        this.created_at = data.created_at;
    }

    // Create new ad
    static async create(adData) {
        try {
            const result = await database.run(`
                INSERT INTO ads (title, description, url, duration, points_reward, is_active)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                adData.title,
                adData.description,
                adData.url,
                adData.duration || 30,
                adData.points_reward || 1,
                adData.is_active !== undefined ? adData.is_active : true
            ]);

            return await this.findById(result.id);
        } catch (error) {
            console.error('Error creating ad:', error);
            throw error;
        }
    }

    // Find ad by ID
    static async findById(id) {
        try {
            const adData = await database.get(
                'SELECT * FROM ads WHERE id = ?',
                [id]
            );
            return adData ? new Ad(adData) : null;
        } catch (error) {
            console.error('Error finding ad by ID:', error);
            throw error;
        }
    }

    // Get all active ads
    static async getActiveAds() {
        try {
            const adsData = await database.all(
                'SELECT * FROM ads WHERE is_active = 1 ORDER BY created_at DESC'
            );
            return adsData.map(ad => new Ad(ad));
        } catch (error) {
            console.error('Error getting active ads:', error);
            throw error;
        }
    }

    // Get random active ad
    static async getRandomActiveAd() {
        try {
            const adData = await database.get(
                'SELECT * FROM ads WHERE is_active = 1 ORDER BY RANDOM() LIMIT 1'
            );
            return adData ? new Ad(adData) : null;
        } catch (error) {
            console.error('Error getting random active ad:', error);
            throw error;
        }
    }

    // Update ad
    async save() {
        try {
            await database.run(`
                UPDATE ads SET 
                    title = ?, description = ?, url = ?, duration = ?,
                    points_reward = ?, is_active = ?
                WHERE id = ?
            `, [
                this.title, this.description, this.url, this.duration,
                this.points_reward, this.is_active, this.id
            ]);
            
            return true;
        } catch (error) {
            console.error('Error saving ad:', error);
            throw error;
        }
    }

    // Delete ad
    async delete() {
        try {
            await database.run('DELETE FROM ads WHERE id = ?', [this.id]);
            return true;
        } catch (error) {
            console.error('Error deleting ad:', error);
            throw error;
        }
    }

    // Get all ads (for admin)
    static async getAllAds() {
        try {
            const adsData = await database.all(
                'SELECT * FROM ads ORDER BY created_at DESC'
            );
            return adsData.map(ad => new Ad(ad));
        } catch (error) {
            console.error('Error getting all ads:', error);
            throw error;
        }
    }

    // Toggle ad active status
    async toggleActive() {
        try {
            this.is_active = !this.is_active;
            await this.save();
            return this.is_active;
        } catch (error) {
            console.error('Error toggling ad active status:', error);
            throw error;
        }
    }
}

class AdView {
    constructor(data = {}) {
        this.id = data.id;
        this.user_id = data.user_id;
        this.ad_id = data.ad_id;
        this.view_type = data.view_type; // earn, daily_contest, weekly_contest, monthly_contest, vip_contest
        this.points_earned = data.points_earned || 0;
        this.viewed_at = data.viewed_at;
    }

    // Record ad view
    static async create(userId, adId, viewType = 'earn', pointsEarned = 1) {
        try {
            const result = await database.run(`
                INSERT INTO ad_views (user_id, ad_id, view_type, points_earned)
                VALUES (?, ?, ?, ?)
            `, [userId, adId, viewType, pointsEarned]);

            return await this.findById(result.id);
        } catch (error) {
            console.error('Error creating ad view:', error);
            throw error;
        }
    }

    // Find ad view by ID
    static async findById(id) {
        try {
            const viewData = await database.get(
                'SELECT * FROM ad_views WHERE id = ?',
                [id]
            );
            return viewData ? new AdView(viewData) : null;
        } catch (error) {
            console.error('Error finding ad view by ID:', error);
            throw error;
        }
    }

    // Get user's ad views for today
    static async getUserTodayViews(userId, viewType = 'earn') {
        try {
            const today = moment().format('YYYY-MM-DD');
            const views = await database.all(`
                SELECT * FROM ad_views 
                WHERE user_id = ? AND view_type = ? 
                AND DATE(viewed_at) = ?
                ORDER BY viewed_at DESC
            `, [userId, viewType, today]);
            
            return views.map(view => new AdView(view));
        } catch (error) {
            console.error('Error getting user today views:', error);
            throw error;
        }
    }

    // Get user's last ad view time
    static async getLastAdViewTime(userId, viewType = 'earn') {
        try {
            const lastView = await database.get(`
                SELECT * FROM ad_views 
                WHERE user_id = ? AND view_type = ?
                ORDER BY viewed_at DESC 
                LIMIT 1
            `, [userId, viewType]);
            
            return lastView ? moment(lastView.viewed_at) : null;
        } catch (error) {
            console.error('Error getting last ad view time:', error);
            throw error;
        }
    }

    // Check if user can watch next ad (timer check)
    static async canWatchNextAd(userId, viewType = 'earn') {
        try {
            const lastViewTime = await this.getLastAdViewTime(userId, viewType);
            if (!lastViewTime) return true;

            // Get timer settings based on view type
            let timerMinutes = 2; // Default for earn ads
            
            switch (viewType) {
                case 'daily_contest':
                    timerMinutes = 2;
                    break;
                case 'weekly_contest':
                    timerMinutes = 5;
                    break;
                case 'monthly_contest':
                    timerMinutes = 15;
                    break;
                case 'vip_contest':
                    timerMinutes = 2;
                    break;
            }

            const now = moment();
            const timeDiff = now.diff(lastViewTime, 'minutes');
            
            return timeDiff >= timerMinutes;
        } catch (error) {
            console.error('Error checking if user can watch next ad:', error);
            throw error;
        }
    }

    // Get remaining time until next ad
    static async getRemainingTime(userId, viewType = 'earn') {
        try {
            const lastViewTime = await this.getLastAdViewTime(userId, viewType);
            if (!lastViewTime) return 0;

            // Get timer settings based on view type
            let timerMinutes = 2;
            
            switch (viewType) {
                case 'daily_contest':
                    timerMinutes = 2;
                    break;
                case 'weekly_contest':
                    timerMinutes = 5;
                    break;
                case 'monthly_contest':
                    timerMinutes = 15;
                    break;
                case 'vip_contest':
                    timerMinutes = 2;
                    break;
            }

            const nextAllowedTime = lastViewTime.clone().add(timerMinutes, 'minutes');
            const now = moment();
            
            if (now.isBefore(nextAllowedTime)) {
                return nextAllowedTime.diff(now, 'seconds');
            }
            
            return 0;
        } catch (error) {
            console.error('Error getting remaining time:', error);
            throw error;
        }
    }

    // Get user's total ad views
    static async getUserTotalViews(userId, viewType = null) {
        try {
            let query = 'SELECT COUNT(*) as count FROM ad_views WHERE user_id = ?';
            const params = [userId];
            
            if (viewType) {
                query += ' AND view_type = ?';
                params.push(viewType);
            }
            
            const result = await database.get(query, params);
            return result.count || 0;
        } catch (error) {
            console.error('Error getting user total views:', error);
            throw error;
        }
    }

    // Get user's contest ad views for specific contest
    static async getUserContestViews(userId, contestId, viewType) {
        try {
            // Get contest start date
            const contest = await database.get(
                'SELECT start_date FROM contests WHERE id = ?',
                [contestId]
            );
            
            if (!contest) return [];
            
            const views = await database.all(`
                SELECT * FROM ad_views 
                WHERE user_id = ? AND view_type = ? 
                AND viewed_at >= ?
                ORDER BY viewed_at ASC
            `, [userId, viewType, contest.start_date]);
            
            return views.map(view => new AdView(view));
        } catch (error) {
            console.error('Error getting user contest views:', error);
            throw error;
        }
    }

    // Get ad viewing statistics (for admin)
    static async getAdStats() {
        try {
            const stats = await database.get(`
                SELECT 
                    COUNT(*) as total_views,
                    COUNT(DISTINCT user_id) as unique_viewers,
                    SUM(points_earned) as total_points_distributed
                FROM ad_views
            `);
            
            const todayStats = await database.get(`
                SELECT 
                    COUNT(*) as today_views,
                    COUNT(DISTINCT user_id) as today_unique_viewers
                FROM ad_views
                WHERE DATE(viewed_at) = DATE('now')
            `);
            
            return {
                totalViews: stats.total_views || 0,
                uniqueViewers: stats.unique_viewers || 0,
                totalPointsDistributed: stats.total_points_distributed || 0,
                todayViews: todayStats.today_views || 0,
                todayUniqueViewers: todayStats.today_unique_viewers || 0
            };
        } catch (error) {
            console.error('Error getting ad stats:', error);
            throw error;
        }
    }
}

// Ad watching service
class AdWatchingService {
    // Process ad watching for earning points
    static async watchAdForEarning(user, ad) {
        try {
            // Check if user can watch more ads today
            if (!user.canWatchAds()) {
                throw new Error('DAILY_LIMIT_REACHED');
            }

            // Check timer
            const canWatch = await AdView.canWatchNextAd(user.id, 'earn');
            if (!canWatch) {
                const remainingTime = await AdView.getRemainingTime(user.id, 'earn');
                throw new Error(`TIMER_WAIT:${remainingTime}`);
            }

            // Calculate points (with VIP bonus)
            let pointsEarned = ad.points_reward;
            let vipBonus = 0;
            
            if (user.isVip()) {
                // VIP users get extra bonus (example: 20% more)
                vipBonus = Math.ceil(pointsEarned * 0.2);
                pointsEarned += vipBonus;
            }

            // Record ad view
            await AdView.create(user.id, ad.id, 'earn', pointsEarned);
            
            // Update user points and ads watched count
            await user.addPoints(pointsEarned, 'Ad watching reward');
            await user.incrementAdsWatched();

            return {
                success: true,
                pointsEarned,
                vipBonus,
                totalPoints: user.points,
                adsWatched: user.daily_ads_watched,
                adsLimit: user.getDailyAdsLimit()
            };
        } catch (error) {
            console.error('Error processing ad watching:', error);
            throw error;
        }
    }

    // Process ad watching for contests
    static async watchAdForContest(user, ad, contestType) {
        try {
            // Check timer for contest ads
            const canWatch = await AdView.canWatchNextAd(user.id, contestType);
            if (!canWatch) {
                const remainingTime = await AdView.getRemainingTime(user.id, contestType);
                throw new Error(`TIMER_WAIT:${remainingTime}`);
            }

            // Record ad view (no points earned for contest ads)
            await AdView.create(user.id, ad.id, contestType, 0);

            return {
                success: true,
                message: 'Contest ad watched successfully'
            };
        } catch (error) {
            console.error('Error processing contest ad watching:', error);
            throw error;
        }
    }

    // Get next available ad for user
    static async getNextAd(excludeIds = []) {
        try {
            let query = 'SELECT * FROM ads WHERE is_active = 1';
            const params = [];
            
            if (excludeIds.length > 0) {
                const placeholders = excludeIds.map(() => '?').join(',');
                query += ` AND id NOT IN (${placeholders})`;
                params.push(...excludeIds);
            }
            
            query += ' ORDER BY RANDOM() LIMIT 1';
            
            const adData = await database.get(query, params);
            return adData ? new Ad(adData) : null;
        } catch (error) {
            console.error('Error getting next ad:', error);
            throw error;
        }
    }
}

module.exports = {
    Ad,
    AdView,
    AdWatchingService
};