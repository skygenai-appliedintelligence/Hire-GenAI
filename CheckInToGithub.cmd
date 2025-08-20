@echo off
setlocal

REM Allows running: CheckInToGithub "Commit message" [-NoVerify] [-Force]
set SCRIPT_DIR=%~dp0

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%CheckInToGithub.ps1" %*

endlocal
