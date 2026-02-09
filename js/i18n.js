/**
 * i18n - Internationalization System
 * Supports 12 languages for global accessibility
 */

class I18n {
    constructor() {
        this.translations = {};
        this.supportedLanguages = ['ko', 'en', 'zh', 'hi', 'ru', 'ja', 'es', 'pt', 'id', 'tr', 'de', 'fr'];
        this.currentLang = this.detectLanguage();
        this.isLoading = false;
    }

    /**
     * Detect language from localStorage or browser
     */
    detectLanguage() {
        // Check localStorage first
        const saved = localStorage.getItem('i18n_language');
        if (saved && this.supportedLanguages.includes(saved)) {
            return saved;
        }

        // Check browser language
        const browserLang = navigator.language.split('-')[0].toLowerCase();
        if (this.supportedLanguages.includes(browserLang)) {
            return browserLang;
        }

        // Default to English
        return 'en';
    }

    /**
     * Initialize i18n and load default language
     */
    async initI18n() {
        await this.loadTranslations(this.currentLang);
        this.updateUI();
    }

    /**
     * Load translation file for language
     */
    async loadTranslations(lang) {
        if (this.translations[lang]) {
            return this.translations[lang];
        }

        try {
            const response = await fetch(`js/locales/${lang}.json`);
            const data = await response.json();
            this.translations[lang] = data;
            return data;
        } catch (error) {
            console.error(`Failed to load language: ${lang}`, error);
            // Fallback to English
            if (lang !== 'en') {
                return this.loadTranslations('en');
            }
            return {};
        }
    }

    /**
     * Get translated text by key
     * Supports dot notation: 'section.key'
     */
    t(key) {
        const keys = key.split('.');
        let value = this.translations[this.currentLang];

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                // Fallback to key itself if not found
                return key;
            }
        }

        return value || key;
    }

    /**
     * Set language and update UI
     */
    async setLanguage(lang) {
        if (!this.supportedLanguages.includes(lang)) {
            console.warn(`Language not supported: ${lang}`);
            return;
        }

        if (this.currentLang === lang) {
            return; // Already set
        }

        this.isLoading = true;
        await this.loadTranslations(lang);
        this.currentLang = lang;
        localStorage.setItem('i18n_language', lang);
        this.updateUI();
        this.isLoading = false;

        // Dispatch event for other components
        document.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: lang }
        }));
    }

    /**
     * Update UI with current language
     */
    updateUI() {
        document.documentElement.lang = this.currentLang;

        // Update all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);

            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        });

        // Update active language button
        document.querySelectorAll('.lang-option').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-lang') === this.currentLang);
        });
    }

    /**
     * Get current language
     */
    getCurrentLanguage() {
        return this.currentLang;
    }

    /**
     * Get language display name
     */
    getLanguageName(lang) {
        const names = {
            ko: '한국어',
            en: 'English',
            zh: '中文',
            hi: 'हिन्दी',
            ru: 'Русский',
            ja: '日本語',
            es: 'Español',
            pt: 'Português',
            id: 'Bahasa Indonesia',
            tr: 'Türkçe',
            de: 'Deutsch',
            fr: 'Français'
        };
        return names[lang] || lang;
    }

    /**
     * Get supported languages
     */
    getSupportedLanguages() {
        return this.supportedLanguages;
    }
}

// Global i18n instance
window.i18n = new I18n();

// Setup language selector UI
document.addEventListener('DOMContentLoaded', () => {
    const langToggle = document.getElementById('lang-toggle');
    const langMenu = document.getElementById('lang-menu');
    const langOptions = document.querySelectorAll('.lang-option');

    // Toggle language menu
    if (langToggle) {
        langToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            langMenu.classList.toggle('hidden');
        });
    }

    // Handle language selection
    langOptions.forEach(option => {
        option.addEventListener('click', async (e) => {
            const lang = option.getAttribute('data-lang');
            await window.i18n.setLanguage(lang);
            langMenu.classList.add('hidden');
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.language-selector')) {
            langMenu.classList.add('hidden');
        }
    });

    // Close menu when pressing Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            langMenu.classList.add('hidden');
        }
    });
});
