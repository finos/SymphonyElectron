const path = require("path");
const fs = require('fs');
let language;
let loadedTranslations = {};

const getMessageFor = function(phrase) {
    let translation = loadedTranslations[phrase];
    if(translation === undefined) {
        translation = phrase;
    }
    return translation;
};

const setLanguage = function(lng) {
    language = lng ? lng : 'en-US';
    loadedTranslations = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'locale', language + '.json'), 'utf8'));
};

/**
 * Returns the current locale
 * @return {*|string}
 */
const getLanguage = function() {
    return language || 'en-US';
};

module.exports = {
    setLanguage: setLanguage,
    getMessageFor: getMessageFor,
    getLanguage: getLanguage,
};