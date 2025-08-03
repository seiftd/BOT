const database = require('../database/database');
const moment = require('moment');
const { AdView } = require('./Ad');

class Contest {
    constructor(data = {}) {
        this.id = data.id;
        this.type = data.type; // daily, weekly, monthly, vip
        this.start_date = data.start_date;
        this.end_date = data.end_date;
        this.required_ads = data.required_ads;
        this.ad_timer_minutes = data.ad_timer_minutes;
        this.max_winners = data.max_winners || 1;
        this.prize_points = data.prize_points;
        this.prize_description = data.prize_description;
        this.status = data.status || 'active';
        this.created_at = data.created_at;
    }

    // Create new contest
    static async create(contestData) {
        try {
            const result = await database.run(`
                INSERT INTO contests (
                    type, start_date, end_date, required_ads, ad_timer_minutes,
                    max_winners, prize_points, prize_description, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                contestData.type,
                contestData.start_date,
                contestData.end_date,
                contestData.required_ads,
                contestData.ad_timer_minutes,
                contestData.max_winners || 1,
                contestData.prize_points,
                contestData.prize_description,
                contestData.status || 'active'
            ]);

            return await this.findById(result.id);
        } catch (error) {
            console.error('Error creating contest:', error);
            throw error;
        }
    }

    // Find contest by ID
    static async findById(id) {
        try {
            const contestData = await database.get(
                'SELECT * FROM contests WHERE id = ?',
                [id]
            );
            return contestData ? new Contest(contestData) : null;
        } catch (error) {
            console.error('Error finding contest by ID:', error);
            throw error;
        }
    }

    // Get active contest by type
    static async getActiveContest(type) {
        try {
            const contestData = await database.get(`
                SELECT * FROM contests 
                WHERE type = ? AND status = 'active' 
                AND start_date <= datetime('now') 
                AND end_date > datetime('now')
                ORDER BY start_date DESC
                LIMIT 1
            `, [type]);
            
            return contestData ? new Contest(contestData) : null;
        } catch (error) {
            console.error('Error getting active contest:', error);
            throw error;
        }
    }

    // Get all active contests
    static async getActiveContests() {
        try {
            const contestsData = await database.all(`
                SELECT * FROM contests 
                WHERE status = 'active' 
                AND start_date <= datetime('now') 
                AND end_date > datetime('now')
                ORDER BY type, start_date DESC
            `);
            
            return contestsData.map(contest => new Contest(contest));
        } catch (error) {
            console.error('Error getting active contests:', error);
            throw error;
        }
    }

    // Update contest
    async save() {
        try {
            await database.run(`
                UPDATE contests SET 
                    type = ?, start_date = ?, end_date = ?, required_ads = ?,
                    ad_timer_minutes = ?, max_winners = ?, prize_points = ?,
                    prize_description = ?, status = ?
                WHERE id = ?
            `, [
                this.type, this.start_date, this.end_date, this.required_ads,
                this.ad_timer_minutes, this.max_winners, this.prize_points,
                this.prize_description, this.status, this.id
            ]);
            
            return true;
        } catch (error) {
            console.error('Error saving contest:', error);
            throw error;
        }
    }

    // End contest
    async endContest() {
        try {
            this.status = 'ended';
            await this.save();
            
            // Select winners
            const winners = await this.selectWinners();
            
            // Distribute prizes
            for (const winner of winners) {
                await this.distributePrize(winner);
            }
            
            return winners;
        } catch (error) {
            console.error('Error ending contest:', error);
            throw error;
        }
    }

    // Select contest winners
    async selectWinners() {
        try {
            // Get all qualified participants
            const qualifiedParticipants = await database.all(`
                SELECT cp.*, u.telegram_id, u.first_name, u.last_name
                FROM contest_participants cp
                JOIN users u ON cp.user_id = u.id
                WHERE cp.contest_id = ? AND cp.qualified = 1
                ORDER BY RANDOM()
                LIMIT ?
            `, [this.id, this.max_winners]);

            // Mark them as winners
            for (const participant of qualifiedParticipants) {
                await database.run(`
                    UPDATE contest_participants 
                    SET is_winner = 1 
                    WHERE id = ?
                `, [participant.id]);
            }

            return qualifiedParticipants;
        } catch (error) {
            console.error('Error selecting winners:', error);
            throw error;
        }
    }

    // Distribute prize to winner
    async distributePrize(winnerData) {
        try {
            const User = require('./User');
            const user = await User.findById(winnerData.user_id);
            
            if (user) {
                if (this.type === 'monthly' && this.prize_description === 'king vip promoted') {
                    // Upgrade to King VIP for monthly contest
                    await user.upgradeToVip('king', 30);
                } else if (this.prize_points) {
                    // Give points prize
                    await user.addPoints(this.prize_points, `Contest winner: ${this.type}`);
                }
            }
            
            // Mark prize as claimed
            await database.run(`
                UPDATE contest_participants 
                SET prize_claimed = 1 
                WHERE contest_id = ? AND user_id = ?
            `, [this.id, winnerData.user_id]);
            
        } catch (error) {
            console.error('Error distributing prize:', error);
            throw error;
        }
    }

    // Check if contest is active
    isActive() {
        const now = moment();
        const startDate = moment(this.start_date);
        const endDate = moment(this.end_date);
        
        return this.status === 'active' && now.isBetween(startDate, endDate);
    }

    // Get time remaining
    getTimeRemaining() {
        const now = moment();
        const endDate = moment(this.end_date);
        
        if (now.isAfter(endDate)) return 0;
        
        return endDate.diff(now, 'seconds');
    }

    // Get participants count
    async getParticipantsCount() {
        try {
            const result = await database.get(`
                SELECT COUNT(*) as count 
                FROM contest_participants 
                WHERE contest_id = ?
            `, [this.id]);
            
            return result.count || 0;
        } catch (error) {
            console.error('Error getting participants count:', error);
            return 0;
        }
    }

    // Get qualified participants count
    async getQualifiedParticipantsCount() {
        try {
            const result = await database.get(`
                SELECT COUNT(*) as count 
                FROM contest_participants 
                WHERE contest_id = ? AND qualified = 1
            `, [this.id]);
            
            return result.count || 0;
        } catch (error) {
            console.error('Error getting qualified participants count:', error);
            return 0;
        }
    }
}

class ContestParticipant {
    constructor(data = {}) {
        this.id = data.id;
        this.contest_id = data.contest_id;
        this.user_id = data.user_id;
        this.ads_watched = data.ads_watched || 0;
        this.qualified = data.qualified || false;
        this.is_winner = data.is_winner || false;
        this.prize_claimed = data.prize_claimed || false;
        this.joined_at = data.joined_at;
    }

    // Join contest
    static async joinContest(userId, contestId) {
        try {
            // Check if already participating
            const existing = await database.get(`
                SELECT * FROM contest_participants 
                WHERE user_id = ? AND contest_id = ?
            `, [userId, contestId]);

            if (existing) {
                return new ContestParticipant(existing);
            }

            // Join contest
            const result = await database.run(`
                INSERT INTO contest_participants (user_id, contest_id)
                VALUES (?, ?)
            `, [userId, contestId]);

            return await this.findById(result.id);
        } catch (error) {
            console.error('Error joining contest:', error);
            throw error;
        }
    }

    // Find participant by ID
    static async findById(id) {
        try {
            const participantData = await database.get(
                'SELECT * FROM contest_participants WHERE id = ?',
                [id]
            );
            return participantData ? new ContestParticipant(participantData) : null;
        } catch (error) {
            console.error('Error finding contest participant by ID:', error);
            throw error;
        }
    }

    // Get user's participation in contest
    static async getUserParticipation(userId, contestId) {
        try {
            const participantData = await database.get(`
                SELECT * FROM contest_participants 
                WHERE user_id = ? AND contest_id = ?
            `, [userId, contestId]);
            
            return participantData ? new ContestParticipant(participantData) : null;
        } catch (error) {
            console.error('Error getting user participation:', error);
            throw error;
        }
    }

    // Update ads watched count
    async incrementAdsWatched() {
        try {
            this.ads_watched += 1;
            
            // Check if qualified
            const contest = await Contest.findById(this.contest_id);
            if (contest && this.ads_watched >= contest.required_ads) {
                this.qualified = true;
            }
            
            await database.run(`
                UPDATE contest_participants 
                SET ads_watched = ?, qualified = ?
                WHERE id = ?
            `, [this.ads_watched, this.qualified, this.id]);
            
            return true;
        } catch (error) {
            console.error('Error incrementing ads watched:', error);
            throw error;
        }
    }
}

// Contest Service
class ContestService {
    // Create automatic contests
    static async createAutomaticContests() {
        try {
            const now = moment().utc();
            
            // Create daily contest (ends at 23:30 UTC)
            await this.createDailyContest(now);
            
            // Create weekly contest (ends every Monday at 23:30 UTC)
            if (now.day() === 1) { // Monday
                await this.createWeeklyContest(now);
            }
            
            // Create monthly contest (ends on 1st of month at 23:30 UTC)
            if (now.date() === 1) { // First day of month
                await this.createMonthlyContest(now);
            }
            
            // Create VIP contest (10 days duration)
            await this.createVipContest(now);
            
        } catch (error) {
            console.error('Error creating automatic contests:', error);
            throw error;
        }
    }

    // Create daily contest
    static async createDailyContest(now) {
        try {
            const today = now.format('YYYY-MM-DD');
            const endTime = moment.utc(today + ' 23:30');
            
            // Check if daily contest already exists for today
            const existing = await database.get(`
                SELECT * FROM contests 
                WHERE type = 'daily' 
                AND DATE(start_date) = ?
            `, [today]);
            
            if (!existing) {
                await Contest.create({
                    type: 'daily',
                    start_date: now.toISOString(),
                    end_date: endTime.toISOString(),
                    required_ads: 10,
                    ad_timer_minutes: 2,
                    max_winners: 1,
                    prize_points: 50, // Example prize
                    prize_description: '50 points for daily winner'
                });
                
                console.log('Daily contest created');
            }
        } catch (error) {
            console.error('Error creating daily contest:', error);
        }
    }

    // Create weekly contest
    static async createWeeklyContest(now) {
        try {
            const endTime = moment.utc().day(1).hour(23).minute(30).second(0); // Next Monday 23:30
            if (endTime.isBefore(now)) {
                endTime.add(1, 'week');
            }
            
            await Contest.create({
                type: 'weekly',
                start_date: now.toISOString(),
                end_date: endTime.toISOString(),
                required_ads: 30,
                ad_timer_minutes: 5,
                max_winners: 3,
                prize_points: 100, // Example prize
                prize_description: '100 points for each of 3 winners'
            });
            
            console.log('Weekly contest created');
        } catch (error) {
            console.error('Error creating weekly contest:', error);
        }
    }

    // Create monthly contest
    static async createMonthlyContest(now) {
        try {
            const endTime = moment.utc().add(1, 'month').startOf('month').hour(23).minute(30);
            
            await Contest.create({
                type: 'monthly',
                start_date: now.toISOString(),
                end_date: endTime.toISOString(),
                required_ads: 200,
                ad_timer_minutes: 15,
                max_winners: 3,
                prize_points: 0, // VIP upgrade instead
                prize_description: 'king vip promoted'
            });
            
            console.log('Monthly contest created');
        } catch (error) {
            console.error('Error creating monthly contest:', error);
        }
    }

    // Create VIP contest
    static async createVipContest(now) {
        try {
            // Check if active VIP contest exists
            const existing = await Contest.getActiveContest('vip');
            
            if (!existing) {
                const endTime = moment.utc(now).add(10, 'days');
                
                await Contest.create({
                    type: 'vip',
                    start_date: now.toISOString(),
                    end_date: endTime.toISOString(),
                    required_ads: 50,
                    ad_timer_minutes: 2,
                    max_winners: 1,
                    prize_points: 200, // Example prize
                    prize_description: '200 points for VIP winner'
                });
                
                console.log('VIP contest created');
            }
        } catch (error) {
            console.error('Error creating VIP contest:', error);
        }
    }

    // Join contest
    static async joinContest(user, contestType) {
        try {
            const contest = await Contest.getActiveContest(contestType);
            
            if (!contest) {
                throw new Error('No active contest found');
            }
            
            // Check VIP requirement for VIP contest
            if (contestType === 'vip' && !user.isVip()) {
                throw new Error('VIP membership required');
            }
            
            // Check if already participating
            const participation = await ContestParticipant.getUserParticipation(user.id, contest.id);
            
            if (participation) {
                return {
                    success: false,
                    message: 'Already participating',
                    participation
                };
            }
            
            // Join contest
            const newParticipation = await ContestParticipant.joinContest(user.id, contest.id);
            
            return {
                success: true,
                message: 'Joined contest successfully',
                participation: newParticipation,
                contest
            };
        } catch (error) {
            console.error('Error joining contest:', error);
            throw error;
        }
    }

    // Watch ad for contest
    static async watchAdForContest(user, contestType) {
        try {
            const contest = await Contest.getActiveContest(contestType);
            
            if (!contest) {
                throw new Error('No active contest found');
            }
            
            // Get user participation
            const participation = await ContestParticipant.getUserParticipation(user.id, contest.id);
            
            if (!participation) {
                throw new Error('Not participating in contest');
            }
            
            // Check if qualified
            if (participation.qualified) {
                throw new Error('Already qualified for contest');
            }
            
            // Check timer
            const canWatch = await AdView.canWatchNextAd(user.id, `${contestType}_contest`);
            if (!canWatch) {
                const remainingTime = await AdView.getRemainingTime(user.id, `${contestType}_contest`);
                throw new Error(`TIMER_WAIT:${remainingTime}`);
            }
            
            // Get ad and record view
            const { AdWatchingService } = require('./Ad');
            const ad = await AdWatchingService.getNextAd();
            
            if (!ad) {
                throw new Error('No ads available');
            }
            
            // Record ad view for contest
            await AdView.create(user.id, ad.id, `${contestType}_contest`, 0);
            
            // Increment contest ads watched
            await participation.incrementAdsWatched();
            
            return {
                success: true,
                adsWatched: participation.ads_watched + 1,
                requiredAds: contest.required_ads,
                qualified: participation.ads_watched + 1 >= contest.required_ads,
                ad
            };
        } catch (error) {
            console.error('Error watching ad for contest:', error);
            throw error;
        }
    }

    // Get user's contest status
    static async getUserContestStatus(userId) {
        try {
            const activeContests = await Contest.getActiveContests();
            const contestStatus = {};
            
            for (const contest of activeContests) {
                const participation = await ContestParticipant.getUserParticipation(userId, contest.id);
                
                contestStatus[contest.type] = {
                    contestId: contest.id,
                    active: true,
                    participating: !!participation,
                    adsWatched: participation ? participation.ads_watched : 0,
                    requiredAds: contest.required_ads,
                    qualified: participation ? participation.qualified : false,
                    timeRemaining: contest.getTimeRemaining(),
                    prize: contest.prize_description,
                    maxWinners: contest.max_winners
                };
            }
            
            return contestStatus;
        } catch (error) {
            console.error('Error getting user contest status:', error);
            throw error;
        }
    }

    // End expired contests
    static async endExpiredContests() {
        try {
            const expiredContests = await database.all(`
                SELECT * FROM contests 
                WHERE status = 'active' 
                AND end_date <= datetime('now')
            `);
            
            for (const contestData of expiredContests) {
                const contest = new Contest(contestData);
                await contest.endContest();
                console.log(`Contest ${contest.type} (ID: ${contest.id}) ended`);
            }
        } catch (error) {
            console.error('Error ending expired contests:', error);
        }
    }

    // Get contest statistics (for admin)
    static async getContestStats() {
        try {
            const stats = await database.get(`
                SELECT 
                    COUNT(*) as total_contests,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_contests,
                    COUNT(CASE WHEN status = 'ended' THEN 1 END) as ended_contests
                FROM contests
            `);
            
            const participationStats = await database.get(`
                SELECT 
                    COUNT(*) as total_participations,
                    COUNT(CASE WHEN qualified = 1 THEN 1 END) as qualified_participants,
                    COUNT(CASE WHEN is_winner = 1 THEN 1 END) as total_winners
                FROM contest_participants
            `);
            
            return {
                totalContests: stats.total_contests || 0,
                activeContests: stats.active_contests || 0,
                endedContests: stats.ended_contests || 0,
                totalParticipations: participationStats.total_participations || 0,
                qualifiedParticipants: participationStats.qualified_participants || 0,
                totalWinners: participationStats.total_winners || 0
            };
        } catch (error) {
            console.error('Error getting contest stats:', error);
            throw error;
        }
    }
}

module.exports = {
    Contest,
    ContestParticipant,
    ContestService
};