@echo off
cd /d "%~dp0win7-dist"
python -m http.server 8080
