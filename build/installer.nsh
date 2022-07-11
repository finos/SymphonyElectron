!include LogicLib.nsh

; Uninstall existing Symphony before installing a new version
!macro uninstallSymphony
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
!macroend

; Preinstall script
!macro preInit
    SetRegView 64
    !insertmacro uninstallSymphony
    WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "$PROGRAMFILES64\Symphony\Symphony"
    WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "$PROGRAMFILES64\Symphony\Symphony"
!macroend