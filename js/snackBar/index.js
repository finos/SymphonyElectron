const snackBarContent = require('./content').snackBarContent;

class SnackBar {

    constructor() {
        this.body = document.getElementsByTagName('body');
        this.domParser = new DOMParser();

        const snackBar = this.domParser.parseFromString(snackBarContent, 'text/html');
        this.snackBar = snackBar.getElementById('snackbar');
    }

    /**
     * Method that displays a snack bar for 3 sec
     */
    showSnackBar(content) {
        if (content && typeof content === 'object') {
            const i18nNodes = this.snackBar.querySelectorAll('[data-i18n-text]');

            for (let node of i18nNodes) {
                if (node.attributes['data-i18n-text'] && node.attributes['data-i18n-text'].value) {
                    node.innerText = content[node.attributes['data-i18n-text'].value] || node.attributes['data-i18n-text'].value;
                }
            }
        }

        if (this.body && this.body.length > 0 && this.snackBar) {
            this.body[0].appendChild(this.snackBar);
            this.snackBar.className = "show";
            this.snackBarTimmer = setTimeout(() => {
                this.body[0].removeChild(this.snackBar);
            }, 3000);
        }
    }

    /**
     * Method that removes snack bar from the DOM
     */
    removeSnackBar() {
        if (this.body && this.body.length > 0 && this.snackBar) {
            this.body[0].removeChild(this.snackBar);
            if (this.snackBarTimmer) {
                clearTimeout(this.snackBarTimmer);
            }
        }
    }

}

module.exports = {
    SnackBar,
};