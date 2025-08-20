@echo off
REM Wrapper for SwitchBranch.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0SwitchBranch.ps1" %*
