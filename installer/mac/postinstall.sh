#!/bin/sh

## Create file path variables ##
settingsFilePath='/tmp/sym_settings.txt'
permissionsFilePath='/tmp/sym_permissions.txt'
plistFileName="com.symphony.electron-desktop.plist"
userName=$(stat -f%Su /dev/console)
plistFilePath="/Users/$userName/Library/Preferences/$plistFileName"

echo "$plistFilePath"
echo "$userName"
echo "$EUID"

# Create a plist file it not exist
if [ ! -f "$plistFilePath" ]
then
  # Add a default entry
  echo "Plist file does not exists creating new file"
  if [ "$EUID" -ne 0 ]; then
    defaults write "$plistFilePath" ApplicationName Symphony
  else
    sudo -u "$userName" defaults write "$plistFilePath" ApplicationName Symphony
  fi
fi

#Set default value
if [ "$EUID" -ne 0 ]; then
  defaults write "$plistFilePath" url -string "https://my.symphony.com"
  defaults write "$plistFilePath" autoUpdateUrl -string ""
  defaults write "$plistFilePath" autoUpdateChannel -string "latest"
  defaults write "$plistFilePath" isAutoUpdateEnabled -bool true
  defaults write "$plistFilePath" isPodUrlEditable -bool true
  defaults write "$plistFilePath" forceAutoUpdate -bool false
  defaults write "$plistFilePath" autoUpdateCheckInterval -string "30"
  defaults write "$plistFilePath" enableBrowserLogin -bool false
  defaults write "$plistFilePath" browserLoginAutoConnect -bool false
  defaults write "$plistFilePath" overrideUserAgent -bool false
  defaults write "$plistFilePath" minimizeOnClose -string "ENABLED"
  defaults write "$plistFilePath" launchOnStartup -string "ENABLED"
  defaults write "$plistFilePath" alwaysOnTop -string "DISABLED"
  defaults write "$plistFilePath" bringToFront -string "DISABLED"
  defaults write "$plistFilePath" whitelistUrl -string "*"
  defaults write "$plistFilePath" isCustomTitleBar -string "ENABLED"
  defaults write "$plistFilePath" memoryRefresh -string "ENABLED"
  defaults write "$plistFilePath" memoryThreshold -string "800"
  defaults write "$plistFilePath" devToolsEnabled -bool true
  defaults write "$plistFilePath" contextIsolation -bool true
  defaults write "$plistFilePath" contextOriginUrl -string ""
  defaults write "$plistFilePath" disableGpu -bool false
  defaults write "$plistFilePath" enableRendererLogs -bool false
  defaults write "$plistFilePath" ctWhitelist -array
  defaults write "$plistFilePath" podWhitelist -array
  defaults write "$plistFilePath" position -string "upper-right"
  defaults write "$plistFilePath" display -string ""
  defaults write "$plistFilePath" authServerWhitelist -string ""
  defaults write "$plistFilePath" authNegotiateDelegateWhitelist -string ""
  defaults write "$plistFilePath" disableThrottling -string "DISABLED"
  defaults write "$plistFilePath" media -bool true
  defaults write "$plistFilePath" geolocation -bool true
  defaults write "$plistFilePath" notifications -bool true
  defaults write "$plistFilePath" midiSysex -bool true
  defaults write "$plistFilePath" pointerLock -bool true
  defaults write "$plistFilePath" fullscreen -bool true
  defaults write "$plistFilePath" openExternal -bool true
  defaults write "$plistFilePath" autoLaunchPath -string ""
  defaults write "$plistFilePath" userDataPath -string ""
  defaults write "$plistFilePath" chromeFlags -string ""
  defaults write "$plistFilePath" betaAutoUpdateChannelEnabled -bool true
else
  sudo -u "$userName" defaults write "$plistFilePath" url -string "https://my.symphony.com"
  sudo -u "$userName" defaults write "$plistFilePath" autoUpdateUrl -string ""
  sudo -u "$userName" defaults write "$plistFilePath" autoUpdateChannel -string "latest"
  sudo -u "$userName" defaults write "$plistFilePath" isAutoUpdateEnabled -bool true
  sudo -u "$userName" defaults write "$plistFilePath" isPodUrlEditable -bool true
  sudo -u "$userName" defaults write "$plistFilePath" forceAutoUpdate -bool false
  sudo -u "$userName" defaults write "$plistFilePath" autoUpdateCheckInterval -string "30"
  sudo -u "$userName" defaults write "$plistFilePath" enableBrowserLogin -bool false
  sudo -u "$userName" defaults write "$plistFilePath" browserLoginAutoConnect -bool false
  sudo -u "$userName" defaults write "$plistFilePath" overrideUserAgent -bool false
  sudo -u "$userName" defaults write "$plistFilePath" minimizeOnClose -string "ENABLED"
  sudo -u "$userName" defaults write "$plistFilePath" launchOnStartup -string "ENABLED"
  sudo -u "$userName" defaults write "$plistFilePath" alwaysOnTop -string "DISABLED"
  sudo -u "$userName" defaults write "$plistFilePath" bringToFront -string "DISABLED"
  sudo -u "$userName" defaults write "$plistFilePath" whitelistUrl -string "*"
  sudo -u "$userName" defaults write "$plistFilePath" isCustomTitleBar -string "ENABLED"
  sudo -u "$userName" defaults write "$plistFilePath" memoryRefresh -string "ENABLED"
  sudo -u "$userName" defaults write "$plistFilePath" memoryThreshold -string "800"
  sudo -u "$userName" defaults write "$plistFilePath" devToolsEnabled -bool true
  sudo -u "$userName" defaults write "$plistFilePath" contextIsolation -bool true
  sudo -u "$userName" defaults write "$plistFilePath" contextOriginUrl -string ""
  sudo -u "$userName" defaults write "$plistFilePath" disableGpu -bool false
  sudo -u "$userName" defaults write "$plistFilePath" enableRendererLogs -bool false
  sudo -u "$userName" defaults write "$plistFilePath" ctWhitelist -array
  sudo -u "$userName" defaults write "$plistFilePath" podWhitelist -array
  sudo -u "$userName" defaults write "$plistFilePath" position -string "upper-right"
  sudo -u "$userName" defaults write "$plistFilePath" display -string ""
  sudo -u "$userName" defaults write "$plistFilePath" authServerWhitelist -string ""
  sudo -u "$userName" defaults write "$plistFilePath" authNegotiateDelegateWhitelist -string ""
  sudo -u "$userName" defaults write "$plistFilePath" disableThrottling -string "DISABLED"
  sudo -u "$userName" defaults write "$plistFilePath" media -bool true
  sudo -u "$userName" defaults write "$plistFilePath" geolocation -bool true
  sudo -u "$userName" defaults write "$plistFilePath" notifications -bool true
  sudo -u "$userName" defaults write "$plistFilePath" midiSysex -bool true
  sudo -u "$userName" defaults write "$plistFilePath" pointerLock -bool true
  sudo -u "$userName" defaults write "$plistFilePath" fullscreen -bool true
  sudo -u "$userName" defaults write "$plistFilePath" openExternal -bool true
  sudo -u "$userName" defaults write "$plistFilePath" autoLaunchPath -string ""
  sudo -u "$userName" defaults write "$plistFilePath" userDataPath -string ""
  sudo -u "$userName" defaults write "$plistFilePath" chromeFlags -string ""
  sudo -u "$userName" defaults write "$plistFilePath" betaAutoUpdateChannelEnabled -bool true
fi

## Get Symphony Settings from the temp file ##
pod_url=$(sed -n '1p' ${settingsFilePath});
context_origin_url=$(sed -n '2p' ${settingsFilePath});
minimize_on_close=$(sed -n '3p' ${settingsFilePath});
launch_on_startup=$(sed -n '4p' ${settingsFilePath});
always_on_top=$(sed -n '5p' ${settingsFilePath});
bring_to_front=$(sed -n '6p' ${settingsFilePath});
dev_tools_enabled=$(sed -n '7p' ${settingsFilePath});
enable_browser_login=$(sed -n '8p' ${settingsFilePath});
browser_login_autoconnect=$(sed -n '9p' ${settingsFilePath});

## If any of the above values turn out to be empty, set default values ##
if [ "$pod_url" = "" ]; then pod_url="https://my.symphony.com"; fi
if [ "$context_origin_url" = "" ]; then context_origin_url=""; fi
if [ "$minimize_on_close" = "" ] || [ "$minimize_on_close" = 'true' ]; then minimize_on_close='ENABLED'; else minimize_on_close='DISABLED'; fi
if [ "$launch_on_startup" = "" ] || [ "$launch_on_startup" = 'true' ]; then launch_on_startup='ENABLED'; else launch_on_startup='DISABLED'; fi
if [ "$always_on_top" = "" ] || [ "$always_on_top" = 'false' ]; then always_on_top='DISABLED'; else always_on_top='ENABLED'; fi
if [ "$bring_to_front" = "" ] || [ "$bring_to_front" = 'false' ]; then bring_to_front='DISABLED'; else bring_to_front='ENABLED'; fi
if [ "$dev_tools_enabled" = "" ]; then dev_tools_enabled=true; fi
if [ "$enable_browser_login" = "" ]; then enable_browser_login=false; fi
if [ "$browser_login_autoconnect" = "" ]; then browser_login_autoconnect=false; fi

pod_url_escaped=$(sed 's#[&/\]#\\&#g' <<<"$pod_url")
context_origin_url_escaped=$(sed 's#[&/\]#\\&#g' <<<"$context_origin_url")

## Replace the default settings with the user selected settings ##
plutil -replace url -string "$pod_url_escaped" "$plistFilePath"
plutil -replace contextOriginUrl -string "$context_origin_url_escaped" "$plistFilePath"
plutil -replace minimizeOnClose -string "$minimize_on_close" "$plistFilePath"
plutil -replace alwaysOnTop -string "$always_on_top" "$plistFilePath"
plutil -replace launchOnStartup -string "$launch_on_startup" "$plistFilePath"
plutil -replace bringToFront -string "$bring_to_front" "$plistFilePath"
plutil -replace devToolsEnabled -bool "$dev_tools_enabled" "$plistFilePath"
plutil -replace enableBrowserLogin -bool "$enable_browser_login" "$plistFilePath"
plutil -replace browserLoginAutoConnect -bool "$browser_login_autoconnect" "$plistFilePath"

## Add settings force auto update
force_auto_update=$(sed -n '10p' ${settingsFilePath});
if [ "$force_auto_update" = "" ]; then force_auto_update=false; fi
plutil -replace forceAutoUpdate -bool "$force_auto_update" "$plistFilePath"

## Add settings is pod url editable
is_pod_url_editable=$(sed -n '11p' ${settingsFilePath});
if [ "$is_pod_url_editable" = "" ]; then is_pod_url_editable=true; fi
plutil -replace isPodUrlEditable -bool "$is_pod_url_editable" "$plistFilePath"

## Get Symphony Permissions from the temp file ##
media=$(sed -n '1p' ${permissionsFilePath});
geo_location=$(sed -n '2p' ${permissionsFilePath});
notifications=$(sed -n '3p' ${permissionsFilePath});
midi_sysex=$(sed -n '4p' ${permissionsFilePath});
pointer_lock=$(sed -n '5p' ${permissionsFilePath});
full_screen=$(sed -n '6p' ${permissionsFilePath});
open_external_app=$(sed -n '7p' ${permissionsFilePath});

## If any of the above values turn out to be empty, set default values ##
if [ "$media" = "" ]; then media=true; fi
if [ "$geo_location" = "" ]; then geo_location=true; fi
if [ "$notifications" = "" ]; then notifications=true; fi
if [ "$midi_sysex" = "" ]; then midi_sysex=true; fi
if [ "$pointer_lock" = "" ]; then pointer_lock=true;fi
if [ "$full_screen" = "" ]; then full_screen=true; fi
if [ "$open_external_app" = "" ]; then open_external_app=true; fi

## Replace the default permissions with the user selected permissions ##
plutil -replace media -bool "$media" "$plistFilePath"
plutil -replace geolocation -bool "$geo_location" "$plistFilePath"
plutil -replace notifications -bool "$notifications" "$plistFilePath"
plutil -replace midiSysex -bool "$midi_sysex" "$plistFilePath"
plutil -replace pointerLock -bool "$pointer_lock" "$plistFilePath"
plutil -replace fullscreen -bool "$full_screen" "$plistFilePath"
plutil -replace openExternal -bool "$open_external_app" "$plistFilePath"

## Remove the temp settings & permissions file created ##
# rm -f ${settingsFilePath}
# rm -f ${permissionsFilePath}

uuid=$(uuidgen)
plutil -replace installVariant -string "$uuid" "$plistFilePath"