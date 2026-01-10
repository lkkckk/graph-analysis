# 示例文件说明

本目录包含测试数据和示例脚本，用于快速测试系统功能。

## 📁 文件列表

- **test_data_cdr.csv**：话单测试数据（8 条通话记录）
- **test_data_wechat.csv**：微信好友测试数据（7 条好友关系）
- **test_api.py**：Python API 测试脚本

## 🚀 快速测试

### 1. 启动系统

确保 Neo4j 和 FastAPI 服务已启动：

```bash
# 启动 Neo4j
docker-compose up -d

# 启动 FastAPI（在项目根目录）
python -m app.main
```

### 2. 方法一：使用测试脚本

```bash
cd examples
python test_api.py
```

### 3. 方法二：使用 curl 命令

**导入话单 CSV：**
```bash
curl -X POST "http://localhost:8000/ingest/upload/csv" \
  -F "file=@examples/test_data_cdr.csv" \
  -F "data_type=cdr"
```

**导入微信好友 CSV：**
```bash
curl -X POST "http://localhost:8000/ingest/upload/csv" \
  -F "file=@examples/test_data_wechat.csv" \
  -F "data_type=wechat"
```

**查找共同联系人：**
```bash
curl -X POST "http://localhost:8000/analysis/common-contacts" \
  -H "Content-Type: application/json" \
  -d '{"target_a": "13800138001", "target_b": "13800138002"}'
```

### 4. 方法三：使用 Swagger UI

打开浏览器访问：http://localhost:8000/docs

在交互式界面中上传测试文件并执行分析。

## 📊 测试数据说明

### test_data_cdr.csv（话单数据）

包含 5 个手机号码的 8 条通话记录：
- 13800138001
- 13800138002
- 13800138003
- 13800138004
- 13800138005

可以测试：
- 共同联系人分析
- 最短路径查询
- 频繁联系分析
- 中心节点识别

### test_data_wechat.csv（微信好友数据）

包含 5 个微信账号的 7 条好友关系：
- wx_alice
- wx_bob
- wx_charlie
- wx_david
- wx_eve

可以测试：
- 共同好友分析
- 社交圈扩展
- 社区发现

## 🔍 验证结果

在 Neo4j Browser（http://localhost:7474）中运行：

```cypher
// 查看所有节点
MATCH (n) RETURN n LIMIT 25

// 查看通话关系
MATCH (a:Phone)-[r:CALL]->(b:Phone) 
RETURN a.number, b.number, r.count, r.total_duration

// 查看微信好友关系
MATCH (a:WeChat)-[r:FRIEND]-(b:WeChat) 
RETURN a.wxid, b.wxid
```

祝测试顺利！ 🎉
