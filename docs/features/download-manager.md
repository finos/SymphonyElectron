# Intro
File Downloader is responsible for downloading a file from any IM/Chat Room directly into the user's downloads folder on Windows or Mac.

# Platforms Supported
macOS, Windows 10, Windows 7

# Purpose
- replace existing "Save as" dialog with more refined file download experience.
- provide option to open file in OS default app directly from wrapper.
- provide option to show file in finder/explorer.
- allow downloading multiple files simultaneously
- give user indication of the file being downloaded, its progress, etc. ala how Google Chrome does.

# Details
## SDA Capabilities
Electron provides built-in capabilities to manage file downloads.
See documentation [here](https://github.com/electron/electron/blob/master/docs/api/download-item.md)

SDA provides options to do the following:

- Show determinate progress of download
- Pause/Resume downloads
- Cancel downloads
- Electron Implementation

We make use of a package called electron-dl to simplify the implementation.

The download manager makes use of a download bar built using web technologies. The download bar shows items being downloaded along with progress and other details associated with the download.

The download bar is made available on the client app and is injected with download items from Electron.

# Examples
N/A

# Other Info
N/A

# Related Links
[Electron Download Item API](https://github.com/electron/electron/blob/master/docs/api/download-item.md)

[Electron DL](https://github.com/sindresorhus/electron-dl)