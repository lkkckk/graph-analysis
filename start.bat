@echo off
chcp 65001 >nul
echo =====================================
echo   情报研判系统 - 全栈 Docker 启动
echo =====================================
echo.

REM 检查 Docker 是否运行
echo [1/2] 检查 Docker 服务...
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker 未运行，请先启动 Docker Desktop
    pause
    exit /b 1
)
echo ✅ Docker 正在运行
echo.

REM 启动所有容器
echo [2/2] 正在构建并启动所有服务...
docker-compose up --build -d
if %errorlevel% neq 0 (
    echo ❌ 启动失败，请检查 Docker 子系统状态
    pause
    exit /b 1
)

echo.
echo ✨ 所有服务已在后台成功启动！
echo -------------------------------------
echo 🌐 前端界面: http://localhost:3000
echo 🚀 后端 API : http://localhost:8000/docs
echo 📊 Neo4j 管理: http://localhost:7474
echo -------------------------------------
echo 💡 提示: 第一次启动需要构建镜像，请耐心等待。
echo 📘 停止系统请运行: docker-compose down
echo.

pause
