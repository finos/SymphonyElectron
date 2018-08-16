module.exports= {    
    // Title bar
    TITLE_BAR: "#title-bar",
    MAXIMIZE_BTN: "#title-bar-maximize-button", 
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
    SIGNAL_OPTION: "//div[@class='sym-menu-tooltip__option']/*[text()='Create a Signal']", 
    LEFT_NAV_SINGLE_ITEM: "//div[contains(@class, 'navigation-item-title')]//span[@class='navigation-item-name' and normalize-space()='$$']",
    CHAT_INPUT_TYPING: "//div[contains(@class,'public-DraftEditor-content')]",
    SETTTING_BUTTON: "//div[@class='toolbar-settings-text-container']",
    PERSIS_NOTIFICATION_INPUT_ROOM: "//div[@class='alerts-settings__notification-category']//h5[text()='Rooms:']/..//input[@class='persistent-notification']",
    PERSIS_NOTIFICATION_INPUT_IM: "//div[@class='alerts-settings__notification-category']//h5[text()='IMs:']/..//input[@class='persistent-notification']",
    PERSIS_NOTIFICATION_INPUT_SIGNAL: "//div[@class='alerts-settings__notification-category']//h5[text()='Signals:']/..//input[@class='persistent-notification']",
    ALERT_TAB: "//*[contains(@class,'tempo-tabs__tab tabs-tab') and @data-tab='alerts']",
    GENERAL_TAB: "//*[contains(@class,'tempo-tabs__tab tabs-tab') and @data-tab='general']",
    ALERT_OPTION: "//span[@class='sym-menu-tooltip__option-label' and contains(.,'Alerts')]",
    GENERAL_OPTION: "//span[@class='sym-menu-tooltip__option-label' and contains(.,'General')]",
    NAV_ALIAS: "//div[@class='nav-profile__alias']",
    SIGNAL_HEADER: "//span[@class='navigation-category-name' and contains(.,'Signals')]",
    WARNING_CLOSE_ICON: "//div[@id='sysMsg']//span[@class='close-icon']",
    SCROLL_TAB_ACTIVE: "//div[@class='active-tab-container']",
    SIGNAL_NAME: "//input[@class='react-signal__name']",
    HASHTAG_NAME: "//div[@class='react-signal__rule-name']//input",
    LAST_RULE_ROW: "//div[@class='react-signal__rules'][last()]",
    ENTER_KEYWORD_IN_LAST_INPUT: "//input",
    HEADER_MODULE: "//header[contains(@class,'module-header gs-draggable')]",
    MENTION_USER_SUGGESTION: "//span[@class='draftJs__suggestionsEntryText' and text()='$$']",
    SUGGESTED_ENTITY_DROPDOWN: "//span[@class='draftJs__suggestionsEntryText']",
    CONFIRM_CREATE_ROOM_BUTTON: "//div[@class='modal-box__footer-buttons']//button[text()='Yes']",
    MODULE_ON_GRID: "#simple_grid",
    SPINNER: ".spinner",
    SIGNOUT: ".sign-out",
    SIGNOUT_MODAL_BUTTON: "//div[@class='modal-content-buttons buttons']//button[contains(text(), 'Sign Out')]",

    //Popin Popout
    POPOUT_BUTTON: ".enhanced-pop-out",
    POPOUT_INBOX_BUTTON: ".add-margin.popout",
    POPIN_BUTTON: "//*[contains(@class, 'enhanced-pop-in') or contains(@class, 'add-margin popin')]",
    PIN_CHAT_MOD: ".chat-module .pin-view",

    //Alert Settings
    MUTE_POPUP_ALERTS_CKB: ".field.field-notifications-on input",
    ALERT_POSITION: ".field-configure-desktop-alerts button",
    
    //Toast Message
    TOAST_MESSAGE_CONTENT: "#message",

    //Inbox
    INBOX_BUTTON: ".toolbar-btn-inbox",
    INBOX_HEADER: ".inbox-header",
    //ACP
    ACP_LINK: "//button[@class='show-admin-link left-action button-reset']",
    IMG_ADMIN_LOGO: "//img[@src='./img/nav_admin_logo.png']",
    //LOG OUT
    LOGOUT_DROPDOWN: "//div[@class='header-account']",
    ADMIN_NAME: "//*[@class='account-name']",
    ADMIN_LOG_OUT: "//*[text()[contains(.,'Log out')]]",
    ADMIN_PAGE_TITLE: "//h2[@class='page-title']",
    //INPUT SEARCH
    INPUT_SEARCH_ENTITIES: "//input[@id='search-entities']"
};

