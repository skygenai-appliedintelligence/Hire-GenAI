@echo off
setlocal ENABLEDELAYEDEXPANSION

REM Wrapper to call the PowerShell CreatePullRequest script
set SCRIPT_DIR=%~dp0
set PS1=%SCRIPT_DIR%CreatePullRequest.ps1

powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%" %*
endlocal
