# Intro
This document details the options available in configuring the various parameters in the Electron (SDA) Configuration file.

# Purpose
This allows users to understand what options are available amongst the various configuration parameters in the Symphony configuration file.

# Details
The Symphony configuration file is typically located under:

macOS: ```/Applications⁩/Symphony.app⁩/Contents⁩/config⁩/Symphony.config```
Windows (Single-User): ```C:\Users\john.doe\AppData\Local\Programs\Symphony\Symphony\config\Symphony.config```
Windows (Multi-User - 64 bit): ```C:\Program Files\Symphony\Symphony\config\Symphony.config```
Windows (Multi-User - 32 bit): ```C:\Program Files (x86)\Symphony\Symphony\config\Symphony.config```

And, following set of configuration parameters are available in the Symphony configuration file:

- url: This is the pod url against which you'll need to run SDA against.
    - Eg: https://corporate.symphony.com
- minimizeOnClose: This allows users to minimise SDA upon using the "X" button on macOS and Windows
    - The options available are "true" and "false". More details here → Electron Feature - Minimize on Close
- launchOnStartup: This allows users to launch SDA on their computer startup
    - The options available are "true" and "false". More details here → Electron Feature - Auto Launch on Startup
- alwaysOnTop: This allows users to have SDA sit on top of all the other apps in their computer
    - The options available are "true" and "false". More details here → Electron Feature - Always on Top
- bringToFront: This allows users to get SDA to the foreground when a new notification comes in
    - The options available are "true" and "false". More details here → Electron Feature - Bring to Front / Flash Notification on Taskbar
- whitelistUrl: This allows users to whitelist certain domains to accept insecure certificates from those domains
    - More details [here](./domain-whitelisting.md)
- isCustomTitleBar: This allows users to set a custom title bar (aka hamburger menu) with the SDA
    The options available are "true" and "false". More details here → Electron Feature - Custom Title Bar
- memoryRefresh: This allows users to refresh the SDA in the background based on certain conditions
    The options available are "true" and "false". More details here → Electron Feature - Memory Refresh (Background)
- devToolsEnabled: This allows users to either enable or disable developer tools on the SDA. If it is disabled, a message is shown to the user that the dev tools is disabled.
    The options available are "true" and "false".
- ctWhitelist: This allows users to bypass certificate transparency checks for specific domains and avoid showing warning dialogs
  - More details [here](./ct-whitelisting.md)
- notificationSettings: This allows users on Windows to set the notification position on the screen for the SDA.
position:
    - The options available are:
        - upper-right
        - upper-left
        - lower-right
        - lower-left
    - display: This allows users to set the display number for the notifications. For example, if you have two monitors setup, the values can be "0" or "1"
- customFlags: This allows users to set certain Chromium flags upon starting the SDA
  - authServerWhitelist: This is a list of domains that would be included for auto authentication. More details [here](./ad-sso-authentication.md)
  - authNegotiateDelegateWhitelist: This is a list of domains that would be included for auto authentication. More details [here](./ad-sso-authentication.md)
  - disableGpu: This disables hardware acceleration. The options available are "true" and "false"
  - enableRendererLogs: This enables printouts from renderer. The options available are "true" and "false"
- permissions: These are a set of fine grained controls that admins can use to control certain peripherals of the system being used from the SDA.
  - media: This includes the camera, microphone and audio. If set to "true", all these permissions are allowed to be used by the SDA.
  - geolocation: This includes the user location that is requested by the app. If set to "true", this permission is allowed to be used by the SDA.
  - notifications: This allows users to receive web notifications (Note: this isn't applicable on the Windows platform because we use custom notifications). If set to "false", notifications are not delivered to the user on macOS.
  - midiSysex: This allows users to control the MIDI event.
  - pointerLock: This allows users to control the pointer lock against the SDA.
  - fullscreen: This allows users to either allow full screen or not.
  - openExternal: This allows users to control if the SDA can open an external app. If set to "false", SDA won't be able to open external apps. For example, opening a link from within the SDA in a browser tab.
  - autoLaunchPath: This allows administrators to set a custom launch path for an app that can bootstrap the SDA. Typically used by administrators who have their own bootstrapped to open other apps like the SDA.
        - Example can be C:\Program Files\My Bootstrapper\start.exe
  - chromeFlags: This allows users to set Chromium flags.
        - Example can be "--enable-logging --log-file=C:\\Users\\YOUR_USER\\Desktop\\chrome_debug.log"

