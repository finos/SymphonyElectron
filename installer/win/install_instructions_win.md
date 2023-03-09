Windows Installer Instructions
==============================

Silent installation
-------------------

The installer supports silent installation using the standard "msiexec" command from a command prompt. 
This is done by specifying the /q command line flag

#### Example

    msiexec /i Symphony.msi /q

As errors are not reported during silent installation, it is a good idea to enable logging when using 
this option (see below).

Note that the default installation path will require elevated user rights, so a silent install will 
either have to be run from an Administrator command promp, or specify a different INSTALLDIR path 
(see below) or the installation will silently fail (but an error will be logged if logging is enabled).


Logging
-------

To get a detailed log of the installation and detailed reports of any errors, logging to file can be 
enabled by specifying the /l* command line flag

#### Example

    msiexec /i Symphony.msi /l* symphony_install.log```


Installation path
-----------------

By default, Symphony will be installed to the location

    %LOCALAPPDATA%\Programs\Symphony

which requires elevated user rights. If running a normal (not silent) installation, the user will get 
the usual UAC prompt to grant access.

To specify a different install location, the `INSTALLDIR` parameter can be specified

#### Example

    msiexec /i Symphony.msi INSTALLDIR="C:\MyLocation"



Install parameters
------------------

The following parameters are available to control other aspects of the installation.

-------------------------------------------------------------------
### ALLUSERS

Expected values:

* "1"
  Install *For all users* (default)
* ""
  Install *Only for me*

#### Example, install *For all users*

    msiexec /i Symphony.msi ALLUSERS="1"

or

    msiexec /i Symphony.msi


#### Example, install *Only for me*

    msiexec /i Symphony.msi ALLUSERS=""



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

    msiexec /i Symphony.msi APPDIR="C:\Program Files\Symphony"



-------------------------------------------------------------------
### ALWAYS_ON_TOP

Expected values:

* "DISABLED"
  Always-on-top disabled (default)
* "ENABLED"
  Always-on-top enabled

#### Example, install with always-on-top disabled

    msiexec /i Symphony.msi ALWAYS_ON_TOP="DISABLED"

or

    msiexec /i Symphony.msi /q

#### Example, install with always-on-top enabled

    msiexec /i Symphony.msi ALWAYS_ON_TOP="ENABLED"



-------------------------------------------------------------------
### AUTO_LAUNCH_PATH

Expected values:

* Full file path for custom auto launch path

#### Example

    msiexec /i Symphony.msi AUTO_LAUNCH_PATH="C:\Program Files\internet explorer\iexplore.exe"



-------------------------------------------------------------------
### AUTO_START

Expected values:

* "ENABLED"
  Auto start enabled (default)
* "DISABLED"
  Auto start disabled

#### Example, install with auto start enabled

    msiexec /i Symphony.msi AUTO_START="ENABLED"

or

    msiexec /i Symphony.msi /q

#### Example, install with auto start disabled

    msiexec /i Symphony.msi AUTO_START="DISABLED"



-------------------------------------------------------------------
### BRING_TO_FRONT

Expected values:

* "DISABLED"
  Bring-to-front disabled (default)
* "ENABLED"
  Bring-to-front enabled

#### Example, install with bring-to-front disabled

    msiexec /i Symphony.msi BRING_TO_FRONT="DISABLED"

or

    msiexec /i Symphony.msi /q

#### Example, install with bring-to-front enabled

    msiexec /i Symphony.msi BRING_TO_FRONT="ENABLED"



-------------------------------------------------------------------
### CUSTOM_TITLE_BAR

Expected values:

* "ENABLED"
  Custom title bar enabled (default)
* "DISABLED"
  Custom title bar disabled

#### Example, install with custom title bar enabled

    msiexec /i Symphony.msi CUSTOM_TITLE_BAR="ENABLED"

or

    msiexec /i Symphony.msi /q

#### Example, install with custom title bar disabled

    msiexec /i Symphony.msi CUSTOM_TITLE_BAR="DISABLED"



-------------------------------------------------------------------
### DEV_TOOLS_ENABLED

Expected values:

* "true"
  Dev tools enabled (default)
* "false"
  Dev tools disabled

#### Example, install with dev tools enabled

    msiexec /i Symphony.msi DEV_TOOLS_ENABLED="true"

or

    msiexec /i Symphony.msi /q

#### Example, install with dev tools disabled

    msiexec /i Symphony.msi DEV_TOOLS_ENABLED="false"



-------------------------------------------------------------------
### FULL_SCREEN

Expected values:

* "true"
  Full screen enabled (default)
* "false"
  Full screen disabled

#### Example, install with full screen enabled

    msiexec /i Symphony.msi FULL_SCREEN="true"

or

    msiexec /i Symphony.msi /q

#### Example, install with full screen disabled

    msiexec /i Symphony.msi FULL_SCREEN="false"



-------------------------------------------------------------------
### LAUNCH_ON_INSTALL

Expected values:

* "true"
  Symphony will be launched automatically after installation has completed (default)
* "false"
  Symphony will not be launched after installation has completed

#### Example, install with launch on install enabled

    msiexec /i Symphony.msi LAUNCH_ON_INSTALL="true"

or

    msiexec /i Symphony.msi /q

#### Example, install with launch on install disabled

    msiexec /i Symphony.msi LAUNCH_ON_INSTALL="false"



-------------------------------------------------------------------
### LOCATION

Expected values:

* "true"
  Location enabled (default)
* "false"
  Location disabled

#### Example, install with location enabled

    msiexec /i Symphony.msi LOCATION="true"

or

    msiexec /i Symphony.msi /q

#### Example, install with location disabled

    msiexec /i Symphony.msi LOCATION="false"



-------------------------------------------------------------------
### MEDIA

Expected values:

* "true"
  Media enabled (default)
* "false"
  Media disabled

#### Example, install with media enabled

    msiexec /i Symphony.msi MEDIA="true"

or

    msiexec /i Symphony.msi /q

#### Example, install with media disabled

    msiexec /i Symphony.msi MEDIA="false"



-------------------------------------------------------------------
### MIDI_SYSEX

Expected values:

* "true"
  Midi SysEx enabled (default)
* "false"
  Midi SysEx disabled

#### Example, install with Midi SysEx enabled

    msiexec /i Symphony.msi MIDI_SYSEX="true"

or

    msiexec /i Symphony.msi /q

#### Example, install with Midi SysEx disabled

    msiexec /i Symphony.msi MIDI_SYSEX="false"



-------------------------------------------------------------------
### MINIMIZE_ON_CLOSE

Expected values:

* "ENABLED"
  Minimize-on-close enabled (default)
* "DISABLED"
  Minimize-on-close disabled

#### Example, install with minimize-on-close enabled

    msiexec /i Symphony.msi MINIMIZE_ON_CLOSE="ENABLED"

or

    msiexec /i Symphony.msi /q

#### Example, install with minimize-on-close disabled

    msiexec /i Symphony.msi MINIMIZE_ON_CLOSE="DISABLED"



-------------------------------------------------------------------
### NOTIFICATIONS

Expected values:

* "true"
  Notifications enabled (default)
* "false"
  Notifications disabled

#### Example, install with notifications enabled

    msiexec /i Symphony.msi NOTIFICATIONS="true"

or

    msiexec /i Symphony.msi /q

#### Example, install with notifications disabled

    msiexec /i Symphony.msi NOTIFICATIONS="false"



-------------------------------------------------------------------
### OPEN_EXTERNAL

Expected values:

* "true"
  Open external enabled (default)
* "false"
  Open external disabled

#### Example, install with open external enabled

    msiexec /i Symphony.msi OPEN_EXTERNAL="true"

or

    msiexec /i Symphony.msi /q

#### Example, install with open external disabled

    msiexec /i Symphony.msi OPEN_EXTERNAL="false"



-------------------------------------------------------------------
### POD_URL

Expected values:

* Full url to POD
  (default is "https://my.symphony.com" )

#### Example

    msiexec /i Symphony.msi POD_URL="https://my.symphony.com"



-------------------------------------------------------------------
### CONTEXT_ORIGIN_URL

Expected values:

* Your actual POD URL and not the SSO URL
  (default is "" )

#### Example

    msiexec /i Symphony.msi CONTEXT_ORIGIN_URL="https://my.symphony.com"



-------------------------------------------------------------------
### POINTER_LOCK

Expected values:

* "true"
  Pointer lock enabled (default)
* "false"
  Pointer lock disabled

#### Example, install with pointer lock enabled

    msiexec /i Symphony.msi POINTER_LOCK="true"

or

    msiexec /i Symphony.msi /q

#### Example, install with pointer lock disabled

    msiexec /i Symphony.msi POINTER_LOCK="false"



-------------------------------------------------------------------
### USER_DATA_PATH

Expected values:

* Full file path for location to store Symphony user data

The default (if not specified, or if specified as empty string "") is 
	
	%LOCALAPPDATA%\Symphony\

#### Example

    msiexec /i Symphony.msi USER_DATA_PATH="z:\userdata\symphony"



-------------------------------------------------------------------
### OVERRIDE_USER_AGENT

Expected values:

* "true"
  User-agent value "Electron/X.X" is replaced with "ElectronSymphony/X.X"
* "false"
  User-agents are not modified (default)

#### Example, install with user-agent override

    msiexec /i Symphony.msi OVERRIDE_USER_AGENT="true"

#### Example, install without user-agent override

    msiexec /i Symphony.msi OVERRIDE_USER_AGENT="false"

or

    msiexec /i Symphony.msi
	

	
-------------------------------------------------------------------
### CHROME_FLAGS

Expected values:

* A single string containing all flags to be passed to chrome
  (default is "" )

#### Example

    msiexec /i Symphony.msi CHROME_FLAGS="--debug --debug2 --debug3"


-------------------------------------------------------------------
### ENABLE_BROWSER_LOGIN

Expected values:

* "true"
  SDA will authenticate the user by relying on third-party browser
* "false"
  SDA will authenticate the user in SDA

#### Example, install with user-agent override

    msiexec /i Symphony.msi ENABLE_BROWSER_LOGIN="true"

#### Example, install without user-agent override

    msiexec /i Symphony.msi ENABLE_BROWSER_LOGIN="false"

or

    msiexec /i Symphony.msi
	

	
-------------------------------------------------------------------
