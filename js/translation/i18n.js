const path = require("path");
const fs = require('fs');
let language;
let loadedTranslations;
let missingPhrases = {};

module.exports = i18n;

function i18n(lng) {
    this.switchLanguage(lng);
}

i18n.prototype.__ = function(phrase) {
    let translation = loadedTranslations[phrase];
    if(translation === undefined) {
        translation = phrase;
        generateMissingPhrase(phrase);
    }
    return translation;
};

i18n.prototype.switchLanguage = function(lng) {
    language = lng ? lng : 'en-US';
    loadedTranslations = JSON.parse(fs.readFileSync(path.join(__dirname, language + '.json'), 'utf8'));
};

function generateMissingPhrase(phrase) {
    missingPhrases[phrase] = phrase;
    let data = JSON.stringify(missingPhrases, null, 2);
    fs.writeFile(path.join(__dirname, language + '_missing.json'), data, err => err ? console.error(err) : null);
}

function cleanupTranslationMissingFiles(language) {
    fs.writeFile(path.join(__dirname, language + '_missing.json'), JSON.stringify({}, null, 2), err => err ? console.error(err) : null);
}