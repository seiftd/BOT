const localization = require('../utils/localization');

class MenuHandler {
    constructor(bot) {
        this.bot = bot;
    }

    // Show main menu
    async showMainMenu(chatId, user, messageId = null) {
        try {
            const lang = localization.getUserLanguage(user.language_code);
            
            // Get user stats for display
            const stats = await user.getStats();
            
            let statusEmoji = '';
            if (user.isVip()) {
                const vipDetails = user.getVipDetails();
                switch (user.vip_level) {
                    case 'king':
                        statusEmoji = '👑';
                        break;
                    case 'emperor':
                        statusEmoji = '👨‍💼';
                        break;
                    case 'lord':
                        statusEmoji = '🏛️';
                        break;
                }
            }
            
            const welcomeText = `${statusEmoji} ${localization.t('menu.main', lang)}\n\n` +
                `💰 ${localization.t('profile.points', lang, { points: stats.points })}\n` +
                `💵 ${localization.t('profile.usdt_value', lang, { usdt: stats.pointsValue })}\n` +
                `📺 ${localization.t('earn.watch_ads', lang, { watched: stats.dailyAdsWatched, limit: stats.dailyAdsLimit })}\n`;
            
            const keyboard = {
                inline_keyboard: [
                    [
                        { text: localization.t('menu.earn', lang), callback_data: 'menu_earn' },
                        { text: localization.t('menu.contests', lang), callback_data: 'menu_contests' }
                    ],
                    [
                        { text: localization.t('menu.vip', lang), callback_data: 'menu_vip' },
                        { text: localization.t('menu.profile', lang), callback_data: 'menu_profile' }
                    ],
                    [
                        { text: localization.t('menu.referral', lang), callback_data: 'menu_referral' },
                        { text: localization.t('menu.settings', lang), callback_data: 'menu_settings' }
                    ]
                ]
            };

            const options = {
                reply_markup: keyboard,
                parse_mode: 'HTML'
            };

            if (messageId) {
                await this.bot.editMessageText(welcomeText, {
                    chat_id: chatId,
                    message_id: messageId,
                    ...options
                });
            } else {
                await this.bot.sendMessage(chatId, welcomeText, options);
            }
        } catch (error) {
            console.error('Error showing main menu:', error);
            await this.bot.sendMessage(chatId, 'An error occurred. Please try again.');
        }
    }

    // Handle menu callbacks
    async handleCallback(callbackQuery, user) {
        try {
            const data = callbackQuery.data;
            const chatId = callbackQuery.message.chat.id;
            const messageId = callbackQuery.message.message_id;
            const lang = localization.getUserLanguage(user.language_code);

            switch (data) {
                case 'menu_main':
                    await this.showMainMenu(chatId, user, messageId);
                    break;

                case 'menu_earn':
                    await this.showEarnMenu(chatId, user, messageId);
                    break;

                case 'menu_contests':
                    await this.showContestsMenu(chatId, user, messageId);
                    break;

                case 'menu_vip':
                    await this.showVipMenu(chatId, user, messageId);
                    break;

                case 'menu_profile':
                    await this.showProfileMenu(chatId, user, messageId);
                    break;

                case 'menu_referral':
                    await this.showReferralMenu(chatId, user, messageId);
                    break;

                case 'menu_settings':
                    await this.showSettingsMenu(chatId, user, messageId);
                    break;

                default:
                    await this.showMainMenu(chatId, user, messageId);
                    break;
            }
        } catch (error) {
            console.error('Error handling menu callback:', error);
        }
    }

    // Show earn menu
    async showEarnMenu(chatId, user, messageId) {
        try {
            const lang = localization.getUserLanguage(user.language_code);
            const stats = await user.getStats();
            
            const text = `${localization.t('earn.title', lang)}\n\n` +
                `📊 ${localization.t('earn.watch_ads', lang, { watched: stats.dailyAdsWatched, limit: stats.dailyAdsLimit })}\n` +
                `💰 ${localization.t('profile.points', lang, { points: stats.points })}`;

            const keyboard = {
                inline_keyboard: [
                    [
                        { text: localization.t('earn.watch_ads', lang, { watched: stats.dailyAdsWatched, limit: stats.dailyAdsLimit }), callback_data: 'earn_watch_ads' }
                    ],
                    [
                        { text: localization.t('earn.daily_tasks', lang), callback_data: 'earn_daily_tasks' }
                    ]
                ]
            };

            // Add VIP mining button if user is VIP
            if (user.isVip()) {
                keyboard.inline_keyboard.push([
                    { text: localization.t('earn.mining', lang), callback_data: 'earn_vip_mining' }
                ]);
            }

            // Add back button
            keyboard.inline_keyboard.push([
                { text: localization.t('buttons.back', lang), callback_data: 'menu_main' }
            ]);

            await this.bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: keyboard
            });
        } catch (error) {
            console.error('Error showing earn menu:', error);
        }
    }

    // Show contests menu
    async showContestsMenu(chatId, user, messageId) {
        try {
            const lang = localization.getUserLanguage(user.language_code);
            const { ContestService } = require('../models/Contest');
            
            const contestStatus = await ContestService.getUserContestStatus(user.id);
            
            let text = `${localization.t('contests.title', lang)}\n\n`;
            
            // Show status for each contest type
            const contestTypes = ['daily', 'weekly', 'monthly'];
            if (user.isVip()) {
                contestTypes.push('vip');
            }

            for (const type of contestTypes) {
                const status = contestStatus[type];
                if (status && status.active) {
                    const progress = `${status.adsWatched}/${status.requiredAds}`;
                    const qualified = status.qualified ? '✅' : '❌';
                    text += `${localization.t(`contests.${type}`, lang)}: ${progress} ${qualified}\n`;
                } else {
                    text += `${localization.t(`contests.${type}`, lang)}: ${localization.t('contests.no_contest', lang)}\n`;
                }
            }

            const keyboard = {
                inline_keyboard: [
                    [
                        { text: localization.t('contests.daily', lang), callback_data: 'contest_daily' },
                        { text: localization.t('contests.weekly', lang), callback_data: 'contest_weekly' }
                    ],
                    [
                        { text: localization.t('contests.monthly', lang), callback_data: 'contest_monthly' }
                    ]
                ]
            };

            // Add VIP contest button if user is VIP
            if (user.isVip()) {
                keyboard.inline_keyboard.push([
                    { text: localization.t('contests.vip', lang), callback_data: 'contest_vip' }
                ]);
            }

            // Add back button
            keyboard.inline_keyboard.push([
                { text: localization.t('buttons.back', lang), callback_data: 'menu_main' }
            ]);

            await this.bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: keyboard
            });
        } catch (error) {
            console.error('Error showing contests menu:', error);
        }
    }

    // Show VIP menu
    async showVipMenu(chatId, user, messageId) {
        try {
            const lang = localization.getUserLanguage(user.language_code);
            
            let text = `${localization.t('vip.title', lang)}\n\n`;
            
            if (user.isVip()) {
                const vipDetails = user.getVipDetails();
                text += `${localization.t('vip.current', lang, { level: vipDetails.name })}\n`;
                if (user.vip_expires_at) {
                    text += `${localization.t('vip.expires', lang, { date: localization.formatDate(user.vip_expires_at, lang) })}\n\n`;
                }
                
                text += `✨ ${localization.t('earn.mining', lang)}\n`;
            } else {
                text += `${localization.t('vip.current', lang, { level: 'None' })}\n\n`;
            }
            
            // Show VIP levels
            text += `${localization.t('vip.king.name', lang)} - ${localization.t('vip.king.price', lang)}\n`;
            text += `${localization.t('vip.emperor.name', lang)} - ${localization.t('vip.emperor.price', lang)}\n`;
            text += `${localization.t('vip.lord.name', lang)} - ${localization.t('vip.lord.price', lang)}`;

            const keyboard = {
                inline_keyboard: [
                    [
                        { text: `👑 ${localization.t('vip.king.name', lang)}`, callback_data: 'vip_king' },
                        { text: `👨‍💼 ${localization.t('vip.emperor.name', lang)}`, callback_data: 'vip_emperor' }
                    ],
                    [
                        { text: `🏛️ ${localization.t('vip.lord.name', lang)}`, callback_data: 'vip_lord' }
                    ]
                ]
            };

            // Add mining button if user is VIP
            if (user.isVip()) {
                keyboard.inline_keyboard.push([
                    { text: localization.t('earn.mining', lang), callback_data: 'vip_mining' }
                ]);
            }

            // Add back button
            keyboard.inline_keyboard.push([
                { text: localization.t('buttons.back', lang), callback_data: 'menu_main' }
            ]);

            await this.bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: keyboard
            });
        } catch (error) {
            console.error('Error showing VIP menu:', error);
        }
    }

    // Show profile menu
    async showProfileMenu(chatId, user, messageId) {
        try {
            const lang = localization.getUserLanguage(user.language_code);
            const stats = await user.getStats();
            
            let text = `${localization.t('profile.title', lang)}\n\n`;
            text += `${localization.t('profile.points', lang, { points: stats.points })}\n`;
            text += `${localization.t('profile.usdt_value', lang, { usdt: stats.pointsValue })}\n`;
            text += `${localization.t('profile.vip_status', lang, { level: user.vip_level })}\n`;
            
            if (user.vip_expires_at) {
                text += `${localization.t('profile.vip_expires', lang, { date: localization.formatDate(user.vip_expires_at, lang) })}\n`;
            }
            
            text += `${localization.t('profile.referrals', lang, { count: stats.totalReferrals })}`;

            const keyboard = {
                inline_keyboard: [
                    [
                        { text: localization.t('profile.withdraw', lang), callback_data: 'profile_withdraw' },
                        { text: localization.t('profile.history', lang), callback_data: 'profile_history' }
                    ],
                    [
                        { text: localization.t('buttons.back', lang), callback_data: 'menu_main' }
                    ]
                ]
            };

            await this.bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: keyboard
            });
        } catch (error) {
            console.error('Error showing profile menu:', error);
        }
    }

    // Show referral menu
    async showReferralMenu(chatId, user, messageId) {
        try {
            const lang = localization.getUserLanguage(user.language_code);
            const botInfo = await this.bot.getMe();
            const referralLink = user.getReferralLink(botInfo.username);
            
            const text = `${localization.t('referral.title', lang)}\n\n` +
                `${localization.t('referral.code', lang, { link: referralLink })}\n\n` +
                `${localization.t('referral.stats', lang, { count: user.total_referrals, points: user.total_referrals })}`;

            const keyboard = {
                inline_keyboard: [
                    [
                        { text: localization.t('referral.share', lang), url: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}` }
                    ],
                    [
                        { text: localization.t('referral.leaderboard', lang), callback_data: 'referral_leaderboard' }
                    ],
                    [
                        { text: localization.t('buttons.back', lang), callback_data: 'menu_main' }
                    ]
                ]
            };

            await this.bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: keyboard
            });
        } catch (error) {
            console.error('Error showing referral menu:', error);
        }
    }

    // Show settings menu
    async showSettingsMenu(chatId, user, messageId) {
        try {
            const lang = localization.getUserLanguage(user.language_code);
            
            const text = `${localization.t('menu.settings', lang)}\n\n` +
                `Current language: ${lang === 'ar' ? 'العربية' : 'English'}`;

            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '🇺🇸 English', callback_data: 'settings_lang_en' },
                        { text: '🇸🇦 العربية', callback_data: 'settings_lang_ar' }
                    ],
                    [
                        { text: localization.t('buttons.back', lang), callback_data: 'menu_main' }
                    ]
                ]
            };

            await this.bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: keyboard
            });
        } catch (error) {
            console.error('Error showing settings menu:', error);
        }
    }

    // Handle language change
    async handleLanguageChange(callbackQuery, user, newLang) {
        try {
            user.language_code = newLang;
            await user.save();
            
            const lang = localization.getUserLanguage(user.language_code);
            await this.bot.answerCallbackQuery(callbackQuery.id, localization.t('success.updated', lang));
            
            // Refresh settings menu
            await this.showSettingsMenu(callbackQuery.message.chat.id, user, callbackQuery.message.message_id);
        } catch (error) {
            console.error('Error changing language:', error);
        }
    }
}

module.exports = MenuHandler;