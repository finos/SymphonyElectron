'use strict';

const ffi = require('ffi');
const ref = require('ref');

const electron = require('electron');
const app = electron.app;
const path = require('path');
const isDevEnv = require('../utils/misc.js').isDevEnv;
const isMac = require('../utils/misc.js').isMac;

var symLucyIndexer = ref.types.void;
var symLucyIndexerPtr = ref.refType(symLucyIndexer);


let messageData = ref.types.void;
let messagePtr = ref.refType(messageData);

let execPath = path.dirname(app.getPath('exe'));

const rootPath = isMac ? 'libsymphonysearch.dylib' : 'libsymphonysearch.dll';
let productionPath = path.join(execPath, isMac ? '..' : '', rootPath);
let devPath = path.join(__dirname, '..', '..', rootPath);
let libraryPath = isDevEnv ? devPath : productionPath;

var libSymphonySearch = ffi.Library(libraryPath, {
    //init
    'symSE_init': ['void', []],
    'symSE_remove_folder': ['int', ['string']],
    'symSE_ensure_index_exists': ['int', ['string']],
    'symSE_ensure_folder_exists': ['int', ['string']],
    //first time indexing and delta indexing
    'symSE_get_indexer': [symLucyIndexerPtr, ['string']], //will be removed
    'symSE_create_partial_index': ['int', ['string', 'string', 'string']],
    'symSE_merge_partial_index': ['int', ['string', 'string']],
    //real time indexing
    'symSE_index_realtime': ['int', ['string', 'string']],
    'symSE_merge_temp_index': ['int', ['string', 'string']],
    'symSE_clear_temp_index': ['int', ['string']],
    //Search,
    'symSE_search': ['string', ['string', 'string', 'string', 'string', 'string', 'int', 'int', 'int']],
    //Deletion
    'symSE_delete_messages': ['int', ['string', 'string', 'string', 'string']],
    //Index commit/optimize
    'symSE_commit_index': ['int', [symLucyIndexerPtr, 'int']], //will be removed
    //freePointer
    'symSE_free_results': ['int', [messagePtr]]
});

module.exports = {
    symSEInit: libSymphonySearch.symSE_init,
    symSERemoveFolder: libSymphonySearch.symSE_remove_folder,
    symSEEnsureIndexExists: libSymphonySearch.symSE_ensure_index_exists,
    symSEEnsureFolderExists: libSymphonySearch.symSE_ensure_folder_exists,
    symSEGetIndexer: libSymphonySearch.symSE_get_indexer,
    symSECreatePartialIndex: libSymphonySearch.symSE_create_partial_index,
    symSEMergePartialIndex: libSymphonySearch.symSE_merge_partial_index,
    symSEIndexRealTime: libSymphonySearch.symSE_index_realtime,
    symSEMergeTempIndex: libSymphonySearch.symSE_merge_temp_index,
    symSEClearTempIndex: libSymphonySearch.symSE_clear_temp_index,
    symSESearch: libSymphonySearch.symSE_search,
    symSEDeleteMessages: libSymphonySearch.symSE_delete_messages,
    symSECommitIndex: libSymphonySearch.symSE_commit_index,
    symSEFreeResult: libSymphonySearch.symSE_free_results,
    symSEInitAsync: libSymphonySearch.symSE_init.async,
    symSERemoveFolderAsync: libSymphonySearch.symSE_remove_folder.async,
    symSEEnsureIndexExistsAsync: libSymphonySearch.symSE_ensure_index_exists.async,
    symSEEnsureFolderExistsAsync: libSymphonySearch.symSE_ensure_folder_exists.async,
    symSEGetIndexerAsync: libSymphonySearch.symSE_get_indexer.async,
    symSECreatePartialIndexAsync: libSymphonySearch.symSE_create_partial_index.async,
    symSEMergePartialIndexAsync: libSymphonySearch.symSE_merge_partial_index.async,
    symSEIndexRealTimeAsync: libSymphonySearch.symSE_index_realtime.async,
    symSEMergeTempIndexAsync: libSymphonySearch.symSE_merge_temp_index.async,
    symSEClearTempIndexAsync: libSymphonySearch.symSE_clear_temp_index.async,
    symSESearchAsync: libSymphonySearch.symSE_search.async,
    symSEDeleteMessagesAsync: libSymphonySearch.symSE_delete_messages.async,
    symSECommitIndexAsync: libSymphonySearch.symSE_commit_index.async,
    symSEFreeResultAsync: libSymphonySearch.symSE_free_results.async
};