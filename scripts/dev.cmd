@echo off
setlocal
pushd "%~dp0.."

rem Prefer the project's known runtime to a different Node.js on the system PATH.
for /d %%D in (".tools\node-*-win-x64") do (
  if exist "%%D\node.exe" set "PATH=%%~fD;%PATH%"
)
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 24 LTS, then run npm ci.
  popd
  exit /b 1
)
if not exist "node_modules\astro" (
  echo Dependencies are missing. Run npm ci before starting the site.
  popd
  exit /b 1
)

node scripts\dev.mjs %*
set "devExitCode=%ERRORLEVEL%"
popd
exit /b %devExitCode%
