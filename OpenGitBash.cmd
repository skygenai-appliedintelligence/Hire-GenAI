@echo off
REM Wrapper to open Git Bash at the repo directory
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0OpenGitBash.ps1" %*
