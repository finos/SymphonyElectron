# Intro

SDA supports silent installation on macOS using the standard "installer" command from the terminal

# Purpose

To help admins push installation to their users' systems silently using the "installer" command.

# Details

SDA can be automatically installed from the terminal. The process of customizing the settings that appear in the installer is described below.

- We have 2 distinct files that take user settings and permissions settings.
- These 2 files have to be created as "/tmp/sym_settings.txt" and "/tmp/sym_permissions.txt" respectively for the user settings and permissions settings.
- Both are plain text files containing values of corresponding settings that'll be read by a `post-install script` in the installer.
- So, both have to be set up correctly in order to avoid installation issues.

## sym_settings.txt

The parameters that should be configured in `sym_settings.txt` are listed below. They need to be in the same order as they'll be picked up by the installer in the same order. Do not skip any parameters.

- Pod Url
- Minimize On Close
- Launch On Startup
- Always on Top
- Bring to Front
- Dev Tools Enabled

You can find a sample [sample here](../../installer/mac/sym_settings.txt).

## sym_permissions.txt

The parameters that should be configured in `sym_permissions.txt` are listed below. They need to be in the same order as they'll be picked up by the installer in the same order. Do not skip any parameters.

- Media
- GeoLocation
- Notifications
- Midi Sysex
- Pointer Lock
- Full Screen
- Open External App

You can find a [sample here](../../installer/mac/sym_permissions.txt).


# Installation

To install the package, use the below command with appropriate changes to the path where the app gets installed. It should ideally be in the "/" (root) volume.

```sudo installer -store -pkg /Users/johndoe/Downloads/SDA.pkg -target /```

**Note:** Since we are installing the package in the root volume, you need to run the above command as `sudo`.

# Fully Packaged Script

We've also provisioned a shell script that can be used to cut out all of the above manual processes. You'll just need to edit the script to set appropriate values (for which we've added comments in the script) for the parameters which are self-explanatory.

You can find the [script here](../../installer/mac/installation_script.txt).

Ensure that you change extension of the above script to `.sh` and set executable permission.
