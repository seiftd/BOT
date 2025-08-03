const localization = require('../utils/localization');

class ReferralHandler {
    constructor(bot) {
        this.bot = bot;
    }

    async handleCallback(callbackQuery, user) {
        const data = callbackQuery.data;
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;
        const lang = localization.getUserLanguage(user.language_code);

        try {
            switch (data) {
                case 'referral_leaderboard':
                    await this.showLeaderboard(chatId, user, messageId, lang);
                    break;
                default:
                    // Back to main menu
                    const MenuHandler = require('./menuHandler');
                    const menuHandler = new MenuHandler(this.bot);
                    await menuHandler.showMainMenu(chatId, user, messageId);
                    break;
            }
        } catch (error) {
            console.error('Error in referral handler:', error);
        }
    }

    async showLeaderboard(chatId, user, messageId, lang) {
        const database = require('../database/database');
        
        // Get top referrers for current week
        const topReferrers = await database.all(`
            SELECT u.first_name, u.last_name, u.total_referrals
            FROM users u
            WHERE u.total_referrals > 0
            ORDER BY u.total_referrals DESC
            LIMIT 10
        `);

        let text = `${localization.t('referral.leaderboard', lang)}\n\n`;
        
        if (topReferrers.length > 0) {
            topReferrers.forEach((referrer, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                const name = referrer.first_name || 'Anonymous';
                text += `${medal} ${name} - ${referrer.total_referrals} referrals\n`;
            });
        } else {
            text += "No referrals yet. Be the first!";
        }

        const keyboard = {
            inline_keyboard: [
                [{ text: localization.t('buttons.back', lang), callback_data: 'menu_referral' }]
            ]
        };

        await this.bot.editMessageText(text, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: keyboard
        });
    }
}

module.exports = ReferralHandler;