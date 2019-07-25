# Intro
The SDA displays a network error page when there is some network related issue Including the error code. which makes it easier for users to understand what's the actual problem is.

# Platforms Supported
macOS, Windows 10, Windows 7

# Purpose
To let the users know the exact error the page stopped loading, instead of just displaying a blank screen.

# Details
This error info page will be displayed in the main electron app and can be any of the following reasons (Network offline, Proxy connection failed, Endpoint not access able, etc..)

The error info page will be included with retry button which on clicking the SDA will be reloaded with the global config POD URL ex: "https://my.symphony.com"

The list of all the error codes can be found [here](https://cs.chromium.org/chromium/src/net/base/net_error_list.h)

# Example
N/A
