# Intro
Electron allows us to whitelist domains for certificate transparency checking.

# Platforms Supported
macOS, Windows 10, Windows 7

# Purpose
To allow admins to bypass certificate transparency checks for specific domains and avoid showing warning dialogs.

# Details
In the current implementation, we support this feature by creating a handler in a window session in Electron. The handler then compares the whitelist with the domain to be opened and chooses to skip certificate transparency if the domain is in the whitelist.

To make this work, you need to add domains under the "ctWhitelist" configuration in the "Symphony.config" file.

# Examples
If your app is installed in C:\Program Files\Symphony\Symphony, you need to edit the file "Symphony.config" under the "config" sub-directory and set domains in the "ctWhitelist" parameter to ["example.com", "abc.com"].

# Other Info
N/A
