@echo off
SETLOCAL EnableDelayedExpansion

:: Get the directory of the script
set "SCRIPT_DIR=%~dp0"

:: Define the relative path to the ADB directory
set "ADB_DIR=%SCRIPT_DIR%platform-tools"

:: Check if the ADB directory exists
if not defined ADB_DIR (
    echo The ADB_DIR variable is not defined.
    exit /b 1
)


if not exist "!ADB_DIR!" (
    echo The specified ADB directory does not exist: !ADB_DIR!
    exit /b 1
)

:: Add the ADB directory to the PATH environment variable
echo Adding "!ADB_DIR!" to PATH...
setx PATH "!PATH!;!ADB_DIR!"

echo ADB directory added to PATH successfully.

ENDLOCAL
pause
