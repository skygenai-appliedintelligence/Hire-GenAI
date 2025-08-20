@echo off
setlocal

REM Usage: RollbackRelease -Tag <tag> [-DeleteRemote] [-RevertMerge] [-Push] [-MainBranch main]
set SCRIPT_DIR=%~dp0

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%RollbackRelease.ps1" %*

endlocal
