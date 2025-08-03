const localization = require('../utils/localization');

class VipHandler {
    constructor(bot) {
        this.bot = bot;
        this.userInputState = new Map(); // Store user input states
    }

    async handleCallback(callbackQuery, user) {
        const data = callbackQuery.data;
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;
        const lang = localization.getUserLanguage(user.language_code);

        try {
            switch (data) {
                case 'vip_king':
                    await this.showVipPurchase(chatId, user, messageId, lang, 'king');
                    break;
                case 'vip_emperor':
                    await this.showVipPurchase(chatId, user, messageId, lang, 'emperor');
                    break;
                case 'vip_lord':
                    await this.showVipPurchase(chatId, user, messageId, lang, 'lord');
                    break;
                case 'vip_mining':
                    await this.handleVipMining(chatId, user, messageId, lang);
                    break;
                default:
                    if (data.startsWith('purchase_vip_')) {
                        const vipLevel = data.replace('purchase_vip_', '');
                        await this.initiatePurchase(callbackQuery, user, vipLevel, lang);
                    }
                    break;
            }
        } catch (error) {
            console.error('Error in VIP handler:', error);
            await this.bot.answerCallbackQuery(callbackQuery.id, localization.t('errors.generic', lang));
        }
    }

    async showVipPurchase(chatId, user, messageId, lang, vipLevel) {
        const vipLevels = {
            king: { name: 'King VIP', price: 2.5, benefits: localization.t('vip.king.benefits', lang) },
            emperor: { name: 'Emperor VIP', price: 9, benefits: localization.t('vip.emperor.benefits', lang) },
            lord: { name: 'Lord VIP', price: 20, benefits: localization.t('vip.lord.benefits', lang) }
        };

        const vipInfo = vipLevels[vipLevel];
        
        let text = `${localization.t(`vip.${vipLevel}.name`, lang)}\n`;
        text += `${localization.t(`vip.${vipLevel}.price`, lang)}\n\n`;
        text += `${localization.t(`vip.${vipLevel}.benefits`, lang)}\n\n`;
        text += localization.t('vip.payment_methods', lang, {
            trc20: process.env.TRC20_ADDRESS,
            ton: process.env.TON_ADDRESS
        });

        const keyboard = {
            inline_keyboard: [
                [{ text: localization.t('vip.purchase', lang), callback_data: `purchase_vip_${vipLevel}` }],
                [{ text: localization.t('buttons.back', lang), callback_data: 'menu_vip' }]
            ]
        };

        await this.bot.editMessageText(text, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: keyboard,
            parse_mode: 'Markdown'
        });
    }

    async initiatePurchase(callbackQuery, user, vipLevel, lang) {
        // Set user state to waiting for transaction hash
        this.userInputState.set(user.id, {
            type: 'vip_purchase',
            vipLevel: vipLevel,
            chatId: callbackQuery.message.chat.id
        });

        const message = `Please send the transaction hash after you've completed the payment for ${vipLevel} VIP.`;
        
        await this.bot.sendMessage(callbackQuery.message.chat.id, message);
        await this.bot.answerCallbackQuery(callbackQuery.id, "Waiting for transaction hash...");
    }

    async handleVipMining(chatId, user, messageId, lang) {
        if (!user.isVip()) {
            const text = localization.t('vip.no_mining', lang);
            const keyboard = {
                inline_keyboard: [
                    [{ text: localization.t('buttons.back', lang), callback_data: 'menu_vip' }]
                ]
            };

            await this.bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: keyboard
            });
            return;
        }

        // Check for available mining rewards
        const database = require('../database/database');
        const today = new Date().toISOString().split('T')[0];
        
        const unclaimedRewards = await database.all(`
            SELECT * FROM mining_rewards 
            WHERE user_id = ? AND claimed = 0
        `, [user.id]);

        let text = `⛏️ ${localization.t('earn.mining', lang)}\n\n`;
        
        if (unclaimedRewards.length > 0) {
            const totalPoints = unclaimedRewards.reduce((sum, reward) => sum + reward.points_earned, 0);
            text += localization.t('vip.mining_available', lang, { points: totalPoints });
        } else {
            text += localization.t('vip.no_mining', lang);
        }

        const keyboard = {
            inline_keyboard: []
        };

        if (unclaimedRewards.length > 0) {
            keyboard.inline_keyboard.push([
                { text: "⛏️ Claim All Rewards", callback_data: 'claim_all_mining' }
            ]);
        }

        keyboard.inline_keyboard.push([
            { text: localization.t('buttons.back', lang), callback_data: 'menu_vip' }
        ]);

        await this.bot.editMessageText(text, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: keyboard
        });
    }

    isWaitingForInput(userId) {
        return this.userInputState.has(userId);
    }

    async handleTextInput(msg, user) {
        const state = this.userInputState.get(user.id);
        if (!state) return;

        const lang = localization.getUserLanguage(user.language_code);

        if (state.type === 'vip_purchase') {
            const txHash = msg.text.trim();
            
            // Basic validation for transaction hash
            if (txHash.length < 10) {
                await this.bot.sendMessage(msg.chat.id, localization.t('vip.invalid_hash', lang));
                return;
            }

            // Store VIP purchase request in database
            const database = require('../database/database');
            const vipPrices = { king: 2.5, emperor: 9, lord: 20 };
            
            await database.run(`
                INSERT INTO vip_purchases (user_id, vip_level, amount_usdt, payment_method, transaction_hash, expires_at)
                VALUES (?, ?, ?, ?, ?, datetime('now', '+30 days'))
            `, [user.id, state.vipLevel, vipPrices[state.vipLevel], 'TRC20/TON', txHash]);

            await this.bot.sendMessage(msg.chat.id, localization.t('vip.payment_sent', lang));
            
            // Clear user state
            this.userInputState.delete(user.id);
        }
    }
}

module.exports = VipHandler;