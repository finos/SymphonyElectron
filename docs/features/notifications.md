# Intro
The Symphony Electron app supports toast notifications.

# Platforms Supported
macOS, Windows 7, Windows 10

# Purpose
To provide a rich desktop user experience, toast notifications are supported on all the platforms.

# Details
We support the following set of notifications along with badge / taskbar count on Electron.

- IM message
- MIM message
- Room message
- Mentions
- Wall Posts
- Signals

## Electron native notification (MacOS)
macOS notifications are native chrome notifications which appear like any other desktop app notifications on a Mac.
Emojis are supported in the toast.

- Inline reply

![notifications_mac.png](assets/notifications_mac.png)
![notifications_mac_2.png](assets/notifications_mac_2.png)

## HTML Notification (Window, MacOS, Linux)
Notifications are custom built to support the following use cases:
- Custom Color
- Position in the screen
- Custom screen (in case of multiple displays connected)
- Flash a notification
- Inline reply
- Quick reactions (👍)
- Emojis

![Notification_screen.png](assets/Notification_screen.png)
![New Custom Notification](assets/custom_notifications.gif)

# Example
N/A

# Other Info
N/A
