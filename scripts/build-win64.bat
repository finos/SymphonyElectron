:: Check to ensure that the VSDev command prompt is in the below location
echo "Starting VSDev Command Prompt"
call "C:\Program Files (x86)\Microsoft Visual Studio 14.0\Common7\Tools\VsDevCmd.bat"

echo %PATH%

set DISABLE_REBUILD=true
set NODE_REQUIRED_VERSION=10.17.0
set SNYK_API_TOKEN=885953dc-9469-443c-984d-524352d54116

set PATH=%PATH%;C:\Program Files\nodejs\;C:\Program Files\Git\cmd
echo %PATH%

set PATH=%PATH%;C:\Program Files (x86)\GnuWin32\bin
echo %PATH%

call nvm install %NODE_REQUIRED_VERSION%
call nvm use %NODE_REQUIRED_VERSION%

WHERE gulp
if %ERRORLEVEL% NEQ 0 (
  echo "GULP does not exist. Installing it."
  call npm i gulp -g
)

WHERE snyk
if %ERRORLEVEL% NEQ 0 (
  echo "Snyk does not exist! Installing and setting it up"
  call npm i snyk -g
  call snyk config set api=%SNYK_API_TOKEN%
)

:: Below command replaces buildVersion with the appropriate build number from jenkins
sed -i -e "s/\"buildNumber\"[[:space:]]*\:[[:space:]]*\".*\"/\"buildNumber\":\"%PARENT_BUILD_VERSION%\"/g" package.json

:: Copy search libraries onto the project root
echo "Copying search libraries"
echo D | xcopy /y "C:\jenkins\workspace\tronlibraries\library" "library"

echo "Installing dependencies..."
call npm install

# Run Snyk Security Tests
echo "Running snyk security tests"
call snyk test --file=package.json

:: Set expiry if required
IF "%EXPIRY_PERIOD%"=="" (
    echo "Not setting expiry for the build!"
) else (
    echo "Setting expiry to days: %EXPIRY_PERIOD%"
    call gulp setExpiry --period %EXPIRY_PERIOD%
)

echo "Running tests, code coverage, linting and building..."
call npm run unpacked-win