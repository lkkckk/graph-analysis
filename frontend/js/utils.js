/**
 * 通用工具模块
 */
const utils = {
    /**
     * HTML 转义，防止 XSS 攻击
     * @param {string} unsafe - 不安全的字符串
     * @returns {string} - 转义后的安全字符串
     */
    escapeHtml: (unsafe) => {
        if (unsafe === null || unsafe === undefined) return '';
        return String(unsafe)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    /**
     * 简单的防抖函数
     */
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// 导出工具
window.utils = utils;
