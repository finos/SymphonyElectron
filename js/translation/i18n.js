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
    let file = path.join(__dirname, '..', '..', 'locale', language + '.json');
    if (!fs.existsSync(file)) {
        file = path.join(__dirname, '..', '..', 'locale', 'en-US.json');
    }
    let data = fs.readFileSync(file, 'utf8');
    try {
        loadedTranslations = JSON.parse(data);
    } catch (e) {
        loadedTranslations = {}
    }
};

module.exports = {
    setLanguage: setLanguage,
    getMessageFor: getMessageFor
};