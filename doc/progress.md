# 项目进展文档

## 最新进展 (2026-01-18)

### 🛡️ 代码审查：前端安全性与架构 ✅

**完成时间**：2026-01-18

**审查范围**：`frontend/js` 及相关 HTML

**主要发现**：
1. **安全性高危**：`analysis.js` 中存在多处 XSS 风险（使用 `innerHTML` 渲染未过滤数据）。
2. **硬编码**：API 地址硬编码在 `js/api.js`- [x] (可选) 修复 XSS 漏洞与硬编码配置 (2026-01-18)
- [x] (可选) 优化图谱渲染性能 (2026-01-18)

审查已完成，详细报告请查阅：`doc/frontend_code_review.md`。

## 修复总结 (2026-01-18)

### 🛡️ 安全性增强
- **XSS 防护**：引入 `utils.escapeHtml`，在 `analysis.js` 所有渲染用户数据的环节进行转义处理。
- **配置分离**：创建 `js/config.js` 管理 API 地址，不再硬编码在业务逻辑中。

### ⚡ 性能优化
- **图谱渲染**：重构 `graph.js` 的核心渲染逻辑，将逐个 `addNode/addEdge` 改为 `vis.DataSet` 的批量 `add` 操作，显著减少 DOM 更新频率和重绘开销。

---

## 历史进展 (2026-01-10 22:43)

### 🔥 新增：一键碰撞分析功能 ✅

**用户需求**：系统应该能自动从所有数据中进行碰撞分析，而不是需要手动输入目标。

**解决方案**：新增自动碰撞分析功能，核心特性：

1. **共同联系人检测**
   - 自动查找所有人之间的共同电话联系人
   - 显示共同联系人数量和具体号码

2. **热点号码分析**
   - 识别被多人共同联系的号码（可能是重要节点）
   - 显示被多少人联系、具体是哪些人

3. **跨数据源关联**
   - 尝试匹配微信好友和手机通讯录中的交叉点
   - 通过姓名/昵称进行模糊匹配

4. **人物关系推断**
   - 基于共同联系人数量推断人物之间的关系强度
   - 分为强/中/弱三个等级

**涉及文件**：
- `app/services/analysis_service.py` - 添加 `auto_collision_analysis()` 函数
- `app/main.py` - 添加 `/analysis/auto-collision` API 端点
- `frontend/js/api.js` - 添加 `autoCollision()` 方法
- `frontend/js/analysis.js` - 添加结果展示逻辑
- `frontend/index.html` - 添加碰撞分析 UI 卡片

---

### Excel 数据导入功能增强 ✅

1. **新增自动识别功能**
   - 根据列名自动检测数据类型（话单/微信/通讯录）
   - 根据文件名提取机主信息

2. **新增手机通讯录导入**
   - 支持列名：`姓名`、`电话号码`、`备注`
   - 创建 `Person` 节点（机主）和 `Phone` 节点（联系人）
   - 建立 `HAS_CONTACT` 关系

3. **支持中文列名映射**
   - 话单：`主叫` → `caller`，`被叫` → `callee`
   - 微信：`微信ID` → `friend`，`微信昵称` → `nickname`
   - 通讯录：`姓名` → `name`，`电话号码` → `phone`

---

## 端口配置
- 后端 API: `localhost:8011`
- 前端界面: `localhost:3011`
- Neo4j 浏览器: `localhost:7474`
- Neo4j Bolt: `localhost:7687`

## Neo4j 连接信息
- URL: `bolt://localhost:7687`
- 用户名: `neo4j`
- 密码: `mysecretpassword`
