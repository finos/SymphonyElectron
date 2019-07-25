# Intro
Electron supports silent installation on Windows using the standard "msiexec" command from the command prompt / powershell

# Platforms Supported
Windows 7, Windows 10 (64-bit and 32-bit)

# Purpose
To help admins push installation to their users' systems silently using msiexec command.

# Details
The Symphony Desktop Client can be automatically installed from the command line. The supported but optional parameters appear below. If you do not supply these parameters you will get an “only for me” install that points to the public pod at https://my.symphony.com.

Important Note - that you must uninstall the previous version before installing the latest version as the unattended installation

- POD_URL (required for private pods) – The URL to your private pod such as https://abccorp.symphony.com. If you are using SSO you can bypass the blue SSO sign-in button by entering https://abccorp.symphony.com/login/sso/initsso or by using a “IdP initiated SSO” link. See your SSO administrator for the latter.
- APPDIR (optional) - Change the install folder to one different from the default folder.
- ALLUSERS (optional) – Do not include for an “Everybody” installation as that is the default. Note that “Everybody” installations require admin privileges. For an “Only for me” install set ALLUSERS=””

# Examples
### Remove current version
```msiexec /x "current_version.msi" /q /l* symphony_uninstall.log```

### Install to all users for a specific pod
```msiexec /i "new_version.msi" /q POD_URL="https://example.symphony.com" /l* symphony_install.log```

### Install to all users for a specific pod with custom config values
```msiexec /i "new_version.msi" /q POD_URL="https://example.symphony.com" ALWAYS_ON_TOP="true" AUTO_LAUNCH="false" /l* symphony_install.log```

### Install to my user only for a specific pod
```msiexec /i "new_version.msi" /q ALLUSERS="" POD_URL="https://example.symphony.com" /l* symphony_install.log```

Some handy troubleshooting tips.
If the install doesn’t work or quickly exits, then replace the “/q” with “/qf” to see the human interface during the install. Sometimes a popup can interfere with the auto-installation.
Use “/x“ instead of “/i“ to uninstall
Add “/l* symphony_install.log” to get debug information from the install written to a file on disk
#### Config values that can be altered as listed below:
- POD_URL (String)
- ALWAYS_ON_TOP (Boolean)
- AUTO_LAUNCH (Boolean)
- MINIMIZE_ON_CLOSE (Boolean)
- BRING_TO_FRONT (Boolean)
- MEDIA (Boolean)
- LOCATION (Boolean)
- NOTIFICATIONS (Boolean)
- MIDI_SYSEX (Boolean)
- FULL_SCREEN (Boolean)
- POINTER_LOCK (Boolean)
- OPEN_EXTERNAL (Boolean)
- DEV_TOOLS_ENABLED (Boolean)
- AUTO_LAUNCH_PATH (String)
You'll need to quote the Boolean values when passing from the command line.

#### Check-boxes (in the installer UI) that can be altered are listed below:
- ALWAYS_ON_TOP_CB (Boolean)
- BRING_TO_FRONT_CB (Boolean)
- MINIMIZE_ON_CLOSE_CB (Boolean)
- AUTO_START_CB (Boolean)
- CUSTOM_TITLE_BAR_CB (Boolean)
- DEV_TOOLS_CB (Boolean)
- MEDIA_CB (Boolean)
- POINTER_LOCK_CB (Boolean)
- LOCATION_CB (Boolean)
- FULL_SCREEN_CB (Boolean)
- MIDI_SYSEX_CB (Boolean)
- OPEN_EXTERNAL_CB (Boolean)
To uncheck an already checked checkbox, the argument should be blank quotes, for example:
```Symphony.msi MINIMIZE_ON_CLOSE_CB=""```

To check an unchecked checkbox, you can pass any value to the property, for example:
```Symphony.msi ALWAYS_ON_TOP="true"```

### Custom Auto Launch Path

The auto launch path can be obtained from holding down the shift key and right clicking on any of the application and select Copy as path

```msiexec /i "new_version.msi" AUTO_LAUNCH_PATH="C:\Program Files\internet explorer\iexplore.exe"```


# Other Info
When msiexec is used, you can generate logs using the "/l* abc.log" option as part of the command prompt. This is useful in case of troubleshooting failed installations.
