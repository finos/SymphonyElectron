'use strict';
const electron = require('electron');
const app = electron.app;
const path = require('path');
const isDevEnv = require('../utils/misc.js').isDevEnv;

const userData = path.join(app.getPath('userData'));
const INDEX_DATA_FOLDER = isDevEnv ? './data' : path.join(userData, 'data');

class Crypto {

    constructor() {
        this.indexDataFolder = INDEX_DATA_FOLDER;
    }

    encryption() {
        console.log(this.indexDataFolder)
    }

    decryption() {
        console.log(this.indexDataFolder)
    }
}

module.exports = Crypto;