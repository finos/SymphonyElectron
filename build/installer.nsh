!include LogicLib.nsh

Var PerUser
Var AllUser

Function uninstallSymphony
    StrCpy $0 0
    SetRegView 64
    loop:
        EnumRegKey $1 HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall" $0
        StrCmp $1 "" done
        ReadRegStr $2 HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\$1" "DisplayName"
        ${If} $2 == "Symphony"
            ReadRegStr $3 HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\$1" "UninstallString"
            ExecWait '$3  /qn'
        ${EndIf}
        IntOp $0 $0 + 1
        Goto loop
    done:
FunctionEnd

!macro copySystemGlobalConfig
    IfFileExists $PROGRAMFILES64\Symphony\Symphony\config\Symphony.config 0 +2
    CopyFiles /SILENT $PROGRAMFILES64\Symphony\Symphony\config\Symphony.config $WINDIR\Temp\temp-sys-Symphony.config
!macroend

!macro copyLocalGlobalConfig
    IfFileExists $LOCALAPPDATA\Programs\Symphony\Symphony\config\Symphony.config 0 +2
    CopyFiles /SILENT $LOCALAPPDATA\Programs\Symphony\Symphony\config\Symphony.config $LOCALAPPDATA\Temp\temp-local-Symphony.config
!macroend

!macro replaceSystemGlobalConfig
    IfFileExists $WINDIR\Temp\temp-sys-Symphony.config 0 +2
    CopyFiles /SILENT $WINDIR\Temp\temp-sys-Symphony.config $PROGRAMFILES64\Symphony\Symphony\config\Symphony.config
!macroend

!macro replaceLocalGlobalConfig
    IfFileExists $LOCALAPPDATA\Temp\temp-local-Symphony.config 0 +2
    CopyFiles /SILENT $LOCALAPPDATA\Temp\temp-local-Symphony.config $LOCALAPPDATA\Programs\Symphony\Symphony\config\Symphony.config
!macroend

!macro bothM
	MessageBox MB_OK "Auto update not supported as there is two version installed"
!macroend

!macro perUserM
    !insertmacro copyLocalGlobalConfig
    Call uninstallSymphony
    Sleep 10000
	SetRegView 64
    WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "$LOCALAPPDATA\Programs\Symphony\Symphony"
    WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "$LOCALAPPDATA\Programs\Symphony\Symphony"
!macroend

!macro allUserM
    ${IfNot} ${UAC_IsAdmin}
        ShowWindow $HWNDPARENT ${SW_HIDE}
        !insertmacro UAC_RunElevated
        Quit
    ${endif}
    !insertmacro copySystemGlobalConfig
    Call uninstallSymphony
    Sleep 10000
	SetRegView 64
    WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "$PROGRAMFILES64\Symphony\Symphony"
    WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "$PROGRAMFILES64\Symphony\Symphony"
!macroend

!macro abortM
	; MessageBox MB_OK "Something went wrong!! Could not find existing SDA"
!macroend

!macro validateInstallation
	IfFileExists $PROGRAMFILES64\Symphony\Symphony\Symphony.exe 0 +2
	StrCpy $AllUser "exists"

	IfFileExists $LOCALAPPDATA\Programs\Symphony\Symphony\Symphony.exe 0 +2
	StrCpy $PerUser "exists"
!macroend

!macro preInit
    !insertmacro validateInstallation
    ${If} $PerUser == "exists"
        ${AndIf} $AllUser == "exists"
            !insertmacro bothM
    ${ElseIf} $PerUser == "exists"
        !insertmacro perUserM
    ${ElseIf} $AllUser == "exists"
        !insertmacro allUserM
    ${Else}
        !insertmacro abortM
    ${EndIf}
!macroend

!macro customInstall
    ${If} $PerUser == "exists"
        !insertmacro replaceLocalGlobalConfig
    ${ElseIf} $AllUser == "exists"
        !insertmacro replaceSystemGlobalConfig
    ${Else}
        !insertmacro abortM
    ${EndIf}
!macroend

!macro customUnInit
    !insertmacro validateInstallation
    ${If} $AllUser == "exists"
        ${IfNot} ${UAC_IsAdmin}
            ShowWindow $HWNDPARENT ${SW_HIDE}
            !insertmacro UAC_RunElevated
            Quit
        ${endif}
    ${EndIf}
!macroend