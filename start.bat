@echo off
title SOS Da Nang - May Chu Cuu Tro Khan Cap
color 0A
cd /d "%~dp0"

echo ===================================================================
echo           HE THONG SOS DA NANG - MAY CHU WEB FULLSTACK
echo ===================================================================
echo.
echo   [+] Dang khoi dong may chu...
echo   [+] Trinh duyet se tu dong mo: http://localhost:5000
echo.
echo ===================================================================
echo   CHU Y QUAN TRONG:
echo   -- KHONG DONG CUA SO NAY TRONG KHI SU DUNG WEB! --
echo   -- Neu dong cua so nay, web tren trinh duyet se bi ngat! --
echo   (Ban co the thu nho cua so nay xuong thanh taskbar)
echo ===================================================================
echo.

node server.js
if %errorlevel% neq 0 (
    echo.
    echo [LOI] Khong the khoi dong bang lenh 'node'.
    echo Thu chay bang duong dan goc C:\Program Files\nodejs\node.exe...
    "C:\Program Files\nodejs\node.exe" server.js
)

pause
