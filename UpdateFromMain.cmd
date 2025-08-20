@echo off
setlocal

REM Usage: UpdateFromMain [branch] [-Rebase] [-Push]
set SCRIPT_DIR=%~dp0

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%UpdateFromMain.ps1" %*

endlocal
