# Intro
The Whitelist URL allows admins to restrict their users with a list of domains and sub-domains they can visit via SDA.

# Platforms Supported
macOS, Windows 10, Windows 7

# Purpose
In order to restrict users from visiting other websites / domains.

# Details
- Using an electron webContents event will-navigate and validating the navigated URL with a list of domains
- If the navigated URL does not match any of the whitelist URL a warning dialog is shown to the user
- By default, the value of the whitelistUrl will be * which will not restrict the user from navigating to any URLs

# Example
## macOS
The global config location by default can be accessed in the following path: /Applications/Symphony.app/Contents/config

## Windows
The global config location by default can be accessed in the following path: C:\Program Files\Symphony\Symphony\config
Updating the whitelistUrl with the list of URLs examples:

[ "abc.com, def.com" ] Will restrict user from navigating to URLs other than abc and def pods
[ "www.symphony.com, app.symphony.com, my.symphony.com" ] In this example users can navigate to the following URL https://xyz.my.symphony.com/ as the first occurrence of sub-domain is matched
[ "www.symphony.com, app.symphony.com, symphony.com" ] In this example navigate any subdomain that is https://acb.symphony.com or https://xyz.symphony.com as hostname is defined

# Other Info
Currently, this feature only applies to the main window and not for pop-outs. Only admins can control this feature