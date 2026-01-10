# PowerShell 停止脚本

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  停止情报研判系统" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "🛑 停止 Neo4j 容器..." -ForegroundColor Yellow
docker-compose down

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 服务已停止" -ForegroundColor Green
} else {
    Write-Host "❌ 停止失败" -ForegroundColor Red
}

Write-Host ""
Write-Host "💡 提示：数据已保存在 neo4j_data/ 目录中" -ForegroundColor Cyan
Write-Host "   下次启动时会自动加载历史数据" -ForegroundColor Cyan
