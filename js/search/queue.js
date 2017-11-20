let messagesData = [];

let makeBoundTimedCollector = function(isIndexing, timeout, callback) {
    let timer;

    return function (...args) {
        if (!timer){
            timer = setTimeout(function(){
                if (!isIndexing) {
                    flush(getQueue())
                }
            }, timeout);
        }

        let queue = getQueue();
        queue.push(args[0]);

        if (!isIndexing()) {
            flush(queue);
        }
    };

    function flush(queue) {
        clearTimeout(timer);
        timer = null;
        resetQueue();
        callback(JSON.stringify(queue));
    }

    function getQueue(){
        return messagesData
    }

    function resetQueue(){
        messagesData = []
    }
};

module.exports = makeBoundTimedCollector;
