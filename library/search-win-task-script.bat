@echo off
QPROCESS "Symphony.exe">NUL
IF %ERRORLEVEL% == 0 (
   ECHO true
) ELSE (
    ECHO %1
    rmdir /s /q %1
    schtasks /delete /tn SymphonySearchTask /f
)