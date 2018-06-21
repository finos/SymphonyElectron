const electron = require('electron');
const app = electron.app;
const path = require("path");
const fs = require('fs');

const log = require('../log.js');
const logLevels = require('../enums/logLevels.js');

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

/**
 * Returns the current locale
 * @return {*|string}
 */
const getLanguage = function() {
    let sysLocale;
    try {
        sysLocale = app.getLocale();
    } catch (err) {
        log.send(logLevels.WARN, `i18n: Failed to fetch app.getLocale with an ${err}`);
    }
    return language || sysLocale || 'en-US';
};

module.exports = {
    setLanguage: setLanguage,
    getMessageFor: getMessageFor,
    getLanguage: getLanguage,
};