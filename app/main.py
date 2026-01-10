"""
FastAPI 应用入口
提供数据导入、研判分析等 RESTful API
"""
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional
from contextlib import asynccontextmanager
import logging
import os
from pathlib import Path

from app.database import db
from app.config import settings
from app.services import ingest_service, analysis_service

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ==================== 请求/响应模型 ====================

class CallRecord(BaseModel):
    """话单记录模型"""
    caller: str = Field(..., description="主叫号码")
    callee: str = Field(..., description="被叫号码")
    duration: int = Field(..., description="通话时长（秒）", ge=0)
    timestamp: Optional[str] = Field(None, description="通话时间")


class WeChatFriend(BaseModel):
    """微信好友关系模型"""
    user: str = Field(..., description="用户微信号")
    friend: str = Field(..., description="好友微信号")
    nickname: Optional[str] = Field(None, description="好友昵称")


class AnalysisRequest(BaseModel):
    """分析请求模型"""
    target_a: str = Field(..., description="目标 A")
    target_b: str = Field(..., description="目标 B")
    node_type: Optional[str] = Field("Phone", description="节点类型 (Phone/WeChat)")


class NetworkExpansionRequest(BaseModel):
    """网络扩展请求模型"""
    target_id: str = Field(..., description="目标 ID")
    depth: int = Field(2, description="扩展深度", ge=1, le=5)
    node_type: Optional[str] = Field("Phone", description="节点类型")


# ==================== 应用生命周期 ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用启动和关闭管理"""
    # 启动
    logger.info("🚀 Starting application...")
    db.connect()
    
    # 创建上传目录
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(exist_ok=True)
    
    yield
    
    # 关闭
    logger.info("🛑 Shutting down application...")
    db.close()


# ==================== FastAPI 应用 ====================

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="基于 Neo4j 的图数据分析平台，提供话单分析、社交关系挖掘等情报研判功能",
    lifespan=lifespan
)

# 添加 CORS 中间件，允许前端跨域访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应限制为具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== 数据导入接口 ====================

@app.post("/ingest/cdr", tags=["数据导入"])
def ingest_cdr(records: List[CallRecord]):
    """
    导入话单数据（JSON 格式）
    
    - **caller**: 主叫号码
    - **callee**: 被叫号码
    - **duration**: 通话时长（秒）
    - **timestamp**: 通话时间（可选）
    """
    try:
        result = ingest_service.import_cdr_data([r.model_dump() for r in records])
        return JSONResponse(content=result, status_code=200)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ingest/wechat", tags=["数据导入"])
def ingest_wechat(friends: List[WeChatFriend]):
    """
    导入微信好友关系（JSON 格式）
    
    - **user**: 用户微信号
    - **friend**: 好友微信号
    - **nickname**: 好友昵称（可选）
    """
    try:
        result = ingest_service.import_wechat_friends([f.model_dump() for f in friends])
        return JSONResponse(content=result, status_code=200)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ingest/upload/excel", tags=["数据导入"])
async def upload_excel(
    file: UploadFile = File(...),
    data_type: str = Form("cdr", description="数据类型: cdr 或 wechat")
):
    """
    上传 Excel 文件导入数据
    
    - **file**: Excel 文件 (.xlsx)
    - **data_type**: 数据类型 (cdr=话单, wechat=微信好友)
    
    **话单 Excel 格式要求**：
    - caller（主叫号码）
    - callee（被叫号码）
    - duration（通话时长，秒）
    - timestamp（通话时间，可选）
    
    **微信 Excel 格式要求**：
    - user（用户微信号）
    - friend（好友微信号）
    - nickname（好友昵称，可选）
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="仅支持 Excel 文件 (.xlsx, .xls)")
    
    # 检查文件大小
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=400, 
            detail=f"文件过大，最大支持 {settings.MAX_UPLOAD_SIZE / 1024 / 1024}MB"
        )
    
    # 保存文件
    upload_dir = Path(settings.UPLOAD_DIR)
    file_path = upload_dir / file.filename
    
    try:
        with open(file_path, "wb") as f:
            f.write(content)
        
        # 导入数据
        result = ingest_service.import_from_excel(str(file_path), data_type)
        
        # 删除临时文件
        os.remove(file_path)
        
        return JSONResponse(content=result, status_code=200)
    except Exception as e:
        # 清理临时文件
        if file_path.exists():
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ingest/upload/csv", tags=["数据导入"])
async def upload_csv(
    file: UploadFile = File(...),
    data_type: str = Form("cdr", description="数据类型: cdr 或 wechat")
):
    """
    上传 CSV 文件导入数据
    
    - **file**: CSV 文件
    - **data_type**: 数据类型 (cdr=话单, wechat=微信好友)
    
    字段要求同 Excel 接口
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="仅支持 CSV 文件")
    
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=400, 
            detail=f"文件过大，最大支持 {settings.MAX_UPLOAD_SIZE / 1024 / 1024}MB"
        )
    
    upload_dir = Path(settings.UPLOAD_DIR)
    file_path = upload_dir / file.filename
    
    try:
        with open(file_path, "wb") as f:
            f.write(content)
        
        result = ingest_service.import_from_csv(str(file_path), data_type)
        os.remove(file_path)
        
        return JSONResponse(content=result, status_code=200)
    except Exception as e:
        if file_path.exists():
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/ingest/clear", tags=["数据导入"])
def clear_all_data():
    """
    清空数据库所有数据（危险操作！）
    """
    try:
        result = ingest_service.clear_all_data()
        return JSONResponse(content=result, status_code=200)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== 研判分析接口 ====================

@app.get("/analysis/auto-collision", tags=["研判分析"])
def auto_collision_analysis():
    """
    🔥 自动碰撞分析（一键分析所有数据）
    
    自动从所有导入的数据中发现关联关系，无需手动输入目标。
    
    **分析内容**：
    - 共同联系人：查找所有人之间共同的电话联系人
    - 热点号码：被多人共同联系的号码（可能是重要节点）
    - 跨源关联：手机通讯录和微信好友的交叉匹配
    - 人物关系：基于共同联系人推断的人物关系网络
    """
    try:
        result = analysis_service.auto_collision_analysis()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/analysis/target/{target_number}", tags=["研判分析"])
def analyze_target(target_number: str):
    """
    🎯 目标分析（以某个号码为中心）
    
    输入一个电话号码，查找与此号码相关的所有人和关系。
    
    **分析内容**：
    - 谁的通讯录里有这个号码
    - 这些人之间有什么关联
    - 如果目标是机主，展示其联系人
    
    **返回数据**：
    - 可直接用于图谱可视化的节点和边数据
    """
    try:
        result = analysis_service.analyze_target(target_number)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analysis/common-contacts", tags=["研判分析"])
def analyze_common_contacts(request: AnalysisRequest):
    """
    分析两个目标的共同联系人
    
    - **target_a**: 目标 A 的 ID（电话号码或微信号）
    - **target_b**: 目标 B 的 ID
    - **node_type**: 节点类型 (Phone 或 WeChat)
    """
    try:
        results = analysis_service.find_common_contacts(
            request.target_a, 
            request.target_b, 
            request.node_type
        )
        return {
            "target_a": request.target_a,
            "target_b": request.target_b,
            "common_contacts": results,
            "count": len(results)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/analysis/path", tags=["研判分析"])
def analyze_shortest_path(
    source: str,
    target: str,
    max_depth: int = 5
):
    """
    分析两个目标之间的最短关联路径
    
    - **source**: 起点 ID
    - **target**: 终点 ID
    - **max_depth**: 最大搜索深度（默认 5）
    """
    try:
        result = analysis_service.find_shortest_path(source, target, max_depth)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/analysis/frequent-contacts", tags=["研判分析"])
def analyze_frequent_contacts(
    target_id: str,
    node_type: str = "Phone",
    top_n: int = 10
):
    """
    查找某个目标的频繁联系人
    
    - **target_id**: 目标 ID
    - **node_type**: 节点类型
    - **top_n**: 返回前 N 个结果（默认 10）
    """
    try:
        results = analysis_service.find_frequent_contacts(target_id, node_type, top_n)
        return {
            "target": target_id,
            "frequent_contacts": results,
            "count": len(results)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/analysis/central-nodes", tags=["研判分析"])
def analyze_central_nodes(
    node_type: str = "Phone",
    top_n: int = 10
):
    """
    查找中心节点（度中心性分析）
    
    - **node_type**: 节点类型
    - **top_n**: 返回前 N 个结果（默认 10）
    """
    try:
        results = analysis_service.find_central_nodes(node_type, top_n)
        return {
            "central_nodes": results,
            "count": len(results)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/analysis/communities", tags=["研判分析"])
def analyze_communities(
    node_type: str = "Phone",
    min_size: int = 3
):
    """
    社区发现（团伙挖掘）
    
    - **node_type**: 节点类型
    - **min_size**: 最小社区规模（默认 3）
    """
    try:
        results = analysis_service.find_communities(node_type, min_size)
        return {
            "communities": results,
            "count": len(results)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analysis/expand-network", tags=["研判分析"])
def expand_contact_network(request: NetworkExpansionRequest):
    """
    扩展联系网络（N 度关系分析）
    
    - **target_id**: 目标 ID
    - **depth**: 扩展深度（1=直接联系人，2=二度，等等）
    - **node_type**: 节点类型
    """
    try:
        result = analysis_service.expand_network(
            request.target_id, 
            request.depth, 
            request.node_type
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/analysis/call-pattern", tags=["研判分析"])
def analyze_call_pattern(
    target_id: str,
    time_window_days: int = 30
):
    """
    通话模式分析
    
    - **target_id**: 目标电话号码
    - **time_window_days**: 分析时间窗口（天数，默认 30）
    """
    try:
        result = analysis_service.analyze_call_pattern(target_id, time_window_days)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== 系统接口 ====================

@app.get("/", tags=["系统"])
def root():
    """API 根路径"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "status": "running"
    }


@app.get("/health", tags=["系统"])
def health_check():
    """健康检查"""
    try:
        # 测试数据库连接
        with db.get_session() as session:
            session.run("RETURN 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


@app.get("/statistics", tags=["系统"])
def get_statistics():
    """获取数据库统计信息"""
    try:
        stats = analysis_service.get_statistics()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== 程序入口 ====================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
