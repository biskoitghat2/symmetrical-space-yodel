@echo off
echo ========================================
echo   HesabFlow - Installation Test
echo ========================================
echo.

echo Checking system requirements...
echo.

echo [1] Checking Windows version...
ver
echo.

echo [2] Checking Node.js...
node --version
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found!
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)
echo OK!
echo.

echo [3] Checking npm...
npm --version
if %errorlevel% neq 0 (
    echo ERROR: npm not found!
    pause
    exit /b 1
)
echo OK!
echo.

echo [4] Checking Rust...
rustc --version
if %errorlevel% neq 0 (
    echo ERROR: Rust not found!
    echo Please install Rust from: https://rustup.rs/
    pause
    exit /b 1
)
echo OK!
echo.

echo [5] Checking Cargo...
cargo --version
if %errorlevel% neq 0 (
    echo ERROR: Cargo not found!
    pause
    exit /b 1
)
echo OK!
echo.

echo [6] Checking Tauri CLI...
npm run tauri --version
if %errorlevel% neq 0 (
    echo WARNING: Tauri CLI might not be installed properly
)
echo.

echo [7] Checking WebView2...
reg query "HKLM\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" /v pv >nul 2>&1
if %errorlevel% equ 0 (
    echo OK! WebView2 is installed
) else (
    echo WARNING: WebView2 might not be installed!
    echo Download from: https://developer.microsoft.com/en-us/microsoft-edge/webview2/
)
echo.

echo [8] Checking database path...
echo Default path: %APPDATA%\com.hesabflow.app\
if exist "%APPDATA%\com.hesabflow.app\" (
    echo OK! Directory exists
    dir "%APPDATA%\com.hesabflow.app\"
) else (
    echo Directory does not exist yet (will be created on first run)
)
echo.

echo ========================================
echo   Test Complete!
echo ========================================
echo.
echo If all checks passed, you can build:
echo   npm run tauri build
echo.
pause
