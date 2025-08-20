@echo off
setlocal

REM Allows running: CreateBranch "feature/my-branch"
REM Ensures the script runs relative to this file's directory
set SCRIPT_DIR=%~dp0

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%CreateBranch.ps1" %*

endlocal
