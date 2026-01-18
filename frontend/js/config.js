/**
 * 全局配置模块
 */
const config = {
    // API 基础地址
    // 优先使用当前页面 Origin (适用于前后端同源部署)，否则使用默认开发地址
    API_BASE: 'http://localhost:8011'
};

// 导出配置
window.config = config;
