-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER UNIQUE NOT NULL,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    language_code TEXT DEFAULT 'en',
    points INTEGER DEFAULT 0,
    vip_level TEXT DEFAULT 'none', -- none, king, emperor, lord
    vip_expires_at DATETIME,
    daily_ads_watched INTEGER DEFAULT 0,
    last_daily_reset DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    login_streak INTEGER DEFAULT 0,
    channel_subscribed BOOLEAN DEFAULT FALSE,
    channel_sub_claimed BOOLEAN DEFAULT FALSE,
    referral_code TEXT UNIQUE,
    referred_by INTEGER,
    total_referrals INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referred_by) REFERENCES users(id)
);

-- Ads table
CREATE TABLE IF NOT EXISTS ads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT,
    duration INTEGER DEFAULT 30, -- seconds
    points_reward INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Ad views tracking
CREATE TABLE IF NOT EXISTS ad_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    ad_id INTEGER NOT NULL,
    view_type TEXT NOT NULL, -- earn, daily_contest, weekly_contest, monthly_contest, vip_contest
    points_earned INTEGER DEFAULT 0,
    viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (ad_id) REFERENCES ads(id)
);

-- Daily tasks
CREATE TABLE IF NOT EXISTS daily_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    task_type TEXT NOT NULL, -- login, channel_subscription
    completed_at DATETIME,
    claim_available_at DATETIME,
    points_earned INTEGER DEFAULT 0,
    date DATE DEFAULT (DATE('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, task_type, date)
);

-- Contests
CREATE TABLE IF NOT EXISTS contests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL, -- daily, weekly, monthly, vip
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    required_ads INTEGER NOT NULL,
    ad_timer_minutes INTEGER NOT NULL,
    max_winners INTEGER DEFAULT 1,
    prize_points INTEGER,
    prize_description TEXT,
    status TEXT DEFAULT 'active', -- active, ended, cancelled
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Contest participants
CREATE TABLE IF NOT EXISTS contest_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contest_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    ads_watched INTEGER DEFAULT 0,
    qualified BOOLEAN DEFAULT FALSE,
    is_winner BOOLEAN DEFAULT FALSE,
    prize_claimed BOOLEAN DEFAULT FALSE,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contest_id) REFERENCES contests(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(contest_id, user_id)
);

-- VIP purchases
CREATE TABLE IF NOT EXISTS vip_purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    vip_level TEXT NOT NULL,
    amount_usdt DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL, -- TRC20, TON
    transaction_hash TEXT,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME,
    approved_by INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Withdrawals
CREATE TABLE IF NOT EXISTS withdrawals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount_points INTEGER NOT NULL,
    amount_usdt DECIMAL(10,2) NOT NULL,
    method TEXT NOT NULL, -- binance_pay, ton_wallet, usdt_trc20
    payment_details TEXT NOT NULL, -- wallet address or binance ID
    status TEXT DEFAULT 'pending', -- pending, approved, rejected, completed
    transaction_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    processed_by INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (processed_by) REFERENCES users(id)
);

-- Mining rewards for VIP users
CREATE TABLE IF NOT EXISTS mining_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    vip_level TEXT NOT NULL,
    points_earned INTEGER NOT NULL,
    date DATE DEFAULT (DATE('now')),
    claimed BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, date)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_users TEXT DEFAULT 'all', -- all, vip, specific_ids
    user_ids TEXT, -- comma-separated user IDs if target_users is specific_ids
    sent_count INTEGER DEFAULT 0,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Leaderboards
CREATE TABLE IF NOT EXISTS leaderboards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL, -- referral_weekly, vip_monthly
    user_id INTEGER NOT NULL,
    score INTEGER NOT NULL,
    rank_position INTEGER,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Bot settings
CREATE TABLE IF NOT EXISTS bot_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT OR IGNORE INTO bot_settings (setting_key, setting_value) VALUES
('points_to_usdt_rate', '100'),
('min_withdrawal_binance', '3.0'),
('min_withdrawal_ton', '1.0'),
('min_withdrawal_usdt', '4.0'),
('min_withdrawal_lord_binance', '2.0'),
('king_vip_price', '2.5'),
('emperor_vip_price', '9.0'),
('lord_vip_price', '20.0'),
('king_mining_points', '10'),
('emperor_mining_points', '25'),
('lord_mining_points', '40'),
('king_ads_limit', '30'),
('emperor_ads_limit', '40'),
('lord_ads_limit', '60'),
('daily_ads_limit', '20'),
('ad_timer_minutes', '2'),
('contest_daily_timer', '2'),
('contest_weekly_timer', '5'),
('contest_monthly_timer', '15'),
('vip_contest_timer', '2');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_ad_views_user_id ON ad_views(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_views_date ON ad_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_user_date ON daily_tasks(user_id, date);
CREATE INDEX IF NOT EXISTS idx_contest_participants_contest_user ON contest_participants(contest_id, user_id);
CREATE INDEX IF NOT EXISTS idx_vip_purchases_user_id ON vip_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_mining_rewards_user_date ON mining_rewards(user_id, date);