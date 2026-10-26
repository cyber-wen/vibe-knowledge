@echo off
chcp 65001 >nul
cd /d "E:\vibe\test\vibe\vibe-video"
echo 正在启动 Remotion Studio...
start "" http://localhost:3000
call npm run start
pause
