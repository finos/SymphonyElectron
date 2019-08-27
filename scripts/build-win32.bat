echo "invoking visual dev tools..."
call "C:\Program Files (x86)\Microsoft Visual Studio 14.0\Common7\Tools\VsDevCmd.bat"
echo %PATH%

set DISABLE_REBUILD=true

set PATH=%PATH%;C:\Program Files\nodejs\;C:\Program Files\Git\cmd
echo %PATH%

set PATH=%PATH%;C:\Program Files (x86)\GnuWin32\bin
echo %PATH%

:: Below command replaces buildVersion with the appropriate build number from jenkins
:: https://superuser.com/questions/339118/regex-replace-from-command-line
sed -i -e "s/\"buildNumber\"[[:space:]]*\:[[:space:]]*\".*\"/\"buildNumber\":\"%PARENT_BUILD_VERSION%\"/g" package.json

sed -i -e "s/\"electronDist\"[[:space:]]*\:[[:space:]]*\".*\"/\"electronDist\":\"C:\\jenkins\\workspace\\R64\"/g" package.json

echo "Copying search libraries"
echo D | xcopy /y "C:\jenkins\workspace\tronlibraries\library" "library"

echo "Running npm install..."
call npm install

call npm i -g gulp-cli
echo "Setting expiry to days: %EXPIRY_PERIOD%"
call gulp setExpiry --period %EXPIRY_PERIOD%

echo "Running tests, code coverage, linting and building..."
call npm run unpacked-win-x86
