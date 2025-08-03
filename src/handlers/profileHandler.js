const localization = require('../utils/localization');

class ProfileHandler {
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
                case 'profile_withdraw':
                    await this.showWithdrawOptions(chatId, user, messageId, lang);
                    break;
                case 'profile_history':
                    await this.showUserHistory(chatId, user, messageId, lang);
                    break;
                default:
                    // Back to main menu
                    const MenuHandler = require('./menuHandler');
                    const menuHandler = new MenuHandler(this.bot);
                    await menuHandler.showMainMenu(chatId, user, messageId);
                    break;
            }
        } catch (error) {
            console.error('Error in profile handler:', error);
        }
    }

    async showWithdrawOptions(chatId, user, messageId, lang) {
        let text = `${localization.t('withdraw.title', lang)}\n\n`;
        text += `${localization.t('profile.points', lang, { points: user.points })}\n`;
        text += `${localization.t('profile.usdt_value', lang, { usdt: (user.points / 100).toFixed(2) })}\n\n`;
        text += localization.t('withdraw.methods', lang);

        const minBinance = user.vip_level === 'lord' ? 2 : 3;
        
        const keyboard = {
            inline_keyboard: [
                [{ text: localization.t('withdraw.binance_pay', lang, { min: minBinance }), callback_data: 'withdraw_binance' }],
                [{ text: localization.t('withdraw.ton_wallet', lang, { min: 1 }), callback_data: 'withdraw_ton' }],
                [{ text: localization.t('withdraw.usdt_trc20', lang, { min: 4 }), callback_data: 'withdraw_usdt' }],
                [{ text: localization.t('buttons.back', lang), callback_data: 'menu_profile' }]
            ]
        };

        await this.bot.editMessageText(text, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: keyboard
        });
    }

    async showUserHistory(chatId, user, messageId, lang) {
        const text = `${localization.t('profile.history', lang)}\n\nFeature coming soon...`;
        
        const keyboard = {
            inline_keyboard: [
                [{ text: localization.t('buttons.back', lang), callback_data: 'menu_profile' }]
            ]
        };

        await this.bot.editMessageText(text, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: keyboard
        });
    }
}

module.exports = ProfileHandler;