:: Check to ensure that the VSDev command prompt is in the below location
echo "Starting VSDev Command Prompt"
call "C:\Program Files (x86)\Microsoft Visual Studio\2017\Community\Common7\Tools\VsDevCmd.bat"

echo %PATH%

set DISABLE_REBUILD=true
set NODE_REQUIRED_VERSION=12.13.1
set SNYK_ORG=sda
set SNYK_PROJECT_NAME="Symphony Desktop Application"

set PATH=%PATH%;C:\Program Files\nodejs\;C:\Program Files\Git\cmd
echo %PATH%

set PATH=%PATH%;C:\Program Files (x86)\GnuWin32\bin
echo %PATH%

call nvm install %NODE_REQUIRED_VERSION%
call nvm use %NODE_REQUIRED_VERSION%

call npm config set msvs_version 2017
set VCTargetsPath=C:\Program Files (x86)\Microsoft Visual Studio\2017\BuildTools\Common7\IDE\VC\VCTargets

WHERE gulp
if %ERRORLEVEL% NEQ 0 (
  echo "GULP does not exist. Installing it."
  call npm i gulp -g
)

WHERE snyk
if %ERRORLEVEL% NEQ 0 (
  echo "Snyk does not exist! Installing and setting it up"
  call npm i snyk -g
)
echo "Setting snyk org to %SNYK_ORG% and api token to %SNYK_API_TOKEN%"
call snyk config set org=%SNYK_ORG%
call snyk config set api=%SNYK_API_TOKEN%

:: Below command replaces buildVersion with the appropriate build number from jenkins
sed -i -e "s/\"buildNumber\"[[:space:]]*\:[[:space:]]*\".*\"/\"buildNumber\":\"%PARENT_BUILD_VERSION%\"/g" package.json

:: Copy search libraries onto the project root
echo "Copying search libraries"
echo D | xcopy /y "C:\jenkins\workspace\tronlibraries\library" "library"

echo "Installing dependencies..."
call npm install

# Run Snyk Security Tests
echo "Running snyk security tests"
call snyk test --file=package-lock.json --org=%SNYK_ORG%
call snyk monitor --file=package-lock.json --org=%SNYK_ORG% --project-name=%SNYK_PROJECT_NAME%

:: Set expiry if required
IF "%EXPIRY_PERIOD%"=="" (
    echo "Not setting expiry for the build!"
) else (
    echo "Setting expiry to days: %EXPIRY_PERIOD%"
    call gulp setExpiry --period %EXPIRY_PERIOD%
)

echo "Running tests, code coverage, linting and building..."
call npm run unpacked-win

echo "Updating 64 bit installer file with hashed passwd..."

set hashedPasswdFile=%HASHED_PASSWORD_FILE_PATH%

if NOT EXIST %hashedPasswdFile% (
  echo "can not find hashed password file in: " %hashedPasswdFile%
  exit /b -1
)

set /p hashedPasswd=<%hashedPasswdFile%

set installerFile=installer\win\Symphony-x64.aip
if NOT EXIST %installerFile% (
  echo "can not find installer file in: " %installerFile%
  exit /b -1
)

call powershell -Command "(get-content %installerFile%) | foreach-object {$_ -replace '4A99BAA4D493EE030480AF53BA42EA11CCFB627AB1800400DA9692073D68C522A10A4FD0B5F78525294E51AC7194D55B5EE1D31F', '%hashedPasswd%'} | set-content %installerFile%"

echo "creating 64 bit msi..."

rem add AdvancedInstaller.com to PATH
set PATH="%PATH%";C:\Program Files\nodejs\;C:\Program Files (x86)\Caphyon\Advanced Installer 15.9\bin\x86
echo %PATH%

call node -e "console.log(require('./package.json').version);" > version.txt
set /p baseVer=<version.txt

set SYMVER=%baseVer%
if NOT DEFINED SYMVER (
	echo "environment variable SYMVER not defined"
	exit /b -1
)

echo "creating targets directory for symphony version: " %SYMVER%
rmdir /q /s targets
mkdir targets
set targetsDir="%CD%\targets\"

IF "%EXPIRY_PERIOD%"=="0" (
    set archiveName=Symphony-Win64-%SYMVER%-%PARENT_BUILD_VERSION%
) else (
    set archiveName=Symphony-Win64-%SYMVER%-%PARENT_BUILD_VERSION%-TTL-%EXPIRY_PERIOD%
)

set installerDir="%CD%\installer\win"
set distDir="%CD%\dist"
set rootDir="%CD%"

if NOT EXIST "%PFX_DIR%\%PFX_FILE%" (
  echo "can not find .pfx file" "%pfxDir%\%pfxFile%"
  exit /b -1
)

copy /y "%PFX_DIR%\%PFX_FILE%" "%installerDir%\%PFX_FILE%"

cd %installerDir%

set AIP=Symphony-x64

if EXIST %AIP%-cache (
	echo "remove old msi cache file"
	rmdir /q /s %AIP%-cache
)
if EXIST %AIP%-SetupFiles (
	echo "remove old msi setup files"
	rmdir /q /s %AIP%-SetupFiles
)

echo "Running Advanced Installer to build MSI"

call AdvancedInstaller.com /edit %AIP%.aip /SetVersion %SYMVER%
IF %errorlevel% neq 0 (
	echo "failed to set advanced installer build version"
	exit /b -1
)

call AdvancedInstaller.com /build %AIP%.aip
IF %errorlevel% neq 0 (
	echo "error returned from advanced installer:" %errorlevel%
	exit /b -1
)

if NOT EXIST %AIP%-SetupFiles/%AIP%.msi (
	echo "Failure - Did not produce MSI"
	exit /b -1
)

echo "Copying Legacy MSI installer to target dir"
copy "%AIP%-SetupFiles\%AIP%.msi" "%targetsDir%\Legacy-%archiveName%.msi"

if NOT EXIST %SIGNING_FILE_PATH% (
    echo Signing failed, 'signing.bat' not found.
    exit /b -1
)

call %SIGNING_FILE_PATH% ..\..\dist\win-unpacked\resources\app.asar.unpacked\node_modules\spawn-rx\vendor\jobber\Jobber.exe
IF %errorlevel% neq 0 (
	echo "Signing failed"
	exit /b -1
)

call %SIGNING_FILE_PATH% ..\..\dist\win-unpacked\resources\app.asar.unpacked\node_modules\screen-share-indicator-frame\ScreenShareIndicatorFrame.exe
IF %errorlevel% neq 0 (
	echo "Signing failed"
	exit /b -1
)

call %SIGNING_FILE_PATH% ..\..\dist\win-unpacked\resources\app.asar.unpacked\node_modules\screen-snippet\ScreenSnippet.exe
IF %errorlevel% neq 0 (
	echo "Signing failed"
	exit /b -1
)

call %SIGNING_FILE_PATH% ..\..\dist\win-unpacked\Symphony.exe
IF %errorlevel% neq 0 (
	echo "Signing failed"
	exit /b -1
)

call %SIGNING_FILE_PATH% ..\..\library\indexvalidator-x64.exe
IF %errorlevel% neq 0 (
	echo "Signing failed"
	exit /b -1
)

call %SIGNING_FILE_PATH% ..\..\library\lz4-win-x64.exe
IF %errorlevel% neq 0 (
	echo "Signing failed"
	exit /b -1
)

call %SIGNING_FILE_PATH% ..\..\library\tar-win.exe
IF %errorlevel% neq 0 (
	echo "Signing failed"
	exit /b -1
)

echo "Building new installer with Wix Sharp"
call "BuildWixSharpInstaller.bat"

call %SIGNING_FILE_PATH% WixSharpInstaller\Symphony.msi
IF %errorlevel% neq 0 (
	echo "Failed to sign installer"
	exit /b -1
)

echo "Copying New MSI installer to target dir"
copy "WixSharpInstaller\Symphony.msi" "%targetsDir%\%archiveName%.msi"

echo "Setting up markdown to pdf package"
%SystemRoot%\System32\where.exe /q markdown-pdf
if ERRORLEVEL 1 (
    echo "Markdown to PDF package missing, installing it now."
    call npm install -g markdown-pdf
)

echo "Generating installation instructions"
call %appdata%\npm\markdown-pdf install_instructions_win.md
copy install_instructions_win.pdf "%targetsDir%\Install-Instructions-%archiveName%.pdf"

echo Generate release notes
cd %rootDir%
call %appdata%\npm\markdown-pdf RELEASE_NOTES.md
copy RELEASE_NOTES.pdf "%targetsDir%\Release-Notes-%archiveName%.pdf"

echo "All done, job successful :)"
