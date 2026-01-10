# ⚡ 快速参考卡片

## 🚀 一键启动

```powershell
.\start.ps1
```

访问地址：
- **API 文档**: http://localhost:8000/docs
- **Neo4j 管理**: http://localhost:7474 （neo4j/mysecretpassword）

---

## 📤 上传数据

### Excel 格式（话单）
| caller | callee | duration | timestamp |
|--------|--------|----------|-----------|
| 13800138001 | 13800138002 | 120 | 2024-01-01 10:00:00 |

```bash
curl -X POST "http://localhost:8000/ingest/upload/excel" \
  -F "file=@your_file.xlsx" \
  -F "data_type=cdr"
```

### CSV 格式（微信）
| user | friend | nickname |
|------|--------|----------|
| wx_alice | wx_bob | 小王 |

```bash
curl -X POST "http://localhost:8000/ingest/upload/csv" \
  -F "file=@your_file.csv" \
  -F "data_type=wechat"
```

---

## 🔍 研判分析

### 1. 查找共同联系人
```bash
curl -X POST "http://localhost:8000/analysis/common-contacts" \
  -H "Content-Type: application/json" \
  -d '{
    "target_a": "13800138001",
    "target_b": "13800138002"
  }'
```

### 2. 最短路径分析
```bash
curl "http://localhost:8000/analysis/path?source=13800138001&target=13800138005"
```

### 3. 频繁联系人
```bash
curl "http://localhost:8000/analysis/frequent-contacts?target_id=13800138001&top_n=10"
```

### 4. 中心节点识别
```bash
curl "http://localhost:8000/analysis/central-nodes?node_type=Phone&top_n=10"
```

### 5. 团伙挖掘
```bash
curl "http://localhost:8000/analysis/communities?node_type=Phone&min_size=3"
```

### 6. 网络扩展（N度关系）
```bash
curl -X POST "http://localhost:8000/analysis/expand-network" \
  -H "Content-Type: application/json" \
  -d '{
    "target_id": "13800138001",
    "depth": 2
  }'
```

### 7. 通话模式分析
```bash
curl "http://localhost:8000/analysis/call-pattern?target_id=13800138001&time_window_days=30"
```

### 8. 统计信息
```bash
curl "http://localhost:8000/statistics"
```

---

## 🛠️ Neo4j 常用查询

在 http://localhost:7474 的查询框中执行：

### 查看所有节点
```cypher
MATCH (n) RETURN n LIMIT 25
```

### 查看所有关系
```cypher
MATCH (a)-[r]->(b) RETURN a, r, b LIMIT 25
```

### 统计节点数
```cypher
MATCH (n) RETURN labels(n) as type, COUNT(n) as count
```

### 统计关系数
```cypher
MATCH ()-[r]->() RETURN type(r) as type, COUNT(r) as count
```

### 创建索引（性能优化）
```cypher
CREATE INDEX phone_number FOR (p:Phone) ON (p.number);
CREATE INDEX wechat_id FOR (w:WeChat) ON (w.wxid);
```

### 删除所有数据
```cypher
MATCH (n) DETACH DELETE n
```

---

## 🧪 快速测试

```bash
# 测试话单数据
cd examples
python test_api.py

# 或使用示例数据
curl -X POST "http://localhost:8000/ingest/upload/csv" \
  -F "file=@examples/test_data_cdr.csv" \
  -F "data_type=cdr"
```

---

## 🛑 停止服务

```powershell
.\stop.ps1
```

或

```bash
docker-compose down
```

---

## 📋 常见问题

**Q: 端口被占用？**
```bash
# 检查端口
netstat -ano | findstr "7474"
netstat -ano | findstr "7687"
netstat -ano | findstr "8000"
```

**Q: 依赖安装失败？**
```bash
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

**Q: Neo4j 启动慢？**
等待 15-30 秒，首次启动需要初始化数据库

---

## 📞 获取帮助

- 查看完整文档：`README.md`
- 查看项目总结：`SUMMARY.md`
- 示例代码：`examples/`
- API 文档：http://localhost:8000/docs
