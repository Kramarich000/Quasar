; installer.nsh — обновлённый скрипт с поддержкой silent-режима
!include "MUI2.nsh"
Unicode true
!define MUI_UNICODE
!include "WinMessages.nsh"
!include "nsDialogs.nsh"

Name "Quasar"

InstallDir "$LOCALAPPDATA\Programs\Quasar"

; !define MUI_ICON "icon.ico"
; !define MUI_UNICON "icon.ico"

!define HEADER_BMP  "C:\Users\karen\OneDrive\Quasar\src\build\header.bmp"
!define MUI_LICENSEFILE "C:\Users\karen\OneDrive\Quasar\src\build\LICENSE.txt"

; ------------------------------------------
; 1) Ловим silent-запуск (/S или --update) и устанавливаем флаг
!define INST_SILENT "0"
Function .onInit
  GetParameters $R0
  ; Проверяем флаг /S (silent) или --update
  StrStr $R0 "/S" $R1
  StrCmp $R1 "" 0 +2
    StrCpy $INST_SILENT "1"
  StrStr $R0 "--update" $R2
  StrCmp $R2 "" 0 +2
    StrCpy $INST_SILENT "1"
FunctionEnd

; ------------------------------------------
; 2) Отключаем стандартные битмапы MUI
!insertmacro MUI_UNSET "MUI_WELCOMEPAGE_BITMAP"
!insertmacro MUI_UNSET "MUI_WELCOMEFINISHPAGE_BITMAP"
!insertmacro MUI_UNSET "MUI_LICENSEPAGE_BITMAP"
!insertmacro MUI_UNSET "MUI_DIRECTORYPAGE_BITMAP"
!insertmacro MUI_UNSET "MUI_INSTFILESPAGE_BITMAP"
!insertmacro MUI_UNSET "MUI_FINISHPAGE_BITMAP"

; Задаём свои битмапы
!define MUI_WELCOMEPAGE_BITMAP       "${HEADER_BMP}"
!define MUI_WELCOMEFINISHPAGE_BITMAP "${HEADER_BMP}"
!define MUI_LICENSEPAGE_BITMAP       "${HEADER_BMP}"
!define MUI_DIRECTORYPAGE_BITMAP     "${HEADER_BMP}"
!define MUI_INSTFILESPAGE_BITMAP     "${HEADER_BMP}"
!define MUI_FINISHPAGE_BITMAP        "${HEADER_BMP}"

!define MUI_LICENSEPAGE_FILE         "${MUI_LICENSEFILE}"
!define MUI_LICENSEPAGE_CHECKBOX
!define MUI_ABORTWARNING
!undef MUI_TEXTCOLOR
!define MUI_TEXTCOLOR 0xFFFFFF
!undef MUI_BGCOLOR
!define MUI_BGCOLOR "0x0E7490"

; ------------------------------------------
; 3) Определяем PRE-функции для пропуска UI при silent
!define MUI_PAGE_CUSTOMFUNCTION_PRE WelcomePre
!insertmacro MUI_PAGE_WELCOME

!define MUI_PAGE_CUSTOMFUNCTION_PRE LicensePre
!insertmacro MUI_PAGE_LICENSE "${MUI_LICENSEFILE}"

!define MUI_PAGE_CUSTOMFUNCTION_PRE DirPre
!insertmacro MUI_PAGE_DIRECTORY

!define MUI_PAGE_CUSTOMFUNCTION_PRE InstFilesPre
!insertmacro MUI_PAGE_INSTFILES

!define MUI_PAGE_CUSTOMFUNCTION_PRE FinishPre
!insertmacro MUI_PAGE_FINISH

BrandingText "Quasar"

; ------------------------------------------
; 4) SHOW-функции для обычного запуска
Function WelcomeShow
  CreateFont $0 "Segoe UI" 10 400
  SendMessage $mui.WelcomePage.Text ${WM_SETFONT} $0 1
FunctionEnd

Function LicenseShow
FunctionEnd

Function FinishShow
  CreateFont $4 "Segoe UI" 10 400
  SendMessage $mui.FinishPage.Text ${WM_SETFONT} $4 1
FunctionEnd

; ------------------------------------------
; 5) PRE-hook реализации — пропускают страницу если silent
Function WelcomePre
  StrCmp $INST_SILENT "1" 0 +2
    Abort
FunctionEnd

Function LicensePre
  StrCmp $INST_SILENT "1" 0 +2
    Abort
FunctionEnd

Function DirPre
  StrCmp $INST_SILENT "1" 0 +2
    Abort
FunctionEnd

Function InstFilesPre
  StrCmp $INST_SILENT "1" 0 +2
    Abort
FunctionEnd

Function FinishPre
  StrCmp $INST_SILENT "1" 0 +2
    Abort
FunctionEnd

; ------------------------------------------
; 6) Основной раздел — копирование файлов
Section "MainSection"
  SetOutPath "$INSTDIR\images"
  File "C:\Users\karen\OneDrive\Quasar\src\build\header.bmp"
  File "${MUI_LICENSEFILE}"
SectionEnd
