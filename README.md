[![Symphony Software Foundation - Incubating](https://cdn.rawgit.com/symphonyoss/contrib-toolbox/master/images/ssf-badge-incubating.svg)](https://symphonyoss.atlassian.net/wiki/display/FM/Incubating)

# SymphonyElectron

## Project Goals:

Our goal is to improve the performance and development agility of Symphony's desktop wrapper and build a path to support other wrappers by:

1. Standardizing the JS to native interfaces
2. Standardizing the app to app interfaces (current embedding API)
3. Provide an open and free reference implementation that anyone can contribute to, modify, and make derivative works.

In order to achieve those goals Symphony is participating and working in close collaboration with the [Foundation Desktop Wrapper Working Group](https://symphonyoss.atlassian.net/wiki/display/WGDWAPI/Working+Group+-+Desktop+Wrapper+API)

## Run demo:
- npm install
- npm run demo

## Build Instructions:
- npm install
- to run locally: npm run dev
- to build mac dmg: npm run dist-mac
- to build win squirrel installer exe (64 bit): npm run dist-win
- to build win squirrel installer exe (32 bit): npm run dist-win-x86
- to build win msi, use 'advanced installer' .aip file in installer/ dir

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
- code coverage reports are placed in dir: converage
- tests are located in dir: tests

## Misc notes
If desiring to run against server without proper cert use cmd line option: --ignore-certificate-errors
