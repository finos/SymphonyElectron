# Intro
To launch the SDA app when the operating system is started.

# Platforms Supported
macOS, Windows 7, Windows 10

# Purpose
To launch the SDA app when the operating system is started.

# Details
- On Windows, use the "Auto Launch on Startup" option under the "Window" menu in the app to set "Auto Launch on Startup" to true in SDA.
- On macOS, use the "Auto Launch on Startup" option under the "Window" menu in the app to set "Auto Launch on Startup" to true in SDA.

# Example
N/A

# Other Info
We make use of the Electron API [Set Login Item Settings](https://github.com/electron/electron/blob/master/docs/api/app.md#appsetloginitemsettingssettings-macos-windows)
- On Windows, a registry entry is created.
- On macOS, a plist file is created under the User account.