!define StrRep "!insertmacro StrRep"
!macro StrRep output string old new
    Push `${string}`
    Push `${old}`
    Push `${new}`
    !ifdef __UNINSTALL__
        Call un.StrRep
    !else
        Call StrRep
    !endif
    Pop ${output}
!macroend
 
!macro Func_StrRep un
    Function ${un}StrRep
        Exch $R2 ;new
        Exch 1
        Exch $R1 ;old
        Exch 2
        Exch $R0 ;string
        Push $R3
        Push $R4
        Push $R5
        Push $R6
        Push $R7
        Push $R8
        Push $R9
 
        StrCpy $R3 0
        StrLen $R4 $R1
        StrLen $R6 $R0
        StrLen $R9 $R2
        loop:
            StrCpy $R5 $R0 $R4 $R3
            StrCmp $R5 $R1 found
            StrCmp $R3 $R6 done
            IntOp $R3 $R3 + 1 ;move offset by 1 to check the next character
            Goto loop
        found:
            StrCpy $R5 $R0 $R3
            IntOp $R8 $R3 + $R4
            StrCpy $R7 $R0 "" $R8
            StrCpy $R0 $R5$R2$R7
            StrLen $R6 $R0
            IntOp $R3 $R3 + $R9 ;move offset by length of the replacement string
            Goto loop
        done:
 
        Pop $R9
        Pop $R8
        Pop $R7
        Pop $R6
        Pop $R5
        Pop $R4
        Pop $R3
        Push $R0
        Push $R1
        Pop $R0
        Pop $R1
        Pop $R0
        Pop $R2
        Exch $R1
    FunctionEnd
!macroend
!insertmacro Func_StrRep ""

Var STR_HAYSTACK
Var STR_NEEDLE
Var STR_CONTAINS_VAR_1
Var STR_CONTAINS_VAR_2
Var STR_CONTAINS_VAR_3
Var STR_CONTAINS_VAR_4
Var STR_RETURN_VAR
 
Function StrContains
  Exch $STR_NEEDLE
  Exch 1
  Exch $STR_HAYSTACK
  ; Uncomment to debug
  ;MessageBox MB_OK 'STR_NEEDLE = $STR_NEEDLE STR_HAYSTACK = $STR_HAYSTACK '
    StrCpy $STR_RETURN_VAR ""
    StrCpy $STR_CONTAINS_VAR_1 -1
    StrLen $STR_CONTAINS_VAR_2 $STR_NEEDLE
    StrLen $STR_CONTAINS_VAR_4 $STR_HAYSTACK
    loop:
      IntOp $STR_CONTAINS_VAR_1 $STR_CONTAINS_VAR_1 + 1
      StrCpy $STR_CONTAINS_VAR_3 $STR_HAYSTACK $STR_CONTAINS_VAR_2 $STR_CONTAINS_VAR_1
      StrCmp $STR_CONTAINS_VAR_3 $STR_NEEDLE found
      StrCmp $STR_CONTAINS_VAR_1 $STR_CONTAINS_VAR_4 done
      Goto loop
    found:
      StrCpy $STR_RETURN_VAR $STR_NEEDLE
      Goto done
    done:
   Pop $STR_NEEDLE ;Prevent "invalid opcode" errors and keep the
   Exch $STR_RETURN_VAR  
FunctionEnd
 
!macro _StrContainsConstructor OUT NEEDLE HAYSTACK
  Push `${HAYSTACK}`
  Push `${NEEDLE}`
  Call StrContains
  Pop `${OUT}`
!macroend
 
!define StrContains '!insertmacro "_StrContainsConstructor"'
!include LogicLib.nsh
!include TextFunc.nsh

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

Function WriteFindAt
  Exch $0 ;file
  Exch
  Exch $1 ;key
  Exch 2
  Exch $2 ;string to write
  Exch 2
  Push $3
  Push $4
  

  FileOpen $4 $0 r
  GetTempFileName $R0 $LOCALAPPDATA\Programs
  FileOpen $R4 $R0 w
  
  #FileOpen $8 "E:\Projects\NSIS\$1_0.txt" w This one is for debugging purpose if you need, open it
  #CopyFiles /SILENT $0 "E:\Projects\NSIS\$1.txt"

  loopFind:
    FileRead $4 $R1
    ${If} $R1 == ""
      #FileWrite $8 "At Error"
      #FileWrite $8 "$R1$\r$\n"
      Goto done
    ${Else}
      ${StrContains} $R5 "$\"url$\":" $R1
      #FileWrite $8 "$R1$\r$\n"
      #FileWrite $8 "At loop find"

      StrCmp $R5 "" notfound
        #FileWrite $8 "$R5$\r$\n"
        #FileWrite $8 "At URL found"
        FileWrite $R4 "$R1"
        FileWrite $R4 "$2$\r$\n"
        Goto loopFind
      notfound:
        ${StrContains} $R6 $1 $R1
        #FileWrite $8 "At not found"
        #FileWrite $8 "$R6$\r$\n"
        StrCmp $R6 "" notmatchkey
        #FileWrite $8 "At key found"
        #FileWrite $8 "$R6$\r$\n"
          Goto loopFind
        notmatchkey:
          ${StrContains} $R7 "$\"chromeFlags$\":" $R1
          #FileWrite $8 "At key not found"
          #FileWrite $8 "$R1$\r$\n"
            StrCmp $R7 "" writekey
            ${StrRep} $R2 $R1 "," ""
            FileWrite $R4 "$R2"
            Goto loopFind
					writekey:
          FileWrite $R4 $R1
          Goto loopFind
    ${EndIf}
    done:
      FileClose $R4
      FileClose $4
      #FileWrite $8 "At done"
      #FileWrite $8 "$4$\r$\n"
      #FileWrite $8 "At done"
      #FileWrite $8 "$R4$\r$\n"
      CopyFiles /SILENT $R0 $0
      Delete $R0
      pop $0
      pop $1
      pop $2
      pop $3
      pop $4
      pop $5
      pop $6
      pop $R0
      pop $R1
      pop $R4
      pop $R5
      pop $R6
FunctionEnd

!macro migrationFailed
  MessageBox MB_OK "Auto update migration not supported as there are two versions installed"
!macroend

Function SearchAndReplace
  ${If} $PerUser == "exists"
    ${AndIf} $AllUser == "exists"
      !insertmacro migrationFailed
  ${ElseIf} $AllUser == "exists"
    StrCpy $3 "$PROGRAMFILES64\Symphony\Symphony\config\Symphony.config"
    ${ElseIf} $PerUser == "exists"
      StrCpy $3 "$LOCALAPPDATA\Programs\Symphony\Symphony\config\Symphony.config"
    ${EndIf}
  pop $0
  pop $1
    StrCpy $4 "$\t$\"$0$\": $1,"
  
  #FileOpen $8 "E:\Projects\NSIS\text.txt" w
  #FileWrite $8 "$0$\r$\n"
  #FileWrite $8 "$1$\r$\n"
  #FileWrite $8 "$4$\r$\n"
  #FileClose $8

  #LogText $0
  #DetailPrint $0
  #DetailPrint $1
  #DetailPrint $4

  # Find the term in the config

    IfFileExists $3 0 +2
      Push $4
      Push $0
      Push $3
      Call WriteFindAt
  Pop $0
  Pop $1
  Pop $2
  Pop $3
  Pop $4

FunctionEnd

# isPodUrlEditable
Function updateConfigIsPodUrlEditable
  push true
  push isPodUrlEditable
  call SearchAndReplace
FunctionEnd

# forceAutoUpdate
Function updateConfigForceAutoUpdate
  push false
  push forceAutoUpdate
  call SearchAndReplace
FunctionEnd

# enableBrowserLogin
Function updateConfigEnableBrowserLogin
  push false
  push enableBrowserLogin
  call SearchAndReplace
FunctionEnd

# browserLoginAutoConnect
Function updateConfigBrowserLoginAutoConnect
  push false
  push browserLoginAutoConnect
  call SearchAndReplace
FunctionEnd

# betaAutoUpdateChannelEnabled
Function updateConfigBetaAutoUpdateChannelEnabled
  push true
  push betaAutoUpdateChannelEnabled
  call SearchAndReplace
FunctionEnd

# latestAutoUpdateChannelEnabled
Function updateConfigLatestAutoUpdateChannelEnabled
  push true
  push latestAutoUpdateChannelEnabled
  call SearchAndReplace
FunctionEnd

Function scriptMigration
  call updateConfigIsPodUrlEditable
  call updateConfigForceAutoUpdate
  call updateConfigEnableBrowserLogin
  call updateConfigBrowserLoginAutoConnect
  call updateConfigBetaAutoUpdateChannelEnabled
  call updateConfigLatestAutoUpdateChannelEnabled
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
  MessageBox MB_OK "Auto update not supported as there are two versions installed"
!macroend

!macro perUserM
  call scriptMigration
  !insertmacro copyLocalGlobalConfig
  Call uninstallSymphony
  WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "$LOCALAPPDATA\Programs\Symphony\Symphony"
  WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "$LOCALAPPDATA\Programs\Symphony\Symphony"
!macroend

!macro allUserM
  ${IfNot} ${UAC_IsAdmin}
    ShowWindow $HWNDPARENT ${SW_HIDE}
    !insertmacro UAC_RunElevated
    Quit
  ${endif}
  call scriptMigration
  !insertmacro copySystemGlobalConfig
  Call uninstallSymphony
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