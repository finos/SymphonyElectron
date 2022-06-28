!macro preInit
    SetRegView 64
    WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "$PROGRAMFILES64\Symphony\Symphony"
    WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "$PROGRAMFILES64\Symphony\Symphony"
!macroend