@echo off
setlocal

REM Usage: MergeToMain "feature-branch" [-NoFF] [-Push]
set SCRIPT_DIR=%~dp0

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%MergeToMain.ps1" %*

endlocal
