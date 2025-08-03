const fs = require('fs');
const path = require('path');

class Localization {
    constructor() {
        this.translations = {};
        this.defaultLanguage = 'en';
        this.loadTranslations();
    }

    loadTranslations() {
        try {
            // Load English translations
            const enPath = path.join(__dirname, '../locales/en.json');
            this.translations.en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

            // Load Arabic translations
            const arPath = path.join(__dirname, '../locales/ar.json');
            this.translations.ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));

            console.log('Translations loaded successfully');
        } catch (error) {
            console.error('Error loading translations:', error);
            this.translations = {
                en: {},
                ar: {}
            };
        }
    }

    // Get nested property from object using dot notation
    getNestedProperty(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : null;
        }, obj);
    }

    // Replace placeholders in text with provided values
    replacePlaceholders(text, replacements = {}) {
        if (!text || typeof text !== 'string') return text;
        
        return text.replace(/\{(\w+)\}/g, (match, key) => {
            return replacements[key] !== undefined ? replacements[key] : match;
        });
    }

    // Get translation for a specific key and language
    t(key, language = null, replacements = {}) {
        // Default to English if language not specified
        const lang = language || this.defaultLanguage;
        
        // Ensure language is supported
        const supportedLang = this.translations[lang] ? lang : this.defaultLanguage;
        
        // Get the translation
        const translation = this.getNestedProperty(this.translations[supportedLang], key);
        
        // If translation not found in the specified language, try default language
        if (!translation && supportedLang !== this.defaultLanguage) {
            const fallbackTranslation = this.getNestedProperty(this.translations[this.defaultLanguage], key);
            if (fallbackTranslation) {
                return this.replacePlaceholders(fallbackTranslation, replacements);
            }
        }
        
        // If no translation found, return the key
        if (!translation) {
            console.warn(`Translation not found for key: ${key} in language: ${supportedLang}`);
            return key;
        }
        
        // Replace placeholders and return
        return this.replacePlaceholders(translation, replacements);
    }

    // Get user's preferred language from language code
    getUserLanguage(languageCode) {
        if (!languageCode) return this.defaultLanguage;
        
        // Extract language from locale (e.g., 'ar-SA' -> 'ar')
        const lang = languageCode.split('-')[0].toLowerCase();
        
        // Return if supported, otherwise default
        return this.translations[lang] ? lang : this.defaultLanguage;
    }

    // Get available languages
    getAvailableLanguages() {
        return Object.keys(this.translations);
    }

    // Check if language is supported
    isLanguageSupported(language) {
        return this.translations[language] !== undefined;
    }

    // Format time in user's language
    formatTime(seconds, language = 'en') {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (language === 'ar') {
            if (hours > 0) {
                return `${hours}س ${minutes}د ${secs}ث`;
            } else if (minutes > 0) {
                return `${minutes}د ${secs}ث`;
            } else {
                return `${secs}ث`;
            }
        } else {
            if (hours > 0) {
                return `${hours}h ${minutes}m ${secs}s`;
            } else if (minutes > 0) {
                return `${minutes}m ${secs}s`;
            } else {
                return `${secs}s`;
            }
        }
    }

    // Format date in user's language
    formatDate(date, language = 'en') {
        const dateObj = new Date(date);
        
        if (language === 'ar') {
            return dateObj.toLocaleDateString('ar', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } else {
            return dateObj.toLocaleDateString('en', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }

    // Format numbers in user's language
    formatNumber(number, language = 'en') {
        if (language === 'ar') {
            // Convert to Arabic-Indic numerals
            const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
            return number.toString().replace(/[0-9]/g, (digit) => arabicNumerals[parseInt(digit)]);
        } else {
            return number.toLocaleString('en');
        }
    }
}

// Create singleton instance
const localization = new Localization();

module.exports = localization;