# 🚨 FastAPI 启动所需：Python 安装指南

## 当前状态
❌ 系统中未检测到 Python 环境  
✅ Neo4j 数据库已成功运行

## 📥 安装 Python（必需，约 5-10 分钟）

### 方法 1：官方安装（推荐）

#### 步骤 1：下载
1. 访问：https://www.python.org/downloads/
2. 点击黄色按钮 "Download Python 3.12.x"
3. 下载 Windows 安装程序（约 25MB）

#### 步骤 2：安装
⚠️ **非常重要**：安装时必须勾选以下选项：

```
☑️ Add Python to PATH  （这是最重要的选项！）
☑️ Install pip
```

点击 "Install Now" 或 "Customize installation"

#### 步骤 3：验证
安装完成后，**关闭当前 PowerShell**，**打开新的 PowerShell**，运行：

```powershell
python --version
# 应显示：Python 3.12.x

pip --version
# 应显示：pip 24.x.x
```

#### 步骤 4：启动 FastAPI
```powershell
cd d:\graph-analysis-system

# 安装依赖
pip install -r requirements.txt

# 启动服务
python -m app.main
```

---

### 方法 2：使用 Microsoft Store（更简单）

1. 打开 Microsoft Store
2. 搜索 "Python 3.12"
3. 点击 "获取" / "安装"
4. 安装完成后，打开新的 PowerShell
5. 运行：
   ```powershell
   python --version
   pip install -r requirements.txt
   python -m app.main
   ```

---

## 🔧 如果安装后仍无法使用

### 问题：命令未找到

**原因**：Python 未添加到系统 PATH

**解决方案**：手动添加 PATH

1. 找到 Python 安装目录，通常在：
   - `C:\Users\<你的用户名>\AppData\Local\Programs\Python\Python312\`
   - 或 `C:\Python312\`

2. 右键"此电脑" → "属性" → "高级系统设置"
3. 点击 "环境变量"
4. 在 "系统变量" 中找到 "Path"，点击 "编辑"
5. 点击 "新建"，添加以下两个路径：
   ```
   C:\Users\<你的用户名>\AppData\Local\Programs\Python\Python312\
   C:\Users\<你的用户名>\AppData\Local\Programs\Python\Python312\Scripts\
   ```
6. 点击 "确定" 保存
7. **重启 PowerShell**

---

## 📌 安装完成后的操作

### 1. 安装项目依赖
```powershell
cd d:\graph-analysis-system
pip install -r requirements.txt
```

这将安装：
- fastapi (Web 框架)
- uvicorn (ASGI 服务器)
- neo4j (数据库驱动)
- pandas (数据处理)
- openpyxl (Excel 支持)

### 2. 启动 FastAPI 服务
```powershell
python -m app.main
```

看到以下输出表示成功：
```
INFO:     Started server process [xxxx]
INFO:     Waiting for application startup.
✅ Connected to Neo4j
🚀 Starting application...
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 3. 访问系统
- **API 文档**: http://localhost:8000/docs
- **Neo4j**: http://localhost:7474

---

## 🆘 常见问题

### Q: 安装程序提示"已安装"但命令不可用
A: 可能是 Windows Store 的占位符。卸载后从官网重新安装。

### Q: pip 安装依赖失败
A: 使用镜像源加速：
```powershell
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

### Q: 端口 8000 被占用
A: 修改 `app/main.py` 最后一行的端口号，或停止占用该端口的程序。

---

## ⏭️ 安装完成后请告诉我

安装 Python 完成后，请在对话中告诉我，我将帮您：
1. 安装项目依赖
2. 启动 FastAPI 服务
3. 打开浏览器测试 API

---

## 💡 在此期间您可以...

由于 **Neo4j 已经运行**，您现在可以：

1. 访问 http://localhost:7474
2. 使用 `neo4j_test_queries.cypher` 中的脚本
3. 手动测试所有图分析功能

这样您就可以立即体验系统的核心能力了！

---

**我随时准备帮助您完成后续步骤！** 🚀
