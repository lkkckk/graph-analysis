# 项目文件结构

```
graph-analysis-system/
│
├── 📄 .env                          # 环境变量配置（数据库密码等）
├── 📄 .gitignore                    # Git 忽略规则
├── 📄 docker-compose.yml             # Neo4j 容器配置
├── 📄 requirements.txt               # Python 依赖清单
│
├── 📘 README.md                      # 项目完整文档
├── 📘 SUMMARY.md                     # 项目实施总结
├── 📘 QUICK_REFERENCE.md             # 快速参考卡片
│
├── 🚀 start.ps1                      # 快速启动脚本
├── 🛑 stop.ps1                       # 停止服务脚本
│
├── 📁 app/                           # 应用主目录
│   ├── __init__.py                  # 包初始化
│   ├── config.py                    # 配置管理（环境变量加载）
│   ├── database.py                  # Neo4j 连接管理（单例模式）
│   ├── main.py                      # FastAPI 应用入口（15个API）
│   │
│   └── 📁 services/                 # 业务逻辑层
│       ├── __init__.py
│       ├── ingest_service.py        # 数据导入服务
│       │                            #  - JSON/Excel/CSV 导入
│       │                            #  - 话单/微信数据处理
│       │
│       └── analysis_service.py      # 研判分析服务
│                                    #  - 8种图分析算法
│
└── 📁 examples/                     # 示例和测试文件
    ├── README.md                    # 示例使用说明
    ├── test_api.py                  # Python API 测试脚本
    ├── test_data_cdr.csv            # 话单测试数据（8条记录）
    └── test_data_wechat.csv         # 微信测试数据（7条关系）
```

## 📊 文件统计

### 核心代码文件（9个）
- `app/main.py` - FastAPI 应用（~350 行）
- `app/services/analysis_service.py` - 分析算法（~350 行）
- `app/services/ingest_service.py` - 数据导入（~150 行）
- `app/database.py` - 数据库连接（~60 行）
- `app/config.py` - 配置管理（~30 行）

### 配置文件（4个）
- `docker-compose.yml` - Docker 配置
- `requirements.txt` - Python 依赖
- `.env` - 环境变量
- `.gitignore` - Git 忽略规则

### 文档文件（4个）
- `README.md` - 完整文档
- `SUMMARY.md` - 项目总结
- `QUICK_REFERENCE.md` - 快速参考
- `examples/README.md` - 示例说明

### 辅助文件（4个）
- `start.ps1` - 启动脚本
- `stop.ps1` - 停止脚本
- `examples/test_api.py` - 测试脚本
- 测试数据文件（2个CSV）

## 🎯 功能映射

### 数据导入功能 → `app/services/ingest_service.py`
- `import_cdr_data()` - 话单导入
- `import_wechat_friends()` - 微信导入
- `import_from_excel()` - Excel 解析
- `import_from_csv()` - CSV 解析
- `clear_all_data()` - 数据清空

### 分析算法 → `app/services/analysis_service.py`
- `find_common_contacts()` - 共同联系人
- `find_shortest_path()` - 最短路径
- `find_frequent_contacts()` - 频繁联系
- `find_central_nodes()` - 中心节点
- `find_communities()` - 社区发现
- `expand_network()` - 网络扩展
- `analyze_call_pattern()` - 通话模式
- `get_statistics()` - 统计信息

### API 接口 → `app/main.py`
- **数据导入**（5个接口）
  - POST `/ingest/cdr`
  - POST `/ingest/wechat`
  - POST `/ingest/upload/excel`
  - POST `/ingest/upload/csv`
  - DELETE `/ingest/clear`

- **研判分析**（8个接口）
  - POST `/analysis/common-contacts`
  - GET `/analysis/path`
  - GET `/analysis/frequent-contacts`
  - GET `/analysis/central-nodes`
  - GET `/analysis/communities`
  - POST `/analysis/expand-network`
  - GET `/analysis/call-pattern`
  - GET `/statistics`

- **系统管理**（2个接口）
  - GET `/`
  - GET `/health`

## 🗂️ 运行时生成的目录

启动后将自动创建以下目录（已在 .gitignore 中忽略）：

```
graph-analysis-system/
├── 📁 neo4j_data/          # Neo4j 数据持久化
├── 📁 neo4j_logs/          # Neo4j 日志
├── 📁 neo4j_import/        # CSV 导入临时目录
└── 📁 uploads/             # 文件上传临时目录
```

## 💾 数据流图

```
用户上传数据
    ↓
Excel/CSV 文件 → ingest_service.py → Pandas 解析
    ↓
JSON 数据 → database.py → Neo4j Driver
    ↓
Neo4j 图数据库
    ↓
analysis_service.py → Cypher 查询
    ↓
FastAPI (main.py) → JSON 响应
    ↓
用户获取结果
```

## 🔄 技术栈映射

| 层级 | 技术 | 文件位置 |
|------|------|----------|
| 前端 | Swagger UI | 自动生成 |
| API | FastAPI | `app/main.py` |
| 业务逻辑 | Python | `app/services/` |
| 数据验证 | Pydantic | `app/main.py` |
| 配置管理 | Pydantic Settings | `app/config.py` |
| 数据库驱动 | neo4j-driver | `app/database.py` |
| 数据处理 | Pandas | `ingest_service.py` |
| 图数据库 | Neo4j 5.12.0 | Docker 容器 |
| 容器化 | Docker Compose | `docker-compose.yml` |

---

**总计**: 17 个代码文件，约 1200+ 行代码，实现完整的图数据分析系统 🎉
