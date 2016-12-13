[![Symphony Software Foundation - Incubating](https://cdn.rawgit.com/symphonyoss/contrib-toolbox/master/images/ssf-badge-incubating.svg)](https://symphonyoss.atlassian.net/wiki/display/FM/Incubating)

# SymphonyElectron

Instructions:
- to pick up dependencies: npm install
- to locally run mac version: npm run dev:mac
- to locally run windows (64 bit) version: npm run dev:win
- to build mac dmg: npm run dist-mac
- to build win exe installer (64 bit): npm run dist-win
- to build win exe installer (32 bit): npm run dist-win-x86

to change the url start location, edit package.json and change 'homepage' variable.

if desiring to run against server without proper cert use cmd line option: --ignore-certificate-errors

if you want to build windows version on mac then need to install few items, see: https://github.com/electron-userland/electron-builder/wiki/Multi-Platform-Build
