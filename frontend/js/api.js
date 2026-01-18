/**
 * API 请求封装模块
 * 封装与后端 API 的所有交互
 */

const API_BASE = window.config ? window.config.API_BASE : 'http://localhost:8011';

const api = {
    /**
     * 通用请求方法
     */
    async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.detail || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    },

    // ==================== 系统接口 ====================

    /**
     * 健康检查
     */
    async health() {
        return this.request('/health');
    },

    /**
     * 获取统计信息
     */
    async statistics() {
        return this.request('/statistics');
    },

    /**
     * 自动碰撞分析（一键分析所有数据）
     */
    async autoCollision() {
        return this.request('/analysis/auto-collision');
    },

    /**
     * 目标分析（以某个号码为中心）
     */
    async analyzeTarget(targetNumber) {
        return this.request(`/analysis/target/${encodeURIComponent(targetNumber)}`);
    },

    // ==================== 数据导入接口 ====================

    /**
     * 导入话单数据 (JSON)
     */
    async importCDR(records) {
        return this.request('/ingest/cdr', {
            method: 'POST',
            body: JSON.stringify(records)
        });
    },

    /**
     * 导入微信数据 (JSON)
     */
    async importWeChat(friends) {
        return this.request('/ingest/wechat', {
            method: 'POST',
            body: JSON.stringify(friends)
        });
    },

    /**
     * 上传 Excel 文件
     */
    async uploadExcel(file, dataType = 'cdr') {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('data_type', dataType);

        const url = `${API_BASE}/ingest/upload/excel`;
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || `HTTP ${response.status}`);
        }

        return response.json();
    },

    /**
     * 上传 CSV 文件
     */
    async uploadCSV(file, dataType = 'cdr') {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('data_type', dataType);

        const url = `${API_BASE}/ingest/upload/csv`;
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || `HTTP ${response.status}`);
        }

        return response.json();
    },

    /**
     * 清空所有数据
     */
    async clearData() {
        return this.request('/ingest/clear', {
            method: 'DELETE'
        });
    },

    // ==================== 研判分析接口 ====================

    /**
     * 共同联系人分析
     */
    async commonContacts(targetA, targetB, nodeType = 'Phone') {
        return this.request('/analysis/common-contacts', {
            method: 'POST',
            body: JSON.stringify({
                target_a: targetA,
                target_b: targetB,
                node_type: nodeType
            })
        });
    },

    /**
     * 最短路径查询
     */
    async shortestPath(source, target, maxDepth = 5) {
        const params = new URLSearchParams({
            source,
            target,
            max_depth: maxDepth
        });
        return this.request(`/analysis/path?${params}`);
    },

    /**
     * 频繁联系分析
     */
    async frequentContacts(targetId, nodeType = 'Phone', topN = 10) {
        const params = new URLSearchParams({
            target_id: targetId,
            node_type: nodeType,
            top_n: topN
        });
        return this.request(`/analysis/frequent-contacts?${params}`);
    },

    /**
     * 中心节点分析
     */
    async centralNodes(nodeType = 'Phone', topN = 10) {
        const params = new URLSearchParams({
            node_type: nodeType,
            top_n: topN
        });
        return this.request(`/analysis/central-nodes?${params}`);
    },

    /**
     * 社区发现
     */
    async communities(nodeType = 'Phone', minSize = 3) {
        const params = new URLSearchParams({
            node_type: nodeType,
            min_size: minSize
        });
        return this.request(`/analysis/communities?${params}`);
    },

    /**
     * 网络扩展
     */
    async expandNetwork(targetId, depth = 2, nodeType = 'Phone') {
        return this.request('/analysis/expand-network', {
            method: 'POST',
            body: JSON.stringify({
                target_id: targetId,
                depth: depth,
                node_type: nodeType
            })
        });
    },

    /**
     * 通话模式分析
     */
    async callPattern(targetId, timeWindowDays = 30) {
        const params = new URLSearchParams({
            target_id: targetId,
            time_window_days: timeWindowDays
        });
        return this.request(`/analysis/call-pattern?${params}`);
    }
};

// 导出 API 模块
window.api = api;
