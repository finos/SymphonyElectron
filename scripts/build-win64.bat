:: Check to ensure that the VSDev command prompt is in the below location
echo "Starting VSDev Command Prompt"
call "C:\Program Files (x86)\Microsoft Visual Studio 14.0\Common7\Tools\VsDevCmd.bat"

echo %PATH%

set DISABLE_REBUILD=true

set PATH=%PATH%;C:\Program Files\nodejs\;C:\Program Files\Git\cmd
echo %PATH%

set PATH=%PATH%;C:\Program Files (x86)\GnuWin32\bin
echo %PATH%

WHERE git
if (%ERRORLEVEL% > 0) then (
  echo "GIT does not exist. Please set it up before running this script."
  EXIT /B 1
)

WHERE node
if (%ERRORLEVEL% > 0) then (
  echo "NODE does not exist. Please set it up before running this script."
  EXIT /B 1
)

WHERE npm
if (%ERRORLEVEL% > 0) then (
  echo "NPM does not exist. Please set it up before running this script."
  EXIT /B 1
)

WHERE gulp
if (%ERRORLEVEL% > 0) then (
  echo "GULP does not exist. Please set it up before running this script."
  EXIT /B 1
)

:: Below command replaces buildVersion with the appropriate build number from jenkins
sed -i -e "s/\"buildNumber\"[[:space:]]*\:[[:space:]]*\".*\"/\"buildNumber\":\"%PARENT_BUILD_VERSION%\"/g" package.json

:: Copy search libraries onto the project root
echo "Copying search libraries"
echo D | xcopy /y "C:\jenkins\workspace\tronlibraries\library" "library"

echo "Running npm install..."
call npm install

call npm i -g gulp-cli

:: Set expiry if required
IF ("%EXPIRY_PERIOD%"=="") then (
    echo "Not setting expiry for the build!"
) else (
    echo "Setting expiry to days: %EXPIRY_PERIOD%"
    call gulp setExpiry --period %EXPIRY_PERIOD%
)

echo "Running tests, code coverage, linting and building..."
call npm run unpacked-win
