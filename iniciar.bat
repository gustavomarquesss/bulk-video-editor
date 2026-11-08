@echo off
rem Abre o Bulk Video Editor. Dê dois cliques neste arquivo.
rem Na primeira vez instala as dependências; depois compila e abre o app.
cd /d "%~dp0"

if not exist node_modules (
  echo Instalando dependencias, aguarde...
  call npm install || goto :erro
)

echo Compilando...
call npm run build || goto :erro

echo Abrindo o app...
call npm start
exit /b 0

:erro
echo.
echo Algo deu errado. Confira se o Node.js esta instalado e tente de novo.
pause
exit /b 1
