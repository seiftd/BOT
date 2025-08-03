const database = require('../database/database');
const moment = require('moment');

class DailyTask {
    constructor(data = {}) {
        this.id = data.id;
        this.user_id = data.user_id;
        this.task_type = data.task_type; // login, channel_subscription
        this.completed_at = data.completed_at;
        this.claim_available_at = data.claim_available_at;
        this.points_earned = data.points_earned || 0;
        this.date = data.date;
    }

    // Create or update daily task
    static async createOrUpdate(userId, taskType, pointsEarned = 1) {
        try {
            const today = moment().format('YYYY-MM-DD');
            
            // Check if task already exists for today
            const existing = await database.get(`
                SELECT * FROM daily_tasks 
                WHERE user_id = ? AND task_type = ? AND date = ?
            `, [userId, taskType, today]);

            if (existing) {
                // Update existing task
                const completedAt = new Date().toISOString();
                let claimAvailableAt = completedAt;
                
                // Login task has 24-hour claim delay
                if (taskType === 'login') {
                    claimAvailableAt = moment().add(24, 'hours').toISOString();
                }

                await database.run(`
                    UPDATE daily_tasks SET 
                        completed_at = ?, claim_available_at = ?, points_earned = ?
                    WHERE id = ?
                `, [completedAt, claimAvailableAt, pointsEarned, existing.id]);

                return await this.findById(existing.id);
            } else {
                // Create new task
                const completedAt = new Date().toISOString();
                let claimAvailableAt = completedAt;
                
                // Login task has 24-hour claim delay
                if (taskType === 'login') {
                    claimAvailableAt = moment().add(24, 'hours').toISOString();
                }

                const result = await database.run(`
                    INSERT INTO daily_tasks (
                        user_id, task_type, completed_at, claim_available_at, 
                        points_earned, date
                    ) VALUES (?, ?, ?, ?, ?, ?)
                `, [userId, taskType, completedAt, claimAvailableAt, pointsEarned, today]);

                return await this.findById(result.id);
            }
        } catch (error) {
            console.error('Error creating/updating daily task:', error);
            throw error;
        }
    }

    // Find task by ID
    static async findById(id) {
        try {
            const taskData = await database.get(
                'SELECT * FROM daily_tasks WHERE id = ?',
                [id]
            );
            return taskData ? new DailyTask(taskData) : null;
        } catch (error) {
            console.error('Error finding daily task by ID:', error);
            throw error;
        }
    }

    // Get user's tasks for today
    static async getUserTodayTasks(userId) {
        try {
            const today = moment().format('YYYY-MM-DD');
            const tasksData = await database.all(`
                SELECT * FROM daily_tasks 
                WHERE user_id = ? AND date = ?
                ORDER BY task_type
            `, [userId, today]);
            
            return tasksData.map(task => new DailyTask(task));
        } catch (error) {
            console.error('Error getting user today tasks:', error);
            throw error;
        }
    }

    // Get specific task for user today
    static async getUserTodayTask(userId, taskType) {
        try {
            const today = moment().format('YYYY-MM-DD');
            const taskData = await database.get(`
                SELECT * FROM daily_tasks 
                WHERE user_id = ? AND task_type = ? AND date = ?
            `, [userId, taskType, today]);
            
            return taskData ? new DailyTask(taskData) : null;
        } catch (error) {
            console.error('Error getting user today task:', error);
            throw error;
        }
    }

    // Check if task is completed
    isCompleted() {
        return this.completed_at !== null;
    }

    // Check if task reward can be claimed
    canClaim() {
        if (!this.isCompleted()) return false;
        if (!this.claim_available_at) return true;
        
        return moment().isAfter(moment(this.claim_available_at));
    }

    // Get time remaining until claim is available
    getTimeUntilClaim() {
        if (!this.claim_available_at) return 0;
        
        const claimTime = moment(this.claim_available_at);
        const now = moment();
        
        if (now.isAfter(claimTime)) return 0;
        
        return claimTime.diff(now, 'seconds');
    }

    // Mark task as claimed
    async markClaimed(user) {
        try {
            if (!this.canClaim()) {
                throw new Error('Task cannot be claimed yet');
            }

            // Add points to user
            await user.addPoints(this.points_earned, `Daily task reward: ${this.task_type}`);
            
            // Mark as claimed by setting points_earned to negative (claimed flag)
            await database.run(`
                UPDATE daily_tasks SET points_earned = ? WHERE id = ?
            `, [-Math.abs(this.points_earned), this.id]);

            return true;
        } catch (error) {
            console.error('Error marking task as claimed:', error);
            throw error;
        }
    }

    // Check if task has been claimed
    isClaimed() {
        return this.points_earned < 0;
    }
}

// Daily Tasks Service
class DailyTasksService {
    // Process daily login
    static async processLoginTask(user) {
        try {
            // Update user login streak
            await user.updateLoginStreak();
            
            // Create/update login task
            const loginTask = await DailyTask.createOrUpdate(user.id, 'login', 1);
            
            return {
                success: true,
                task: loginTask,
                canClaim: loginTask.canClaim(),
                timeUntilClaim: loginTask.getTimeUntilClaim()
            };
        } catch (error) {
            console.error('Error processing login task:', error);
            throw error;
        }
    }

    // Process channel subscription task
    static async processChannelSubscriptionTask(user, bot) {
        try {
            const channelUsername = process.env.CHANNEL_USERNAME;
            if (!channelUsername) {
                throw new Error('Channel username not configured');
            }

            // Check if user is subscribed to channel
            try {
                const chatMember = await bot.getChatMember(channelUsername, user.telegram_id);
                const isSubscribed = ['member', 'administrator', 'creator'].includes(chatMember.status);
                
                if (isSubscribed) {
                    // Update user subscription status
                    user.channel_subscribed = true;
                    await user.save();
                    
                    // Create/update channel subscription task
                    const subscriptionTask = await DailyTask.createOrUpdate(user.id, 'channel_subscription', 1);
                    
                    return {
                        success: true,
                        subscribed: true,
                        task: subscriptionTask,
                        canClaim: subscriptionTask.canClaim()
                    };
                } else {
                    return {
                        success: false,
                        subscribed: false,
                        channelUrl: `https://t.me/${channelUsername.replace('@', '')}`
                    };
                }
            } catch (botError) {
                console.error('Error checking channel membership:', botError);
                return {
                    success: false,
                    subscribed: false,
                    channelUrl: `https://t.me/${channelUsername.replace('@', '')}`
                };
            }
        } catch (error) {
            console.error('Error processing channel subscription task:', error);
            throw error;
        }
    }

    // Claim task reward
    static async claimTaskReward(user, taskType) {
        try {
            const task = await DailyTask.getUserTodayTask(user.id, taskType);
            
            if (!task) {
                throw new Error('Task not found');
            }
            
            if (task.isClaimed()) {
                throw new Error('Task already claimed');
            }
            
            if (!task.canClaim()) {
                const timeUntilClaim = task.getTimeUntilClaim();
                throw new Error(`Cannot claim yet. Wait ${Math.ceil(timeUntilClaim / 3600)} hours`);
            }
            
            await task.markClaimed(user);
            
            return {
                success: true,
                pointsEarned: Math.abs(task.points_earned),
                totalPoints: user.points
            };
        } catch (error) {
            console.error('Error claiming task reward:', error);
            throw error;
        }
    }

    // Get user's daily tasks status
    static async getUserTasksStatus(userId) {
        try {
            const tasks = await DailyTask.getUserTodayTasks(userId);
            const taskTypes = ['login', 'channel_subscription'];
            
            const taskStatus = {};
            
            for (const taskType of taskTypes) {
                const task = tasks.find(t => t.task_type === taskType);
                
                if (task) {
                    taskStatus[taskType] = {
                        completed: task.isCompleted(),
                        claimed: task.isClaimed(),
                        canClaim: task.canClaim(),
                        timeUntilClaim: task.getTimeUntilClaim(),
                        pointsReward: Math.abs(task.points_earned)
                    };
                } else {
                    taskStatus[taskType] = {
                        completed: false,
                        claimed: false,
                        canClaim: false,
                        timeUntilClaim: 0,
                        pointsReward: 1
                    };
                }
            }
            
            return taskStatus;
        } catch (error) {
            console.error('Error getting user tasks status:', error);
            throw error;
        }
    }

    // Get daily tasks statistics (for admin)
    static async getTasksStats() {
        try {
            const today = moment().format('YYYY-MM-DD');
            
            const loginStats = await database.get(`
                SELECT 
                    COUNT(*) as total_logins,
                    COUNT(CASE WHEN points_earned < 0 THEN 1 END) as claimed_logins
                FROM daily_tasks 
                WHERE task_type = 'login' AND date = ?
            `, [today]);
            
            const subscriptionStats = await database.get(`
                SELECT 
                    COUNT(*) as total_subscriptions,
                    COUNT(CASE WHEN points_earned < 0 THEN 1 END) as claimed_subscriptions
                FROM daily_tasks 
                WHERE task_type = 'channel_subscription' AND date = ?
            `, [today]);
            
            const allTimeStats = await database.get(`
                SELECT 
                    COUNT(*) as total_tasks,
                    SUM(CASE WHEN points_earned < 0 THEN ABS(points_earned) ELSE 0 END) as total_points_distributed
                FROM daily_tasks
            `);
            
            return {
                today: {
                    totalLogins: loginStats.total_logins || 0,
                    claimedLogins: loginStats.claimed_logins || 0,
                    totalSubscriptions: subscriptionStats.total_subscriptions || 0,
                    claimedSubscriptions: subscriptionStats.claimed_subscriptions || 0
                },
                allTime: {
                    totalTasks: allTimeStats.total_tasks || 0,
                    totalPointsDistributed: allTimeStats.total_points_distributed || 0
                }
            };
        } catch (error) {
            console.error('Error getting tasks stats:', error);
            throw error;
        }
    }
}

module.exports = {
    DailyTask,
    DailyTasksService
};