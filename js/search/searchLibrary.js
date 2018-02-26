'use strict';

const ffi = require('ffi');
const ref = require('ref');

const searchConfig = require('../search/searchConfig.js');

const symLucyIndexer = ref.types.void;
const symLucyIndexerPtr = ref.refType(symLucyIndexer);

/**
 * Initializing the C SymphonySearchEngine library
 * using the node-ffi
 */
let libSymphonySearch = ffi.Library(searchConfig.LIBRARY_CONSTANTS.SEARCH_LIBRARY_PATH, {

    //New Memory Indexing API
    'symSE_index_main_RAM': ['int', [ 'string' ] ],
    'symSE_index_realtime_RAM': ['int', [ 'string' ] ],
    'symSE_main_RAM_index_to_FS_index': ['int', [ 'string' ] ],
    'symSE_realtime_RAM_index_to_FS_index': ['int', [ 'string' ] ],
    'symSE_main_RAM_index_get_last_message_timestamp': ['char *', [] ],
    'symSE_RAM_index_search': ['char *', [ 'string', 'string', 'string', 'int', 'int', 'int' ] ],
    'symSE_main_FS_index_to_RAM_index': ['int', [ 'string' ] ],
    'symSE_realtime_FS_index_to_RAM_index': ['int', [ 'string' ] ],
    'symSE_clear_realtime_RAM_index': ['int', [] ],
    'symSE_clear_main_RAM_index': ['int', [] ],
    'symSE_delete_messages_from_RAM_index': ['int', [ 'string', 'string', 'string' ] ],
    'symSE_destroy': ['int', [] ],


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
    'symSE_search': ['char *', ['string', 'string', 'string', 'string', 'string', 'int', 'int', 'int']],
    //Deletion
    'symSE_delete_messages': ['int', ['string', 'string', 'string', 'string']],
    //Index commit/optimize
    'symSE_commit_index': ['int', [symLucyIndexerPtr, 'int']], //will be removed
    //freePointer
    'symSE_free_results': ['int', ['char *']],

    //Latest messages timestamp
    'symSE_get_last_message_timestamp': ['char *', ['string']]
});

module.exports = {
    // New Memory Indexing API
    symSEIndexMainRAM: libSymphonySearch.symSE_index_main_RAM,
    symSEIndexRealtimeRAM: libSymphonySearch.symSE_index_realtime_RAM,
    symSEMainRAMIndexToFSIndex: libSymphonySearch.symSE_main_RAM_index_to_FS_index,
    symSERealtimeRAMIndexToFSIndex: libSymphonySearch.symSE_realtime_RAM_index_to_FS_index,
    symSEMainRAMIndexGetLastMessageTimestamp: libSymphonySearch.symSE_main_RAM_index_get_last_message_timestamp,
    symSERAMIndexSearch: libSymphonySearch.symSE_RAM_index_search,
    symSEMainFSIndexToRAMIndex: libSymphonySearch.symSE_main_FS_index_to_RAM_index,
    symSERealtimeFSIndexToRAMIndex: libSymphonySearch.symSE_realtime_FS_index_to_RAM_index,
    symSEClearRealtimeRAMIndex: libSymphonySearch.symSE_clear_realtime_RAM_index,
    symSEClearMainRAMIndex: libSymphonySearch.symSE_clear_main_RAM_index,
    symSEDeleteMessagesFromRAMIndex: libSymphonySearch.symSE_delete_messages_from_RAM_index,
    symSEDestroy: libSymphonySearch.symSE_destroy,
    symSEIndexMainRAMAsync: libSymphonySearch.symSE_index_main_RAM.async,
    symSEIndexRealtimeRAMAsync: libSymphonySearch.symSE_index_realtime_RAM.async,
    symSEMainRAMIndexToFSIndexAsync: libSymphonySearch.symSE_main_RAM_index_to_FS_index.async,
    symSERealtimeRAMIndexToFSIndexAsync: libSymphonySearch.symSE_realtime_RAM_index_to_FS_index.async,
    symSEMainRAMIndexGetLastMessageTimestampAsync: libSymphonySearch.symSE_main_RAM_index_get_last_message_timestamp.async,
    symSERAMIndexSearchAsync: libSymphonySearch.symSE_RAM_index_search.async,
    symSEMainFSIndexToRAMIndexAsync: libSymphonySearch.symSE_main_FS_index_to_RAM_index.async,
    symSERealtimeFSIndexToRAMIndexAsync: libSymphonySearch.symSE_realtime_FS_index_to_RAM_index.async,
    symSEClearRealtimeRAMIndexAsync: libSymphonySearch.symSE_clear_realtime_RAM_index.async,
    symSEClearMainRAMIndexAsync: libSymphonySearch.symSE_clear_main_RAM_index.async,
    symSEDeleteMessagesFromRAMIndexAsync: libSymphonySearch.symSE_delete_messages_from_RAM_index.async,
    symSEDestroyAsync: libSymphonySearch.symSE_destroy.async,

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
    symSEGetLastMessageTimestamp: libSymphonySearch.symSE_get_last_message_timestamp,
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
    symSEFreeResultAsync: libSymphonySearch.symSE_free_results.async,
    symSEGetLastMessageTimestampAsync: libSymphonySearch.symSE_get_last_message_timestamp.async,
};