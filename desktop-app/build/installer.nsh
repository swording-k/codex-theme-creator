; The desktop controller keeps running in the tray after its window closes.
; Stop only this app before NSIS replaces its executable and ffmpeg runtime.
!macro customInit
  nsExec::Exec 'taskkill /F /T /IM "Codex Theme Creator.exe"'
  Pop $0
!macroend

; Old test builds could leave a shortcut that targets a removed custom folder.
; Rewrite both links after Electron Builder has extracted the current executable.
!macro customInstall
  CreateShortCut "$newStartMenuLink" "$appExe" "" "$appExe" 0 "" "" "Codex Theme Creator"
  CreateShortCut "$newDesktopLink" "$appExe" "" "$appExe" 0 "" "" "Codex Theme Creator"
!macroend
