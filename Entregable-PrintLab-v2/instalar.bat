@echo off
title Instalacion de PrintLab
echo =============================================
echo  Instalacion de PrintLab
echo =============================================
echo.

REM Verificar si somos administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Solicitando permisos de administrador...
    powershell -Command "Start-Process cmd -ArgumentList '/c, \"%~f0\"' -Verb RunAs -Wait"
    exit /b %errorlevel%
)

echo Iniciando asistente de instalacion...
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0instalar.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Ocurrio un error durante la instalacion. Revise el log: instalar.log
    pause
    exit /b %ERRORLEVEL%
)
echo.
echo Instalacion finalizada exitosamente.
pause
