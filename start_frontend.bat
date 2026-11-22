@echo off
echo ========================================================
echo   Starting AeroClean React Frontend (Port 3000)
echo ========================================================
cd frontend
set PATH=C:\Users\Anfal\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.19.0-win-x64;%PATH%
node "C:\Users\Anfal\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.19.0-win-x64\node_modules\npm\bin\npm-cli.js" run dev
pause
