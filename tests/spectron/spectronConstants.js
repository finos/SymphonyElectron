module.exports = {

    SYMPHONY_CONFIG_FILE_NAME: "/Symphony.config",

    ELECTRON_GLOBAL_CONFIG_PATH_MAC: "node_modules/electron/dist/Electron.app/Contents/config",
    ELECTRON_GLOBAL_CONFIG_PATH_WIN: "node_modules/electron/dist/config",

    SEARCH_LIBRARY_PATH_MAC: "node_modules/electron/dist/Electron.app/Contents/library",
    SEARCH_LIBRARY_PATH_WIN: "node_modules/electron/dist/library",

    TESTED_HOST: "https://cip4-qa.symphony.com/",

    MENU: {
        "windows": { name: "menu", step: 0, items: [{ name: "Edit", step: 0, items: [{ name: "Undo", step: 0 }, { name: "Redo", step: 1 }, { name: "Cut", step: 2 }, { name: "Copy", step: 3 }, { name: "Paste", step: 4 }, { name: "Paste and Match Style", step: 5 }, { name: "Delete", step: 6 }, { name: "Select All", step: 7 }] }, { name: "View", step: 1, items: [{ name: "Reload", step: 0 }, { name: "Actual Size", step: 1 }, { name: "Zoom In", step: 2 }, { name: "Zoom Out", step: 3 }, { name: "Toogle Full Screen", step: 4 }] }, { name: "Window", step: 2, items: [{ name: "Minimize", step: 0 }, { name: "Close", step: 1 }, { name: "Auto Launch On Startup", step: 2 }, { name: "Always on Top", step: 3 }, { name: "Minimize on Close", step: 4 }] }, { name: "Help", step: 3, items: [{ name: "Symphony Help", step: 0 }, { name: "Learn More", step: 1 }, { name: "Troubleshooting", step: 2, items: [{ name: "Show Logs in Explorer", step: 0 }] }, { name: "About Symphony", step: 3 }] }] },
        "mac": { name: "menu", step: 0, items: [{ name: "Electron", step: 0, items: [{ name: "About Symphony", step: 1 }, { name: "Services", step: 2 }, { name: "Hide Symphony", step: 3 }, { name: "Hide Others", step: 4 }, { name: "Show All", step: 5 }, { name: "Quit Symphony", step: 6 }] }, { name: "Edit", step: 1, items: [{ name: "Undo", step: 1 }, { name: "Redo", step: 2 }, { name: "Cut", step: 3 }, { name: "Copy", step: 4 }, { name: "Paste", step: 5 }, { name: "Paste and Match Style", step: 6 }, { name: "Delete", step: 7 }, { name: "Select All", step: 8 }, { name: "Speech", step: 9 }, { name: "Start Dictation...", step: 10 }, { name: "Emoji & Symbols", step: 11 }] }, { name: "View", step: 2, items: [{ name: "Reload", step: 1 }, { name: "Actual Size", step: 2 }, { name: "Zoom In", step: 3 }, { name: "Zoom Out", step: 4 }, { name: "Toggle Full Screen", step: 5 }, { name: "Auto Launch On Startup", step: 6 }, { name: "Always on Top", step: 7 }, { name: "Minimize on Close", step: 8 }, { name: "Bring to Front on Notifications", step: 9 }, { name: "Refresh app when idle", step: 10 }] }, { name: "Window", step: 3, items: [{ name: "Close", step: 1 }, { name: "Minimize", step: 2 }, { name: "Zoom", step: 3 }, { name: "Bring All to Front", step: 4 }, { name: "Symphony | Secure Seamless Communication", step: 5 }] }, { name: "Help", step: 4, items: [{ name: "Symphony Help", step: 1 }, { name: "Learn More", step: 2 }, { name: "Troubleshooting", step: 3 }] }] }
    }
};
