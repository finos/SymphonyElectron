@echo off

echo "Running jenkins-win64.bat"

call "scripts\build-win64.bat"

echo "updating 64 bit installer file with hashed passwd..."

set hashedPasswdFile=C:\electron-installer\hashedPasswd.txt

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

set pfxDir=C:\electron-installer
set pfxFile=Wrapper.Windows.Product.RSA.pkcs12.pfx
if NOT EXIST "%pfxDir%\%pfxFile%" (
  echo "can not find .pfx file" "%pfxDir%\%pfxFile%"
  exit /b -1
)

copy /y "%pfxDir%\%pfxFile%" "%installerDir%\%pfxFile%"

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

echo "running advanced installer to build msi"

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
	echo "failure did not produce msi"
	exit /b -1
)

echo "copy msi result to target dir"
copy "%AIP%-SetupFiles\%AIP%.msi" "%targetsDir%\%archiveName%.msi"

echo Building new installer with wix#
call "BuildWixSharpInstaller.bat"

if NOT EXIST c:\electron-installer\signing.bat (
    echo Signing failed, 'signing.bat' not found.
    exit /b -1
)

call c:\electron-installer\signing.bat
copy "WixSharpInstaller\Symphony.msi" "%targetsDir%\Experimental-%archiveName%.msi"

%SystemRoot%\System32\where.exe /q markdown-pdf
if ERRORLEVEL 1 (
    call npm install -g markdown-pdf
)
markdown-pdf install_instructions_win.md -o "%targetsDir%\Install-Instructions-Experimental-%archiveName%.pdf"
