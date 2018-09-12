module.exports = {

    SYMPHONY_CONFIG_FILE_NAME: "/Symphony.config",

    ELECTRON_GLOBAL_CONFIG_PATH_MAC: "node_modules/electron/dist/Electron.app/Contents/config",
    ELECTRON_GLOBAL_CONFIG_PATH_WIN: "node_modules/electron/dist/config",

    SEARCH_LIBRARY_PATH_MAC: "node_modules/electron/dist/Electron.app/Contents/library",
    SEARCH_LIBRARY_PATH_WIN: "node_modules/electron/dist/library",
    MENU: {
        "root": {
            name: "menu", step: 0, items: [
                { name: "Edit", step: 0, items: [{ name: "Undo", step: 0 }, { name: "Redo", step: 1 }, { name: "Cut", step: 2 }, { name: "Copy", step: 3 }, { name: "Paste", step: 4 }, { name: "Paste and Match Style", step: 5 }, { name: "Delete", step: 6 }, { name: "Select All", step: 7 }] },
                { name: "View", step: 1, items: [{ name: "Reload", step: 0 }, { name: "Actual Size", step: 1 }, { name: "Zoom In", step: 2 }, { name: "Zoom Out", step: 3 }, { name: "Toggle Full Screen", step: 4 }] },
                { name: "Window", step: 2, items: [{ name: "Minimize", step: 0 }, { name: "Close", step: 1 }, { name: "Auto Launch On Startup", step: 2 }, { name: "Always on Top", step: 3 }, { name: "Minimize on Close", step: 4 }] },
                { name: "Help", step: 3, items: [{ name: "Symphony Help", step: 0 }, { name: "Learn More", step: 1 }, { name: "Troubleshooting", step: 2, items: [{ name: "Show Logs in Explorer", step: 0 }] }, { name: "About Symphony", step: 3 }] }
            ]
        }
    },
    MENUMAC: {
        "root": {
            name: "menu", step: 0, items: [
                { name: "Electron", step: 0, items: [{ name: "About Symphony", step: 0 }, { name: "Services", step: 1 }]},
                { name: "Edit", step: 1, items: [{ name: "Undo", step: 0 }, { name: "Redo", step: 1 }, { name: "Cut", step: 2 }, { name: "Copy", step: 3 }, { name: "Paste", step: 4 }, { name: "Paste and Match Style", step: 5 }, { name: "Delete", step: 6 }, { name: "Select All", step: 7 }] },
                { name: "View", step: 2, items: [{ name: "Reload", step: 0 }, { name: "Actual Size", step: 1 }, { name: "Zoom In", step: 2 }, { name: "Zoom Out", step: 3 }, { name: "Toogle Full Screen", step: 4 },{ name: "Minimize on Close", step: 7 }] },
                { name: "Window", step: 3, items: [{ name: "Close", step: 0 }, { name: "Minimize", step: 1 }, { name: "Zoom", step: 2 }]},
                { name: "Help", step: 4, items: [{ name: "Symphony Help", step: 0 }, { name: "Learn More", step: 1 }, { name: "Troubleshooting", step: 2, items: [{ name: "Show Logs in Explorer", step: 0 }] }, { name: "About Symphony", step: 3 }] }
            ]
        }
    },
    LOG_FILENAME_PREFIX: "logs_symphony_",
    USER_A: { username: process.env.USER_A, password: process.env.PASSWORD, name: process.env.USER_A_NAME },
    USER_B: { username: process.env.USER_B, password: process.env.PASSWORD, name: process.env.USER_B_NAME },
    USER_C: { username: process.env.USER_C, password: process.env.PASSWORD, name: process.env.USER_C_NAME },
    TESTED_HOST: process.env.TESTED_HOST,
    TYPE_ROOM: { private: "PRIVATE", public: "PUBLIC" },
    TIMEOUT_TEST_SUITE: process.env.TIMEOUT_TEST_SUITE,
    TIMEOUT_PAGE_LOAD: process.env.TIMEOUT_PAGE_LOAD,
    TIMEOUT_WAIT_ELEMENT: process.env.TIMEOUT_WAIT_ELEMENT
};
