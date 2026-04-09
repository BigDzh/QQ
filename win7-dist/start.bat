@echo off
cd /d "%~dp0"
echo Starting server on port 8080...
start "" /b python -m http.server 8080
timeout /t 2 /nobreak >nul 2>&1
start "" chrome "http://localhost:8080/"
echo Done! Open http://localhost:8080/ if browser not opened
pause
