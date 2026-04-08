@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

set "APP_NAME=项目全生命周期管理系统"
set "APP_DIR=%~dp0\win7-dist"
set "INDEX_FILE=%APP_DIR%\index.html"
set "DEFAULT_PORT=8080"
set "HOST=localhost"
set "PYTHON_FOUND=0"
set "PORT=%DEFAULT_PORT%"

echo ================================================
echo %APP_NAME% - Python服务器启动器
echo ================================================
echo.

echo [INFO] 正在检查 Python 环境...
echo.

python --version 2>nul
if !errorlevel! equ 0 (
    set "PYTHON_FOUND=1"
    echo [OK] 已找到 Python
    python --version
    goto :check_port
)

python3 --version 2>nul
if !errorlevel! equ 0 (
    set "PYTHON_FOUND=1"
    echo [OK] 已找到 Python3
    python3 --version
    goto :check_port
)

for /f "tokens=2*" %%A in ('reg query "HKEY_LOCAL_MACHINE\SOFTWARE\Python\PythonCore\3.*\InstallPath" /ve 2^>nul') do (
    if exist "%%~B\python.exe" (
        set "PYTHON_FOUND=1"
        echo [OK] 已找到 Python (注册表)
        "%%~B\python.exe" --version
        set "PYTHON=%%~B\python.exe"
        goto :check_port
    )
)

for /f "tokens=2*" %%A in ('reg query "HKEY_CURRENT_USER\SOFTWARE\Python\PythonCore\3.*\InstallPath" /ve 2^>nul') do (
    if exist "%%~B\python.exe" (
        set "PYTHON_FOUND=1"
        echo [OK] 已找到 Python (用户注册表)
        "%%~B\python.exe" --version
        set "PYTHON=%%~B\python.exe"
        goto :check_port
    )
)

for %%P in (
    "%ProgramFiles%\Python*\*\python.exe"
    "%ProgramFiles(x86)%\Python*\*\python.exe"
    "%LOCALAPPDATA%\Programs\Python\*\python.exe"
    "%AppData%\Local\Programs\Python\*\python.exe"
) do (
    if exist "%%~P" (
        set "PYTHON_FOUND=1"
        echo [OK] 已找到 Python (目录搜索)
        "%%~P" --version
        set "PYTHON=%%~P"
        goto :check_port
    )
)

if "%PYTHON_FOUND%"=="0" (
    echo [错误] 未找到 Python 环境！
    echo.
    echo 请确保已安装 Python 3.x
    echo 您可以从以下地址下载安装：
    echo   https://www.python.org/downloads/
    echo.
    echo 注意：安装时请勾选 "Add Python to PATH" 选项
    echo.
    pause
    exit /b 1
)

:check_port
if "%PYTHON%"=="" (
    set "PYTHON=python"
)

netstat -ano 2>nul | findstr ":%DEFAULT_PORT% " >nul 2>&1
if !errorlevel! equ 0 (
    echo [WARNING] 端口 %DEFAULT_PORT% 已被占用，正在尝试其他端口...
    set "PORT=8081"
    netstat -ano 2>nul | findstr ":8081 " >nul 2>&1
    if !errorlevel! equ 0 (
        set "PORT=8082"
        netstat -ano 2>nul | findstr ":8082 " >nul 2>&1
        if !errorlevel! equ 0 (
            set "PORT=8083"
        )
    )
)

echo.
echo [INFO] 正在检查 Chrome 浏览器...
echo.

set "CHROME_PATH="
set "CHROME_PATHS[0]=C:\Program Files\Google\Chrome\Application\chrome.exe
set "CHROME_PATHS[1]=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe
set "CHROME_PATHS[2]=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe
set "CHROME_PATHS[3]=%ProgramFiles%\Google\Chrome\Application\chrome.exe
set "CHROME_PATHS[4]=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"

for %%P in ("%CHROME_PATHS[0]%" "%CHROME_PATHS[1]%" "%CHROME_PATHS[2]%" "%CHROME_PATHS[3]%" "%CHROME_PATHS[4]%") do (
    if exist "%%~P" (
        set "CHROME_PATH=%%~P"
        goto :found_chrome
    )
)

for /f "tokens=2*" %%A in ('reg query "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe" /ve 2^>nul') do (
    if exist "%%~B" (
        set "CHROME_PATH=%%~B"
        goto :found_chrome
    )
)

for /f "tokens=2*" %%A in ('reg query "HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe" /ve 2^>nul') do (
    if exist "%%~B" (
        set "CHROME_PATH=%%~B"
        goto :found_chrome
    )
)

if "%CHROME_PATH%"=="" (
    echo [错误] 未找到 Chrome 浏览器！
    echo.
    echo 请确保已安装 Google Chrome 浏览器。
    echo 您可以从以下地址下载安装：
    echo   https://www.google.com/chrome/
    echo.
    pause
    exit /b 1
)

:found_chrome
echo [OK] 已找到 Chrome: %CHROME_PATH%
echo.

if not exist "%INDEX_FILE%" (
    echo [错误] 应用程序文件未找到！
    echo.
    echo 期望路径: %INDEX_FILE%
    echo.
    echo 请确保将应用程序放置在正确位置，或联系技术支持。
    echo.
    pause
    exit /b 1
)

echo [INFO] 正在启动 Python HTTP 服务器...
echo.

set "SERVER_PID="
for /f "tokens=2" %%A in ('netstat -ano 2^>nul ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
    set "SERVER_PID=%%A"
)

if not "%SERVER_PID%"=="" (
    echo [INFO] 发现端口 %PORT% 已有服务运行，尝试复用...
    goto :start_chrome
)

cd /d "%APP_DIR%"
start "" /b "%PYTHON%" -m http.server %PORT% >nul 2>&1

timeout /t 2 /nobreak >nul 2>&1

for /f "tokens=2" %%A in ('netstat -ano 2^>nul ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
    set "SERVER_PID=%%A"
)

if "%SERVER_PID%"=="" (
    echo [WARNING] 服务器启动可能需要更长时间，等待更多时间...
    timeout /t 3 /nobreak >nul 2>&1
    for /f "tokens=2" %%A in ('netstat -ano 2^>nul ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
        set "SERVER_PID=%%A"
    )
)

:start_chrome
echo.
echo [INFO] 正在启动 Chrome 浏览器...
echo.

set "USER_DATA_DIR=%TEMP%\lifecycle_management_system_win7"

start "" "%CHROME_PATH%" ^
    --user-data-dir="%USER_DATA_DIR%" ^
    --window-size="1400,900" ^
    --window-position="50,50" ^
    --disable-web-security ^
    --disable-features=TranslateUI ^
    --no-first-run ^
    --no-default-browser-check ^
    --disable-background-networking ^
    --disable-client-side-phishing-detection ^
    --disable-default-apps ^
    --disable-extensions ^
    --disable-hang-monitor ^
    --disable-popup-blocking ^
    --disable-prompt-on-repost ^
    --disable-sync ^
    --disable-translate ^
    --metrics-recording-only ^
    --safebrowsing-disable-auto-update ^
    --start-maximized ^
    "http://%HOST%:%PORT%/"

if errorlevel 1 (
    echo.
    echo [错误] Chrome 启动失败！
    echo.
    echo 错误代码: %errorlevel%
    echo.
    echo 请尝试以下解决方案：
    echo   1. 确认 Chrome 浏览器版本是否为较新版本
    echo   2. 清理浏览器缓存后重试
    echo   3. 检查是否有其他程序占用相同端口
    echo.
    pause
    exit /b 1
)

echo.
echo ================================================
echo %APP_NAME% 已成功启动！
echo ================================================
echo.
echo 服务地址: http://%HOST%:%PORT%/
echo.
echo 注意事项：
echo   - 请勿关闭此命令窗口，关闭后服务器将停止
echo   - 如需停止服务，按 Ctrl+C 并选择 Y
echo   - 首次加载可能需要几秒钟时间
echo   - 如果浏览器未自动打开，请手动访问上方地址
echo ================================================
echo.

endlocal
