const localization = require('../utils/localization');

class AdminHandler {
    constructor(bot) {
        this.bot = bot;
        this.userInputState = new Map();
    }

    async handleAdminCommand(msg) {
        const userId = msg.from.id;
        const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => parseInt(id)) : [];
        
        if (!adminIds.includes(userId)) {
            await this.bot.sendMessage(msg.chat.id, "❌ Access denied. Admin only.");
            return;
        }

        const User = require('../models/User');
        const user = await User.findByTelegramId(userId);
        const lang = localization.getUserLanguage(user?.language_code);

        await this.showAdminPanel(msg.chat.id, user, lang);
    }

    async showAdminPanel(chatId, user, lang) {
        // Get admin statistics
        const User = require('../models/User');
        const totalUsers = await User.getTotalUsersCount();
        const vipUsers = await User.getVipUsersCount();

        let text = `${localization.t('admin.title', lang)}\n\n`;
        text += `${localization.t('admin.users', lang, { count: totalUsers })}\n`;
        text += `${localization.t('admin.pending_vip', lang, { count: 0 })}\n`;
        text += `${localization.t('admin.pending_withdrawals', lang, { count: 0 })}`;

        const keyboard = {
            inline_keyboard: [
                [
                    { text: localization.t('admin.user_management', lang), callback_data: 'admin_users' },
                    { text: localization.t('admin.approve_payments', lang), callback_data: 'admin_payments' }
                ],
                [
                    { text: localization.t('admin.manage_contests', lang), callback_data: 'admin_contests' },
                    { text: localization.t('admin.manage_ads', lang), callback_data: 'admin_ads' }
                ],
                [
                    { text: localization.t('admin.send_notification', lang), callback_data: 'admin_notify' }
                ]
            ]
        };

        await this.bot.sendMessage(chatId, text, { reply_markup: keyboard });
    }

    async handleCallback(callbackQuery, user) {
        const data = callbackQuery.data;
        const chatId = callbackQuery.message.chat.id;
        const lang = localization.getUserLanguage(user.language_code);

        try {
            switch (data) {
                case 'admin_users':
                    await this.showUserManagement(chatId, user, lang);
                    break;
                case 'admin_payments':
                    await this.showPaymentApprovals(chatId, user, lang);
                    break;
                case 'admin_contests':
                    await this.showContestManagement(chatId, user, lang);
                    break;
                case 'admin_ads':
                    await this.showAdManagement(chatId, user, lang);
                    break;
                case 'admin_notify':
                    await this.showNotificationPanel(chatId, user, lang);
                    break;
                default:
                    await this.bot.answerCallbackQuery(callbackQuery.id, "Feature coming soon...");
                    break;
            }
        } catch (error) {
            console.error('Error in admin handler:', error);
            await this.bot.answerCallbackQuery(callbackQuery.id, "Error occurred");
        }
    }

    async showUserManagement(chatId, user, lang) {
        const text = `${localization.t('admin.user_management', lang)}\n\nFeature coming soon...`;
        await this.bot.sendMessage(chatId, text);
    }

    async showPaymentApprovals(chatId, user, lang) {
        const database = require('../database/database');
        
        // Get pending VIP purchases
        const pendingVip = await database.all(`
            SELECT vp.*, u.first_name, u.last_name, u.username
            FROM vip_purchases vp
            JOIN users u ON vp.user_id = u.id
            WHERE vp.status = 'pending'
            ORDER BY vp.created_at DESC
            LIMIT 10
        `);

        let text = `${localization.t('admin.approve_payments', lang)}\n\n`;
        
        if (pendingVip.length > 0) {
            text += "Pending VIP Purchases:\n";
            pendingVip.forEach((purchase, index) => {
                const userName = purchase.first_name || purchase.username || 'Unknown';
                text += `${index + 1}. ${userName} - ${purchase.vip_level} VIP ($${purchase.amount_usdt})\n`;
                text += `   TX: ${purchase.transaction_hash}\n\n`;
            });
        } else {
            text += "No pending payments.";
        }

        await this.bot.sendMessage(chatId, text);
    }

    async showContestManagement(chatId, user, lang) {
        const text = `${localization.t('admin.manage_contests', lang)}\n\nFeature coming soon...`;
        await this.bot.sendMessage(chatId, text);
    }

    async showAdManagement(chatId, user, lang) {
        const text = `${localization.t('admin.manage_ads', lang)}\n\nFeature coming soon...`;
        await this.bot.sendMessage(chatId, text);
    }

    async showNotificationPanel(chatId, user, lang) {
        const text = `${localization.t('admin.send_notification', lang)}\n\nFeature coming soon...`;
        await this.bot.sendMessage(chatId, text);
    }

    isWaitingForInput(userId) {
        return this.userInputState.has(userId);
    }

    async handleTextInput(msg, user) {
        // Handle admin text inputs
        const state = this.userInputState.get(user.id);
        if (!state) return;

        // Implementation for admin text inputs
        console.log('Admin text input:', msg.text);
    }
}

module.exports = AdminHandler;