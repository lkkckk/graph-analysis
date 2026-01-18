/**
 * 图谱可视化模块
 * 使用 vis.js 渲染交互式网络图
 */

const graphModule = {
    network: null,
    nodes: null,
    edges: null,
    container: null,

    /**
     * 初始化图谱
     */
    init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Graph container not found:', containerId);
            return;
        }

        this.nodes = new vis.DataSet([]);
        this.edges = new vis.DataSet([]);

        const data = {
            nodes: this.nodes,
            edges: this.edges
        };

        const options = {
            nodes: {
                shape: 'dot',
                size: 20,
                font: {
                    size: 12,
                    color: '#ccd6f6',
                    face: 'Inter, sans-serif'
                },
                borderWidth: 2,
                shadow: {
                    enabled: true,
                    color: 'rgba(0,0,0,0.5)',
                    size: 10
                }
            },
            edges: {
                width: 1.5,
                color: {
                    color: '#495670',
                    highlight: '#64ffda',
                    hover: '#64ffda'
                },
                arrows: {
                    to: { enabled: false }
                },
                smooth: {
                    type: 'continuous',
                    roundness: 0.5
                },
                font: {
                    size: 10,
                    color: '#8892b0',
                    strokeWidth: 0
                }
            },
            physics: {
                enabled: true,
                barnesHut: {
                    gravitationalConstant: -3000,
                    centralGravity: 0.3,
                    springLength: 150,
                    springConstant: 0.04,
                    damping: 0.09
                },
                stabilization: {
                    iterations: 150,
                    fit: true
                }
            },
            interaction: {
                hover: true,
                tooltipDelay: 200,
                hideEdgesOnDrag: true,
                navigationButtons: false,
                keyboard: {
                    enabled: true,
                    bindToWindow: false
                }
            },
            layout: {
                improvedLayout: true
            }
        };

        this.network = new vis.Network(this.container, data, options);

        // 事件监听
        this.network.on('click', (params) => {
            if (params.nodes.length > 0) {
                this.onNodeClick(params.nodes[0]);
            } else {
                this.hideNodeDetail();
            }
        });

        this.network.on('hoverNode', (params) => {
            this.container.style.cursor = 'pointer';
        });

        this.network.on('blurNode', () => {
            this.container.style.cursor = 'default';
        });

        console.log('Graph initialized');
    },

    /**
     * 获取节点颜色
     */
    getNodeColor(type) {
        const colors = {
            'Phone': {
                background: '#ffd166',
                border: '#f5a623',
                highlight: { background: '#ffe599', border: '#ffd166' }
            },
            'WeChat': {
                background: '#06d6a0',
                border: '#05b88a',
                highlight: { background: '#3de0b5', border: '#06d6a0' }
            },
            'default': {
                background: '#64ffda',
                border: '#00b4d8',
                highlight: { background: '#9effea', border: '#64ffda' }
            }
        };
        return colors[type] || colors['default'];
    },

    /**
     * 添加节点
     */
    addNode(id, label, type = 'Phone', properties = {}) {
        const color = this.getNodeColor(type);

        // 检查是否已存在
        if (this.nodes.get(id)) {
            return;
        }

        this.nodes.add({
            id: id,
            label: label,
            title: `${type}: ${label}`,
            color: color,
            nodeType: type,
            properties: properties
        });
    },

    /**
     * 添加边
     */
    addEdge(from, to, label = '', properties = {}) {
        const edgeId = `${from}-${to}`;
        const reverseId = `${to}-${from}`;

        // 检查是否已存在（双向）
        if (this.edges.get(edgeId) || this.edges.get(reverseId)) {
            return;
        }

        this.edges.add({
            id: edgeId,
            from: from,
            to: to,
            label: label,
            title: properties.title || '',
            properties: properties
        });
    },

    /**
     * 清空图谱
     */
    clear() {
        this.nodes.clear();
        this.edges.clear();
    },

    /**
     * 加载网络数据
     */
    async loadNetworkData(targetId, depth = 2, nodeType = 'Phone') {
        try {
            this.clear();
            app.showLoading('加载网络数据...');

            const result = await api.expandNetwork(targetId, depth, nodeType);

            if (result.nodes && result.nodes.length > 0) {
                const newNodes = result.nodes.map(node => ({
                    id: node.id || node.number || node.wxid,
                    label: node.id || node.number || node.wxid,
                    title: `${node.type || nodeType}: ${node.id || node.number || node.wxid}`,
                    color: this.getNodeColor(node.type || nodeType),
                    nodeType: node.type || nodeType
                }));
                this.nodes.add(newNodes);
            }

            if (result.relationships && result.relationships.length > 0) {
                const newEdges = result.relationships.map(rel => ({
                    from: rel.source || rel.from,
                    to: rel.target || rel.to,
                    label: rel.type || '',
                    title: rel.type || '',
                    properties: { count: rel.count, duration: rel.total_duration }
                }));
                this.edges.add(newEdges);
            }

            // 如果没有数据从expandNetwork，尝试从统计接口构建
            if (this.nodes.length === 0) {
                await this.loadFromStatistics();
            }

            this.fit();
            app.hideLoading();
            app.showToast(`已加载 ${this.nodes.length} 个节点`, 'success');

        } catch (error) {
            app.hideLoading();
            app.showToast('加载网络数据失败: ' + error.message, 'error');
        }
    },

    /**
     * 从统计数据构建图谱（备用方案）
     */
    async loadFromStatistics() {
        try {
            const stats = await api.statistics();

            // 这里可以根据实际的统计数据结构来构建
            // 暂时显示空状态
            if (this.nodes.length === 0) {
                console.log('No data to display');
            }
        } catch (error) {
            console.error('Failed to load statistics:', error);
        }
    },

    /**
     * 高亮路径
     */
    highlightPath(nodeIds) {
        // 重置所有节点颜色
        this.nodes.forEach(node => {
            const color = this.getNodeColor(node.nodeType);
            this.nodes.update({ id: node.id, color: color });
        });

        // 高亮路径节点
        nodeIds.forEach(id => {
            this.nodes.update({
                id: id,
                color: {
                    background: '#64ffda',
                    border: '#00b4d8'
                }
            });
        });

        // 聚焦到路径
        if (nodeIds.length > 0) {
            this.network.fit({
                nodes: nodeIds,
                animation: true
            });
        }
    },

    /**
     * 高亮社区
     */
    highlightCommunities(communities) {
        const colors = [
            '#64ffda', '#ffd166', '#06d6a0', '#ef476f',
            '#00b4d8', '#9b5de5', '#f15bb5', '#fee440'
        ];

        communities.forEach((community, index) => {
            const color = colors[index % colors.length];
            community.members.forEach(memberId => {
                this.nodes.update({
                    id: memberId,
                    color: {
                        background: color,
                        border: color
                    }
                });
            });
        });
    },

    /**
     * 节点点击事件
     */
    onNodeClick(nodeId) {
        const node = this.nodes.get(nodeId);
        if (node) {
            this.showNodeDetail(node);
        }
    },

    /**
     * 显示节点详情
     */
    showNodeDetail(node) {
        const panel = document.getElementById('node-detail-panel');
        if (!panel) return;

        const nodeId = document.getElementById('detail-node-id');
        const nodeType = document.getElementById('detail-node-type');

        if (nodeId) nodeId.textContent = node.id;
        if (nodeType) nodeType.textContent = node.nodeType || 'Unknown';

        panel.classList.add('active');
    },

    /**
     * 隐藏节点详情
     */
    hideNodeDetail() {
        const panel = document.getElementById('node-detail-panel');
        if (panel) {
            panel.classList.remove('active');
        }
    },

    /**
     * 适应视图
     */
    fit() {
        if (this.network) {
            this.network.fit({
                animation: {
                    duration: 500,
                    easingFunction: 'easeOutQuad'
                }
            });
        }
    },

    /**
     * 缩放
     */
    zoom(direction) {
        if (!this.network) return;

        const scale = this.network.getScale();
        const newScale = direction === 'in' ? scale * 1.2 : scale / 1.2;

        this.network.moveTo({
            scale: newScale,
            animation: {
                duration: 200,
                easingFunction: 'easeOutQuad'
            }
        });
    },

    /**
     * 搜索并聚焦节点
     */
    searchNode(query) {
        if (!query) return;

        const found = this.nodes.get({
            filter: (node) => {
                return node.id.toLowerCase().includes(query.toLowerCase()) ||
                    node.label.toLowerCase().includes(query.toLowerCase());
            }
        });

        if (found.length > 0) {
            const nodeIds = found.map(n => n.id);
            this.network.selectNodes(nodeIds);
            this.network.fit({
                nodes: nodeIds,
                animation: true
            });
            return found.length;
        }

        return 0;
    },

    /**
     * 可视化目标分析结果（以目标为中心的关系图）
     */
    visualizeTargetResult(result) {
        this.clear();

        if (!result.nodes || result.nodes.length === 0) {
            console.log('No nodes to display');
            return;
        }

        // 定义颜色
        const colors = {
            'Target': { background: '#ef4444', border: '#dc2626', font: '#fff' },
            'Person': { background: '#6366f1', border: '#4f46e5', font: '#fff' },
            'Phone': { background: '#ffd166', border: '#f5a623', font: '#333' }
        };

        // 批量添加节点
        const newNodes = result.nodes.map(node => {
            const nodeColor = colors[node.type] || colors['Phone'];
            return {
                id: node.id,
                label: node.label,
                title: `${node.type}: ${node.label}${node.number ? '\n号码: ' + node.number : ''}`,
                color: {
                    background: nodeColor.background,
                    border: nodeColor.border,
                    highlight: { background: nodeColor.background, border: '#64ffda' }
                },
                font: { color: nodeColor.font, size: node.type === 'Target' ? 16 : 12 },
                size: node.size || 25,
                nodeType: node.type
            };
        });
        this.nodes.add(newNodes);

        // 批量添加边
        const newEdges = result.edges.map((edge, index) => {
            let edgeStyle = {
                color: '#64748b',
                width: 1.5,
                dashes: false
            };

            if (edge.type === 'contact') {
                edgeStyle = { color: '#22c55e', width: 2, dashes: false };
            } else if (edge.type === 'knows') {
                edgeStyle = { color: '#6366f1', width: 1.5, dashes: false };
            } else if (edge.type === 'common') {
                const strength = edge.strength || 1;
                edgeStyle = {
                    color: strength >= 3 ? '#ef4444' : '#f97316',
                    width: 1 + strength,
                    dashes: true
                };
            }

            return {
                id: `edge_${index}`,
                from: edge.from,
                to: edge.to,
                label: edge.label || '',
                color: { color: edgeStyle.color, highlight: '#64ffda' },
                width: edgeStyle.width,
                dashes: edgeStyle.dashes,
                title: edge.label || ''
            };
        });
        this.edges.add(newEdges);

        this.fit();
        this.showTargetLegend();

        return {
            nodes: this.nodes.length,
            edges: this.edges.length
        };
    },

    /**
     * 显示目标分析图例
     */
    showTargetLegend() {
        const legend = document.querySelector('.graph-legend');
        if (legend) {
            legend.innerHTML = `
                <div class="legend-item">
                    <span class="legend-dot" style="background: #ef4444;"></span>
                    <span>目标</span>
                </div>
                <div class="legend-item">
                    <span class="legend-dot" style="background: #6366f1;"></span>
                    <span>相关人物</span>
                </div>
                <div class="legend-item">
                    <span class="legend-dot" style="background: #ffd166;"></span>
                    <span>电话号码</span>
                </div>
            `;
        }
    },

    /**
     * 可视化碰撞分析结果
     */
    visualizeCollisionResult(result) {
        this.clear();

        const personColors = {};
        const colorPalette = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6'];
        let colorIndex = 0;

        // 获取人物颜色
        const getPersonColor = (name) => {
            if (!personColors[name]) {
                personColors[name] = colorPalette[colorIndex % colorPalette.length];
                colorIndex++;
            }
            return personColors[name];
        };

        // 1. 添加人物节点（Person）
        const persons = new Set();

        if (result.common_contacts) {
            result.common_contacts.forEach(item => {
                persons.add(item.person1);
                persons.add(item.person2);
            });
        }

        if (result.hot_numbers) {
            result.hot_numbers.forEach(item => {
                (item.owners || []).forEach(owner => persons.add(owner));
            });
        }

        // 准备批量添加的数组
        const newNodes = [];
        const newEdges = [];

        // 添加人物节点
        persons.forEach(person => {
            const color = getPersonColor(person);
            newNodes.push({
                id: `person_${person}`,
                label: person,
                title: `人物: ${person}`,
                color: {
                    background: color,
                    border: color,
                    highlight: { background: color, border: '#fff' }
                },
                nodeType: 'Person',
                size: 30,
                font: { size: 14, color: '#fff', bold: true }
            });
        });

        // 2. 添加热点号码节点
        if (result.hot_numbers) {
            result.hot_numbers.forEach(item => {
                const nodeId = `phone_${item.number}`;

                // 添加电话节点
                newNodes.push({
                    id: nodeId,
                    label: item.name || item.number,
                    title: `电话: ${item.number}\n姓名: ${item.name || '未知'}\n被 ${item.owner_count} 人联系`,
                    color: {
                        background: '#ffd166',
                        border: '#f5a623',
                        highlight: { background: '#ffe599', border: '#ffd166' }
                    },
                    nodeType: 'Phone',
                    size: 15 + item.owner_count * 5 // 越多人联系越大
                });

                // 添加从人物到电话的边
                (item.owners || []).forEach(owner => {
                    newEdges.push({
                        from: `person_${owner}`,
                        to: nodeId,
                        label: 'HAS_CONTACT',
                        color: { color: '#64748b', highlight: '#64ffda' },
                        title: `${owner} 的联系人`
                    });
                });
            });
        }

        // 3. 添加人物关系边（基于共同联系人）
        if (result.person_relations) {
            result.person_relations.forEach(item => {
                const edgeColor = item.relation_strength === '强' ? '#ef4444' :
                    (item.relation_strength === '中' ? '#f97316' : '#94a3b8');
                const width = item.relation_strength === '强' ? 4 :
                    (item.relation_strength === '中' ? 2.5 : 1.5);

                newEdges.push({
                    from: `person_${item.person1}`,
                    to: `person_${item.person2}`,
                    label: `${item.shared_contacts} 个共同联系人`,
                    color: { color: edgeColor, highlight: '#64ffda' },
                    width: width,
                    dashes: true,
                    title: `关系强度: ${item.relation_strength}\n共同联系人: ${item.shared_contacts} 个`
                });
            });
        }

        this.nodes.add(newNodes);
        this.edges.add(newEdges);

        this.fit();

        // 显示图例
        this.showCollisionLegend();

        return {
            nodes: this.nodes.length,
            edges: this.edges.length
        };
    },

    /**
     * 显示碰撞分析图例
     */
    showCollisionLegend() {
        const legend = document.querySelector('.graph-legend');
        if (legend) {
            legend.innerHTML = `
                <div class="legend-item">
                    <span class="legend-dot" style="background: #6366f1;"></span>
                    <span>人物</span>
                </div>
                <div class="legend-item">
                    <span class="legend-dot" style="background: #ffd166;"></span>
                    <span>电话</span>
                </div>
                <div class="legend-item">
                    <span style="display: inline-block; width: 20px; border-top: 3px dashed #ef4444;"></span>
                    <span>强关联</span>
                </div>
                <div class="legend-item">
                    <span style="display: inline-block; width: 20px; border-top: 2px dashed #f97316;"></span>
                    <span>中关联</span>
                </div>
            `;
        }
    }
};

// 导出模块
window.graphModule = graphModule;
