@echo off
title Dung May Chu SOS Da Nang
echo Dang tat may chu SOS Da Nang...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5000" ^| find "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo Da tat may chu thanh cong!
pause

