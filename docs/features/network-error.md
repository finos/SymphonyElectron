# Intro
The SDA displays a network error page when there are network failures.

# Platforms Supported
macOS, Windows 10

# Purpose
To create awareness for users to try and reload Symphony and also to understand the network error in case they need to engage the support team.

# Details
This error info page will be displayed in the SDA and can be any of the following reasons

- Network offline
- Proxy connection failed,
- Endpoint not access able
- Etc..

The list of all the error codes can be found [here](https://cs.chromium.org/chromium/src/net/base/net_error_list.h)

We also show a **Retry** button which upon a user clicking, Symphony is reloaded with two scenarios handled:
- If a user has already logged in, Symphony is reloaded and a user doesn't need to login
- If a user hasn't logged in yet or is on the verge of it, Symphony is reloaded and user is taken back to the login page

# Example
N/A
