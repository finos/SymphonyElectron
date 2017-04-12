'use strict';

class Search {

    credentials(username, password) {

    }

    query(query) {
        return new Promise((resolve, reject) => {
            resolve({
                text: 'hello world'
            });
        });
    }
}

module.exports = Search;
