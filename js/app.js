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
        this.lives = 3;
        this.maxLives = 3;
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

        // Pulse start button to draw attention
        if (this.startBtn) this.startBtn.classList.add('pulse');

        // Pattern preview preference
        this.skipPreview = this._loadSkipPreview();
        this._createPreviewOverlay();
        this._createSkipPreviewToggle();

        // Streak tracking
        this.streak = 0;
        this._createStreakBar();

        // Milestone overlay
        this._createMilestoneOverlay();

        // Tutorial (first visit only)
        this._createTutorialOverlay();
        this._showTutorialIfFirstVisit();

        // Intro demo animation (runs on page load)
        this._playIntroDemo();

        // GA4 engagement tracking
        this.engagementTracked = false;
        this.trackFirstInteraction();
    }

    /**
     * Track first interaction for GA4 engagement (reduces bounce rate)
     */
    trackFirstInteraction() {
        const handler = () => {
            this.trackEngagement('first_interaction');
            document.removeEventListener('click', handler);
            document.removeEventListener('keydown', handler);
        };
        document.addEventListener('click', handler, { once: true });
        document.addEventListener('keydown', handler, { once: true });
    }

    /**
     * Track GA4 engagement event
     */
    trackEngagement(label) {
        if (this.engagementTracked) return;
        this.engagementTracked = true;
        if (typeof gtag === 'function') {
            gtag('event', 'engagement', {
                event_category: 'color_memory',
                event_label: label
            });
        }
    }

    hideLoader() {
        const loader = document.getElementById('app-loader');
        if (!loader) return;
        const start = Date.now();
        const check = setInterval(() => {
            if ((window.i18n && window.i18n.initialized) || Date.now() - start > 2000) {
                clearInterval(check);
                loader.classList.add('hidden');
                setTimeout(() => loader.remove(), 300);
            }
        }, 50);
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

    showNewBest() {
        let el = document.getElementById('new-best-flash');
        if (!el) {
            el = document.createElement('div');
            el.id = 'new-best-flash';
            el.style.cssText = 'position:fixed;top:20%;left:50%;transform:translate(-50%,-50%) scale(0);font-size:32px;font-weight:800;color:#fbbf24;text-shadow:0 0 30px rgba(251,191,36,0.6);pointer-events:none;z-index:200;transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1),opacity 0.4s;opacity:0;white-space:nowrap;';
            document.body.appendChild(el);
        }
        const newBestText = (window.i18n && window.i18n.t('game.newBest')) || 'NEW BEST!';
        el.textContent = '\uD83C\uDFC6 ' + newBestText;
        el.style.transform = 'translate(-50%,-50%) scale(1.2)';
        el.style.opacity = '1';
        setTimeout(() => {
            el.style.transform = 'translate(-50%,-50%) scale(0.8)';
            el.style.opacity = '0';
        }, 1200);
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
        if (typeof GameAds !== 'undefined') GameAds.removeRewardButton('#game-over-screen');
        this.userSequence = [];
        this.round = 1;
        this.lives = 3;
        this.gameOver = false;
        this.playCount = 0;
        this.speed = 600;

        // Reset streak
        this.streak = 0;
        this._updateStreak(false);

        // Pre-seed sequence with 2 colors so round 1 starts with 3
        const colors = ['red', 'blue', 'green', 'yellow'];
        this.sequence = [
            colors[Math.floor(Math.random() * 4)],
            colors[Math.floor(Math.random() * 4)]
        ];

        // Remove pulse after first start
        if (this.startBtn) this.startBtn.classList.remove('pulse');

        this.updateLivesDisplay();
        this.showGameScreen();
        this.playRound();
        if(typeof gtag!=='undefined') gtag('event','game_start');
        this.trackEngagement('game_start');
    }

    resetGame() {
        this.sequence = [];
        this.userSequence = [];
        this.round = 1;
        this.lives = 3;
        this.gameOver = false;
        this.playCount = 0;
        this.speed = 600;

        this.updateRoundDisplay();
        this.updateScoreDisplay();
        this.updateLivesDisplay();
        this.gameStatus.textContent = window.i18n.t('game.ready');
        this.startBtn.disabled = false;
    }

    // ========================
    // Pattern Preview
    // ========================

    _loadSkipPreview() {
        try {
            return localStorage.getItem('colorMemory_skipPreview') === 'true';
        } catch (e) {
            return false;
        }
    }

    _saveSkipPreview(val) {
        try {
            localStorage.setItem('colorMemory_skipPreview', val ? 'true' : 'false');
        } catch (e) { /* ignore */ }
    }

    _createPreviewOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'preview-overlay';
        overlay.id = 'preview-overlay';
        overlay.innerHTML = '<div class="preview-text" id="preview-text">MEMORIZE!</div><div class="preview-countdown" id="preview-countdown"></div>';
        document.body.appendChild(overlay);
        this.previewOverlay = overlay;
        this.previewTextEl = overlay.querySelector('#preview-text');
        this.previewCountdownEl = overlay.querySelector('#preview-countdown');
    }

    _createSkipPreviewToggle() {
        const container = document.querySelector('.game-controls');
        if (!container) return;
        const label = document.createElement('label');
        label.className = 'skip-preview-toggle';
        label.innerHTML = '<input type="checkbox" id="skip-preview-cb"' + (this.skipPreview ? ' checked' : '') + '> <span data-i18n="game.skipPreview">Skip Preview</span>';
        container.after(label);
        const cb = label.querySelector('#skip-preview-cb');
        cb.addEventListener('change', () => {
            this.skipPreview = cb.checked;
            this._saveSkipPreview(this.skipPreview);
        });
    }

    // ========================
    // Intro Demo Animation
    // ========================

    _playIntroDemo() {
        // Skip if tutorial is showing
        try {
            if (localStorage.getItem('colorMemory_tutorialSeen') !== 'true') return;
        } catch (e) { /* proceed */ }

        const colors = ['red', 'blue', 'green', 'yellow'];
        const demoSequence = ['red', 'blue', 'green', 'yellow', 'red', 'green'];
        let i = 0;

        this.colorGrid.classList.add('intro-demo-active');

        const flashNext = () => {
            if (i >= demoSequence.length) {
                this.colorGrid.classList.remove('intro-demo-active');
                return;
            }
            const color = demoSequence[i];
            const btn = document.querySelector(`[data-color="${color}"]`);
            if (btn) {
                btn.classList.add('demo-flash');
                this.playSound(color);
                setTimeout(() => btn.classList.remove('demo-flash'), 250);
            }
            i++;
            setTimeout(flashNext, 350);
        };

        // Delay slightly after page load
        setTimeout(flashNext, 600);
    }

    // ========================
    // Tutorial Overlay
    // ========================

    _createTutorialOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'tutorial-overlay';
        overlay.id = 'tutorial-overlay';

        const t = (key) => (window.i18n && window.i18n.t(key)) || key;

        overlay.innerHTML = `
            <div class="tutorial-card">
                <h3 data-i18n="game.tutorialTitle">${t('game.tutorialTitle')}</h3>
                <div class="tutorial-steps">
                    <div class="tutorial-step">
                        <div class="tutorial-step-num">1</div>
                        <div class="tutorial-step-text" data-i18n="game.tutorialStep1">${t('game.tutorialStep1')}</div>
                    </div>
                    <div class="tutorial-step">
                        <div class="tutorial-step-num">2</div>
                        <div class="tutorial-step-text" data-i18n="game.tutorialStep2">${t('game.tutorialStep2')}</div>
                    </div>
                    <div class="tutorial-step">
                        <div class="tutorial-step-num">3</div>
                        <div class="tutorial-step-text" data-i18n="game.tutorialStep3">${t('game.tutorialStep3')}</div>
                    </div>
                </div>
                <button class="tutorial-btn" id="tutorial-close-btn" data-i18n="game.tutorialGotIt">${t('game.tutorialGotIt')}</button>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelector('#tutorial-close-btn').addEventListener('click', () => {
            overlay.classList.remove('active');
            try { localStorage.setItem('colorMemory_tutorialSeen', 'true'); } catch (e) { /* ignore */ }
            // Play intro demo after tutorial closes
            setTimeout(() => this._playIntroDemo(), 400);
        });
    }

    _showTutorialIfFirstVisit() {
        try {
            if (localStorage.getItem('colorMemory_tutorialSeen') === 'true') return;
        } catch (e) { return; }

        const overlay = document.getElementById('tutorial-overlay');
        if (overlay) {
            setTimeout(() => overlay.classList.add('active'), 500);
        }
    }

    // ========================
    // Streak Counter
    // ========================

    _createStreakBar() {
        const bar = document.createElement('div');
        bar.className = 'streak-bar';
        bar.id = 'streak-bar';
        bar.innerHTML = '<span class="streak-icon">&#x1F525;</span><span class="streak-count" id="streak-count">0</span><span class="streak-label" data-i18n="game.streak">' + ((window.i18n && window.i18n.t('game.streak')) || 'Streak') + '</span>';

        const statsBar = document.querySelector('.stats-bar');
        if (statsBar) statsBar.after(bar);
    }

    _updateStreak(correct) {
        if (correct) {
            this.streak++;
        } else {
            this.streak = 0;
        }

        const bar = document.getElementById('streak-bar');
        const count = document.getElementById('streak-count');
        if (!bar || !count) return;

        count.textContent = this.streak;

        if (this.streak >= 1) {
            bar.classList.add('visible');
        } else {
            bar.classList.remove('visible');
        }

        // Intensity tiers
        bar.classList.remove('hot', 'fire');
        if (this.streak >= 10) {
            bar.classList.add('fire');
        } else if (this.streak >= 5) {
            bar.classList.add('hot');
        }
    }

    // ========================
    // Milestone Celebrations
    // ========================

    _createMilestoneOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'milestone-overlay';
        overlay.id = 'milestone-overlay';
        overlay.innerHTML = '<div class="milestone-content"><span class="milestone-emoji" id="milestone-emoji"></span><span class="milestone-text" id="milestone-text"></span></div>';
        document.body.appendChild(overlay);
    }

    _showMilestoneCelebration(round) {
        const milestones = {
            5:  { emoji: '\u2B50', key: 'game.milestone5',  color: '#10b981' },
            10: { emoji: '\uD83C\uDF1F', key: 'game.milestone10', color: '#3b82f6' },
            15: { emoji: '\uD83D\uDD25', key: 'game.milestone15', color: '#f59e0b' },
            20: { emoji: '\uD83D\uDC8E', key: 'game.milestone20', color: '#a855f7' },
            25: { emoji: '\uD83D\uDE80', key: 'game.milestone20', color: '#ef4444' },
            30: { emoji: '\uD83D\uDC51', key: 'game.milestone20', color: '#fbbf24' }
        };

        const m = milestones[round];
        if (!m) return;

        const overlay = document.getElementById('milestone-overlay');
        const emojiEl = document.getElementById('milestone-emoji');
        const textEl = document.getElementById('milestone-text');
        if (!overlay || !emojiEl || !textEl) return;

        emojiEl.textContent = m.emoji;
        textEl.textContent = (window.i18n && window.i18n.t(m.key)) || `Level ${round}!`;
        textEl.style.color = m.color;

        overlay.classList.add('active');

        // Mini confetti burst for milestones
        this._milestoneConfetti(m.color);

        setTimeout(() => overlay.classList.remove('active'), 1800);
    }

    _milestoneConfetti(color) {
        const container = this.confettiContainer;
        if (!container) return;
        const colors = [color, '#FFD700', '#FF6B6B', '#4ECDC4'];
        for (let i = 0; i < 20; i++) {
            const piece = document.createElement('div');
            piece.classList.add('confetti');
            piece.style.background = colors[Math.floor(Math.random() * colors.length)];
            piece.style.left = (Math.random() * window.innerWidth) + 'px';
            piece.style.top = (-20 - Math.random() * 100) + 'px';
            const duration = 1.5 + Math.random() * 1;
            const delay = Math.random() * 0.3;
            piece.style.animation = `fall ${duration}s linear ${delay}s forwards`;
            container.appendChild(piece);
            setTimeout(() => piece.remove(), (duration + delay) * 1000);
        }
    }

    getPreviewDuration() {
        // Preview time decreases with difficulty
        if (this.round <= 10) return 2000;      // Easy: 2s
        if (this.round <= 20) return 1500;       // Medium: 1.5s
        if (this.round <= 35) return 1000;       // Hard: 1s
        return 500;                               // Very hard: 0.5s
    }

    showPatternPreview() {
        return new Promise((resolve) => {
            if (this.skipPreview) {
                resolve();
                return;
            }

            const duration = this.getPreviewDuration();
            const memorizeText = (window.i18n && window.i18n.t('game.memorize')) || 'MEMORIZE!';

            // Update overlay text
            this.previewTextEl.textContent = memorizeText;

            // Light up all color buttons that appear in the sequence
            const uniqueColors = [...new Set(this.sequence)];
            this.colorGrid.classList.add('preview-mode');
            uniqueColors.forEach(color => {
                const btn = document.querySelector(`[data-color="${color}"]`);
                if (btn) btn.classList.add('preview-active');
            });

            // Show overlay
            this.previewOverlay.classList.add('active');

            // Countdown display
            let remaining = Math.ceil(duration / 1000);
            this.previewCountdownEl.textContent = remaining;
            const countdownInterval = setInterval(() => {
                remaining--;
                if (remaining > 0) {
                    this.previewCountdownEl.textContent = remaining;
                } else {
                    this.previewCountdownEl.textContent = '';
                }
            }, 1000);

            // End preview after duration
            setTimeout(() => {
                clearInterval(countdownInterval);

                // Remove preview classes
                uniqueColors.forEach(color => {
                    const btn = document.querySelector(`[data-color="${color}"]`);
                    if (btn) btn.classList.remove('preview-active');
                });
                this.colorGrid.classList.remove('preview-mode');
                this.previewOverlay.classList.remove('active');

                // Brief pause before sequence plays
                setTimeout(() => resolve(), 300);
            }, duration);
        });
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

        // Show pattern preview then play sequence
        const memorizeText = (window.i18n && window.i18n.t('game.memorize')) || 'MEMORIZE!';
        this.gameStatus.textContent = this.skipPreview
            ? (window.i18n.t('game.watching') || 'Watch...')
            : memorizeText;

        this.showPatternPreview().then(() => {
            this.gameStatus.textContent = window.i18n.t('game.watching') || 'Watch...';
            setTimeout(() => {
                this.playSequence();
            }, 300);
        });
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
            if (typeof Haptic !== 'undefined') Haptic.medium();
            this._updateStreak(false);
            this.shakeScreen(3, 6);
            this.lives--;
            this.updateLivesDisplay();
            this.showFloatingText(`\u2764\uFE0F x${this.lives}`, '#e74c3c');
            if (this.lives <= 0) {
                this.endGame();
                return;
            }
            // Replay current round (forgive mistake)
            this.userSequence = [];
            this.isUserTurn = false;
            this.gameStatus.textContent = window.i18n.t('game.watching') || 'Watch...';
            setTimeout(() => this.playSequence(), 800);
            return;
        }

        // Check if user completed the round
        if (this.userSequence.length === this.sequence.length) {
            this.isUserTurn = false;
            if (typeof Haptic !== 'undefined') Haptic.light();

            // Update streak
            this._updateStreak(true);

            // Play success sound
            if (window.sfx) {
                if (!window.sfx.initialized) {
                    window.sfx.init();
                }
                window.sfx.success();
            }

            // Floating "Correct!" text
            const correctText = (window.i18n && window.i18n.t('game.message.correct')) || 'Correct!';
            this.showFloatingText(correctText, '#2ecc71');

            // Live PB tracking - show "NEW BEST!" as you play
            const currentScore = this.round;
            if (currentScore > this.bestScore) {
                this.bestScore = currentScore;
                this._saveBestScore(this.bestScore);
                this.updateBestScoreDisplay();
                this.showNewBest();
            }

            // Milestone celebrations at key rounds
            if ([5, 10, 15, 20, 25, 30].includes(this.round)) {
                this._showMilestoneCelebration(this.round);
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
        if (typeof Haptic !== 'undefined') Haptic.heavy();

        // Play game over sound
        if (window.sfx) {
            if (!window.sfx.initialized) {
                window.sfx.init();
            }
            window.sfx.error();
        }

        // Error feedback — shake + flash
        this.colorGrid.classList.add('error');
        this.shakeGrid();
        setTimeout(() => {
            this.colorGrid.classList.remove('error');
        }, 500);

        const finalScore = this.round - 1;
        const cmGames = parseInt(localStorage.getItem('colorMemory_gamesPlayed')) || 0;
        localStorage.setItem('colorMemory_gamesPlayed', cmGames + 1);
        if (typeof DailyStreak !== 'undefined') DailyStreak.report(finalScore);
        if(typeof gtag!=='undefined') gtag('event','game_over',{score: finalScore});
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
            this.showNewBest();
            this.recordCheck.style.display = 'block';
        } else {
            this.recordCheck.style.display = 'none';
        }

        // Show game over screen (with interstitial ad)
        const showGameOver = () => {
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

            // Report achievements
            if (typeof GameAchievements !== 'undefined') GameAchievements.report({
                bestScore: parseInt(localStorage.getItem('colorMemory_bestScore')) || 0,
                gamesPlayed: parseInt(localStorage.getItem('colorMemory_gamesPlayed')) || 0
            });

            // Rewarded ad — watch ad for 2x score
            if (typeof GameAds !== 'undefined') {
                GameAds.injectRewardButton({
                    container: '#game-over-screen',
                    label: 'Watch Ad for 2x Score',
                    onReward: () => {
                        const doubled = finalScore * 2;
                        this.finalScoreDisplay.textContent = doubled;
                        if (doubled > this.bestScore) {
                            this.bestScore = doubled;
                            this._saveBestScore(doubled);
                            this.finalBestScoreDisplay.textContent = doubled;
                        }
                    }
                });
            }
        };

        setTimeout(() => {
            if (typeof GameAds !== 'undefined') {
                GameAds.showInterstitial({ onComplete: () => { showGameOver(); } });
            } else {
                showGameOver();
            }
        }, 500);
    }

    // ========================
    // UI Updates
    // ========================

    updateRoundDisplay() {
        this.roundDisplay.textContent = this.round;

        // Difficulty tier badge
        let tierEl = document.getElementById('difficulty-tier');
        if (!tierEl) {
            tierEl = document.createElement('div');
            tierEl.id = 'difficulty-tier';
            tierEl.style.cssText = 'text-align:center;font-size:0.75rem;font-weight:700;letter-spacing:2px;margin-top:4px;transition:color 0.3s;';
            this.roundDisplay.parentElement?.appendChild(tierEl);
        }
        let tier, color;
        if (this.round <= 5) { tier = 'EASY'; color = '#10b981'; }
        else if (this.round <= 10) { tier = 'NORMAL'; color = '#3b82f6'; }
        else if (this.round <= 20) { tier = 'HARD'; color = '#f59e0b'; }
        else if (this.round <= 35) { tier = 'EXPERT'; color = '#ef4444'; }
        else if (this.round <= 50) { tier = 'MASTER'; color = '#a855f7'; }
        else { tier = 'LEGEND'; color = '#fbbf24'; }
        tierEl.textContent = tier;
        tierEl.style.color = color;
    }

    updateScoreDisplay() {
        this.scoreDisplay.textContent = this.round - 1;
    }

    updateBestScoreDisplay() {
        this.bestScoreDisplay.textContent = this.bestScore;
        // Add PB badge if score > 0
        let badge = this.bestScoreDisplay.parentElement?.querySelector('.pb-badge');
        if (this.bestScore > 0 && !badge) {
            badge = document.createElement('span');
            badge.className = 'pb-badge';
            badge.textContent = 'PB';
            this.bestScoreDisplay.parentElement?.appendChild(badge);
        }
    }

    updateLivesDisplay() {
        let livesEl = document.getElementById('lives-display');
        if (!livesEl) {
            livesEl = document.createElement('div');
            livesEl.id = 'lives-display';
            livesEl.style.cssText = 'text-align:center;font-size:1.2rem;margin:8px 0;letter-spacing:4px;';
            const statsBar = document.querySelector('.stats-bar');
            if (statsBar) statsBar.after(livesEl);
        }
        livesEl.textContent = '❤️'.repeat(this.lives) + '🖤'.repeat(this.maxLives - this.lives);
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

    shakeGrid() {
        this.colorGrid.style.animation = 'cm-shake 0.4s ease';
        setTimeout(() => { this.colorGrid.style.animation = ''; }, 450);
    }

    showFloatingText(text, color = '#2ecc71') {
        const el = document.createElement('div');
        el.textContent = text;
        el.style.cssText = 'position:fixed;top:40%;left:50%;transform:translateX(-50%);font-size:24px;font-weight:800;color:' + color + ';z-index:9999;pointer-events:none;text-shadow:0 0 10px ' + color + '40;opacity:1;transition:all 0.7s ease-out;';
        document.body.appendChild(el);
        requestAnimationFrame(() => {
            el.style.top = '30%';
            el.style.opacity = '0';
        });
        setTimeout(() => el.remove(), 800);
    }

    shakeScreen(intensity = 3, frames = 6) {
        const duration = Math.max(frames * (1000 / 60), 200);
        const px = intensity;
        const keyframes = `@keyframes cm-shake-dynamic{0%,100%{transform:translateX(0)}25%{transform:translateX(-${px}px)}50%{transform:translateX(${px}px)}75%{transform:translateX(-${Math.ceil(px/2)}px)}}`;
        const s = document.createElement('style');
        s.textContent = keyframes;
        document.head.appendChild(s);
        this.colorGrid.style.animation = `cm-shake-dynamic ${duration}ms ease`;
        setTimeout(() => {
            this.colorGrid.style.animation = '';
            s.remove();
        }, duration + 50);
    }

    // showLevelMilestone replaced by _showMilestoneCelebration

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

// Shake animation CSS
(function(){const s=document.createElement('style');s.textContent='@keyframes cm-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}';document.head.appendChild(s);})();

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
    if (typeof DailyStreak !== 'undefined') DailyStreak.init({ gameId: 'color-memory', bestScoreKey: 'colorMemory_bestScore', minTarget: 3 });
    if (typeof GameAds !== 'undefined') GameAds.init();
    if (typeof GameAchievements !== 'undefined') GameAchievements.init({
        gameId: 'color-memory',
        defs: [
            { id: 'score_5', stat: 'bestScore', target: 5, icon: '\uD83C\uDFA8', name: 'Color Starter' },
            { id: 'score_10', stat: 'bestScore', target: 10, icon: '\uD83C\uDFA8', name: 'Color Expert' },
            { id: 'score_20', stat: 'bestScore', target: 20, icon: '\uD83C\uDFA8', name: 'Color Master' },
            { id: 'score_30', stat: 'bestScore', target: 30, icon: '\uD83C\uDFA8', name: 'Color Legend' },
            { id: 'games_10', stat: 'gamesPlayed', target: 10, icon: '\uD83C\uDFAE', name: 'Regular' },
            { id: 'games_50', stat: 'gamesPlayed', target: 50, icon: '\uD83C\uDFAE', name: 'Dedicated' },
        ]
    });
});
