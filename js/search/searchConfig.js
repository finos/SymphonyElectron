const electron = require('electron');
const app = electron.app;
const path = require('path');
const userData = path.join(app.getPath('userData'));
const execPath = path.dirname(app.getPath('exe'));
const { isDevEnv, isMac } = require('../utils/misc.js');

const winLibraryPath = isDevEnv ? path.join(__dirname, '..', '..', 'library') : path.join(execPath, 'library');
const macLibraryPath = isDevEnv ? path.join(__dirname, '..', '..', 'library') : path.join(execPath, '..', 'library');

const arch = process.arch === 'ia32';

const winLZ4ArchPath = arch ? 'lz4-win-x86.exe' : 'lz4-win-x64.exe';
const lz4Path = path.join(winLibraryPath, winLZ4ArchPath);

const indexFolderPath = isDevEnv ? './' : userData;

const winSearchLibArchPath = arch ? 'libsymphonysearch-x86.dll' : 'libsymphonysearch-x64.dll';
const libraryPath = isMac ? path.join(macLibraryPath, 'libsymphonysearch.dylib') : path.join(winLibraryPath, winSearchLibArchPath);

const userConfigFileName = 'search_users_config.json';
const userConfigFile = isDevEnv ? path.join(__dirname, '..', '..', userConfigFileName) : path.join(userData, userConfigFileName);

const libraryFolderPath = isMac ? macLibraryPath : winLibraryPath;

const pathToUtils = isDevEnv ? path.join(__dirname, '../../node_modules/electron-utils') : winLibraryPath;
const freeDiskSpace = path.join(pathToUtils, isDevEnv ? 'FreeDiskSpace/bin/Release/FreeDiskSpace.exe' : 'FreeDiskSpace.exe');


const libraryPaths = {
    LZ4_PATH: lz4Path,
    MAC_LIBRARY_FOLDER: macLibraryPath,
    WIN_LIBRARY_FOLDER: winLibraryPath,
    SEARCH_LIBRARY_PATH: libraryPath,
    LIBRARY_FOLDER_PATH: libraryFolderPath,
    FREE_DISK_SPACE: freeDiskSpace,
};

const folderPaths = {
    MAIN_INDEX: 'mainindex',
    INDEX_PATH: indexFolderPath,
    PREFIX_NAME: 'search_index',
    EXEC_PATH: execPath,
    USER_DATA_PATH: userData,
    USER_CONFIG_FILE: userConfigFile
};

const searchConfig = {
    SEARCH_PERIOD_SUBTRACTOR: 3 * 31 * 24 * 60 * 60 * 1000,
    REAL_TIME_INDEXING_TIME: 60000,
    MINIMUM_DATE: '0000000000000',
    MAXIMUM_DATE: '9999999999999',
    SORT_BY_SCORE: 0,
    INDEX_VERSION: 'v1',
    LIBRARY_CONSTANTS: libraryPaths,
    FOLDERS_CONSTANTS: folderPaths,
    TAR_LZ4_EXT: '.tar.lz4',
    DISK_NOT_READY: 'NOT_READY',
    DISK_NOT_FOUND: 'DISK_NOT_FOUND',
    MINIMUM_DISK_SPACE: 300000000, // in bytes
    MAC_PATH_ERROR: "No such file or directory",
    KEY_LENGTH: 32,
    KEY_ENCODING: 'base64'
};

module.exports = searchConfig;
