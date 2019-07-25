# Intro
Electron allows us to configure proxy pac file or proxy rules

# Platforms Supported
macOS, Windows 10, Windows 7

# Purpose
To allow admins to configure system proxy via pac files or proxy rules

# Details
We enable proxy on Electron by setting it on the default session before we load the Symphony app.

To set proxy, open the "Symphony.config" file and set the proxy configuration in the field "proxy". Also, ensure that you set the "enabled" field to true if you want to start SDA with a proxy.

# Examples
How to set proxy pac script & rules can be found [here](https://electronjs.org/docs/api/session#sessetproxyconfig-callback)

# Other Info
N/A
