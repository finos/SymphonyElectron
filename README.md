[![Symphony Software Foundation - Incubating](https://cdn.rawgit.com/symphonyoss/contrib-toolbox/master/images/ssf-badge-incubating.svg)](https://symphonyoss.atlassian.net/wiki/display/FM/Incubating)

# SymphonyElectron

## Project Goals:

Our goal is to improve the performance and development agility of Symphony's desktop wrapper and build a path to support other wrappers by:

1. Standardizing the JS to native interfaces
2. Standardizing the app to app interfaces (current embedding API)
3. Provide an open and free reference implementation that anyone can contribute to, modify, and make derivative works.

In order to achieve those goals Symphony is participating and working in close collaboration with the [Foundation Desktop Wrapper Working Group](https://symphonyoss.atlassian.net/wiki/display/WGDWAPI/Working+Group+-+Desktop+Wrapper+API)

## Windows Dev Env
- NodeJS version >= 7.4.0 (corresponds to electron 1.6.7)
- install Microsoft Visual Studio 2015 with both C++ and .NET/C# development tools. Free community versions works.
- also make sure .NET3.5SP1 is installed.
- note: C++ tools needed to recompile node modules
- note: .NET/C# tools needed to compile screen-snippet
- open 'Developer Command Prompt for VS2015' - this sets paths to visual studio build tools

## Mac Dev Env
- need to install xcode command line tools.
- NodeJS version >= 7.4.0 (corresponds to electron 1.6.7) - needed to run tests locally

## Run demo:
- npm install
- npm run demo-win (for windows)
- npm run demo-mac (for mac osx)

## Build Instructions:
- npm install
- to run locally: npm run dev
- to build mac pkg: 
  * npm run unpacked-mac
  * install software to build .pkg: http://s.sudre.free.fr/Software/Packages/about.html
  * /usr/local/bin/packagesbuild -v installer/mac/symphony-mac-packager.pkgproj
  * The .pkg file will output in directory: installer/mac/build
- to build win msi: npm run unpacked-win (for 64 bit) and use 'advanced installer' .aip file in installer/ dir

## msi command line options:
- to install for all users (admin required): msiexec.exe /i Symphony-x64.msi ALLUSERS=1
- to install per user: msiexec.exe /i Symphony-x64.msi ALLUSERS=""
- to change default pod url: msiexe.exe /i Symphony-x64.msi POD_URL=my.symphony.com
- to change auto start: msiexe.exe /i Symphony-x64.msi AUTO_START=true (or false) - if not specified default it true.
- to change minimize on close: msiexe.exe /i Symphony-x64.msi MINIMIZE_ON_CLOSE=true (or false) - if not specified default is true.
- any of the above options can be chained together, for example: msiexe.exe /i Symphony-x64.msi MINIMIZE_ON_CLOSE=true AUTO_START=false POD_URL=my.symphony.com

## Start URL
- To change the start url (i.e., pod url), edit config/Symphony.config and change 'url' variable. if no protocol provided, then https will be added.
- The installer will include file config/Symphony.config next to executable. Changes in this file will effect all users.  

## Tests and Code Coverage
- jest framework is used to run tests: http://facebook.github.io/jest/
- to run tests and get code coverage report: npm test
- code coverage reports are placed in dir: converage
- tests are located in dir: tests

## Logging
- Local logging is enabled for dev environments using the module [electron-log](https://www.npmjs.com/package/electron-log)
- On macOS, the logs are stored under `~/Library/Logs/<app name>/log.log`
- On Windows, the logs are stored under `%USERPROFILE%\AppData\Roaming\<app name>\log.log`
- Remote logging is enabled for local and production cases and are sent to the backend server via the remote objects

## Misc notes
If desiring to run against server without proper cert use cmd line option: --ignore-certificate-errors
