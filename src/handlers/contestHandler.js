const localization = require('../utils/localization');
const { ContestService } = require('../models/Contest');

class ContestHandler {
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
                case 'contest_daily':
                    await this.handleContestDetails(chatId, user, messageId, lang, 'daily');
                    break;
                case 'contest_weekly':
                    await this.handleContestDetails(chatId, user, messageId, lang, 'weekly');
                    break;
                case 'contest_monthly':
                    await this.handleContestDetails(chatId, user, messageId, lang, 'monthly');
                    break;
                case 'contest_vip':
                    await this.handleContestDetails(chatId, user, messageId, lang, 'vip');
                    break;
                default:
                    if (data.startsWith('join_contest_')) {
                        const contestType = data.replace('join_contest_', '');
                        await this.handleJoinContest(callbackQuery, user, contestType, lang);
                    } else if (data.startsWith('watch_contest_ad_')) {
                        const contestType = data.replace('watch_contest_ad_', '');
                        await this.handleWatchContestAd(callbackQuery, user, contestType, lang);
                    }
                    break;
            }
        } catch (error) {
            console.error('Error in contest handler:', error);
            await this.bot.answerCallbackQuery(callbackQuery.id, localization.t('errors.generic', lang));
        }
    }

    async handleContestDetails(chatId, user, messageId, lang, contestType) {
        const contestStatus = await ContestService.getUserContestStatus(user.id);
        const status = contestStatus[contestType];

        let text = `${localization.t(`contests.${contestType}`, lang)}\n\n`;
        
        if (status && status.active) {
            text += `${localization.t('contests.requirements', lang, { ads: status.requiredAds, timer: this.getTimerMinutes(contestType) })}\n`;
            text += `${localization.t('contests.progress', lang, { watched: status.adsWatched, required: status.requiredAds })}\n`;
            text += `${localization.t('contests.time_left', lang, { time: this.formatTime(status.timeRemaining, lang) })}\n`;
            text += `${localization.t('contests.winners', lang, { count: status.maxWinners })}\n`;
            text += `${localization.t('contests.prize', lang, { prize: status.prize })}`;
        } else {
            text += localization.t('contests.no_contest', lang);
        }

        const keyboard = {
            inline_keyboard: []
        };

        if (status && status.active) {
            if (!status.participating) {
                keyboard.inline_keyboard.push([
                    { text: "🏆 Join Contest", callback_data: `join_contest_${contestType}` }
                ]);
            } else if (!status.qualified) {
                keyboard.inline_keyboard.push([
                    { text: "📺 Watch Contest Ad", callback_data: `watch_contest_ad_${contestType}` }
                ]);
            } else {
                keyboard.inline_keyboard.push([
                    { text: "✅ Qualified - Wait for Results", callback_data: 'noop' }
                ]);
            }
        }

        keyboard.inline_keyboard.push([
            { text: localization.t('buttons.back', lang), callback_data: 'menu_contests' }
        ]);

        await this.bot.editMessageText(text, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: keyboard
        });
    }

    async handleJoinContest(callbackQuery, user, contestType, lang) {
        try {
            const result = await ContestService.joinContest(user, contestType);
            
            if (result.success) {
                await this.bot.answerCallbackQuery(callbackQuery.id, localization.t('contests.joined', lang));
            } else {
                await this.bot.answerCallbackQuery(callbackQuery.id, localization.t('contests.already_joined', lang));
            }
            
            // Refresh the contest details
            await this.handleContestDetails(
                callbackQuery.message.chat.id, 
                user, 
                callbackQuery.message.message_id, 
                lang, 
                contestType
            );
        } catch (error) {
            console.error('Error joining contest:', error);
            await this.bot.answerCallbackQuery(callbackQuery.id, localization.t('errors.generic', lang));
        }
    }

    async handleWatchContestAd(callbackQuery, user, contestType, lang) {
        try {
            const result = await ContestService.watchAdForContest(user, contestType);
            
            if (result.success) {
                const message = `✅ Ad watched! Progress: ${result.adsWatched}/${result.requiredAds}`;
                await this.bot.answerCallbackQuery(callbackQuery.id, message);
                
                if (result.qualified) {
                    await this.bot.sendMessage(callbackQuery.message.chat.id, 
                        `🎉 Congratulations! You're now qualified for the ${contestType} contest!`);
                }
            }
            
            // Refresh the contest details
            await this.handleContestDetails(
                callbackQuery.message.chat.id, 
                user, 
                callbackQuery.message.message_id, 
                lang, 
                contestType
            );
        } catch (error) {
            if (error.message.startsWith('TIMER_WAIT:')) {
                const remainingTime = parseInt(error.message.split(':')[1]);
                const minutes = Math.floor(remainingTime / 60);
                const seconds = remainingTime % 60;
                await this.bot.answerCallbackQuery(callbackQuery.id, 
                    localization.t('earn.timer_wait', lang, { minutes, seconds }));
            } else {
                console.error('Error watching contest ad:', error);
                await this.bot.answerCallbackQuery(callbackQuery.id, error.message);
            }
        }
    }

    getTimerMinutes(contestType) {
        switch (contestType) {
            case 'daily': return 2;
            case 'weekly': return 5;
            case 'monthly': return 15;
            case 'vip': return 2;
            default: return 2;
        }
    }

    formatTime(seconds, lang) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m`;
        } else {
            return `${seconds}s`;
        }
    }
}

module.exports = ContestHandler;