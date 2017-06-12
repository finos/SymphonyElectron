# Advanced Mac Installer

## Overview

Using [Packages](http://s.sudre.free.fr/Software/Packages/about.html), we can build a .pkg file for an existing app (.app). The tool allows us to customise the installation procedure so as to capture the user entered pod url amongst other settings.

## Pre-requisites

- [Xcode build tools](http://railsapps.github.io/xcode-command-line-tools.html)
- [Packages](http://s.sudre.free.fr/Software/Packages/about.html)

## Build Process

Once we have [Packages](http://s.sudre.free.fr/Software/Packages/about.html) installed, we'll just need to run the following command which should take care of creating the .pkg build for us.

`packagesbuild -v installer/mac/symphony-mac-packager.pkgproj`

The above command creates the build 'Symphony.pkg' and places it into the directory `installer/mac/build` relative to the project root.

Also note that the packages project file 'symphony-mac-packager.pkgproj' contains link to the plugin bundle and the post install script both of which are relative to 'symphony-mac-packager.pkgproj'.

[More command line documentation here](http://s.sudre.free.fr/Software/documentation/Packages/en/Project_Building.html#4)

## Notes

Currently, both the plugin source code and the plugin bundle are in the `installer/mac` directory. This helps us create builds in a quicker way than having to maintain another repo and building the plugin every time we build the pkg.

## Implementation Details

- The plugin captures data entered by the user and copied it to a temp file
- The post installation script then reads data from the temp file and replaces the values in the 'Symphony.config' file in the installed app

## Known Issues

- During installation, there is a section called "Destination Select" which is skipped based on the OS and it's settings. This is a [known bug](https://stackoverflow.com/questions/4647416/mac-packagemaker-destination-select-step-a-skipping-boption-permanently-disa). 
- Only macOS 10.7+ versions are supported with the installer plugin

## Related links

- [Packages Mac](http://s.sudre.free.fr/Software/Packages/about.html)
- [Packages User Guide](http://s.sudre.free.fr/Software/documentation/Packages/en/Packages_Installation.html)
- [Destination Select Bug](https://stackoverflow.com/questions/4647416/mac-packagemaker-destination-select-step-a-skipping-boption-permanently-disa)

