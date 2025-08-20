@echo off
setlocal

REM Usage: ReleaseToMain "feature-branch" [-NoFF] [-Push] [-Tag vX.Y.Z] [-UsePackageVersion]
set SCRIPT_DIR=%~dp0

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%ReleaseToMain.ps1" %*

endlocal
