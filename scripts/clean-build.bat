@echo off
echo ========================================
echo   HesabFlow - Clean Build Script
echo ========================================
echo.

echo [1/5] Cleaning dist folder...
if exist dist rmdir /s /q dist
echo Done!
echo.

echo [2/5] Cleaning Tauri target folder...
if exist src-tauri\target rmdir /s /q src-tauri\target
echo Done!
echo.

echo [3/5] Cleaning node_modules (optional)...
set /p clean_node="Do you want to clean node_modules? (y/n): "
if /i "%clean_node%"=="y" (
    if exist node_modules rmdir /s /q node_modules
    echo Done!
    echo.
    echo [4/5] Installing dependencies...
    call npm install
    echo Done!
) else (
    echo Skipped!
)
echo.

echo [5/5] Building application...
call npm run build
echo Done!
echo.

echo ========================================
echo   Build Complete!
echo ========================================
echo.
echo Now you can run: npm run tauri build
echo.
pause
