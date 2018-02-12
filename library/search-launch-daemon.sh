#!/usr/bin/env bash

launchDir=~/Library/LaunchAgents/

if $1; then
   if [ ! -d "$launchDir" ]; then
      mkdir "$launchDir"
   fi
   cat > ~/Library/LaunchAgents/com.symphony-search.clear.plist << EOT
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.symphony-search.clear.daemon</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/sh</string>
        <string>scriptPath</string>
        <string>false</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
EOT
launchctl load ~/Library/LaunchAgents/com.symphony-search.clear.plist
else
    rm -rf dataPath
fi