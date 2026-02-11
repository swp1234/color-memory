/**
 * Color Memory Game - Main Application Logic
 * Simon Says style color memory game
 */

class ColorMemoryGame {
    constructor() {
        this.hideLoader();

        // Game state
        this.sequence = [];
        this.userSequence = [];
        this.round = 1;
        this.isPlayingSequence = false;
        this.isUserTurn = false;
        this.gameOver = false;
        this.playCount = 0;

        // Settings
        this.speed = 600; // ms per color flash
        this.speedIncrement = 100; // ms reduction per level
        this.speedIncrementInterval = 10; // rounds until speed increase

        // DOM elements
        this.gameScreen = document.getElementById('game-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.colorButtons = document.querySelectorAll('.color-button');
        this.startBtn = document.getElementById('start-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.playAgainBtn = document.getElementById('play-again-btn');
        this.shareBtn = document.getElementById('share-btn');
        this.gameStatus = document.getElementById('game-status');

        // Leaderboard system
        this.leaderboard = new LeaderboardManager('color-memory', 10);

        this.roundDisplay = document.getElementById('round-display');
        this.scoreDisplay = document.getElementById('score-display');
        this.bestScoreDisplay = document.getElementById('best-score-display');
        this.finalScoreDisplay = document.getElementById('final-score');
        this.finalBestScoreDisplay = document.getElementById('final-best-score');
        this.finalLevelDisplay = document.getElementById('final-level');
        this.recordCheck = document.getElementById('record-check');
        this.colorGrid = document.querySelector('.color-grid');
        this.confettiContainer = document.getElementById('confetti-container');

        // Audio context
        this.audioContext = null;
        this.initAudio();

        // localStorage
        this.bestScore = this._loadBestScore();
        this.updateBestScoreDisplay();

        // i18n
        this.setupLanguageSystem();

        // Event listeners
        this.attachEventListeners();

        // Hide loader
        this.hideLoader();
    }

    hideLoader() {
        const loader = document.getElementById('app-loader');
        if (loader) {
            loader.classList.add('hidden');
            setTimeout(() => loader.remove(), 300);
        }
    }

    // ========================
    // Initialization
    // ========================

    _loadBestScore() {
        try {
            if (typeof localStorage === 'undefined') return 0;
            const saved = localStorage.getItem('colorMemory_bestScore');
            if (!saved) return 0;
            const parsed = parseInt(saved, 10);
            return isNaN(parsed) ? 0 : parsed;
        } catch (e) {
            console.warn('localStorage not available (private/incognito mode):', e.message);
            return 0;
        }
    }

    _saveBestScore(score) {
        try {
            if (typeof localStorage === 'undefined') return;
            if (isNaN(score) || score < 0) return;
            localStorage.setItem('colorMemory_bestScore', score.toString());
        } catch (e) {
            console.warn('Could not save best score:', e.message);
        }
    }

    initAudio() {
        // Initialize Web Audio API for sound effects (with fallback)
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
        } catch (e) {
            console.warn('Web Audio API not supported:', e.message);
            this.audioContext = null;
        }
    }

    setupLanguageSystem() {
        // Initialize i18n with error handling
        try {
            if (window.i18n && typeof window.i18n.initI18n === 'function') {
                window.i18n.initI18n().then(() => {
                    this.updateUIText();
                }).catch((e) => {
                    console.warn('i18n init failed:', e.message);
                });
            }
        } catch (e) {
            console.warn('Could not initialize i18n:', e.message);
        }

        // Language change listener
        document.addEventListener('languageChanged', () => {
            this.updateUIText();
        });
    }

    updateUIText() {
        // Update all text elements with i18n
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const text = window.i18n.t(key);
            if (text) {
                el.textContent = text;
            }
        });
    }

    attachEventListeners() {
        this.startBtn.addEventListener('click', () => this.startGame());
        this.resetBtn.addEventListener('click', () => this.resetGame());
        this.playAgainBtn.addEventListener('click', () => this.startGame());
        this.shareBtn.addEventListener('click', () => this.shareScore());

        // Color button events
        this.colorButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleColorClick(e));
            btn.addEventListener('touchstart', (e) => this.handleColorClick(e));
        });

        // Keyboard support
        document.addEventListener('keydown', (e) => {
            const colorMap = { '1': 'red', '2': 'blue', '3': 'green', '4': 'yellow' };
            if (colorMap[e.key]) {
                const btn = document.querySelector(`[data-color="${colorMap[e.key]}"]`);
                if (btn) {
                    this.handleColorClick({ target: btn });
                }
            }
        });
    }

    // ========================
    // Game Flow
    // ========================

    startGame() {
        this.sequence = [];
        this.userSequence = [];
        this.round = 1;
        this.gameOver = false;
        this.playCount = 0;
        this.speed = 600;

        this.showGameScreen();
        this.playRound();
    }

    resetGame() {
        this.sequence = [];
        this.userSequence = [];
        this.round = 1;
        this.gameOver = false;
        this.playCount = 0;
        this.speed = 600;

        this.updateRoundDisplay();
        this.updateScoreDisplay();
        this.gameStatus.textContent = window.i18n.t('game.ready');
        this.startBtn.disabled = false;
    }

    playRound() {
        if (this.gameOver) return;

        this.isUserTurn = false;
        this.userSequence = [];

        // Add new color to sequence
        const colors = ['red', 'blue', 'green', 'yellow'];
        const newColor = colors[Math.floor(Math.random() * colors.length)];
        this.sequence.push(newColor);

        // Improved difficulty curve: keep initial speed longer, increase gradually
        // Rounds 1-30: stay at 600ms (very easy, good for flow state)
        // Rounds 31-60: decrease 50ms every 10 rounds (medium)
        // Rounds 60+: decrease 30ms every 10 rounds (harder)
        if (this.round <= 30) {
            this.speed = 600;
        } else if (this.round <= 60) {
            const stagesIn = Math.floor((this.round - 30) / 10);
            this.speed = Math.max(350, 600 - (stagesIn * 50));
        } else {
            const stagesIn = Math.floor((this.round - 60) / 10);
            this.speed = Math.max(300, 350 - (stagesIn * 30));
        }

        // Update UI
        this.updateRoundDisplay();
        this.updateScoreDisplay();
        this.startBtn.disabled = true;
        this.gameStatus.textContent = window.i18n.t('game.watching');

        // Play sequence with delay
        setTimeout(() => {
            this.playSequence();
        }, 500);
    }

    playSequence() {
        let i = 0;
        const playNext = () => {
            if (i < this.sequence.length) {
                const color = this.sequence[i];
                this.playColor(color);
                i++;
                setTimeout(playNext, this.speed + 200);
            } else {
                this.isUserTurn = true;
                this.gameStatus.textContent = window.i18n.t('game.yourTurn');
                this.colorGrid.classList.remove('disabled');
            }
        };

        this.isPlayingSequence = true;
        this.colorGrid.classList.add('disabled');
        playNext();
        this.isPlayingSequence = false;
    }

    playColor(color) {
        const button = document.querySelector(`[data-color="${color}"]`);
        if (!button) return;

        // Add visual feedback
        button.classList.add('playing');
        button.classList.add('active');

        // Play sound
        this.playSound(color);

        // Remove effect after animation
        setTimeout(() => {
            button.classList.remove('active');
            button.classList.remove('playing');
        }, this.speed - 100);
    }

    // ========================
    // User Interaction
    // ========================

    handleColorClick(e) {
        if (!this.isUserTurn || this.isPlayingSequence || this.gameOver) {
            return;
        }

        let button = e.target;
        if (button.classList.contains('color-inner')) {
            button = button.parentElement;
        }

        const color = button.getAttribute('data-color');
        if (!color) return;

        // Add visual feedback
        button.classList.add('active');
        this.playSound(color);

        // Remove effect
        setTimeout(() => {
            button.classList.remove('active');
        }, 200);

        // Add to user sequence
        this.userSequence.push(color);

        // Check sequence
        const lastIndex = this.userSequence.length - 1;
        if (this.userSequence[lastIndex] !== this.sequence[lastIndex]) {
            this.endGame();
            return;
        }

        // Check if user completed the round
        if (this.userSequence.length === this.sequence.length) {
            this.isUserTurn = false;

            // Play success sound
            if (window.sfx) {
                if (!window.sfx.initialized) {
                    window.sfx.init();
                }
                window.sfx.success();
            }

            setTimeout(() => {
                this.round++;
                this.playCount++;

                // Check for interstitial ad every 3 plays
                if (this.playCount % 3 === 0) {
                    this.showInterstitialAd();
                }

                this.playRound();
            }, 500);
        }
    }

    // ========================
    // Sound
    // ========================

    playSound(color) {
        if (!window.sfx) return;

        // Initialize sound engine on first call
        if (!window.sfx.initialized) {
            window.sfx.init();
        }

        // Color-based musical notes using sound engine
        const frequencies = {
            red: 261.63,     // C4
            blue: 329.63,    // E4
            green: 392.0,    // G4
            yellow: 523.25   // C5
        };

        const freq = frequencies[color] || 400;
        window.sfx.playOscillator(freq, 0.2, 'sine', { attack: 0.01, decay: 0.15, sustain: 0 });
    }

    // ========================
    // Game End
    // ========================

    endGame() {
        this.gameOver = true;
        this.isUserTurn = false;
        this.playCount++;

        // Play game over sound
        if (window.sfx) {
            if (!window.sfx.initialized) {
                window.sfx.init();
            }
            window.sfx.error();
        }

        // Error feedback
        this.colorGrid.classList.add('error');
        setTimeout(() => {
            this.colorGrid.classList.remove('error');
        }, 500);

        const finalScore = this.round - 1;
        const level = Math.ceil(this.round / this.speedIncrementInterval);

        // Add score to leaderboard
        const leaderboardResult = this.leaderboard.addScore(finalScore, {
            level: level,
            playCount: this.playCount
        });

        // Check for new record
        const isNewRecord = leaderboardResult.isNewRecord;
        if (isNewRecord) {
            this.bestScore = finalScore;
            this._saveBestScore(this.bestScore);
            this.recordCheck.style.display = 'block';
        } else {
            this.recordCheck.style.display = 'none';
        }

        // Show game over screen
        setTimeout(() => {
            this.showGameOverScreen();
            this.finalScoreDisplay.textContent = finalScore;
            this.finalBestScoreDisplay.textContent = this.bestScore;
            this.finalLevelDisplay.textContent = level;

            // Display leaderboard
            this.displayLeaderboard(leaderboardResult);

            // Confetti if new record
            if (isNewRecord) {
                this.showConfetti();
            }

            // Show interstitial ad
            this.showInterstitialAd();
        }, 500);
    }

    // ========================
    // UI Updates
    // ========================

    updateRoundDisplay() {
        this.roundDisplay.textContent = this.round;
    }

    updateScoreDisplay() {
        this.scoreDisplay.textContent = this.round - 1;
    }

    updateBestScoreDisplay() {
        this.bestScoreDisplay.textContent = this.bestScore;
    }

    showGameScreen() {
        this.gameScreen.classList.remove('hidden');
        this.gameScreen.classList.add('active');
        this.gameOverScreen.classList.remove('active');
        this.gameOverScreen.classList.add('hidden');
    }

    showGameOverScreen() {
        this.gameScreen.classList.remove('active');
        this.gameScreen.classList.add('hidden');
        this.gameOverScreen.classList.remove('hidden');
        this.gameOverScreen.classList.add('active');
    }

    // ========================
    // Confetti Effect
    // ========================

    showConfetti() {
        const confettiPieces = 50;
        const colors = ['red', 'blue', 'yellow', 'green'];

        for (let i = 0; i < confettiPieces; i++) {
            const confetti = document.createElement('div');
            confetti.classList.add('confetti');
            confetti.classList.add(colors[Math.floor(Math.random() * colors.length)]);

            const x = Math.random() * window.innerWidth;
            const y = Math.random() * window.innerHeight - window.innerHeight;
            const duration = 2 + Math.random() * 1;
            const delay = Math.random() * 0.5;

            confetti.style.left = x + 'px';
            confetti.style.top = y + 'px';
            confetti.style.animation = `fall ${duration}s linear ${delay}s forwards`;

            this.confettiContainer.appendChild(confetti);

            setTimeout(() => confetti.remove(), (duration + delay) * 1000);
        }
    }

    // ========================
    // Ads
    // ========================

    showInterstitialAd() {
        // This would be handled by Google AdSense
        // Placeholder for interstitial ad logic
        if (window.adsbygoogle) {
            try {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            } catch (e) {
                console.log('AdSense ad error:', e);
            }
        }
    }

    // ========================
    // Share
    // ========================

    shareScore() {
        const level = Math.ceil((this.round - 1) / this.speedIncrementInterval) || 1;
        const score = parseInt(this.finalScoreDisplay.textContent);
        const shareText = `🎮 I got ${score} points on Color Memory!\n🎯 Level: ${level}\n\nCan you beat my score?`;
        const shareUrl = window.location.href;

        // Try Web Share API
        if (navigator.share) {
            navigator.share({
                title: 'Color Memory Game',
                text: shareText,
                url: shareUrl
            }).catch(err => console.log('Share failed:', err));
        } else {
            // Fallback: Copy to clipboard
            const fullText = shareText + '\n' + shareUrl;
            navigator.clipboard.writeText(fullText).then(() => {
                alert(window.i18n.t('share.copied') || 'Copied to clipboard!');
            }).catch(() => {
                alert(shareText);
            });
        }
    }

    // ========================
    // Leaderboard Display
    // ========================

    displayLeaderboard(leaderboardResult) {
        // Create or get leaderboard container
        let leaderboardContainer = this.gameOverScreen.querySelector('.leaderboard-section');
        if (!leaderboardContainer) {
            leaderboardContainer = document.createElement('div');
            leaderboardContainer.className = 'leaderboard-section';
            this.gameOverScreen.appendChild(leaderboardContainer);
        }

        // Get top scores
        const topScores = this.leaderboard.getTopScores(5);
        const currentScore = parseInt(this.finalScoreDisplay.textContent);

        // Build leaderboard HTML
        let html = '<div class="leaderboard-title">🏆 Top 5 Scores</div>';
        html += '<div class="leaderboard-list">';

        topScores.forEach((entry, index) => {
            const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
            const isCurrentScore = entry.score === currentScore && leaderboardResult.isNewRecord;
            const classes = isCurrentScore ? 'leaderboard-item highlight' : 'leaderboard-item';

            html += `
                <div class="${classes}">
                    <span class="medal">${medals[index] || (index + 1) + '.'}</span>
                    <span class="score-value">${entry.score}</span>
                    <span class="score-date">${entry.date}</span>
                </div>
            `;
        });

        html += '</div>';

        // Add reset button
        html += '<button id="reset-leaderboard-btn" class="reset-btn">Reset Records</button>';

        leaderboardContainer.innerHTML = html;

        // Add reset button event listener
        const resetBtn = leaderboardContainer.querySelector('#reset-leaderboard-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to reset all records?')) {
                    this.leaderboard.resetScores();
                    this.bestScore = 0;
                    this._saveBestScore(0);
                    this.displayLeaderboard({ isNewRecord: false, rank: -1, notifications: [] });
                    alert('Records reset!');
                }
            });
        }

        // Show notifications
        leaderboardResult.notifications.forEach(notif => {
            this.showNotification(notif);
        });
    }

    showNotification(notification) {
        const notifEl = document.createElement('div');
        notifEl.className = `notification notification-${notification.type}`;
        notifEl.textContent = notification.message;
        notifEl.style.position = 'fixed';
        notifEl.style.top = '20px';
        notifEl.style.right = '20px';
        notifEl.style.padding = '12px 20px';
        notifEl.style.backgroundColor = notification.type === 'new-record' ? '#FFD700' : '#4CAF50';
        notifEl.style.color = '#000';
        notifEl.style.borderRadius = '8px';
        notifEl.style.fontSize = '14px';
        notifEl.style.fontWeight = 'bold';
        notifEl.style.zIndex = '9999';
        notifEl.style.animation = 'slideIn 0.3s ease-out';

        document.body.appendChild(notifEl);

        setTimeout(() => {
            notifEl.style.animation = 'slideOut 0.3s ease-out forwards';
            setTimeout(() => notifEl.remove(), 300);
        }, 3000);
    }
}

// Initialize game when DOM is ready
// Theme toggle functionality
const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggle.textContent = savedTheme === 'light' ? '🌙' : '☀️';
    themeToggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        themeToggle.textContent = next === 'light' ? '🌙' : '☀️';
    });
}

document.addEventListener('DOMContentLoaded', () => {
    window.game = new ColorMemoryGame();
});
