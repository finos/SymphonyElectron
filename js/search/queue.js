const log = require('../log.js');
const logLevels = require('../enums/logLevels.js');

let messagesData = [];

let makeBoundTimedCollector = function(isIndexing, timeout, callback) {
    let timer;

    return function (...args) {
        if (!timer){
            timer = setTimeout(function(){
                if (!isIndexing()) {
                    flush(getQueue());
                }
            }, timeout);
        }

        let queue = getQueue();
        queue.push(args[0]);

        if (!isIndexing()) {
            flush(queue);
        }
    };

    function handleRealTimeResponse(status, response) {
        if (status) {
            log.send(logLevels.INFO, response);
        } else {
            log.send(logLevels.ERROR, response);
        }

    }

    function flush(queue) {
        clearTimeout(timer);
        timer = null;
        resetQueue();
        if (queue) {
            callback(JSON.stringify(queue), handleRealTimeResponse.bind(this));
        }
    }

    function getQueue(){
        return messagesData;
    }

    function resetQueue(){
        messagesData = [];
    }
};

module.exports = makeBoundTimedCollector;
