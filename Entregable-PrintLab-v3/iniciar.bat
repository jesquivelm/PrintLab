@echo off
title PrintLab - Servidor
cd /d "%~dp0app"
for /f "tokens=2 delims==" %%a in ('findstr /b "PORT=" .env 2^>nul') do set PORT=%%a
if "%PORT%"=="" set PORT=9090
echo =============================================
echo  Iniciando PrintLab...
echo =============================================
echo.
echo Servidor en: http://localhost:%PORT%
echo Presione Ctrl+C para detener.
echo.
node server.js
pause
