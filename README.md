[![Symphony Software Foundation - Incubating](https://cdn.rawgit.com/symphonyoss/contrib-toolbox/master/images/ssf-badge-incubating.svg)](https://symphonyoss.atlassian.net/wiki/display/FM/Incubating)

# SymphonyElectron

## Project Goals:

Our goal is to improve the performance and development agility of Symphony's desktop wrapper and build a path to support other wrappers by:

1. Standardizing the JS to native interfaces
2. Standardizing the app to app interfaces (current embedding API)
3. Provide an open and free reference implementation that anyone can contribute to, modify, and make derivative works.

In order to achieve those goals Symphony is participating and working in close collaboration with the [Foundation Desktop Wrapper Working Group](https://symphonyoss.atlassian.net/wiki/display/WGDWAPI/Working+Group+-+Desktop+Wrapper+API)

## Windows Dev Env
- For screen-snippet to work:
  * MSBuild.exe must be in path.  MSBuild.exe is available by installing Visual Studio 2017 Community. 
  * .NET3.5 SP1 must be installed.
  * Note: screen-snippet is an optional dependency so if MSBuild.exe (Visual Studio) is not installed, then the install will still succeed, BUT the screen snippet functionality will not work on Windows.
- NodeJS version >= 7.4.0 (corresponds to electron 1.6.7) - needed to run tests locally

## Mac Dev Env
- NodeJS version >= 7.4.0 (corresponds to electron 1.6.7) - needed to run tests locally

## Run demo:
- npm install
- npm run demo-win (for windows)
- npm run demo-mac (for mac osx)

## Build Instructions:
- npm install
- to run locally: npm run dev
- to build mac dmg: npm run dist-mac
- to build win msi: npm run unpacked-win (for 64 bit) and use 'advanced installer' .aip file in installer/ dir

## msi command line options:
- to install for all users (admin required): msiexec.exe /i Symphony-x64.msi ALLUSERS=1
- to install per user: msiexec.exe /i Symphony-x64.msi ALLUSERS=""
- to change default pod url: msiexe.exe /i Symphony-x64.msi POD_URL=my.symphony.com

## Start URL
- To change the start url (i.e., pod url), edit config/Symphony.config and change 'url' variable. if no protocol provided, then https will be added.
- The installer will include file config/Symphony.config next to executable. Changes in this file will effect all users.  

## Tests and Code Coverage
- jest framework is used to run tests: http://facebook.github.io/jest/
- to run tests and get code coverage report: npm test
- code coverage reports are placed in dir: coverage
- tests are located in dir: tests

## Misc notes
If desiring to run against server without proper cert use cmd line option: --ignore-certificate-errors
