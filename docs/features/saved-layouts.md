# Intro
Electron Saved Layouts adds the ability for a user to save the App Layout including popped out windows, size of windows, etc. between multiple sessions.

# Platforms Supported
macOS, Windows 10, Windows 7

# Purpose
- allow users to save layout of the Electron app between sessions
- allow users to save the previously opened pop out windows between sessions
- allow users to open the app in a maximised / full screen state upon relaunch

# Details
The Electron app detects the layouts that the user creates with the Electron App by capturing the dimensions of the windows the user has opened and its position on the screen. This data is then stored in the user config file to allow for using it between multiple sessions.

When the user starts the app, if a specific layout has been saved, it is loaded and the Electron App positioned, pop out windows opened and size of the windows adjusted as per the user's preferences for the new session.

# Examples
N/A

# Other Info
N/A