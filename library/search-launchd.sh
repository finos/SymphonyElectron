#!/usr/bin/env bash
pid=$2
data=$3

if $1; then
    cat > ~/Library/LaunchAgents/com.symphony.search.plist << EOT
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.search.data.plist</string>
  <key>ProgramArguments</key>
  <array>
  	<string>/bin/sh</string>
    <string>$0</string>
    <string>false</string>
    <string>$pid</string>
    <string>$data</string>
  </array>
  <key>StartInterval</key>
  <integer>10</integer>
</dict>
</plist>
EOT
launchctl load ~/Library/LaunchAgents/com.symphony.search.plist
elif ps -p $pid > /dev/null
then
    echo true
else
    echo false
    rm -rf $data
    launchctl unload ~/Library/LaunchAgents/com.symphony.search.plist
fi