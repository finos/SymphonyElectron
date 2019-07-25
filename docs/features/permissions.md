# Intro
Electron allows us to configure permissions to access user devices / features which provides an admins / users greater control on what they want to share with the app.

# Platforms Supported
macOS, Windows 10, Windows 7

# Purpose
To restrict the app from accessing certain devices / features. This can be controlled by the users / admins.

# Details
The following features can be controlled via setting permissions during installation by an admin. It can also be controlled via the Symphony.config file once the app is installed.

- Media: Access to Camera, Audio, Microphone (all bundled under the same permission)
- Geo Location: Electron accessing user location (currently not asking for permission from any module in Symphony Electron)
- Notifications: Native Chrome Notifications (this is only for macOS, doesn't work for Windows as we use custom notifications for Mac)
- MIDI Sysex: Related to provide access to external devices connected (for instance, a guitar and so on)
- Pointer Lock: Locking a pointer (currently not asking for permission from any module in Symphony Electron)
- Full Screen: Disabling full screen
- Open External App: Opening an external app (for instance, a Finder Window in macOS or Explorer in Windows in case we download a file inside Electron)
- Note that all the above corresponds with the permissions that Chrome asks a user typically. For instance, full screen in the wrapper is still possible because Window management on Electron is not controlled by Chrome and instead by Electron.

# Examples
For instance, you can turn off media permissions in which case a user will not be allowed to use their audio / video devices during a meeting. This can be done by setting the "media" config to false in the Symphony.config file.

# Other Info
- At this point, there is no way to have fine grained permissions for camera, audio and microphone separated
- Full screen permission on Electron doesn't work intuitively because the full screen permission is only for within the renderer process (i.e. where the web app loads). For instance, if there is a button in the web app to go full screen and if the admin has disabled "Full Screen", it works only in that case. In other cases, where in we click on the full screen option in the main menu, the app still goes full screen.
- GeoLocation, MIDI Sysex, Pointer Lock and Open External App have not been tested.
- Disabling Notifications only disables it on Mac. On Windows, we are using custom notifications, so, there is no effect there.