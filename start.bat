@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Dang khoi dong Web Loi Chua...
node server.js
echo.
echo Ung dung da dung. Bam phim bat ky de dong cua so.
pause >nul
