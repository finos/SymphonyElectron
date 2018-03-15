const electron = require('electron');
const app = electron.app;
const path = require('path');
const userData = path.join(app.getPath('userData'));
const execPath = path.dirname(app.getPath('exe'));
const { isDevEnv, isMac } = require('../utils/misc.js');

const INDEX_FOLDER_NAME = 'data';

const winLibraryPath = isDevEnv ? path.join(__dirname, '..', '..', 'library') : path.join(execPath, 'library');
const macLibraryPath = isDevEnv ? path.join(__dirname, '..', '..', 'library') : path.join(execPath, '..', 'library');

const arch = process.arch === 'ia32';

const winIndexValidatorArch = arch ? 'indexvalidator-x86.exe' : 'indexvalidator-x64.exe';
const indexValidatorPath = isMac ? path.join(macLibraryPath, 'indexvalidator.exec') : path.join(winLibraryPath, winIndexValidatorArch);

const winLZ4ArchPath = arch ? 'lz4-win-x86.exe' : 'lz4-win-x64.exe';
const lz4Path = path.join(winLibraryPath, winLZ4ArchPath);

const indexFolderPath = isDevEnv ? `./${INDEX_FOLDER_NAME}` : path.join(userData, INDEX_FOLDER_NAME);

const winSearchLibArchPath = arch ? 'libsymphonysearch-x86.dll' : 'libsymphonysearch-x64.dll';
const libraryPath = isMac ? path.join(macLibraryPath, 'libsymphonysearch.dylib') : path.join(winLibraryPath, winSearchLibArchPath);

const userConfigFileName = 'search_users_config.json';
const userConfigFile = isDevEnv ? path.join(__dirname, '..', '..', userConfigFileName) : path.join(userData, userConfigFileName);

const libraryFolderPath = isMac ? macLibraryPath : winLibraryPath;

const pathToUtils = isDevEnv ? path.join(__dirname, '../../node_modules/electron-utils') : winLibraryPath;
const launchAgentFile = path.join(libraryFolderPath, 'search-launch-agent.sh');
const launchDaemonFile = path.join(libraryFolderPath, 'search-launch-daemon.sh');
const windowsTaskFile = path.join(pathToUtils, isDevEnv ? 'ClearSchTasks/bin/Release/ClearSchTasks.exe' : 'ClearSchTasks.exe');
const windowsClearScript = path.join(pathToUtils, isDevEnv ? 'ClearOnBoot/bin/Release/ClearOnBoot.exe' : 'ClearOnBoot.exe');

const libraryPaths = {
    INDEX_VALIDATOR: indexValidatorPath,
    LZ4_PATH: lz4Path,
    MAC_LIBRARY_FOLDER: macLibraryPath,
    WIN_LIBRARY_FOLDER: winLibraryPath,
    SEARCH_LIBRARY_PATH: libraryPath,
    LIBRARY_FOLDER_PATH: libraryFolderPath,
    LAUNCH_AGENT_FILE: launchAgentFile,
    LAUNCH_DAEMON_FILE: launchDaemonFile,
    WINDOWS_TASK_FILE: windowsTaskFile,
    WINDOWS_CLEAR_SCRIPT: windowsClearScript,
};

const folderPaths = {
    INDEX_PATH: indexFolderPath,
    TEMP_BATCH_INDEX_FOLDER: indexFolderPath + '/temp_batch_indexes',
    TEMP_REAL_TIME_INDEX: indexFolderPath + '/temp_realtime_index',
    PREFIX_NAME: 'search_index',
    PREFIX_NAME_PATH: indexFolderPath + '/search_index',
    EXEC_PATH: execPath,
    USER_DATA_PATH: userData,
    INDEX_FOLDER_NAME: INDEX_FOLDER_NAME,
    USER_CONFIG_FILE: userConfigFile
};

const searchConfig = {
    SEARCH_PERIOD_SUBTRACTOR: 3 * 31 * 24 * 60 * 60 * 1000,
    REAL_TIME_INDEXING_TIME: 60000,
    MINIMUM_DATE: '0000000000000',
    MAXIMUM_DATE: '9999999999999',
    SORT_BY_SCORE: 0,
    INDEX_VERSION: 'v1',
    BATCH_RANDOM_INDEX_PATH_LENGTH: 20,
    LIBRARY_CONSTANTS: libraryPaths,
    FOLDERS_CONSTANTS: folderPaths,
    TAR_LZ4_EXT: '.tar.lz4',
    RANDOM_STRING: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    MINIMUM_DISK_SPACE: 300000000, // in bytes
    PERMISSION_ERROR: "The FSUTIL utility requires that you have administrative privileges.",
    WIN_PATH_ERROR: "Error:  The system cannot find the path specified.",
    MAC_PATH_ERROR: "No such file or directory"
};

module.exports = searchConfig;
