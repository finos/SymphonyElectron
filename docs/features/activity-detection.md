# Intro
The SDA (electron desktop wrapper) supports detecting user activity status and publishing the same across the platform - for ex., whether the user is in an active or idle state.

# Platforms Supported
macOS, Windows 10, Windows 7

# Purpose
We would want to keep the activity status of a user updated across the platform for all users.

# Details
The SDA App makes use of a package to detect user idle status. This package is compatible for multiple operating systems - Windows and macOS.

The user idle status is determined by identifying key strokes or mouse movement for a set period of time. For ex., if the user hasn't moved the mouse or typed anything on the keyboard for over 4 minutes, an event is generated and the status of that sent across to Client App from where other users across the platform on different devices are updated about the status.

We use the [Electron Power Monitor](https://electronjs.org/docs/api/power-monitor#powermonitor) to query the idle state and update it.

# Example
N/A

# Other Info
N/A
