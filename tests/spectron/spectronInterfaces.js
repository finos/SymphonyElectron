module.exports= {    
    // Title bar
    TITLE_BAR: "#title-bar",
    MAXIMIZE_BTN: "#title-bar-maximize-button",
    MINIMIZE_BTN: "#title-bar-minimize-button",
    CLOSE_BUTTON: "button#title-bar-close-button",
    MAIN_MENU_ITEM: "#hamburger-menu-button",
    SYM_LOGO: "#logo",

    //Sign In
    SIGN_IN_BUTTON: "//button[@name='signin-submit']",
    SIGN_IN_EMAIL: "//input[@name='signin-email']",
    SIGN_IN_PASSWORD: "//input[@name='signin-password']",
    NAV_PROFILE: "//div[@id='nav-profile']",
    PLUS_BTN: "//div[@class='nav-profile__plus-btn-icon']",
    IM_TAB: "//div[contains(@class,'modal-box modal-box--nfs')]//li[contains(text(),'Direct Chat')]",
    CHATROOM_TAB: "//div[contains(@class, 'modal-box modal-box--nfs')]//li[contains(text(),'Chat Room')]",
    CREATE_IM: "//form[@class='create-im']",
    CREATE_BUTTON: "//button[text()='Create']",
    ADD_PARTICIPANT_TEXT: "//div[@id='react-modal']//input[contains(@class,'react-autosuggest__input')]",
    USERS_SUGGESTION_LIST: "//li[@id='react-autowhatever-1-section-0-item-0']",
    CHATROOM_NAME_TEXT: "//form[@class='create-chatroom']//input[@name='name']",
    CHATROOM_DESCR_TEXT: "//form[@class='create-chatroom']//input[@name='description']",
    PRIVATE_ROOM_RADIO_BTN: "//form[@class='create-chatroom']//input[@value='PRIVATE']",
    PUBLIC_ROOM_RADIO_BTN: "//form[@class='create-chatroom']//input[@value='PUBLIC']",
    CREATE_IM_DONE_BTN: "//button[contains(@class,tempo-btn--good) and text()='Create']",
    START_CHAT: "//*[contains(@class, 'sym-menu-tooltip__option')]/*[text()='Start a Chat']",
    LEFT_NAV_SINGLE_ITEM: "//div[contains(@class, 'navigation-item-title')][.//span[@class='navigation-item-name' and normalize-space()='$$']]",
    CHAT_INPUT_TYPING: "//div[contains(@class,'public-DraftEditor-content')]",
    SETTTING_BUTTON: "//div[@class='toolbar-settings-text-container']",
    PERSIS_NOTIFICATION_INPUT_ROOM: "//div[@class='alerts-settings__notification-category']//h5[text()='Rooms:']/..//input[@class='persistent-notification']",
    PERSIS_NOTIFICATION_INPUT_IM: "//div[@class='alerts-settings__notification-category']//h5[text()='IMs:']/..//input[@class='persistent-notification']",
    PERSIS_NOTIFICATION_INPUT_SIGNAL: "//div[@class='alerts-settings__notification-category']//h5[text()='Signals:']/..//input[@class='persistent-notification']",
    ALERT_TAB: "//*[contains(@class,'tempo-tabs__tab tabs-tab') and @data-tab='alerts']",
    ALERT_OPTION: "//span[@class='sym-menu-tooltip__option-label' and contains(.,'Alerts')]",
    NAV_ALIAS: "//div[@class='nav-profile__alias']",
    SIGNAL_HEADER : "//span[@class='navigation-category-name' and contains(.,'Signals')]",
    WARNING_CLOSE_ICON : "//div[@id='sysMsg']//span[@class='close-icon']",
    SCROLL_TAB_ACTIVE : "//div[@class='active-tab-container']",

    //Alert Settings
    MUTE_POPUP_ALERTS_CKB: ".field.field-notifications-on input",

    //Toast Message
    TOAST_MESSAGE_CONTENT: "#message",
};
