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
    showSnackBar() {
        if (this.body && this.body.length > 0 && this.snackBar) {
            this.body[0].appendChild(this.snackBar);
            this.snackBar.className = "show";
            setTimeout(() => {
                this.body[0].removeChild(this.snackBar);
            }, 3000);
        }
    }

}

module.exports = {
    SnackBar,
};