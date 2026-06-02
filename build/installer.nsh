!include LogicLib.nsh
!include FileFunc.nsh
!include nsDialogs.nsh

!ifndef BUILD_UNINSTALLER
!macro customPageAfterChangeDir
  Page custom NormalizeInstallDirPageCreate NormalizeInstallDirPageLeave
!macroend

!macro customInit
  Call NormalizeDesignAssetManagerInstallDir
!macroend

Function NormalizeDesignAssetManagerInstallDir
  Push $0
  Push $1
  Push $2
  Push $3

  StrCpy $0 "$INSTDIR"

  trimTrailingSlash:
    StrLen $1 "$0"
    IntCmp $1 3 doneTrim doneTrim 0
    IntOp $2 $1 - 1
    StrCpy $3 "$0" 1 $2
    StrCmp "$3" "\" 0 doneTrim
    StrCpy $0 "$0" $2
    Goto trimTrailingSlash

  doneTrim:
    ${GetFileName} "$0" $1
    StrCmp "$1" "${APP_FILENAME}" alreadyHasAppFolder

    StrLen $2 "$0"
    IntOp $2 $2 - 1
    StrCpy $3 "$0" 1 $2
    StrCmp "$3" "\" appendWithoutSlash appendWithSlash

  appendWithoutSlash:
    StrCpy $INSTDIR "$0${APP_FILENAME}"
    Goto doneNormalize

  appendWithSlash:
    StrCpy $INSTDIR "$0\${APP_FILENAME}"
    Goto doneNormalize

  alreadyHasAppFolder:
    StrCpy $INSTDIR "$0"

  doneNormalize:
    Pop $3
    Pop $2
    Pop $1
    Pop $0
FunctionEnd

Function NormalizeInstallDirPageCreate
  Call NormalizeDesignAssetManagerInstallDir

  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 24u "最终安装文件夹："
  Pop $1
  ${NSD_CreateText} 0 28u 100% 13u "$INSTDIR"
  Pop $2
  EnableWindow $2 0
  ${NSD_CreateLabel} 0 50u 100% 28u "如果上一步选择的是父目录，安装程序会自动使用 Design Asset Manager 子文件夹。"
  Pop $3

  nsDialogs::Show
FunctionEnd

Function NormalizeInstallDirPageLeave
  Call NormalizeDesignAssetManagerInstallDir
FunctionEnd
!endif
