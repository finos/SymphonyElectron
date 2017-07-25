const { SpellCheckHandler, ContextMenuListener, ContextMenuBuilder } = require('electron-spellchecker');

class SpellCheckHelper {

    constructor() {
        this.spellCheckHandler = new SpellCheckHandler();
    }

    /**
     * To initialize for a specific window
     */
    initializeSpellChecker() {
        this.spellCheckHandler.attachToInput();

        const contextMenuBuilder = new ContextMenuBuilder(this.spellCheckHandler);
        this.contextMenuListener = new ContextMenuListener((info) => {
            contextMenuBuilder.showPopupMenu(info);
        }, null, null);
    }

}

module.exports = {
    SpellCheckHelper: SpellCheckHelper
};