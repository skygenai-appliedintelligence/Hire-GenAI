@echo off
REM Wrapper for WhichBranchIamIn.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0WhichBranchIamIn.ps1" %*
