const localization = require('../utils/localization');
const { AdWatchingService } = require('../models/Ad');
const { DailyTasksService } = require('../models/DailyTask');

class EarnHandler {
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
                case 'earn_watch_ads':
                    await this.handleWatchAds(chatId, user, messageId, lang);
                    break;
                case 'earn_daily_tasks':
                    await this.handleDailyTasks(chatId, user, messageId, lang);
                    break;
                case 'earn_vip_mining':
                    await this.handleVipMining(chatId, user, messageId, lang);
                    break;
                default:
                    // Handle back to menu
                    const MenuHandler = require('./menuHandler');
                    const menuHandler = new MenuHandler(this.bot);
                    await menuHandler.showMainMenu(chatId, user, messageId);
                    break;
            }
        } catch (error) {
            console.error('Error in earn handler:', error);
            await this.bot.answerCallbackQuery(callbackQuery.id, localization.t('errors.generic', lang));
        }
    }

    async handleWatchAds(chatId, user, messageId, lang) {
        // Implementation for ad watching
        const text = `${localization.t('earn.watch_ads', lang, { watched: user.daily_ads_watched, limit: user.getDailyAdsLimit() })}\n\n` +
            "Click 'Watch Ad' to start earning points!";
        
        const keyboard = {
            inline_keyboard: [
                [{ text: "📺 Watch Ad", callback_data: 'watch_ad_now' }],
                [{ text: localization.t('buttons.back', lang), callback_data: 'menu_earn' }]
            ]
        };

        await this.bot.editMessageText(text, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: keyboard
        });
    }

    async handleDailyTasks(chatId, user, messageId, lang) {
        // Implementation for daily tasks
        const tasksStatus = await DailyTasksService.getUserTasksStatus(user.id);
        
        let text = `${localization.t('daily_tasks.title', lang)}\n\n`;
        
        // Login task
        const loginTask = tasksStatus.login;
        let loginStatus = loginTask.completed ? 
            (loginTask.claimed ? localization.t('daily_tasks.claimed', lang) : 
             loginTask.canClaim ? localization.t('daily_tasks.claim', lang, { points: 1 }) : 
             localization.t('daily_tasks.timer', lang, { hours: Math.floor(loginTask.timeUntilClaim / 3600), minutes: Math.floor((loginTask.timeUntilClaim % 3600) / 60) })) :
            localization.t('daily_tasks.completed', lang);
        
        text += `🔄 ${localization.t('daily_tasks.login', lang)}: ${loginStatus}\n`;
        
        // Channel subscription task
        const channelTask = tasksStatus.channel_subscription;
        let channelStatus = channelTask.completed ? 
            (channelTask.claimed ? localization.t('daily_tasks.claimed', lang) : localization.t('daily_tasks.claim', lang, { points: 1 })) :
            "❌ Not completed";
        
        text += `📢 ${localization.t('daily_tasks.channel_sub', lang)}: ${channelStatus}`;

        const keyboard = {
            inline_keyboard: [
                [{ text: "🔄 Check Login", callback_data: 'task_login' }],
                [{ text: "📢 Check Channel Subscription", callback_data: 'task_channel' }],
                [{ text: localization.t('buttons.back', lang), callback_data: 'menu_earn' }]
            ]
        };

        await this.bot.editMessageText(text, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: keyboard
        });
    }

    async handleVipMining(chatId, user, messageId, lang) {
        // Implementation for VIP mining
        if (!user.isVip()) {
            await this.bot.answerCallbackQuery(callbackQuery.id, "VIP membership required");
            return;
        }

        const text = `${localization.t('vip.mining_available', lang, { points: user.getVipDetails().miningPoints })}\n\n` +
            "VIP mining rewards are processed automatically daily.";
        
        const keyboard = {
            inline_keyboard: [
                [{ text: "⛏️ Claim Mining Reward", callback_data: 'claim_mining' }],
                [{ text: localization.t('buttons.back', lang), callback_data: 'menu_earn' }]
            ]
        };

        await this.bot.editMessageText(text, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: keyboard
        });
    }
}

module.exports = EarnHandler;