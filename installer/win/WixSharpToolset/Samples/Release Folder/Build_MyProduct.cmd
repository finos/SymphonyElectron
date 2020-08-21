echo off
@setlocal
set WixLocation=E:\PrivateData\Galos\Projects\WixSharp\Source\src\WixSharp.Samples\Wix_bin\bin
call "E:\PrivateData\Galos\Projects\WixSharp\Source\src\WixSharp.Samples\Wix_bin\bin\candle.exe" -sw1026    -ext "E:\PrivateData\Galos\Projects\WixSharp\Source\src\WixSharp.Samples\Wix_bin\bin\WixUIExtension.dll" "E:\PrivateData\Galos\Projects\WixSharp\Source\src\WixSharp.Samples\Wix# Samples\Release Folder\MyProduct.wxs"  -out "E:\PrivateData\Galos\Projects\WixSharp\Source\src\WixSharp.Samples\Wix# Samples\Release Folder\MyProduct.wixobj"
if ERRORLEVEL 1 @echo candle.exe failed & GOTO ERROR
call "E:\PrivateData\Galos\Projects\WixSharp\Source\src\WixSharp.Samples\Wix_bin\bin\light.exe" -sw1076 -sw1079   -b "E:\PrivateData\Galos\Projects\WixSharp\Source\src\WixSharp.Samples\Wix# Samples\Release Folder" "E:\PrivateData\Galos\Projects\WixSharp\Source\src\WixSharp.Samples\Wix# Samples\Release Folder\MyProduct.wixobj"  -out "E:\PrivateData\Galos\Projects\WixSharp\Source\src\WixSharp.Samples\Wix# Samples\Release Folder\MyProduct.msi" -ext "E:\PrivateData\Galos\Projects\WixSharp\Source\src\WixSharp.Samples\Wix_bin\bin\WixUIExtension.dll" -cultures:"en-US"
if ERRORLEVEL 1 @echo light.exe failed & GOTO ERROR
@endlocal
EXIT /B 0
:ERROR
@endlocal
EXIT /B 1
