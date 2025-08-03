// NAVIGi Telegram Mini App
class NAVIGiApp {
    constructor() {
        this.user = null;
        this.stats = null;
        this.timers = new Map();
        this.initTelegramWebApp();
        this.init();
    }

    initTelegramWebApp() {
        // Initialize Telegram WebApp
        if (window.Telegram && window.Telegram.WebApp) {
            this.tg = window.Telegram.WebApp;
            this.tg.ready();
            this.tg.expand();
            
            // Set header color
            this.tg.setHeaderColor('#ffffff');
            
            // Enable closing confirmation
            this.tg.enableClosingConfirmation();
            
            console.log('Telegram WebApp initialized');
        } else {
            console.warn('Telegram WebApp not available');
            // For testing outside Telegram
            this.tg = {
                initData: 'user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22Test%22%2C%22username%22%3A%22testuser%22%2C%22language_code%22%3A%22en%22%7D&hash=test',
                ready: () => {},
                expand: () => {},
                setHeaderColor: () => {},
                enableClosingConfirmation: () => {},
                showAlert: (message) => alert(message),
                showConfirm: (message, callback) => {
                    const result = confirm(message);
                    callback(result);
                },
                close: () => window.close()
            };
        }
    }

    async init() {
        try {
            await this.loadUserData();
            this.setupEventListeners();
            this.startPeriodicUpdates();
            this.hideLoading();
        } catch (error) {
            console.error('App initialization failed:', error);
            this.showToast('Failed to load app', 'error');
            this.hideLoading();
        }
    }

    async loadUserData() {
        try {
            // Load user profile
            const profileResponse = await this.apiRequest('/api/user/profile');
            this.user = profileResponse;

            // Load user stats
            const statsResponse = await this.apiRequest('/api/user/stats');
            this.stats = statsResponse;

            this.updateUI();
        } catch (error) {
            console.error('Failed to load user data:', error);
            throw error;
        }
    }

    async apiRequest(endpoint, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': this.tg.initData
            }
        };

        const response = await fetch(endpoint, {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'API request failed');
        }

        return await response.json();
    }

    updateUI() {
        // Update header
        document.getElementById('user-name').textContent = this.user.first_name || 'User';
        document.getElementById('user-points').textContent = this.user.points.toLocaleString();

        // Update VIP badge
        if (this.user.vip_level !== 'none') {
            const vipBadge = document.getElementById('vip-badge');
            const vipLevel = document.getElementById('vip-level');
            vipBadge.style.display = 'block';
            
            switch (this.user.vip_level) {
                case 'king':
                    vipLevel.textContent = '👑 KING';
                    break;
                case 'emperor':
                    vipLevel.textContent = '👨‍💼 EMPEROR';
                    break;
                case 'lord':
                    vipLevel.textContent = '🏛️ LORD';
                    break;
            }

            // Show VIP mining section
            document.getElementById('vip-mining').classList.remove('hidden');
            
            // Show VIP contest
            document.querySelector('[data-contest="vip"]').style.display = 'block';
        }

        // Update stats
        if (this.stats) {
            document.getElementById('ads-watched').textContent = this.stats.dailyAdsWatched;
            document.getElementById('ads-limit').textContent = this.stats.dailyAdsLimit;
            document.getElementById('points-value').textContent = `$${this.stats.pointsValue}`;
            
            // Profile stats
            document.getElementById('profile-points').textContent = this.stats.points.toLocaleString();
            document.getElementById('profile-usdt').textContent = `$${this.stats.pointsValue}`;
            document.getElementById('profile-vip').textContent = this.user.vip_level === 'none' ? 'None' : this.user.vip_level.toUpperCase();
            document.getElementById('profile-referrals').textContent = this.user.total_referrals;
        }

        // Update referral link
        const botUsername = 'NAVIGi_bot'; // Replace with actual bot username
        const referralLink = `https://t.me/${botUsername}?start=${this.user.referral_code}`;
        document.getElementById('referral-link').value = referralLink;

        this.updateAdStatus();
        this.updateTasksStatus();
        this.updateContestsStatus();
        this.updateVipMining();
    }

    async updateAdStatus() {
        try {
            const adStatus = await this.apiRequest('/api/ads/available');
            const watchAdBtn = document.getElementById('watch-ad-btn');
            const adTimer = document.getElementById('ad-timer');

            if (!adStatus.canWatch) {
                watchAdBtn.disabled = true;
                watchAdBtn.textContent = 'Daily Limit Reached';
            } else if (adStatus.remainingTime > 0) {
                watchAdBtn.disabled = true;
                watchAdBtn.textContent = 'Please Wait...';
                adTimer.classList.remove('hidden');
                this.startTimer(adStatus.remainingTime, 'timer-countdown', () => {
                    watchAdBtn.disabled = false;
                    watchAdBtn.textContent = 'Watch Ad';
                    adTimer.classList.add('hidden');
                });
            } else {
                watchAdBtn.disabled = false;
                watchAdBtn.textContent = 'Watch Ad';
                adTimer.classList.add('hidden');
            }
        } catch (error) {
            console.error('Failed to update ad status:', error);
        }
    }

    async updateTasksStatus() {
        try {
            const tasksStatus = await this.apiRequest('/api/tasks/status');
            
            // Login task
            const loginTask = document.getElementById('login-task');
            const loginBtn = loginTask.querySelector('.task-btn');
            const loginTaskData = tasksStatus.login;
            
            if (loginTaskData.claimed) {
                loginBtn.textContent = 'Claimed';
                loginBtn.disabled = true;
                loginBtn.classList.add('btn-secondary');
            } else if (loginTaskData.canClaim) {
                loginBtn.textContent = 'Claim';
                loginBtn.disabled = false;
                loginBtn.classList.remove('btn-secondary');
                loginBtn.classList.add('btn-primary');
            } else if (loginTaskData.completed) {
                const timeUntilClaim = loginTaskData.timeUntilClaim;
                const hours = Math.floor(timeUntilClaim / 3600);
                const minutes = Math.floor((timeUntilClaim % 3600) / 60);
                loginBtn.textContent = `Wait ${hours}h ${minutes}m`;
                loginBtn.disabled = true;
            }

            // Channel task
            const channelTask = document.getElementById('channel-task');
            const channelBtn = channelTask.querySelector('.task-btn');
            const channelTaskData = tasksStatus.channel_subscription;
            
            if (channelTaskData.claimed) {
                channelBtn.textContent = 'Claimed';
                channelBtn.disabled = true;
                channelBtn.classList.add('btn-secondary');
            } else if (channelTaskData.completed) {
                channelBtn.textContent = 'Claim';
                channelBtn.disabled = false;
                channelBtn.classList.remove('btn-secondary');
                channelBtn.classList.add('btn-primary');
            } else {
                channelBtn.textContent = 'Check';
                channelBtn.disabled = false;
            }
        } catch (error) {
            console.error('Failed to update tasks status:', error);
        }
    }

    async updateContestsStatus() {
        try {
            const contestsStatus = await this.apiRequest('/api/contests/status');
            
            ['daily', 'weekly', 'monthly', 'vip'].forEach(contestType => {
                const contestCard = document.querySelector(`[data-contest="${contestType}"]`);
                if (!contestCard) return;

                const status = contestsStatus[contestType];
                const statusElement = contestCard.querySelector('.contest-status');
                const progressFill = contestCard.querySelector('.progress-fill');
                const progressText = contestCard.querySelector('.progress-text');
                const contestBtn = contestCard.querySelector('.contest-btn');

                if (status && status.active) {
                    const progress = (status.adsWatched / status.requiredAds) * 100;
                    progressFill.style.width = `${progress}%`;
                    progressText.textContent = `${status.adsWatched}/${status.requiredAds}`;

                    if (status.qualified) {
                        statusElement.textContent = 'Qualified';
                        statusElement.style.background = '#34C759';
                        statusElement.style.color = 'white';
                        contestBtn.textContent = 'Qualified ✓';
                        contestBtn.disabled = true;
                    } else if (status.participating) {
                        statusElement.textContent = 'Participating';
                        statusElement.style.background = '#007AFF';
                        statusElement.style.color = 'white';
                        contestBtn.textContent = 'Watch Contest Ad';
                        contestBtn.disabled = false;
                    } else {
                        statusElement.textContent = 'Available';
                        contestBtn.textContent = 'Join Contest';
                        contestBtn.disabled = false;
                    }
                } else {
                    statusElement.textContent = 'Not Available';
                    contestBtn.textContent = 'Not Available';
                    contestBtn.disabled = true;
                }
            });
        } catch (error) {
            console.error('Failed to update contests status:', error);
        }
    }

    async updateVipMining() {
        if (this.user.vip_level === 'none') return;

        try {
            const miningData = await this.apiRequest('/api/vip/mining');
            const miningPoints = document.getElementById('mining-points');
            const claimMiningBtn = document.getElementById('claim-mining-btn');

            if (miningData.hasRewards) {
                miningPoints.textContent = `${miningData.totalPoints} points available`;
                claimMiningBtn.disabled = false;
                claimMiningBtn.textContent = 'Claim Rewards';
                claimMiningBtn.classList.add('pulse');
            } else {
                miningPoints.textContent = 'No rewards available';
                claimMiningBtn.disabled = true;
                claimMiningBtn.textContent = 'No Rewards';
                claimMiningBtn.classList.remove('pulse');
            }
        } catch (error) {
            console.error('Failed to update VIP mining:', error);
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                this.showSection(section);
            });
        });

        // Watch Ad
        document.getElementById('watch-ad-btn').addEventListener('click', () => {
            this.watchAd();
        });

        // Claim Mining
        document.getElementById('claim-mining-btn').addEventListener('click', () => {
            this.claimVipMining();
        });

        // Tasks
        document.getElementById('login-task').querySelector('.task-btn').addEventListener('click', () => {
            this.claimTask('login');
        });

        document.getElementById('channel-task').querySelector('.task-btn').addEventListener('click', () => {
            this.checkChannelSubscription();
        });

        // Contests
        document.querySelectorAll('.contest-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const contestCard = e.target.closest('.contest-card');
                const contestType = contestCard.dataset.contest;
                const btnText = e.target.textContent;

                if (btnText.includes('Join')) {
                    this.joinContest(contestType);
                } else if (btnText.includes('Watch')) {
                    this.watchContestAd(contestType);
                }
            });
        });

        // Referral
        document.getElementById('copy-referral').addEventListener('click', () => {
            this.copyReferralLink();
        });

        document.getElementById('share-referral').addEventListener('click', () => {
            this.shareReferralLink();
        });

        // Modal close
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                modal.classList.add('hidden');
            });
        });
    }

    showSection(sectionName) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // Update sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${sectionName}-section`).classList.add('active');

        // Refresh data for specific sections
        if (sectionName === 'contests') {
            this.updateContestsStatus();
        } else if (sectionName === 'tasks') {
            this.updateTasksStatus();
        }
    }

    async watchAd() {
        try {
            // Show ad modal
            const adModal = document.getElementById('ad-modal');
            adModal.classList.remove('hidden');

            // Start ad countdown
            let countdown = 30;
            const countdownElement = document.getElementById('ad-countdown');
            
            const adTimer = setInterval(() => {
                countdown--;
                countdownElement.textContent = countdown;
                
                if (countdown <= 0) {
                    clearInterval(adTimer);
                    this.completeAdWatch();
                }
            }, 1000);

        } catch (error) {
            console.error('Failed to watch ad:', error);
            this.showToast('Failed to watch ad', 'error');
        }
    }

    async completeAdWatch() {
        try {
            const result = await this.apiRequest('/api/ads/watch', {
                method: 'POST'
            });

            // Hide modal
            document.getElementById('ad-modal').classList.add('hidden');

            // Show success
            this.showToast(`+${result.pointsEarned} points earned!`, 'success');

            // Update user data
            this.user.points = result.totalPoints;
            this.stats.dailyAdsWatched = result.adsWatched;
            this.updateUI();

        } catch (error) {
            console.error('Failed to complete ad watch:', error);
            document.getElementById('ad-modal').classList.add('hidden');
            
            if (error.message === 'Daily limit reached') {
                this.showToast('Daily ad limit reached!', 'error');
            } else if (error.message === 'Timer wait') {
                this.showToast('Please wait before watching next ad', 'error');
            } else {
                this.showToast('Failed to watch ad', 'error');
            }
        }
    }

    async claimTask(taskType) {
        try {
            const result = await this.apiRequest('/api/tasks/claim', {
                method: 'POST',
                body: JSON.stringify({ taskType })
            });

            this.showToast(`+${result.pointsEarned} points claimed!`, 'success');
            this.user.points = result.totalPoints;
            this.updateUI();

        } catch (error) {
            console.error('Failed to claim task:', error);
            this.showToast('Failed to claim task', 'error');
        }
    }

    checkChannelSubscription() {
        // Open channel in Telegram
        const channelUrl = 'https://t.me/NAVIGI_E';
        window.open(channelUrl, '_blank');
        
        // Show message to user
        this.tg.showAlert('Please subscribe to the channel and come back to claim your reward!');
    }

    async joinContest(contestType) {
        try {
            const result = await this.apiRequest('/api/contests/join', {
                method: 'POST',
                body: JSON.stringify({ contestType })
            });

            if (result.success) {
                this.showToast('Successfully joined contest!', 'success');
                this.updateContestsStatus();
            } else {
                this.showToast(result.message, 'error');
            }

        } catch (error) {
            console.error('Failed to join contest:', error);
            this.showToast('Failed to join contest', 'error');
        }
    }

    async watchContestAd(contestType) {
        try {
            const result = await this.apiRequest('/api/contests/watch-ad', {
                method: 'POST',
                body: JSON.stringify({ contestType })
            });

            if (result.success) {
                this.showToast(`Contest ad watched! ${result.adsWatched}/${result.requiredAds}`, 'success');
                this.updateContestsStatus();
            }

        } catch (error) {
            console.error('Failed to watch contest ad:', error);
            if (error.message === 'Timer wait') {
                this.showToast('Please wait before watching next contest ad', 'error');
            } else {
                this.showToast('Failed to watch contest ad', 'error');
            }
        }
    }

    async claimVipMining() {
        try {
            const result = await this.apiRequest('/api/vip/claim-mining', {
                method: 'POST'
            });

            this.showToast(`+${result.pointsEarned} points claimed!`, 'success');
            this.user.points = result.totalPoints;
            this.updateUI();

        } catch (error) {
            console.error('Failed to claim VIP mining:', error);
            this.showToast('Failed to claim mining rewards', 'error');
        }
    }

    copyReferralLink() {
        const referralInput = document.getElementById('referral-link');
        referralInput.select();
        document.execCommand('copy');
        this.showToast('Referral link copied!', 'success');
    }

    shareReferralLink() {
        const referralLink = document.getElementById('referral-link').value;
        const shareText = `Join NAVIGi and earn rewards by watching ads! Use my referral link: ${referralLink}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'NAVIGi - Earn Rewards',
                text: shareText,
                url: referralLink
            });
        } else {
            // Fallback for Telegram
            const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Join NAVIGi and earn rewards!')}`;
            window.open(shareUrl, '_blank');
        }
    }

    startTimer(seconds, elementId, callback) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const timerId = setInterval(() => {
            seconds--;
            const minutes = Math.floor(seconds / 60);
            const secs = seconds % 60;
            element.textContent = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

            if (seconds <= 0) {
                clearInterval(timerId);
                if (callback) callback();
            }
        }, 1000);

        this.timers.set(elementId, timerId);
    }

    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
    }

    startPeriodicUpdates() {
        // Update data every 30 seconds
        setInterval(() => {
            this.updateAdStatus();
            this.updateVipMining();
        }, 30000);

        // Update tasks every minute
        setInterval(() => {
            this.updateTasksStatus();
        }, 60000);

        // Update contests every 5 minutes
        setInterval(() => {
            this.updateContestsStatus();
        }, 300000);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.navigiApp = new NAVIGiApp();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.navigiApp) {
        // Refresh data when page becomes visible
        window.navigiApp.updateAdStatus();
        window.navigiApp.updateTasksStatus();
        window.navigiApp.updateVipMining();
    }
});