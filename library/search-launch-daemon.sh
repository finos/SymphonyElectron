#!/usr/bin/env bash

create=$1
data=$2

if $1; then
  mkdir ~/Library/LaunchDaemons/
     cat > ~/Library/LaunchDaemons/com.symphony-search.clear.plist << EOT
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.symphony-search.clear.daemon</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/sh</string>
        <string>$0</string>
        <string>false</string>
        <string>$data</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
EOT
launchctl load ~/Library/LaunchDaemons/com.symphony-search.clear.plist
else
    rm -rf $data
fi