const { checkDiskSpace } = require('./utils/checkDiskSpace.js');
const searchConfig = require('./searchConfig.js');
const { isMac } = require('../utils/misc.js');

class SearchUtils {

    constructor() {
        this.path = searchConfig.FOLDERS_CONSTANTS.USER_DATA_PATH;
    }

    checkFreeSpace() {
        return new Promise((resolve, reject) => {
            if (!isMac) {
                this.path = this.path.substring(0, 2);
            }
            checkDiskSpace(this.path, function (error, res) {

                if (error) {
                    return reject(new Error(error));
                }

                return resolve(res >= searchConfig.MINIMUM_DISK_SPACE);
            });
        });
    }
}

module.exports = {
    SearchUtils: SearchUtils
};
