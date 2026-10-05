@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist node_modules (
  echo Installation (une seule fois)...
  call npm install --silent
)
set DEPT=%1
if "%DEPT%"=="" set DEPT=37
echo Verification des sites - departement(s) %DEPT%
echo Une fenetre Edge va s'ouvrir : laissez-la travailler, ne la fermez pas.
node verifier.mjs --dept=%DEPT% --workers=3
pause
