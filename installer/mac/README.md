# Advanced Mac Installer

## Overview

Using [Packages](http://s.sudre.free.fr/Software/Packages/about.html), we can build a .pkg file for an existing app (.app). The tool allows us to customise the installation procedure to capture the admin entered values from `/tmp/sym_settings.txt` and `/tmp/sym_permissions.txt`

## Pre-requisites

- [Xcode build tools](http://railsapps.github.io/xcode-command-line-tools.html)
- [Packages](http://s.sudre.free.fr/Software/Packages/about.html)

## Build Process

Once we have [Packages](http://s.sudre.free.fr/Software/Packages/about.html) installed, we'll just need to run the following command which should take care of creating the .pkg build for us.

`packagesbuild -v installer/mac/symphony-mac-packager.pkgproj`

The above command creates the build 'Symphony.pkg' and places it into the directory `installer/mac/build` relative to the project root.

Note that the packages project file 'symphony-mac-packager.pkgproj' contains link to the pre install and the post install scripts both of which are relative to 'symphony-mac-packager.pkgproj'.

[More command line documentation here](http://s.sudre.free.fr/Software/documentation/Packages/en/Project_Building.html#4)

## Implementation Details

- Pre installation script checks to see if the version we are installing is higher than the already installed version. If the installed version is lower, it deletes the installed version.
- Post installation script reads data from the temp files and replaces the values in the 'Symphony.config' file in the installed app

## Known Issues

- During installation, there is a section called "Destination Select" which is skipped based on the OS and it's settings. This is a [known bug](https://stackoverflow.com/questions/4647416/mac-packagemaker-destination-select-step-a-skipping-boption-permanently-disa).

## Related links

- [Packages Mac](http://s.sudre.free.fr/Software/Packages/about.html)
- [Packages User Guide](http://s.sudre.free.fr/Software/documentation/Packages/en/Packages_Installation.html)
- [Destination Select Bug](https://stackoverflow.com/questions/4647416/mac-packagemaker-destination-select-step-a-skipping-boption-permanently-disa)
