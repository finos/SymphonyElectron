# SymphonyElectron

Project Goals:

Our goal is to improve the performance and development agility of Symphony's desktop wrapper and build a path to support other wrappers by:

1. Standardizing the JS to native interfaces
2. Standardizing the app to app interfaces (current embedding API)
3. Provide an open and free reference implementation that anyone can contribute to, modify, and make derivative works.

In order to achieve those goals Symphony is participating and working in close collaboration with the [Foundation Desktop Wrapper Working Group](https://symphonyoss.atlassian.net/wiki/display/WGDWAPI/Working+Group+-+Desktop+Wrapper+API)



Build Instructions:

- to pick up dependencies: npm install
- to locally run mac version: npm run dev:mac
- to locally run windows (64 bit) version: npm run dev:win
- to build mac dmg: npm run dist-mac
- to build win exe installer (64 bit): npm run dist-win
- to build win exe installer (32 bit): npm run dist-win-x86

to change the url start location, edit package.json and change 'homepage' variable.

if desiring to run against server without proper cert use cmd line option: --ignore-certificate-errors

if you want to build windows version on mac then need to install few items, see: https://github.com/electron-userland/electron-builder/wiki/Multi-Platform-Build
