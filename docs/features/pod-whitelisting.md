# Intro
Allow admins to whitelist pod urls

# Platforms Supported
macOS, Windows 10, Windows 7

# Purpose
For admins to whitelist pod urls allowed to be passed via command line 

# Details
Any url passed via command line needs to be validated. To support this, we add a "podWhitelist" parameter in the config file that allows admins to configure what pod urls can be passed via command line. And, only those URLs will be supported to be loaded via command line

To make this work, you need to add urls under the "podWhitelist" parameter in the "Symphony.config" file.

If you still need to allow passing any urls, just leave the "podWhitelist" parameter blank in the "Symphony.config" file.

# Examples
- If your app is installed in C:\Program Files\Symphony\Symphony, you need to edit the file "Symphony.config" under the "config" sub-directory and set domains in the "podWhitelist" parameter to ["https://demo.symphony.com"]. Note that you need to pass the exact url from command line.

- If you want to allow any url, set the "podWhitelist" parameter to [] which is the default.

# Other Info
N/A
