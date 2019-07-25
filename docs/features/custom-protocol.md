# Intro
The electron desktop wrapper supports handling custom protocol such as "symphony://?streamId=123&streamType=im" when such a URI is opened from a browser on Windows or Mac systems.

Currently, it supports 3 contexts:

- Start a new chat with a bunch of users.
- IM (Opens an Instant Message / Direct Message)
- Chatroom (Opens a chat room)
- User Profile (Opens a user's profile)
- Show user settings screen

# Platforms Supported
macOS, Windows 10, Windows 7

# Purpose
Customers want the ability to start the Symphony client from a webpage / an external app (for example outlook).

# Details
SDA supports protocol handler functionality out of the box. When the app is installed and opened for the first time, electron registers the Symphony client as the the app to handle URI scheme starting with "symphony://". And, henceforth, any URIs with the scheme "symphony://" will be redirected to the Symphony app which will handle and open a stream / user profile based on the context.

The following use cases are handled by Electron and the appropriate action is taken upon opening the URL:

- The app is open & is already signed in
- The app is not open (In this case, the OS launches the app and Electron takes care of taking appropriate action once the user signs in)
- The app is open but the user is not signed in (In this case, Electron takes care of taking appropriate action once the user signs in)

Note: In all the above cases, the action taken is subject to the URL being validated by the web app. For instance, if a streamID / userID is incorrect depending on the context, no action is taken by the web app.

# Examples
N/A

# Other Info
- Currently, electron emits an event 'open-url' and a callback function is invoked through which we'll need to take further action.
- The event 'open-url' is only emitted on macOS currently and a [pull request](https://github.com/electron/electron/pull/8052) for doing the same on Windows is open currently →
- On Windows, the way it is handled currently is by listening to the events 'ready' (for when the app is not opened yet) and app.makeSingleInstance (for when the app is already open) and processing the uri from there.
