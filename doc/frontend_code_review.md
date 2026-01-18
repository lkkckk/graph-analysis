# 前端代码审查报告

**日期**: 2026-01-18
**审查对象**: `frontend/` 目录下的 HTML, CSS, JS 文件
**审查人**: Antigravity

## 1. 概览
前端应用是一个基于原生 JavaScript (Vanilla JS) 的单页应用 (SPA)。主要依赖 `vis.js` 进行图谱可视化。代码结构清晰，通过模块化分离了 API、应用逻辑、图谱操作和分析功能。

## 2. 详细审查

### 2.1 安全性 (Security)
-   **CRITICAL: XSS 漏洞**: 在 `analysis.js` 中，多处使用 `innerHTML` 直接渲染 API 返回的数据，且未进行转义。
    -   **位置**: `showTargetAnalysisResult`, `showAutoCollisionResult`, `showCommonContactsResult` 等函数。
    -   **风险**: 如果后端返回恶意数据（如包含 `<script>` 的名字），将在用户浏览器中执行。
    -   **建议**: 使用 `textContent` 设置文本，或使用简单的转义函数处理数据。
-   **硬编码 API 地址**: `api.js` 中硬编码了 `API_BASE = 'http://localhost:8011'`。
    -   **风险**: 部署到生产环境或更改后端端口时会导致应用不可用。
    -   **建议**: 将配置提取到单独的 `config.js` 文件，或使用相对路径（如果前后端同源部署）。
-   **外部依赖**: 依赖 CDN 加载字体、图标和 `vis.js`。
    -   **风险**: 无网络环境下无法正常显示；CDN 劫持风险。
    -   **建议**: 考虑将关键资源本地化。

### 2.2 正确性 (Correctness)
-   **错误处理吞噬**: `api.js` 中的 `response.json().catch(() => ({}))` 会吞噬 JSON 解析错误。如果后端返回非 JSON 的错误页面（如 500 Nginx 错误页），前端可能无法正确报错。
-   **DOM 元素检查**: `app.js` 和 `analysis.js` 中虽然大部分有空值检查，但部分逻辑依然假设 DOM 结构不变。
    -   `graph.js` 中 `app.showLoading` 的调用依赖全局 `app` 对象，存在紧耦合。

### 2.3 代码风格与规范 (Style)
-   **全局命名空间**: 使用 `window.app`, `window.api` 等全局变量。虽然简单，但容易造成污染和冲突。建议使用 ES6 Modules (`import`/`export`) 进行管理（需构建工具支持，或使用 `<script type="module">`）。
-   **混合逻辑**: `app.js` 混合了路由逻辑、UI 交互和 API 调用编排。建议进一步拆分，例如将路由逻辑独立。

### 2.4 性能 (Performance)
-   **批量操作优化**: `graph.js` 中的 `visualizeTargetResult` 方法在循环中逐个调用 `this.nodes.add()`。
    -   **问题**: 对于大量节点，这会触发多次重绘或数据更新 overhead。
    -   **建议**: 使用 `vis.DataSet` 的批量添加功能（传入数组）。
-   **事件监听器**: `app.init()` 中添加了事件监听器。需确保 `init` 只被调用一次，否则会导致重复绑定。当前代码在 `DOMContentLoaded` 调用一次是安全的。

## 3. 改进建议 (Action Items)

### 高优先级
1.  **修复 XSS**: 修改 `analysis.js` 中所有的 `innerHTML` 拼接，特别是涉及用户输入或后端数据的部分，改为安全的 DOM 操作或进行 HTML 转义。
2.  **配置分离**: 将 API 地址移至 `js/config.js`，并支持从 `window` 对象或环境变量读取。

### 中优先级
1.  **性能优化**: 重构 `graph.js` 的节点添加逻辑，使用批量添加 API。
2.  **错误处理增强**: 优化 `api.js` 的错误解析逻辑，确保所有类型的后端错误都能被捕获并提示给用户。

### 低优先级
1.  **采用 ES Modules**: 将项目迁移到使用 ES Modules，移除对全局变量的依赖。
2.  **本地化资源**: 下载 CDN 资源到本地 `vendor` 目录。
