#!/bin/sh

## Create file path variables ##
settingsFilePath='/tmp/sym_settings.txt'
permissionsFilePath='/tmp/sym_permissions.txt'
installPath="$2"
configPath="/Symphony.app/Contents/config"
configFilePath="${installPath}${configPath}/Symphony.config"
installVariantPath="${installPath}${configPath}/InstallVariant.info"
newPath=${configFilePath}

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
sed -i "" -E "s#\"url\" ?: ?\".*\"#\"url\"\: \"$pod_url_escaped\"#g" "${newPath}"
sed -i "" -E "s#\"contextOriginUrl\" ?: ?\".*\"#\"contextOriginUrl\"\: \"$context_origin_url_escaped\"#g" "${newPath}"
sed -i "" -E "s#\"minimizeOnClose\" ?: ?\"([Ee][Nn][Aa][Bb][Ll][Ee][Dd]|[Dd][Ii][Ss][Aa][Bb][Ll][Ee][Dd])\"#\"minimizeOnClose\":\ \"$minimize_on_close\"#g" "${newPath}"
sed -i "" -E "s#\"alwaysOnTop\" ?: ?\"([Ee][Nn][Aa][Bb][Ll][Ee][Dd]|[Dd][Ii][Ss][Aa][Bb][Ll][Ee][Dd])\"#\"alwaysOnTop\":\ \"$always_on_top\"#g" "${newPath}"
sed -i "" -E "s#\"launchOnStartup\" ?: ?\"([Ee][Nn][Aa][Bb][Ll][Ee][Dd]|[Dd][Ii][Ss][Aa][Bb][Ll][Ee][Dd])\"#\"launchOnStartup\":\ \"$launch_on_startup\"#g" "${newPath}"
sed -i "" -E "s#\"bringToFront\" ?: ?\"([Ee][Nn][Aa][Bb][Ll][Ee][Dd]|[Dd][Ii][Ss][Aa][Bb][Ll][Ee][Dd])\"#\"bringToFront\":\ \"$bring_to_front\"#g" "${newPath}"
sed -i "" -E "s#\"devToolsEnabled\" ?: ?([Tt][Rr][Uu][Ee]|[Ff][Aa][Ll][Ss][Ee])#\"devToolsEnabled\":\ $dev_tools_enabled#g" "${newPath}"
sed -i "" -E "s#\"enableBrowserLogin\" ?: ?([Tt][Rr][Uu][Ee]|[Ff][Aa][Ll][Ss][Ee])#\"enableBrowserLogin\":\ $enable_browser_login#g" "${newPath}"
sed -i "" -E "s#\"browserLoginAutoConnect\" ?: ?([Tt][Rr][Uu][Ee]|[Ff][Aa][Ll][Ss][Ee])#\"browserLoginAutoConnect\":\ $browser_login_autoconnect#g" "${newPath}"

## Add settings force auto update
force_auto_update=$(sed -n '10p' ${settingsFilePath});
if [ "$force_auto_update" = "" ]; then force_auto_update=false; fi
sed -i "" -E "s#\"forceAutoUpdate\" ?: ?([Tt][Rr][Uu][Ee]|[Ff][Aa][Ll][Ss][Ee])#\"forceAutoUpdate\":\ $force_auto_update#g" "${newPath}"

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
sed -i "" -E "s#\"media\" ?: ?([Tt][Rr][Uu][Ee]|[Ff][Aa][Ll][Ss][Ee])#\"media\":\ $media#g" "${newPath}"
sed -i "" -E "s#\"geolocation\" ?: ?([Tt][Rr][Uu][Ee]|[Ff][Aa][Ll][Ss][Ee])#\"geolocation\":\ $geo_location#g" "${newPath}"
sed -i "" -E "s#\"notifications\" ?: ?([Tt][Rr][Uu][Ee]|[Ff][Aa][Ll][Ss][Ee])#\"notifications\":\ $notifications#g" "${newPath}"
sed -i "" -E "s#\"midiSysex\" ?: ?([Tt][Rr][Uu][Ee]|[Ff][Aa][Ll][Ss][Ee])#\"midiSysex\":\ $midi_sysex#g" "${newPath}"
sed -i "" -E "s#\"pointerLock\" ?: ?([Tt][Rr][Uu][Ee]|[Ff][Aa][Ll][Ss][Ee])#\"pointerLock\":\ $pointer_lock#g" "${newPath}"
sed -i "" -E "s#\"fullscreen\" ?: ?([Tt][Rr][Uu][Ee]|[Ff][Aa][Ll][Ss][Ee])#\"fullscreen\":\ $full_screen#g" "${newPath}"
sed -i "" -E "s#\"openExternal\" ?: ?([Tt][Rr][Uu][Ee]|[Ff][Aa][Ll][Ss][Ee])#\"openExternal\":\ $open_external_app#g" "${newPath}"

## Remove the temp settings & permissions file created ##
rm -f ${settingsFilePath}
rm -f ${permissionsFilePath}

uuidgen > "${installVariantPath}"