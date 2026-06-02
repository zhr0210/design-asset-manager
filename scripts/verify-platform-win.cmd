@echo off
setlocal
node "%~dp0verify-platform-common.mjs" --platform=windows %*
