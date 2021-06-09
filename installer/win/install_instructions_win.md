Windows Installer Instructions
==============================

Install parameters
------------------




-------------------------------------------------------------------
### ALLUSERS

Expected values:

* "1"
  Install *For all users* (default)
* ""
  Install *Only for me*

#### Example, install *For all users*

    msiexec /i Symphony.msi /q ALLUSERS="1"

or

    msiexec /i Symphony.msi


#### Example, install *Only for me*

    msiexec /i Symphony.msi /q ALLUSERS=""



-------------------------------------------------------------------
### APPDIR

Expected values:

* Full file path for target location to install Symphony to

The default value differs depending on ALLUSERS setting.

* %LOCALAPPDATA%\Programs\Symphony\Symphony
  If installing *Only for me* (ALLUSERS="")
* %PROGRAMFILES%\Symphony\Symphony
  If installing *For all users* (ALLUSERS="1")

#### Example

    msiexec /i Symphony.msi /q APPDIR="C:\Program Files\Symphony"



-------------------------------------------------------------------
### ALWAYS_ON_TOP

Expected values:

* "DISABLED"
  Always-on-top disabled (default)
* "ENABLED"
  Always-on-top enabled

#### Example, install with always-on-top disabled

    msiexec /i Symphony.msi /q ALWAYS_ON_TOP="DISABLED"

or

    msiexec /i Symphony.msi /q

#### Example, install with always-on-top enabled

    msiexec /i Symphony.msi /q ALWAYS_ON_TOP="ENABLED"



-------------------------------------------------------------------
### AUTO_LAUNCH_PATH

Expected values:

* Full file path for custom auto launch path

#### Example

    msiexec /i Symphony.msi /q AUTO_LAUNCH_PATH="C:\Program Files\internet explorer\iexplore.exe"



-------------------------------------------------------------------
### AUTO_START

Expected values:

* "ENABLED"
  Auto start enabled (default)
* "DISABLED"
  Auto start disabled

#### Example, install with auto start enabled

    msiexec /i Symphony.msi /q AUTO_START="ENABLED"

or

    msiexec /i Symphony.msi /q

#### Example, install with auto start disabled

    msiexec /i Symphony.msi /q AUTO_START="DISABLED"



-------------------------------------------------------------------
### BRING_TO_FRONT

Expected values:

* "DISABLED"
  Bring-to-front disabled (default)
* "ENABLED"
  Bring-to-front enabled

#### Example, install with bring-to-front disabled

    msiexec /i Symphony.msi /q BRING_TO_FRONT="DISABLED"

or

    msiexec /i Symphony.msi /q

#### Example, install with bring-to-front enabled

    msiexec /i Symphony.msi /q BRING_TO_FRONT="ENABLED"



-------------------------------------------------------------------
### CUSTOM_TITLE_BAR

Expected values:

* "ENABLED"
  Custom title bar enabled (default)
* "DISABLED"
  Custom title bar disabled

#### Example, install with custom title bar enabled

    msiexec /i Symphony.msi /q CUSTOM_TITLE_BAR="ENABLED"

or

    msiexec /i Symphony.msi /q

#### Example, install with custom title bar disabled

    msiexec /i Symphony.msi /q CUSTOM_TITLE_BAR="DISABLED"



-------------------------------------------------------------------
### DEV_TOOLS_ENABLED

Expected values:

* "true"
  Dev tools enabled (default)
* "false"
  Dev tools disabled

#### Example, install with dev tools enabled

    msiexec /i Symphony.msi /q DEV_TOOLS_ENABLED="true"

or

    msiexec /i Symphony.msi /q

#### Example, install with dev tools disabled

    msiexec /i Symphony.msi /q DEV_TOOLS_ENABLED="false"



-------------------------------------------------------------------
### FULL_SCREEN

Expected values:

* "true"
  Full screen enabled (default)
* "false"
  Full screen disabled

#### Example, install with full screen enabled

    msiexec /i Symphony.msi /q FULL_SCREEN="true"

or

    msiexec /i Symphony.msi /q

#### Example, install with full screen disabled

    msiexec /i Symphony.msi /q FULL_SCREEN="false"



-------------------------------------------------------------------
### LOCATION

Expected values:

* "true"
  Location enabled (default)
* "false"
  Location disabled

#### Example, install with location enabled

    msiexec /i Symphony.msi /q LOCATION="true"

or

    msiexec /i Symphony.msi /q

#### Example, install with location disabled

    msiexec /i Symphony.msi /q LOCATION="false"



-------------------------------------------------------------------
### MEDIA

Expected values:

* "true"
  Media enabled (default)
* "false"
  Media disabled

#### Example, install with media enabled

    msiexec /i Symphony.msi /q MEDIA="true"

or

    msiexec /i Symphony.msi /q

#### Example, install with media disabled

    msiexec /i Symphony.msi /q MEDIA="false"



-------------------------------------------------------------------
### MIDI_SYSEX

Expected values:

* "true"
  Midi SysEx enabled (default)
* "false"
  Midi SysEx disabled

#### Example, install with Midi SysEx enabled

    msiexec /i Symphony.msi /q MIDI_SYSEX="true"

or

    msiexec /i Symphony.msi /q

#### Example, install with Midi SysEx disabled

    msiexec /i Symphony.msi /q MIDI_SYSEX="false"



-------------------------------------------------------------------
### MINIMIZE_ON_CLOSE

Expected values:

* "ENABLED"
  Minimize-on-close enabled (default)
* "DISABLED"
  Minimize-on-close disabled

#### Example, install with minimize-on-close enabled

    msiexec /i Symphony.msi /q MINIMIZE_ON_CLOSE="ENABLED"

or

    msiexec /i Symphony.msi /q

#### Example, install with minimize-on-close disabled

    msiexec /i Symphony.msi /q MINIMIZE_ON_CLOSE="DISABLED"



-------------------------------------------------------------------
### NOTIFICATIONS

Expected values:

* "true"
  Notifications enabled (default)
* "false"
  Notifications disabled

#### Example, install with notifications enabled

    msiexec /i Symphony.msi /q NOTIFICATIONS="true"

or

    msiexec /i Symphony.msi /q

#### Example, install with notifications disabled

    msiexec /i Symphony.msi /q NOTIFICATIONS="false"



-------------------------------------------------------------------
### OPEN_EXTERNAL

Expected values:

* "true"
  Open external enabled (default)
* "false"
  Open external disabled

#### Example, install with open external enabled

    msiexec /i Symphony.msi /q OPEN_EXTERNAL="true"

or

    msiexec /i Symphony.msi /q

#### Example, install with open external disabled

    msiexec /i Symphony.msi /q OPEN_EXTERNAL="false"



-------------------------------------------------------------------
### POD_URL

Expected values:

* Full url to POD
  (default is "https://my.symphony.com" )

#### Example

    msiexec /i Symphony.msi /q POD_URL="https://my.symphony.com"



-------------------------------------------------------------------
### CONTEXT_ORIGIN_URL

Expected values:

* Your actual POD URL and not the SSO URL
  (default is "" )

#### Example

    msiexec /i Symphony.msi /q CONTEXT_ORIGIN_URL="https://my.symphony.com"



-------------------------------------------------------------------
### POINTER_LOCK

Expected values:

* "true"
  Pointer lock enabled (default)
* "false"
  Pointer lock disabled

#### Example, install with pointer lock enabled

    msiexec /i Symphony.msi /q POINTER_LOCK="true"

or

    msiexec /i Symphony.msi /q

#### Example, install with pointer lock disabled

    msiexec /i Symphony.msi /q POINTER_LOCK="false"



-------------------------------------------------------------------
### USER_DATA_PATH

Expected values:

* Full file path for location to store Symphony user data

The default (if not specified, or if specified as empty string "") is 
	
	%LOCALAPPDATA%\Symphony\

#### Example

    msiexec /i Symphony.msi /q USER_DATA_PATH="z:\userdata\symphony"



-------------------------------------------------------------------
### OVERRIDE_USER_AGENT

Expected values:

* "true"
  "Electron/X.X" is removed from user-agents.
* "false"
  User-agents are not modified (default)

#### Example, install with user-agent override

    msiexec /i Symphony.msi OVERRIDE_USER_AGENT="true"

#### Example, install without user-agent override

    msiexec /i Symphony.msi OVERRIDE_USER_AGENT="false"

or

    msiexec /i Symphony.msi