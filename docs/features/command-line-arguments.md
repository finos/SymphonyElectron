# Intro
Electron allows us to pass command line arguments to make special configuration available on a per run basis.

# Platforms Supported
macOS, Windows 10, Windows 7

# Purpose
To make special configuration available on a per run basis.

# Details
The following command line arguments are currently supported (and parsed) with the Symphony Electron app.

- userDataPath - To set custom user data path. Mostly used for running multiple instances in case of automation tests.
- url - To set custom pod url. Only available in dev environments
- multiInstance - To allow running multiple instance of the wrapper. Only recommended for running automation tests / dev environments.
- logPath - To set custom log file location

# Chrome Flags
You can also pass chrome flags as command line arguments. See this [documentation](https://github.com/electron/electron/blob/master/docs/api/chrome-command-line-switches.md) to see what flags are supported.
Note: any chrome flag has to be passed starting with "--", if otherwise, SDA won't process it.

Arguments such as "url", "userDataPath", "logPath", "multiInstance", "symphony://", "inspect" and "inspect-brk" are considered as special arguments and won't be set as chrome flags.

# Examples
To start the app with command line arguments, follow the examples below:

## Windows
```
C:\Program Files\Symphony\Symphony.exe --userDataPath="C:\\Users\\example\Desktop\config" --logPath="C:\\Users\\example\Desktop\logs" --url="https://example.symphony.com" --multiInstance --disable-http-cache --proxy-pac-url=http://google.com
```

## macOS
```
/Applications/Symphony.app/Contents/MacOS/Symphony --userDataPath="/Users/example/Desktop/config" --logPath="/Users/example/Desktop/logs" --url="https://example.symphony.com" --multiInstance --disable-http-cache --proxy-pac-url=http://google.com
```

# Other Info
Note that some of the above arguments may only be applicable in a development environment
