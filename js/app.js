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
    }

    hideLoader() {
        window.addEventListener('load', () => {
            const loader = document.getElementById('app-loader');
            if (loader) {
                loader.classList.add('hidden');
                setTimeout(() => loader.remove(), 300);
            }
        });
    }
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

        // Update speed based on round
        if (this.round % this.speedIncrementInterval === 0) {
            this.speed = Math.max(300, this.speed - this.speedIncrement);
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
        if (!this.audioContext) return;

        const frequencies = {
            red: 261.63,     // C4
            blue: 329.63,    // E4
            green: 392.0,    // G4
            yellow: 523.25   // C5
        };

        try {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.connect(gain);
            gain.connect(this.audioContext.destination);

            osc.frequency.value = frequencies[color];
            osc.type = 'sine';

            gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

            osc.start(this.audioContext.currentTime);
            osc.stop(this.audioContext.currentTime + 0.2);
        } catch (e) {
            console.log('Could not play sound', e);
        }
    }

    // ========================
    // Game End
    // ========================

    endGame() {
        this.gameOver = true;
        this.isUserTurn = false;
        this.playCount++;

        // Error feedback
        this.colorGrid.classList.add('error');
        setTimeout(() => {
            this.colorGrid.classList.remove('error');
        }, 500);

        // Check for new record
        const isNewRecord = (this.round - 1) > this.bestScore;
        if (isNewRecord) {
            this.bestScore = this.round - 1;
            this._saveBestScore(this.bestScore);
            this.recordCheck.style.display = 'block';
        } else {
            this.recordCheck.style.display = 'none';
        }

        // Calculate level
        const level = Math.ceil(this.round / this.speedIncrementInterval);

        // Show game over screen
        setTimeout(() => {
            this.showGameOverScreen();
            this.finalScoreDisplay.textContent = this.round - 1;
            this.finalBestScoreDisplay.textContent = this.bestScore;
            this.finalLevelDisplay.textContent = level;

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
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.game = new ColorMemoryGame();
});
