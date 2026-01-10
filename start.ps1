# 情报研判系统 - 全栈 Docker 启动脚本
# 自动化启动脚本 (全镜像模式)

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  情报研判系统 - 全栈 Docker 启动" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Docker 是否运行
Write-Host "🔍 检查 Docker 服务..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "✅ Docker 正在运行" -ForegroundColor Green
}
catch {
    Write-Host "❌ Docker 未运行，请先启动 Docker Desktop" -ForegroundColor Red
    exit 1
}

# 启动所有服务
Write-Host ""
Write-Host "🚀 正在构建并启动所有服务 (数据库+后端+前端)..." -ForegroundColor Yellow
docker-compose up --build -d

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✨ 所有服务已成功启动！" -ForegroundColor Green
    Write-Host "-------------------------------------" -ForegroundColor Cyan
    Write-Host "🌐 前端界面: http://localhost:3000" -ForegroundColor White
    Write-Host "🚀 后端 API : http://localhost:8000/docs" -ForegroundColor White
    Write-Host "📊 Neo4j 管理: http://localhost:7474" -ForegroundColor White
    Write-Host "-------------------------------------" -ForegroundColor Cyan
    Write-Host "💡 提示: 第一次启动可能需要几分钟进行镜像构建。" -ForegroundColor Gray
}
else {
    Write-Host "❌ 系统启动失败，请检查 Docker 日志。" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📘 停止系统请运行: docker-compose down" -ForegroundColor Yellow
Write-Host ""
