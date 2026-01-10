# 情报研判系统 - 图数据分析平台

基于 Neo4j 图数据库和 FastAPI 构建的情报研判系统，提供话单分析、社交关系挖掘等功能。

## 📋 功能特性

### 数据导入
- ✅ **JSON API 导入**：直接通过 HTTP 接口导入数据
- ✅ **Excel 导入**：支持 `.xlsx`、`.xls` 格式
- ✅ **CSV 导入**：支持标准 CSV 文件
- ✅ **话单数据**：主叫、被叫、通话时长、时间戳
- ✅ **微信好友关系**：用户、好友、昵称

### 研判分析算法
1. **共同联系人分析**：查找两个目标的共同联系人及联系强度
2. **最短路径查询**：分析两个目标之间的关联路径
3. **频繁联系分析**：查找某个目标的高频联系人
4. **中心节点分析**：基于度中心性识别关键节点
5. **社区发现**：团伙挖掘，识别紧密联系的群组
6. **网络扩展**：N 度关系分析（1度、2度、3度...）
7. **通话模式分析**：时间分布、通话时长统计
8. **统计信息**：数据库节点、关系统计

## 🚀 快速开始

### 1. 环境准备

**系统要求**：
- Docker & Docker Compose
- Python 3.8+
- 至少 4GB 可用内存

### 2. 启动 Neo4j 数据库

```bash
# 在项目根目录下执行
docker-compose up -d
```

等待 10-20 秒，Neo4j 将在以下地址启动：
- **Web 管理界面**：http://localhost:7474
- **默认账号**：neo4j / mysecretpassword

### 3. 安装 Python 依赖

```bash
pip install -r requirements.txt
```

### 4. 启动 FastAPI 服务

```bash
python -m app.main
```

服务将在 `http://localhost:8000` 启动。

### 5. 访问 API 文档

打开浏览器访问：**http://localhost:8000/docs**

您将看到完整的 Swagger 交互式文档。

## 📊 使用示例

### 示例 1：导入话单数据（JSON）

```bash
curl -X POST "http://localhost:8000/ingest/cdr" \
  -H "Content-Type: application/json" \
  -d '[
    {"caller": "13800138001", "callee": "13800138002", "duration": 120},
    {"caller": "13800138001", "callee": "13800138003", "duration": 60},
    {"caller": "13800138002", "callee": "13800138003", "duration": 180}
  ]'
```

### 示例 2：上传 Excel 文件

准备一个 Excel 文件（`cdr_data.xlsx`），包含以下列：
- `caller`：13800138001
- `callee`：13800138002
- `duration`：120
- `timestamp`：2024-01-01 10:00:00（可选）

然后上传：

```bash
curl -X POST "http://localhost:8000/ingest/upload/excel" \
  -F "file=@cdr_data.xlsx" \
  -F "data_type=cdr"
```

### 示例 3：分析共同联系人

```bash
curl "http://localhost:8000/analysis/common-contacts" \
  -H "Content-Type: application/json" \
  -d '{
    "target_a": "13800138001",
    "target_b": "13800138002",
    "node_type": "Phone"
  }'
```

返回结果：
```json
{
  "target_a": "13800138001",
  "target_b": "13800138002",
  "common_contacts": [
    {
      "common_id": "13800138003",
      "type": "Phone",
      "contact_strength": 2
    }
  ],
  "count": 1
}
```

### 示例 4：查找最短路径

```bash
curl "http://localhost:8000/analysis/path?source=13800138001&target=13800138005&max_depth=5"
```

### 示例 5：团伙挖掘

```bash
curl "http://localhost:8000/analysis/communities?node_type=Phone&min_size=3"
```

## 📁 项目结构

```
graph-analysis-system/
├── docker-compose.yml          # Neo4j 容器配置
├── requirements.txt            # Python 依赖
├── .env                        # 环境变量配置
├── .gitignore                  # Git 忽略规则
├── README.md                   # 本文档
└── app/
    ├── __init__.py
    ├── main.py                 # FastAPI 应用入口
    ├── config.py               # 配置管理
    ├── database.py             # Neo4j 连接管理
    └── services/
        ├── __init__.py
        ├── ingest_service.py   # 数据导入服务
        └── analysis_service.py # 分析研判服务
```

## 🔧 配置说明

编辑 `.env` 文件自定义配置：

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=mysecretpassword
```

## 📖 API 文档

### 数据导入接口

| 接口 | 方法 | 描述 |
|------|------|------|
| `/ingest/cdr` | POST | 导入话单数据（JSON） |
| `/ingest/wechat` | POST | 导入微信好友（JSON） |
| `/ingest/upload/excel` | POST | 上传 Excel 文件 |
| `/ingest/upload/csv` | POST | 上传 CSV 文件 |
| `/ingest/clear` | DELETE | 清空所有数据 |

### 研判分析接口

| 接口 | 方法 | 描述 |
|------|------|------|
| `/analysis/common-contacts` | POST | 共同联系人分析 |
| `/analysis/path` | GET | 最短路径查询 |
| `/analysis/frequent-contacts` | GET | 频繁联系分析 |
| `/analysis/central-nodes` | GET | 中心节点分析 |
| `/analysis/communities` | GET | 社区发现（团伙挖掘） |
| `/analysis/expand-network` | POST | 网络扩展（N度关系） |
| `/analysis/call-pattern` | GET | 通话模式分析 |

### 系统接口

| 接口 | 方法 | 描述 |
|------|------|------|
| `/` | GET | API 根路径 |
| `/health` | GET | 健康检查 |
| `/statistics` | GET | 数据库统计信息 |
| `/docs` | GET | Swagger 文档 |

## 🧪 测试建议

1. **小规模测试**：先导入 10-20 条测试数据，验证基本功能
2. **访问 Neo4j Browser**：http://localhost:7474，可视化查看图数据
3. **运行 Cypher 查询**：在 Neo4j Browser 中手动查询验证数据

常用 Cypher 查询：
```cypher
// 查看所有节点
MATCH (n) RETURN n LIMIT 25

// 查看所有关系
MATCH (a)-[r]->(b) RETURN a, r, b LIMIT 25

// 统计节点数
MATCH (n) RETURN labels(n) as type, COUNT(n) as count
```

## 🔍 扩展方向

- [ ] **前端可视化**：使用 D3.js 或 ECharts 渲染关系图
- [ ] **实时流式导入**：Kafka 集成
- [ ] **高级图算法**：PageRank、Louvain 社区检测
- [ ] **权限管理**：用户认证和授权
- [ ] **导出功能**：生成分析报告（PDF/Excel）
- [ ] **性能优化**：索引优化、查询缓存

## 🐛 常见问题

### Q1: Neo4j 启动失败？
检查端口 7474 和 7687 是否被占用：
```bash
netstat -ano | findstr "7474"
netstat -ano | findstr "7687"
```

### Q2: Excel 导入失败？
确保 Excel 文件包含必需字段：
- 话单：`caller`, `callee`, `duration`
- 微信：`user`, `friend`

### Q3: 查询速度慢？
为常用字段创建索引（在 Neo4j Browser 中执行）：
```cypher
CREATE INDEX phone_number FOR (p:Phone) ON (p.number)
CREATE INDEX wechat_id FOR (w:WeChat) ON (w.wxid)
```

## 📄 许可证

MIT License

## 👥 联系与支持

如有问题，请提交 Issue 或联系开发团队。

---

**祝您使用愉快！** 🎉
