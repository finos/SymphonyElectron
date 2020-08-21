echo off
@setlocal
set WixLocation=E:\PrivateData\Galos\Projects\WixSharp\Source\src\WixSharp.Samples\Wix_bin\bin
call "E:\PrivateData\Galos\Projects\WixSharp\Source\src\WixSharp.Samples\Wix_bin\bin\candle.exe" -sw1026    "E:\PrivateData\Galos\Projects\WixSharp\Source\src\WixSharp.Samples\Wix# Samples\CustomActions\setup.wxs"  -out "E:\PrivateData\Galos\Projects\WixSharp\Source\src\WixSharp.Samples\Wix# Samples\CustomActions\setup.wixobj"
if ERRORLEVEL 1 @echo candle.exe failed & GOTO ERROR
call "E:\PrivateData\Galos\Projects\WixSharp\Source\src\WixSharp.Samples\Wix_bin\bin\light.exe" -sw1076 -sw1079   -b "E:\PrivateData\Galos\Projects\WixSharp\Source\src\WixSharp.Samples\Wix# Samples\CustomActions" "E:\PrivateData\Galos\Projects\WixSharp\Source\src\WixSharp.Samples\Wix# Samples\CustomActions\setup.wixobj"  -out "E:\PrivateData\Galos\Projects\WixSharp\Source\src\WixSharp.Samples\Wix# Samples\CustomActions\setup.msi" -cultures:"en-US"
if ERRORLEVEL 1 @echo light.exe failed & GOTO ERROR
@endlocal
EXIT /B 0
:ERROR
@endlocal
EXIT /B 1
