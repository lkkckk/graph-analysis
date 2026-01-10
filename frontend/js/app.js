/**
 * 应用主逻辑
 * 页面初始化、导航、全局功能
 */

const app = {
    currentPage: 'dashboard',
    isLoading: false,

    /**
     * 初始化应用
     */
    async init() {
        console.log('🚀 Initializing application...');

        // 初始化导航
        this.initNavigation();

        // 初始化图谱
        graphModule.init('graph-canvas');

        // 初始化上传区域
        this.initUploadZone();

        // 初始化健康检查
        await this.checkHealth();

        // 加载统计数据
        await this.loadStatistics();

        console.log('✅ Application initialized');
    },

    /**
     * 初始化导航
     */
    initNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                if (page) {
                    this.switchPage(page);
                }
            });
        });
    },

    /**
     * 切换页面
     */
    switchPage(pageName) {
        // 更新导航状态
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.page === pageName);
        });

        // 切换页面显示
        document.querySelectorAll('.page').forEach(page => {
            page.classList.toggle('active', page.id === `page-${pageName}`);
        });

        this.currentPage = pageName;

        // 页面切换后的特殊处理
        if (pageName === 'graph') {
            setTimeout(() => graphModule.fit(), 100);
        }
    },

    /**
     * 初始化上传区域
     */
    initUploadZone() {
        const zone = document.getElementById('upload-zone');
        const input = document.getElementById('file-input');

        if (!zone || !input) return;

        // 点击上传
        zone.addEventListener('click', () => input.click());

        // 文件选择
        input.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileUpload(e.target.files[0]);
            }
        });

        // 拖拽事件
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('dragover');
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('dragover');
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                this.handleFileUpload(e.dataTransfer.files[0]);
            }
        });
    },

    /**
     * 处理文件上传
     */
    async handleFileUpload(file) {
        const dataType = document.getElementById('upload-data-type').value;
        const ext = file.name.split('.').pop().toLowerCase();

        if (!['csv', 'xlsx', 'xls'].includes(ext)) {
            this.showToast('仅支持 CSV 和 Excel 文件', 'error');
            return;
        }

        try {
            this.showLoading(`正在上传 ${file.name}...`);

            let result;
            if (ext === 'csv') {
                result = await api.uploadCSV(file, dataType);
            } else {
                result = await api.uploadExcel(file, dataType);
            }

            this.hideLoading();
            this.showToast(`导入成功！${result.message || ''}`, 'success');

            // 刷新统计
            await this.loadStatistics();

            // 显示结果
            this.showUploadResult(result);

        } catch (error) {
            this.hideLoading();
            this.showToast('上传失败: ' + error.message, 'error');
        }
    },

    /**
     * 显示上传结果
     */
    showUploadResult(result) {
        const container = document.getElementById('upload-result');
        if (!container) return;

        container.innerHTML = `
      <div class="card" style="margin-top: 16px; border-color: var(--accent-success);">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-check-circle"></i> 导入成功</span>
        </div>
        <p>节点数: ${result.nodes_created || result.nodes || 0}</p>
        <p>关系数: ${result.relationships_created || result.relationships || 0}</p>
      </div>
    `;
    },

    /**
     * 健康检查
     */
    async checkHealth() {
        const statusDot = document.getElementById('status-dot');
        const statusText = document.getElementById('status-text');

        try {
            const result = await api.health();

            if (result.status === 'healthy') {
                statusDot.classList.remove('error');
                statusText.textContent = '已连接';
            } else {
                statusDot.classList.add('error');
                statusText.textContent = '连接异常';
            }
        } catch (error) {
            statusDot.classList.add('error');
            statusText.textContent = '未连接';
        }
    },

    /**
     * 加载统计数据
     */
    async loadStatistics() {
        try {
            const stats = await api.statistics();

            document.getElementById('stat-nodes').textContent = stats.total_nodes || 0;
            document.getElementById('stat-edges').textContent = stats.total_relationships || 0;
            document.getElementById('stat-phones').textContent = stats.phone_nodes || 0;
            document.getElementById('stat-wechat').textContent = stats.wechat_nodes || 0;

        } catch (error) {
            console.error('Failed to load statistics:', error);
        }
    },

    /**
     * 清空数据
     */
    async clearAllData() {
        if (!confirm('确定要清空所有数据吗？此操作不可恢复！')) {
            return;
        }

        try {
            this.showLoading('正在清空数据...');
            await api.clearData();
            this.hideLoading();
            this.showToast('数据已清空', 'success');

            // 刷新
            await this.loadStatistics();
            graphModule.clear();

        } catch (error) {
            this.hideLoading();
            this.showToast('清空失败: ' + error.message, 'error');
        }
    },

    /**
     * 显示加载状态
     */
    showLoading(message = '加载中...') {
        this.isLoading = true;
        let overlay = document.getElementById('loading-overlay');

        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
        <div style="text-align: center; color: var(--text-primary);">
          <div class="spinner" style="width: 40px; height: 40px; margin: 0 auto 16px;"></div>
          <p id="loading-message">${message}</p>
        </div>
      `;
            document.body.appendChild(overlay);
        } else {
            document.getElementById('loading-message').textContent = message;
        }

        overlay.classList.add('active');
    },

    /**
     * 隐藏加载状态
     */
    hideLoading() {
        this.isLoading = false;
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    },

    /**
     * 显示 Toast 提示
     */
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container') || this.createToastContainer();

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            info: 'fa-info-circle'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
      <i class="fas ${icons[type]}"></i>
      <span>${message}</span>
    `;

        container.appendChild(toast);

        // 自动移除
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100px)';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    },

    /**
     * 搜索节点
     */
    searchNode() {
        const query = document.getElementById('graph-search').value.trim();
        if (!query) return;

        const count = graphModule.searchNode(query);
        if (count > 0) {
            this.showToast(`找到 ${count} 个匹配节点`, 'success');
        } else {
            this.showToast('未找到匹配节点', 'info');
        }
    },

    /**
     * 刷新数据
     */
    async refresh() {
        await this.checkHealth();
        await this.loadStatistics();
        this.showToast('数据已刷新', 'success');
    }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// 导出
window.app = app;
