# Intro
Electron allows us to configure domains to authenticate the app similar to Chrome using SSO / AD.

# Platforms Supported
macOS, Windows 10, Windows 7

# Purpose
To allow users to automatically login to the Symphony app using AD / SSO authentication protocols.

# Details
In the current implementation, we support this feature by setting flags to true in the Chromium container. The following flags are set:

auth-server-whitelist
auth-negotiate-delegate-whitelist
To make this work, you need to set the "authServerWhitelist" and "authNegotiateDelegateWhitelist" to the necessary SSO url under the "customFlags" configuration in the "Symphony.config" file.

# Examples
If your app is installed in C:\Program Files\Symphony\Symphony, you need to edit the file "Symphony.config" under the "config" sub-directory and set "authServerWhitelist" and "authNegotiateDelegateWhitelist" to "https://example.com/sso".

# Other Info
We also set the "NTLMCredentialsForDomains" in the default session of the electron app as a fallback.
