## Prerequisites

### Windows
- NodeJS version >= 18.16.0
- Microsoft Visual Studio 2017 Community or Paid (C++ and .NET/C# development tools)
- Python >= 2.7.1
- Dot Net 3.5 SP1 or later

#### Notes
- C++ tools are required to recompile node modules
- Dot NET/C# tools required to compile screen-snippet module
- Open 'Developer Command Prompt for VS2017'. This sets paths to visual studio build tools.

### Mac
- Xcode command line tools. Or better, Xcode latest version
- NodeJS version >= 18.16.0
- [Sudre Packages](http://s.sudre.free.fr/Software/Packages/about.html)

#### Notes
- Ensure you have accepted the XCode license agreement
- We use Sudre packages to create a .pkg installer file

## Running SDA

- Set this.origin to '*' in `app-bridge.ts` when running the demo.
- Search for `// DEMO-APP:` and comment that line back in.
- Make sure to comment it out again before you commit.


```
# Install dependencies
npm install

# Build SDA
npm run prebuild

# Run against a POD
npm run dev -- --url=https://corporate.symphony.com

# Run the demo app
npm run demo
```

## Tests

```
# Run all the tests
npm run compile:spec
npm run test

# Specific Tests
npm run test -- --match=spell*

# Run Unit tests only
npm run test:unit

# Specific Unit tests
npm run test:unit -- --match=spell*
```

### Code Coverage
- We capture the Code coverage reports under [coverage](out/coverage)
- To check the test run report, see the [out](out/) directory
- See the [tests](spec/) directory to find all the unit tests

## Packaging:

- Add Artifactory credentials to your home directory `.npmrc` file

1. Login to https://repo.symphony.com/ in your browser
2. Open https://repo.symphony.com/artifactory/webapp/#/profile
3. Click generate token
4. Execute `curl --location --request GET 'https://repo.symphony.com/artifactory/api/npm/auth' --header 'X-JFrog-Art-Api: <token from #3>'`
5. Update ~/.npmrc with:

```
registry = https://repo.symphony.com/artifactory/api/npm/npm-virtual-dev/
//repo.symphony.com/artifactory/api/npm/npm-virtual-dev/:_auth = <auth value from #4>
always-auth = true
```

### Mac 🖥
- npm install
- npm run dev (to run locally)
- To build the macOS app:
  * Run the command `npm run unpacked-mac`
  * The distributable is created in the `dist/mac` directory
- To build mac package (installer):
  * Run the command `npm run packed-mac`
  * The .pkg file will be generated in the `installer/mac/build` directory

### Windows 💻
- npm install
- npm run dev (to run locally)
- To build windows unpacked exe:
  * Run the command `npm run unpacked-win`
  * The distributable is created in the `dist/win-unpacked` directory
- To build windows 64-bit unpacked exe:
  * Run the command `npm run unpacked-win`
  * The distributable is created in the `dist/win-unpacked` directory
- To create msi (installer):
  * Run the advanced installer script located in `installer/win` directory

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

### Linux 🐳
- Download and install Docker daemon [here](https://www.docker.com/products/docker-desktop)
- Run the below docker commands under the project directory
- To generate and tag the container
`docker build -t linux:6.0.0 --build-arg REPO=https://github.com/symphonyoss/SymphonyElectron --build-arg BRANCH=linux .`
- To make sure the image is created and tagged correctly
`docker images`
- To run the docker image and generate the linux builds 🎉
`docker run --name linux linux:6.0.0`
- To copy the builds
`docker cp linux:/SymphonyElectron/dist/symphony-6.1.0.x86_64.rpm ~/Desktop`
`docker cp linux:/SymphonyElectron/dist/symphony_6.1.0_amd64.deb ~/Desktop`

##### Other useful docker commands
- To connect to the interactive bash
`docker run -i -t linux:6.0.0 /bin/bash`
- To delete all stopper containers
`docker system prune -a`
- To delete the container/image
`docker rmi -f linux:6.0.0`

### Change POD URL
- To change the start url (i.e., pod url), edit config/Symphony.config and change 'url' variable. if no protocol provided, then https will be added.
- The installer will include file config/Symphony.config next to executable. Changes in this file will affect all
 users.
- Alternatively, to run against a specific pod, launch Symphony (SDA) with the command line parameter `--url=pod_url
`. With this, you don't have to change the config/Symphony.config file every time.

## Troubleshooting
### Logging
- We enable local logging for dev environments using the module [electron-log](https://www.npmjs.com/package
/electron-log)
- On macOS, we store the logs under `~/Library/Logs/Electron/app_<timestamp>.log`
- On Windows, we store the logs under `%USERPROFILE%\AppData\Roaming\Electron\app_<timestamp>.log`
- On Linux, we store the logs under `~/.config/Electron/logs/app_<timestamp>.log`

### Customisation
- If you need to run against a POD without proper cert use cmd line option: --ignore-certificate-errors
- To start an additional instance with custom data directory (if you want seperate user) use cmd line options
: --multiInstance --userDataPath=`<path to data dir>`
- If directory doesn't exist, it will be created
