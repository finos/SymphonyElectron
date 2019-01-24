## Prerequisites

### Windows
- NodeJS version >= 8.9.4 (corresponds to electron 2.0.2)
- Microsoft Visual Studio 2015 Community or Paid (C++ and .NET/C# development tools)
- Python >= 2.7.1
- Dot Net 3.5 SP1
- [Advanced Installer](https://www.advancedinstaller.com/)

#### Notes
- C++ tools are required to recompile node modules
- Dot NET/C# tools required to compile screen-snippet module
- Open 'Developer Command Prompt for VS2015'. This sets paths to visual studio build tools
- Advanced installer is required to create msi installer

### Mac
- Xcode command line tools. Or better, XCode latest version
- NodeJS version >= 8.9.4 (corresponds to electron 2.0.2)
- [Sudre Packages](http://s.sudre.free.fr/Software/Packages/about.html)

#### Notes
- Ensure you have accepted the XCode license agreement
- Sudre packages is used to create a .pkg installer file 

## Run demo:
- npm install
- npm run demo-win (for windows)
- npm run demo-mac (for mac osx)

## Build Instructions:

### Mac
- npm install
- npm run dev (to run locally)
- to build mac app:
  * npm run unpacked-mac
  * The distributable is created in the `dist/mac` directory
- to build mac package (installer):  
  * npm run packed-mac
  * The .pkg file will be generated in the `installer/mac/build` directory

### Windows
- npm install
- npm run dev (to run locally)
- To build windows unpacked exe:
  * npm run unpacked-win
  * The distributable is created in the `dist/win-unpacked` directory
- To build windows 32 bit unpacked exe (installer):
  * npm run unpacked-win-x86
  * The distributable is created in the `dist/win-ia32-unpacked` directory
- To create msi (installer):
  * Run the advanced installer script located in `installer/win` directory
  * There are two configuration files one each for 64-bit and 32-bit

#### MSI command line options:
- To install for all users (admin required): msiexec.exe /i Symphony-x64.msi ALLUSERS=1
- To install per user: msiexec.exe /i Symphony-x64.msi ALLUSERS=""
- To change default pod url: msiexe.exe /i Symphony-x64.msi POD_URL=my.symphony.com
- To change auto start: msiexe.exe /i Symphony-x64.msi AUTO_LAUNCH=true (or false) - if not specified default it true.
- To change minimize on close: msiexe.exe /i Symphony-x64.msi MINIMIZE_ON_CLOSE=true (or false) - if not specified default is true.
- Any of the above options can be chained together, for example: msiexe.exe /i Symphony-x64.msi MINIMIZE_ON_CLOSE=true AUTO_START=false POD_URL=my.symphony.com
- The available values for various settings in the installer is listed below
  * POD_URL (String)
  * ALWAYS_ON_TOP (Boolean)
  * AUTO_LAUNCH (Boolean)
  * MINIMIZE_ON_CLOSE (Boolean)
  * BRING_TO_FRONT (Boolean)
  * MEDIA (Boolean)
  * LOCATION (Boolean)
  * NOTIFICATIONS (Boolean)
  * MIDI_SYSEX (Boolean)
  * FULL_SCREEN (Boolean)
  * POINTER_LOCK (Boolean)
  * OPEN_EXTERNAL (Boolean)

## Start URL
- To change the start url (i.e., pod url), edit config/Symphony.config and change 'url' variable. if no protocol provided, then https will be added.
- The installer will include file config/Symphony.config next to executable. Changes in this file will effect all users.  

## Tests and Code Coverage
- [Jest framework](http://facebook.github.io/jest/) is used to run tests
- Use `npm test` to run unit tests
- Use `npm run spectron-test` to run UI tests
- Code coverage reports are placed in [coverage](./out/coverage) directory
- To check the test run report, see the [dist](./out) directory
- See the [tests](./tests) directory to find all the unit tests
- See the [spectron](./tests/spectron) directory to find all the unit tests

## Logging
- Local logging is enabled for dev environments using the module [electron-log](https://www.npmjs.com/package/electron-log)
- On macOS, the logs are stored under `~/Library/Logs/<app name>/log.log`
- On Windows, the logs are stored under `%USERPROFILE%\AppData\Roaming\<app name>\log.log`
- Remote logging is enabled for local and production cases and are sent to the backend server via the remote objects

## Misc notes
- If desiring to run against server without proper cert use cmd line option: --ignore-certificate-errors
- To start additional instance with custom data directory (if you want seperate user) use cmd line options: --multiInstance --userDataPath=`<path to data dir>`
- If directory doesn't exist, it will be created
