#!/bin/sh

## Create file path variables ##
settingsFilePath='/tmp/sym_settings.txt'
permissionsFilePath='/tmp/sym_permissions.txt'
installPath="$2"
configPath="/Symphony.app/Contents/config/Symphony.config"
newPath=${installPath}${configPath}

## Get Symphony Settings from the temp file ##
pod_url=$(sed -n '1p' ${settingsFilePath});
minimize_on_close=$(sed -n '2p' ${settingsFilePath});
launch_on_startup=$(sed -n '3p' ${settingsFilePath});
always_on_top=$(sed -n '4p' ${settingsFilePath});
bring_to_front=$(sed -n '5p' ${settingsFilePath});
dev_tools_enabled=$(sed -n '6p' ${settingsFilePath});

if [ "$pod_url" == "" ]; then
    pod_url="https://my.symphony.com"
fi

if [ "$minimize_on_close" == "" ]; then
    minimize_on_close=true;
fi

if [ "$launch_on_startup" == "" ]; then
    launch_on_startup=true;
fi

if [ "$always_on_top" == "" ]; then
    always_on_top=false;
fi

if [ "$bring_to_front" == "" ]; then
    bring_to_front=false;
fi

if [ "$dev_tools_enabled" == "" ]; then
    dev_tools_enabled=true;
fi

pod_url_escaped=$(sed 's#[&/\]#\\&#g' <<<"$pod_url")

## Replace the default settings with the user selected settings ##
sed -i "" -E "s#\"url\" ?: ?\".*\"#\"url\"\: \"$pod_url_escaped\"#g" ${newPath}
sed -i "" -E "s#\"minimizeOnClose\" ?: ?([Tt][Rr][Uu][Ee]|[Ff][Aa][Ll][Ss][Ee])#\"minimizeOnClose\":\ $minimize_on_close#g" ${newPath}
sed -i "" -E "s#\"alwaysOnTop\" ?: ?([Tt][Rr][Uu][Ee]|[Ff][Aa][Ll][Ss][Ee])#\"alwaysOnTop\":\ $always_on_top#g" ${newPath}
sed -i "" -E "s#\"launchOnStartup\" ?: ?([Tt][Rr][Uu][Ee]|[Ff][Aa][Ll][Ss][Ee])#\"launchOnStartup\":\ $launch_on_startup#g" ${newPath}
sed -i "" -E "s#\"bringToFront\" ?: ?([Tt][Rr][Uu][Ee]|[Ff][Aa][Ll][Ss][Ee])#\"bringToFront\":\ $bring_to_front#g" ${newPath}
sed -i "" -E "s#\"devToolsEnabled\" ?: ?([Tt][Rr][Uu][Ee]|[Ff][Aa][Ll][Ss][Ee])#\"devToolsEnabled\":\ $dev_tools_enabled#g" ${newPath}

## Remove the temp settings file created ##
rm -f ${settingsFilePath}

## Get Symphony Permissions from the temp file ##
media=$(sed -n '1p' ${permissionsFilePath});
geo_location=$(sed -n '2p' ${permissionsFilePath});
notifications=$(sed -n '3p' ${permissionsFilePath});
midi_sysex=$(sed -n '4p' ${permissionsFilePath});
pointer_lock=$(sed -n '5p' ${permissionsFilePath});
full_screen=$(sed -n '6p' ${permissionsFilePath});
open_external_app=$(sed -n '7p' ${permissionsFilePath});

if [ "$media" == "" ]; then
    media=true;
fi

if [ "$geo_location" == "" ]; then
    geo_location=true;
fi

if [ "$notifications" == "" ]; then
    notifications=true;
fi

if [ "$midi_sysex" == "" ]; then
    midi_sysex=true;
fi

if [ "$pointer_lock" == "" ]; then
    pointer_lock=true;
fi

if [ "$full_screen" == "" ]; then
    full_screen=true;
fi

if [ "$open_external_app" == "" ]; then
    open_external_app=true;
fi

## Replace the default permissions with the user selected permissions ##
sed -i "" -E "s#\"media\" ?: ?([Tt][Rr][Uu][Ee]|[Ff][Aa][Ll][Ss][Ee])#\"media\":\ $media#g" ${newPath}
sed -i "" -E "s#\"geolocation\" ?: ?([Tt][Rr][Uu][Ee]|[Ff][Aa][Ll][Ss][Ee])#\"geolocation\":\ $geo_location#g" ${newPath}
sed -i "" -E "s#\"notifications\" ?: ?([Tt][Rr][Uu][Ee]|[Ff][Aa][Ll][Ss][Ee])#\"notifications\":\ $notifications#g" ${newPath}
sed -i "" -E "s#\"midiSysex\" ?: ?([Tt][Rr][Uu][Ee]|[Ff][Aa][Ll][Ss][Ee])#\"midiSysex\":\ $midi_sysex#g" ${newPath}
sed -i "" -E "s#\"pointerLock\" ?: ?([Tt][Rr][Uu][Ee]|[Ff][Aa][Ll][Ss][Ee])#\"pointerLock\":\ $pointer_lock#g" ${newPath}
sed -i "" -E "s#\"fullscreen\" ?: ?([Tt][Rr][Uu][Ee]|[Ff][Aa][Ll][Ss][Ee])#\"fullscreen\":\ $full_screen#g" ${newPath}
sed -i "" -E "s#\"openExternal\" ?: ?([Tt][Rr][Uu][Ee]|[Ff][Aa][Ll][Ss][Ee])#\"openExternal\":\ $open_external_app#g" ${newPath}


## Remove the temp permissions file created ##
rm -f ${permissionsFilePath}