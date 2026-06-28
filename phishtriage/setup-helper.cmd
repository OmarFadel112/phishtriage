@echo off
REM PhishTriage Windows Setup Helper — Command Prompt Version
REM Run this file by double-clicking it or from Command Prompt: setup-helper.cmd

setlocal enabledelayedexpansion

cls
echo.
echo ========================================================================
echo         PhishTriage SOC Toolkit -- Windows Setup Helper
echo ========================================================================
echo.

REM ─────────────────────────────────────────────────────────────────────────
REM Check Node.js
REM ─────────────────────────────────────────────────────────────────────────

echo Checking Node.js and npm...
node --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] Node.js is not installed or not in your PATH
    echo.
    echo To fix this:
    echo   1. Go to https://nodejs.org/
    echo   2. Download the LTS version
    echo   3. Run the installer
    echo   4. Restart this script
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
for /f "tokens=*" %%i in ('npm --version') do set NPM_VER=%%i

echo [OK] Node.js is installed: %NODE_VER%
echo [OK] npm is installed: %NPM_VER%
echo.

REM ─────────────────────────────────────────────────────────────────────────
REM Check Project Folder
REM ─────────────────────────────────────────────────────────────────────────

echo Checking project structure...
if not exist "package.json" (
    echo [ERROR] package.json not found!
    echo Make sure you're in the 'phishtriage' folder.
    echo Current folder: %cd%
    echo.
    pause
    exit /b 1
)
echo [OK] Found package.json

if not exist "src" (
    echo [ERROR] src/ folder not found!
    echo.
    pause
    exit /b 1
)
echo [OK] Found src/ folder
echo.

REM ─────────────────────────────────────────────────────────────────────────
REM Install Dependencies
REM ─────────────────────────────────────────────────────────────────────────

echo Installing npm dependencies (this will take 1-2 minutes)...
if exist "node_modules" (
    echo node_modules/ already exists. Skipping installation.
) else (
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERROR] npm install failed!
        echo Try these fixes:
        echo   - Check your internet connection
        echo   - Run: npm cache clean --force
        echo   - Run: npm install --legacy-peer-deps
        echo.
        pause
        exit /b 1
    )
)
echo [OK] Dependencies installed
echo.

REM ─────────────────────────────────────────────────────────────────────────
REM Check .env
REM ─────────────────────────────────────────────────────────────────────────

echo Checking for API key configuration...
if exist ".env" (
    echo [OK] .env file exists
) else (
    echo [INFO] No .env file found (that's OK - you can paste the key in the app)
    if exist ".env.example" (
        echo You can create .env by running: copy .env.example .env
    )
)
echo.

REM ─────────────────────────────────────────────────────────────────────────
REM Ready to Start
REM ─────────────────────────────────────────────────────────────────────────

echo Setup complete!
echo.
echo To start PhishTriage, you can:
echo   1. Run this script again and press Enter at the final prompt
echo   2. Or manually run: npm run dev
echo   3. Then open http://localhost:5173/ in your browser
echo.
set /p start="Start the app now? (y/n, default: y): "
if "%start%"=="" set start=y
if /i "%start%"=="y" (
    echo.
    echo Starting the dev server...
    echo App will open at http://localhost:5173/
    echo Press Ctrl+C to stop
    echo.
    call npm run dev
) else (
    echo.
    echo To start later, open Command Prompt in this folder and run:
    echo   npm run dev
    echo.
    pause
)
