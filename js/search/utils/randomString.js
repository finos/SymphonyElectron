const searchConfig = require('../searchConfig.js');

function randomString() {
    let text = "";

    for (let i = 0; i < 7; i++) {
        text += searchConfig.RANDOM_STRING.charAt(Math.floor(Math.random() * searchConfig.RANDOM_STRING.length));
    }
    let time = new Date().getTime();
    return text + time;
}

module.exports = {
    randomString: randomString
};