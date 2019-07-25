# Intro
Electron supports silent installation on macOS using the standard "installer" command from the terminal

# Platforms Supported
macOS

# Purpose
To help admins push installation to their users' systems silently using "installer" command.

# Details
The Symphony Desktop Application can be automatically installed from the terminal. The process of customising the settings that appear in the installer is described below.

We have 2 distinct files that take user settings and permissions settings. These 2 files have to be created as "/tmp/sym_settings.txt" and "/tmp/sym_permissions.txt" respectively for the user settings and permissions settings.

Both are plain text files containing values of corresponding settings that'll be read by a post-install script in the installer. So, both have to be set up cleanly in order to avoid installation issues.

sym_settings.txt
The parameters that should be configured in "sym_settings.txt" are listed below. They need to be in the same order as they'll be picked up by the installer in the same order. Do not skip any parameters.
```
Pod Url
Minimize On Close
Launch On Startup
Always on Top
Bring to Front
Dev Tools Enabled
```

Below is a sample "sym_settings.txt" file.
```
https://corporate.symphony.com/login/sso/initsso
true
true
false
false
true
```

sym_permissions.txt
The parameters that should be configured in "sym_permissions.txt" are listed below. They need to be in the same order as they'll be picked up by the installer in the same order. Do not skip any parameters.

```
Media
GeoLocation
Notifications
Midi Sysex
Pointer Lock
Full Screen
Open External App
```

Attached below is a sample "sym_permissions.txt" file
```
true
true
true
true
true
true
true
```

## Installation Command
To install the package, use the below command with appropriate changes to the path where the app gets installed. It should ideally be in the "/" (root) volume.

```sudo installer -store -pkg /Users/johndoe/Downloads/SDA.pkg -target /```

Note: Since we are installing the package in the root volume, you need to run the above command as "sudo".

## Fully Packaged Script
We've also provisioned a shell script that can be used to cut out all of the above manual processes. You'll just need to edit the script to set appropriate values (for which we've added comments in the script) for the parameters which are self-explanatory. Attached below is the script.

```
#!/usr/bin/env bash

## Set the path where the package file exists
package_path=/Users/johndoe/Downloads/SDA.pkg

## DO NOT CHANGE THIS
settings_temp_file="/tmp/sym_settings.txt"

## Set the POD URL and other user related settings.
## Note, all the user related settings should be either "true" or "false"
pod_url="https://corporate.symphony.com/login/sso/initsso"
minimize_on_close="true"
launch_on_startup="true"
always_on_top="false"
bring_to_front="false"
dev_tools_enabled="true"

## DO NOT CHANGE THIS
sudo echo ${pod_url} > ${settings_temp_file}
sudo echo ${minimize_on_close} >> ${settings_temp_file}
sudo echo ${launch_on_startup} >> ${settings_temp_file}
sudo echo ${always_on_top} >> ${settings_temp_file}
sudo echo ${bring_to_front} >> ${settings_temp_file}
sudo echo ${dev_tools_enabled} >> ${settings_temp_file}

## DO NOT CHANGE THIS
permissions_temp_file="/tmp/sym_permissions.txt"

## Set the permissions. By default, it should be true for all unless you know what you are doing
media="true"
geo_location="true"
notifications="true"
midi_sysex="true"
pointer_lock="true"
full_screen="true"
open_external_app="true"

## DO NOT CHANGE THIS
sudo echo ${media} > ${permissions_temp_file}
sudo echo ${geo_location} >> ${permissions_temp_file}
sudo echo ${notifications} >> ${permissions_temp_file}
sudo echo ${midi_sysex} >> ${permissions_temp_file}
sudo echo ${pointer_lock} >> ${permissions_temp_file}
sudo echo ${full_screen} >> ${permissions_temp_file}
sudo echo ${open_external_app} >> ${permissions_temp_file}

sudo installer -store -pkg ${package_path} -target /

rm -rf ${settings_temp_file}
rm -rf ${permissions_temp_file}

```

# Other Info
N/A
