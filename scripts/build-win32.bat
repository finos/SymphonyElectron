:: Check to ensure that the VSDev command prompt is in the below location
echo "Starting VSDev Command Prompt"
call "C:\Program Files (x86)\Microsoft Visual Studio 14.0\Common7\Tools\VsDevCmd.bat"

echo %PATH%

set DISABLE_REBUILD=true
set NODE_REQUIRED_VERSION=12.13.1

set PATH=%PATH%;C:\Program Files\nodejs\;C:\Program Files\Git\cmd
echo %PATH%

set PATH=%PATH%;C:\Program Files (x86)\GnuWin32\bin
echo %PATH%

WHERE git
if %ERRORLEVEL% NEQ 0 (
  echo "GIT does not exist. Please set it up before running this script."
  EXIT /B 1
)

WHERE nvm
if %ERRORLEVEL% NEQ 0 (
  echo "NVM does not exist. Please set it up before running this script."
  EXIT /B 1
)

nvm install %NODE_REQUIRED_VERSION%
nvm use %NODE_REQUIRED_VERSION%

WHERE node
if %ERRORLEVEL% NEQ 0 (
  echo "NODE does not exist. Please set it up before running this script."
  EXIT /B 1
)

WHERE npm
if %ERRORLEVEL% NEQ 0 (
  echo "NPM does not exist. Please set it up before running this script."
  EXIT /B 1
)

call npm i -g gulp-cli

WHERE gulp
if %ERRORLEVEL% NEQ 0 (
  echo "GULP does not exist. Please set it up before running this script."
  EXIT /B 1
)

echo "Node version is: "
call node --version

:: Below command replaces buildVersion with the appropriate build number from jenkins
sed -i -e "s/\"buildNumber\"[[:space:]]*\:[[:space:]]*\".*\"/\"buildNumber\":\"%PARENT_BUILD_VERSION%\"/g" package.json

:: Copy search libraries onto the project root
echo "Copying search libraries"
echo D | xcopy /y "C:\jenkins\workspace\tronlibraries\library" "library"

echo "Running npm install..."
call npm install

:: Set expiry if required
IF "%EXPIRY_PERIOD%"=="" (
    echo "Not setting expiry for the build!"
) else (
    echo "Setting expiry to days: %EXPIRY_PERIOD%"
    call gulp setExpiry --period %EXPIRY_PERIOD%
)

echo "Running tests, code coverage, linting and building..."
call npm run unpacked-win-x86
