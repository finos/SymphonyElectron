#!/usr/bin/env bash
pid=$2
launchDir=~/Library/LaunchAgents/

if $1; then
   if [ ! -d "$launchDir" ]; then
      mkdir "$launchDir"
   fi
   launchctl unload ~/Library/LaunchAgents/com.symphony-search.data.plist
   cat > ~/Library/LaunchAgents/com.symphony-search.data.plist << EOT
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.symphony-search.data.agent</string>
  <key>ProgramArguments</key>
  <array>
  	<string>/bin/sh</string>
    <string>scriptPath</string>
    <string>false</string>
    <string>SymphonyPID</string>
  </array>
  <key>RunAtLoad</key>
  <false/>
  <key>StartInterval</key>
  <integer>60</integer>
  <key>StandardOutPath</key>
    <string>/dev/null</string>
    <key>StandardErrorPath</key>
    <string>/dev/null</string>
</dict>
</plist>
EOT
launchctl load ~/Library/LaunchAgents/com.symphony-search.data.plist
elif ps -p $pid > /dev/null
then
    echo true
else
    echo false
    rm -rf dataPath
    launchctl unload ~/Library/LaunchAgents/com.symphony-search.data.plist
    rm -rf ~/Library/LaunchAgents/com.symphony-search.data.plist
fi