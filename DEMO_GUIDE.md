# 🎬 功能演示指南

本指南将带您快速体验系统的所有核心功能。

---

## 🚀 准备工作（5分钟）

### 1. 启动系统
```powershell
.\start.ps1
```

等待提示信息出现后，系统就绪：
- ✅ Neo4j: http://localhost:7474
- ✅ API 文档: http://localhost:8000/docs
- ✅ FastAPI 运行中

### 2. 打开浏览器
访问 **http://localhost:8000/docs**，您会看到 Swagger 交互式文档。

---

## 📊 演示场景 1: 话单分析（10分钟）

### 场景描述
侦查人员获得了一批通话记录，需要分析号码之间的关联关系。

### 步骤 1: 导入测试数据

在 Swagger 界面找到 **POST /ingest/upload/csv**，点击 "Try it out"：

1. 点击 "Choose File"，选择 `examples/test_data_cdr.csv`
2. data_type 填写：`cdr`
3. 点击 "Execute"

**预期结果**：
```json
{
  "status": "success",
  "count": 8
}
```

### 步骤 2: 查找共同联系人

找到 **POST /analysis/common-contacts**，输入：

```json
{
  "target_a": "13800138001",
  "target_b": "13800138002",
  "node_type": "Phone"
}
```

**预期结果** - 发现共同联系人：
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

**结论**：13800138001 和 13800138002 都与 13800138003 有联系！

### 步骤 3: 追踪最短路径

找到 **GET /analysis/path**，输入参数：
- source: `13800138001`
- target: `13800138005`
- max_depth: `5`

**预期结果**：
```json
{
  "path_nodes": ["13800138001", "13800138003", "13800138005"],
  "relationship_types": ["CALL", "CALL"],
  "hops": 2
}
```

**结论**：13800138001 → 13800138003 → 13800138005，相隔2跳！

### 步骤 4: 识别关键人物

找到 **GET /analysis/central-nodes**，输入：
- node_type: `Phone`
- top_n: `5`

**预期结果** - 找到联系最广泛的号码：
```json
{
  "central_nodes": [
    {
      "node_id": "13800138003",
      "degree": 4,
      "centrality_score": 0.8
    },
    ...
  ]
}
```

**结论**：13800138003 是核心人物！

---

## 👥 演示场景 2: 社交关系挖掘（8分钟）

### 场景描述
分析微信好友网络，发现可疑团伙。

### 步骤 1: 导入微信数据

**POST /ingest/upload/csv**：
- 文件：`examples/test_data_wechat.csv`
- data_type: `wechat`

### 步骤 2: 团伙挖掘

**GET /analysis/communities**：
- node_type: `WeChat`
- min_size: `3`

**预期结果**：
```json
{
  "communities": [
    {
      "member": "wx_alice",
      "community_members": ["wx_bob", "wx_charlie", "wx_eve", "wx_david"],
      "community_size": 4
    }
  ]
}
```

**结论**：发现一个4人紧密联系的群组！

### 步骤 3: 扩展关系网

**POST /analysis/expand-network**：
```json
{
  "target_id": "wx_alice",
  "depth": 2,
  "node_type": "WeChat"
}
```

**预期结果**：
```json
{
  "target": "wx_alice",
  "depth": 2,
  "total_contacts": 4,
  "network": {
    "1": [
      {"contact_id": "wx_bob", "type": "WeChat", "path_count": 1},
      {"contact_id": "wx_charlie", "type": "WeChat", "path_count": 1}
    ],
    "2": [
      {"contact_id": "wx_david", "type": "WeChat", "path_count": 2}
    ]
  }
}
```

**结论**：wx_alice 的二度关系网包含 4 人！

---

## 📈 演示场景 3: 通话行为分析（5分钟）

### 步骤 1: 频繁联系人分析

**GET /analysis/frequent-contacts**：
- target_id: `13800138001`
- node_type: `Phone`
- top_n: `5`

**预期结果**：
```json
{
  "target": "13800138001",
  "frequent_contacts": [
    {
      "contact_id": "13800138002",
      "type": "Phone",
      "total_contacts": 1,
      "total_duration_seconds": 120
    },
    {
      "contact_id": "13800138003",
      "type": "Phone",
      "total_contacts": 1,
      "total_duration_seconds": 60
    }
  ]
}
```

**结论**：识别出重点联系人及通话时长！

### 步骤 2: 通话模式分析

**GET /analysis/call-pattern**：
- target_id: `13800138001`
- time_window_days: `30`

**预期结果** - 获取通话统计：
```json
{
  "target": "13800138001",
  "total_contacts": 3,
  "total_calls": 3,
  "total_duration_seconds": 255,
  "contacts": [...]
}
```

---

## 🔍 演示场景 4: Neo4j 可视化（5分钟）

### 步骤 1: 访问 Neo4j Browser

打开 http://localhost:7474

- 用户名：`neo4j`
- 密码：`mysecretpassword`

### 步骤 2: 查看关系图

在查询框输入：

```cypher
MATCH (n) RETURN n LIMIT 25
```

点击执行，您会看到漂亮的关系图！

### 步骤 3: 深入查询

**查看所有通话关系**：
```cypher
MATCH (a:Phone)-[r:CALL]->(b:Phone)
RETURN a.number, b.number, r.count, r.total_duration
```

**查看微信网络**：
```cypher
MATCH (a:WeChat)-[r:FRIEND]-(b:WeChat)
RETURN a, r, b
```

---

## 📊 演示场景 5: 数据统计（2分钟）

### 获取全局统计

**GET /statistics**

**预期结果**：
```json
{
  "total_nodes": 10,
  "total_relationships": 15,
  "nodes_by_type": [
    {"label": "Phone", "node_count": 5},
    {"label": "WeChat", "node_count": 5}
  ],
  "relationships_by_type": [
    {"rel_type": "CALL", "rel_count": 8},
    {"rel_type": "FRIEND", "rel_count": 7}
  ]
}
```

**结论**：一目了然掌握数据规模！

---

## 🧹 演示后清理（可选）

如果想重新开始，清空所有数据：

**DELETE /ingest/clear** → Execute

或在 Neo4j Browser 中：
```cypher
MATCH (n) DETACH DELETE n
```

---

## 💡 实战技巧

### 技巧 1: 组合查询
先用 `find_common_contacts` 找共同联系人，再用 `expand_network` 扩展关系网。

### 技巧 2: 逐步深入
1. 导入数据 → 2. 统计分析 → 3. 路径追踪 → 4. 团伙挖掘

### 技巧 3: 可视化验证
在 Neo4j Browser 中可视化查询结果，更直观！

### 技巧 4: 批量导入
生产环境使用 CSV 批量导入，效率更高。

---

## 📝 演示检查清单

完成以下任务证明系统运行正常：

- [ ] 成功导入话单数据（8条）
- [ ] 成功导入微信数据（7条关系）
- [ ] 找到共同联系人（至少1个）
- [ ] 追踪到最短路径（2-3跳）
- [ ] 识别中心节点（度数最高）
- [ ] 发现社区（至少1个群组）
- [ ] 扩展关系网（2度）
- [ ] 查看 Neo4j 可视化图
- [ ] 获取统计信息

---

## 🎓 下一步学习

1. **阅读完整文档**: `README.md`
2. **查看代码实现**: `app/services/analysis_service.py`
3. **自定义算法**: 修改 Cypher 查询
4. **导入真实数据**: 准备自己的 Excel/CSV 文件

---

## 🆘 遇到问题？

- **API 返回错误**: 检查输入参数格式
- **找不到数据**: 确认已成功导入
- **Neo4j 连接失败**: 等待15秒让数据库完全启动
- **端口冲突**: 检查 7474、7687、8000 端口

参考 `QUICK_REFERENCE.md` 获取更多帮助！

---

**🎉 演示完成！享受您的图数据分析之旅！**
