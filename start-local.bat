@echo off
set PORT=5500
where python >nul 2>nul
if %ERRORLEVEL%==0 (
  echo Iniciando servidor local em http://localhost:%PORT%
  python -m http.server %PORT%
  goto :eof
)

echo Python nao encontrado. Instale Python ou rode via Live Server no VS Code.
pause
