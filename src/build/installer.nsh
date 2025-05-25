!include "MUI2.nsh"
Unicode true
!define MUI_UNICODE
!include "WinMessages.nsh"
!include "nsDialogs.nsh"

RequestExecutionLevel user

Name "Quasar"

InstallDir "$PROGRAMFILES\Quasar"

; !define MUI_ICON "icon.ico"
; !define MUI_UNICON "icon.ico"

!define HEADER_BMP  "C:\Users\karen\OneDrive\Quasar\src\build\header.bmp"
!define MUI_LICENSEFILE "C:\Users\karen\OneDrive\Quasar\src\build\LICENSE.txt"

!insertmacro MUI_UNSET "MUI_WELCOMEPAGE_BITMAP"
!insertmacro MUI_UNSET "MUI_WELCOMEFINISHPAGE_BITMAP"
!insertmacro MUI_UNSET "MUI_LICENSEPAGE_BITMAP"
!insertmacro MUI_UNSET "MUI_DIRECTORYPAGE_BITMAP"
!insertmacro MUI_UNSET "MUI_INSTFILESPAGE_BITMAP"
!insertmacro MUI_UNSET "MUI_FINISHPAGE_BITMAP"

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

; !define MUI_WELCOMEPAGE_TITLE "Добро пожаловать в установку Quasar"
; !define MUI_WELCOMEPAGE_TEXT "Этот мастер установит приложение Quasar на ваш компьютер.$\r$\n$\r$\nРекомендуется закрыть все другие приложения перед продолжением установки."
; 
; !define MUI_LICENSEPAGE_TEXT_TOP "Пожалуйста, прочитайте следующие условия перед продолжением установки.$\r$\n$\r$\nДля продолжения вам необходимо принять условия лицензионного соглашения."
; !define MUI_LICENSEPAGE_TEXT_BOTTOM "Если вы принимаете условия, нажмите кнопку Далее. Если нет — нажмите Отмена."
; 
; !define MUI_LICENSEPAGE_BUTTON "Я согласен"
; !define MUI_LICENSEPAGE_CHECKBOX
; 
; !define MUI_FINISHPAGE_TITLE "Установка завершена"
; !define MUI_FINISHPAGE_TEXT "Поздравляем! Quasar успешно установлен на ваш компьютер.$\r$\n$\r$\nВы можете запустить приложение с ярлыка на рабочем столе или через меню Пуск.$\r$\n$\r$\nЕсли у вас есть предложения или вы нашли ошибку — напишите нам, мы вам очень рады!"
; !define MUI_FINISHPAGE_BUTTON "Готово"

!define MUI_PAGE_CUSTOMFUNCTION_SHOW WelcomeShow
!insertmacro MUI_PAGE_WELCOME

!insertmacro MUI_PAGE_LICENSE "${MUI_LICENSEFILE}"
!define MUI_PAGE_CUSTOMFUNCTION_SHOW LicenseShow

!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES

!define MUI_PAGE_CUSTOMFUNCTION_SHOW FinishShow
!insertmacro MUI_PAGE_FINISH

BrandingText "Quasar"

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

Section "MainSection"
  SetOutPath "$INSTDIR\images"
  File "C:\Users\karen\OneDrive\Quasar\src\build\header.bmp"

  File "${MUI_LICENSEFILE}"

SectionEnd
