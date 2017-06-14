#!/bin/sh

## Create file path variables ##
tempFilePath='/tmp/sym_settings.txt'
installPath="$2"
configPath="/Symphony.app/Contents/config/Symphony.config"
newPath=$installPath$configPath

## Get Symphony Settings from the temp file ##
pod_url=$(sed -n '1p' $tempFilePath);
minimize_on_close=$(sed -n '2p' '/tmp/sym_settings.txt');
launch_on_startup=$(sed -n '3p' '/tmp/sym_settings.txt');

## Replace the default settings with the user selected settings ##
sed -i "" -E "s#\"url\" ?: ?\".*\"#\"url\"\: \"$pod_url\"#g" $newPath
sed -i "" -E "s#\"minimizeOnClose\" ?: ?([Tt][Rr][Uu][Ee]|[Ff][Aa][Ll][Ss][Ee])#\"minimizeOnClose\":\ $minimize_on_close#g" $newPath
sed -i "" -E "s#\"launchOnStartup\" ?: ?([Tt][Rr][Uu][Ee]|[Ff][Aa][Ll][Ss][Ee])#\"launchOnStartup\":\ $launch_on_startup#g" $newPath

## Add app to login items
if [ $launch_on_startup == true ]; then
mkdir ~/Library/LaunchAgents/
cat > ~/Library/LaunchAgents/com.symphony.symphony-desktop.agent.plist << EOT
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.symphony.symphony-desktop.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>$installPath/Symphony.app/Contents/MacOS/Symphony</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
EOT
else
launchctl unload ~/Library/LaunchAgents/com.symphony.symphony-desktop.agent.plist
fi

## Remove the temp settings file created ##
rm -f $tempFilePath
