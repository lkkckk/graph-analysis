/**
 * 研判分析模块
 * 处理各种分析功能的 UI 交互和结果展示
 */

const analysisModule = {
  /**
   * 🎯 目标关系分析（以某个号码为中心）
   */
  async analyzeTarget() {
    const targetNumber = document.getElementById('target-number-input')?.value?.trim();

    if (!targetNumber) {
      app.showToast('请输入目标电话号码', 'warning');
      return;
    }

    try {
      app.showLoading('正在分析目标关系...');
      const result = await api.analyzeTarget(targetNumber);
      app.hideLoading();

      // 保存结果
      this.lastTargetResult = result;

      // 显示简要结果
      this.showTargetAnalysisResult(result);

      // 自动跳转到图谱页面并可视化
      if (result.nodes && result.nodes.length > 0) {
        setTimeout(() => {
          this.visualizeTargetResult();
        }, 500);
      }

    } catch (error) {
      app.hideLoading();
      app.showToast('分析失败: ' + error.message, 'error');
    }
  },

  /**
   * 显示目标分析结果摘要
   */
  showTargetAnalysisResult(result) {
    const container = document.getElementById('target-analysis-result');
    if (!container) return;

    const summary = result.summary || {};

    if (summary.node_count === 0 || summary.node_count === 1) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 20px;">
          <i class="fas fa-search"></i>
          <h4>未找到相关数据</h4>
          <p>号码 <strong>${utils.escapeHtml(summary.target)}</strong> 在系统中没有找到关联关系。<br>请确认号码正确，或先导入相关数据。</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="background: var(--bg-tertiary); border-radius: 8px; padding: 16px; margin-top: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h4 style="margin: 0;">
            <i class="fas fa-check-circle" style="color: var(--accent-success);"></i> 
            分析完成
          </h4>
          <button class="btn btn-primary btn-sm" onclick="analysisModule.visualizeTargetResult()">
            <i class="fas fa-project-diagram"></i> 查看图谱
          </button>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
          <div style="text-align: center;">
            <div style="font-size: 20px; font-weight: bold; color: var(--accent-primary);">${utils.escapeHtml(summary.target_name) || '未知'}</div>
            <div style="font-size: 12px; color: var(--text-muted);">目标姓名</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 20px; font-weight: bold; color: var(--accent-success);">${summary.owner_count || 0}</div>
            <div style="font-size: 12px; color: var(--text-muted);">被谁联系</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 20px; font-weight: bold; color: var(--accent-warning);">${summary.node_count || 0}</div>
            <div style="font-size: 12px; color: var(--text-muted);">图谱节点</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 20px; font-weight: bold; color: var(--accent-danger);">${summary.edge_count || 0}</div>
            <div style="font-size: 12px; color: var(--text-muted);">关系连线</div>
          </div>
        </div>
        
        ${result.owners && result.owners.length > 0 ? `
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color);">
            <strong>在以下人的通讯录中：</strong>
            <span style="color: var(--accent-success);">${result.owners.map(o => utils.escapeHtml(o)).join('、')}</span>
          </div>
        ` : ''}
      </div>
    `;
  },

  /**
   * 可视化目标分析结果
   */
  visualizeTargetResult() {
    if (!this.lastTargetResult) {
      app.showToast('请先执行目标分析', 'warning');
      return;
    }

    // 切换到图谱页面
    app.switchPage('graph');

    // 稍等一下确保图谱已初始化
    setTimeout(() => {
      graphModule.visualizeTargetResult(this.lastTargetResult);
      app.showToast(`已生成关系图谱`, 'success');
    }, 100);
  },

  /**
   * 🔥 自动碰撞分析（一键分析所有数据）
   */
  async autoCollision() {
    try {
      app.showLoading('正在进行碰撞分析，请稍候...');
      const result = await api.autoCollision();
      app.hideLoading();

      // 保存结果供可视化使用
      this.lastCollisionResult = result;

      this.showAutoCollisionResult(result);
      app.showToast('碰撞分析完成！', 'success');
    } catch (error) {
      app.hideLoading();
      app.showToast('分析失败: ' + error.message, 'error');
    }
  },

  /**
   * 可视化碰撞分析结果
   */
  visualizeCollision() {
    if (!this.lastCollisionResult) {
      app.showToast('请先执行碰撞分析', 'warning');
      return;
    }

    // 切换到图谱页面
    app.switchPage('graph');

    // 稍等一下确保图谱已初始化
    setTimeout(() => {
      const stats = graphModule.visualizeCollisionResult(this.lastCollisionResult);
      app.showToast(`已生成关系图谱：${stats.nodes} 个节点，${stats.edges} 条关系`, 'success');
    }, 100);
  },

  showAutoCollisionResult(result) {
    const container = document.getElementById('auto-collision-result');
    if (!container) return;

    const summary = result.summary || {};

    let html = `
            <div style="background: var(--bg-secondary); border-radius: 12px; padding: 16px; margin-top: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h4 style="margin: 0; color: var(--text-primary);">
                        <i class="fas fa-chart-pie" style="color: var(--accent-primary);"></i> 分析结果汇总
                    </h4>
                    <button class="btn btn-primary" onclick="analysisModule.visualizeCollision()" style="padding: 8px 16px;">
                        <i class="fas fa-project-diagram"></i> 可视化关系图谱
                    </button>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;">
                    <div style="text-align: center; padding: 12px; background: var(--bg-tertiary); border-radius: 8px;">
                        <div style="font-size: 24px; font-weight: bold; color: var(--accent-success);">${summary.common_contact_pairs || 0}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">共同联系人对</div>
                    </div>
                    <div style="text-align: center; padding: 12px; background: var(--bg-tertiary); border-radius: 8px;">
                        <div style="font-size: 24px; font-weight: bold; color: var(--accent-warning);">${summary.hot_numbers_count || 0}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">热点号码</div>
                    </div>
                    <div style="text-align: center; padding: 12px; background: var(--bg-tertiary); border-radius: 8px;">
                        <div style="font-size: 24px; font-weight: bold; color: var(--accent-primary);">${summary.cross_links_count || 0}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">跨源关联</div>
                    </div>
                    <div style="text-align: center; padding: 12px; background: var(--bg-tertiary); border-radius: 8px;">
                        <div style="font-size: 24px; font-weight: bold; color: var(--accent-danger);">${summary.person_pairs || 0}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">人物关系</div>
                    </div>
                </div>
        `;

    // 共同联系人
    if (result.common_contacts && result.common_contacts.length > 0) {
      html += `
                <div style="margin-bottom: 20px;">
                    <h5 style="margin-bottom: 12px;"><i class="fas fa-users" style="color: var(--accent-success);"></i> 共同联系人</h5>
                    <table class="result-table">
                        <thead>
                            <tr><th>人物 A</th><th>人物 B</th><th>共同联系人</th><th>数量</th></tr>
                        </thead>
                        <tbody>
            `;
      result.common_contacts.slice(0, 10).forEach(item => {
        html += `
                    <tr>
                        <td>${utils.escapeHtml(item.person1)}</td>
                        <td>${utils.escapeHtml(item.person2)}</td>
                        <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${(item.common_phones || []).slice(0, 3).map(p => utils.escapeHtml(p)).join(', ')}${item.common_phones?.length > 3 ? '...' : ''}</td>
                        <td><span class="badge badge-success">${item.common_count}</span></td>
                    </tr>
                `;
      });
      html += '</tbody></table></div>';
    }

    // 热点号码
    if (result.hot_numbers && result.hot_numbers.length > 0) {
      html += `
                <div style="margin-bottom: 20px;">
                    <h5 style="margin-bottom: 12px;"><i class="fas fa-fire" style="color: var(--accent-warning);"></i> 热点号码（被多人联系）</h5>
                    <table class="result-table">
                        <thead>
                            <tr><th>号码</th><th>姓名</th><th>被多少人联系</th><th>联系人</th></tr>
                        </thead>
                        <tbody>
            `;
      result.hot_numbers.slice(0, 10).forEach(item => {
        html += `
                    <tr>
                        <td><strong>${utils.escapeHtml(item.number)}</strong></td>
                        <td>${utils.escapeHtml(item.name) || '-'}</td>
                        <td><span class="badge badge-warning">${item.owner_count} 人</span></td>
                        <td>${(item.owners || []).map(o => utils.escapeHtml(o)).join(', ')}</td>
                    </tr>
                `;
      });
      html += '</tbody></table></div>';
    }

    // 人物关系
    if (result.person_relations && result.person_relations.length > 0) {
      html += `
                <div style="margin-bottom: 20px;">
                    <h5 style="margin-bottom: 12px;"><i class="fas fa-project-diagram" style="color: var(--accent-danger);"></i> 推断的人物关系</h5>
                    <table class="result-table">
                        <thead>
                            <tr><th>人物 A</th><th>人物 B</th><th>共同联系人数</th><th>关系强度</th></tr>
                        </thead>
                        <tbody>
            `;
      result.person_relations.slice(0, 10).forEach(item => {
        const strengthColor = item.relation_strength === '强' ? 'danger' : (item.relation_strength === '中' ? 'warning' : 'secondary');
        html += `
                    <tr>
                        <td>${utils.escapeHtml(item.person1)}</td>
                        <td>${utils.escapeHtml(item.person2)}</td>
                        <td>${item.shared_contacts}</td>
                        <td><span class="badge badge-${strengthColor}">${item.relation_strength}</span></td>
                    </tr>
                `;
      });
      html += '</tbody></table></div>';
    }

    // 如果没有任何结果
    if ((!result.common_contacts || result.common_contacts.length === 0) &&
      (!result.hot_numbers || result.hot_numbers.length === 0) &&
      (!result.person_relations || result.person_relations.length === 0)) {
      html += `
                <div class="empty-state" style="padding: 40px;">
                    <i class="fas fa-database"></i>
                    <h4>暂无碰撞结果</h4>
                    <p>请先导入多个人的数据（通讯录/微信好友），然后再进行碰撞分析。</p>
                </div>
            `;
    }

    html += '</div>';
    container.innerHTML = html;
  },

  /**
   * 共同联系人分析
   */
  async commonContacts() {
    const targetA = document.getElementById('common-target-a').value.trim();
    const targetB = document.getElementById('common-target-b').value.trim();
    const nodeType = document.getElementById('common-node-type').value;

    if (!targetA || !targetB) {
      app.showToast('请输入两个目标 ID', 'error');
      return;
    }

    try {
      app.showLoading('分析共同联系人...');
      const result = await api.commonContacts(targetA, targetB, nodeType);
      app.hideLoading();

      this.showCommonContactsResult(result);
    } catch (error) {
      app.hideLoading();
      app.showToast('分析失败: ' + error.message, 'error');
    }
  },

  showCommonContactsResult(result) {
    const container = document.getElementById('common-contacts-result');
    if (!container) return;

    if (!result.common_contacts || result.common_contacts.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-users-slash"></i>
          <h4>未找到共同联系人</h4>
          <p>${utils.escapeHtml(result.target_a)} 和 ${utils.escapeHtml(result.target_b)} 没有共同的联系人</p>
        </div>
      `;
      return;
    }

    let html = `
      <div class="result-header">
        <span class="badge badge-primary">${result.count} 个共同联系人</span>
      </div>
      <table class="result-table">
        <thead>
          <tr>
            <th>联系人 ID</th>
            <th>类型</th>
            <th>联系强度</th>
          </tr>
        </thead>
        <tbody>
    `;

    result.common_contacts.forEach(contact => {
      html += `
        <tr>
          <td>${utils.escapeHtml(contact.common_id)}</td>
          <td><span class="badge badge-${contact.type === 'Phone' ? 'warning' : 'success'}">${utils.escapeHtml(contact.type)}</span></td>
          <td>${utils.escapeHtml(contact.contact_strength) || '-'}</td>
        </tr>
      `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
  },

  /**
   * 最短路径分析
   */
  async shortestPath() {
    const source = document.getElementById('path-source').value.trim();
    const target = document.getElementById('path-target').value.trim();
    const maxDepth = parseInt(document.getElementById('path-max-depth').value) || 5;

    if (!source || !target) {
      app.showToast('请输入起点和终点', 'error');
      return;
    }

    try {
      app.showLoading('查询最短路径...');
      const result = await api.shortestPath(source, target, maxDepth);
      app.hideLoading();

      this.showPathResult(result);
    } catch (error) {
      app.hideLoading();
      app.showToast('查询失败: ' + error.message, 'error');
    }
  },

  showPathResult(result) {
    const container = document.getElementById('path-result');
    if (!container) return;

    if (!result.path || result.path.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-route"></i>
          <h4>未找到关联路径</h4>
          <p>在指定深度内没有找到连接路径</p>
        </div>
      `;
      return;
    }

    const pathStr = result.path.join(' → ');
    container.innerHTML = `
      <div class="result-header">
        <span class="badge badge-primary">路径长度: ${result.path.length - 1}</span>
      </div>
      <div class="path-display">
        <p style="font-size: 1.1rem; word-break: break-all;">${utils.escapeHtml(pathStr)}</p>
      </div>
      <button class="btn btn-secondary" onclick="analysisModule.highlightPathOnGraph('${result.path.join(',')}')">
        <i class="fas fa-eye"></i> 在图谱中显示
      </button>
    `;
  },

  highlightPathOnGraph(pathStr) {
    const nodeIds = pathStr.split(',');
    graphModule.highlightPath(nodeIds);
    app.switchPage('graph');
  },

  /**
   * 频繁联系分析
   */
  async frequentContacts() {
    const targetId = document.getElementById('frequent-target').value.trim();
    const nodeType = document.getElementById('frequent-node-type').value;
    const topN = parseInt(document.getElementById('frequent-top-n').value) || 10;

    if (!targetId) {
      app.showToast('请输入目标 ID', 'error');
      return;
    }

    try {
      app.showLoading('分析频繁联系人...');
      const result = await api.frequentContacts(targetId, nodeType, topN);
      app.hideLoading();

      this.showFrequentContactsResult(result);
    } catch (error) {
      app.hideLoading();
      app.showToast('分析失败: ' + error.message, 'error');
    }
  },

  showFrequentContactsResult(result) {
    const container = document.getElementById('frequent-contacts-result');
    if (!container) return;

    if (!result.frequent_contacts || result.frequent_contacts.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-phone-slash"></i>
          <h4>暂无通话记录</h4>
          <p>未找到 ${utils.escapeHtml(result.target)} 的联系记录</p>
        </div>
      `;
      return;
    }

    let html = `
      <div class="result-header">
        <span class="badge badge-primary">${result.count} 个联系人</span>
      </div>
      <table class="result-table">
        <thead>
          <tr>
            <th>排名</th>
            <th>联系人</th>
            <th>通话次数</th>
            <th>总时长(秒)</th>
          </tr>
        </thead>
        <tbody>
    `;

    result.frequent_contacts.forEach((contact, index) => {
      html += `
        <tr>
          <td>${index + 1}</td>
          <td>${utils.escapeHtml(contact.contact_id)}</td>
          <td>${contact.call_count || contact.count || '-'}</td>
          <td>${contact.total_duration || '-'}</td>
        </tr>
      `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
  },

  /**
   * 中心节点分析
   */
  async centralNodes() {
    const nodeType = document.getElementById('central-node-type').value;
    const topN = parseInt(document.getElementById('central-top-n').value) || 10;

    try {
      app.showLoading('分析中心节点...');
      const result = await api.centralNodes(nodeType, topN);
      app.hideLoading();

      this.showCentralNodesResult(result);
    } catch (error) {
      app.hideLoading();
      app.showToast('分析失败: ' + error.message, 'error');
    }
  },

  showCentralNodesResult(result) {
    const container = document.getElementById('central-nodes-result');
    if (!container) return;

    if (!result.central_nodes || result.central_nodes.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-project-diagram"></i>
          <h4>暂无数据</h4>
          <p>请先导入数据</p>
        </div>
      `;
      return;
    }

    let html = `
      <div class="result-header">
        <span class="badge badge-primary">${result.count} 个中心节点</span>
      </div>
      <table class="result-table">
        <thead>
          <tr>
            <th>排名</th>
            <th>节点 ID</th>
            <th>度数</th>
          </tr>
        </thead>
        <tbody>
    `;

    result.central_nodes.forEach((node, index) => {
      html += `
        <tr>
          <td>${index + 1}</td>
          <td>${utils.escapeHtml(node.id || node.node_id)}</td>
          <td>${node.degree || node.connection_count || '-'}</td>
        </tr>
      `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
  },

  /**
   * 社区发现
   */
  async communities() {
    const nodeType = document.getElementById('community-node-type').value;
    const minSize = parseInt(document.getElementById('community-min-size').value) || 3;

    try {
      app.showLoading('发现社区...');
      const result = await api.communities(nodeType, minSize);
      app.hideLoading();

      this.showCommunitiesResult(result);
    } catch (error) {
      app.hideLoading();
      app.showToast('分析失败: ' + error.message, 'error');
    }
  },

  showCommunitiesResult(result) {
    const container = document.getElementById('communities-result');
    if (!container) return;

    if (!result.communities || result.communities.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-users"></i>
          <h4>未发现社区</h4>
          <p>没有找到符合条件的联系群组</p>
        </div>
      `;
      return;
    }

    let html = `
      <div class="result-header">
        <span class="badge badge-primary">发现 ${result.count} 个社区</span>
        <button class="btn btn-secondary btn-sm" onclick="analysisModule.highlightCommunitiesOnGraph()">
          <i class="fas fa-palette"></i> 图谱着色
        </button>
      </div>
    `;

    result.communities.forEach((community, index) => {
      html += `
        <div class="card" style="margin-top: 12px; padding: 12px;">
          <h5>社区 ${index + 1} <span class="badge badge-success">${community.members.length} 人</span></h5>
          <p style="font-size: 0.85rem; color: var(--text-secondary); word-break: break-all;">
            ${community.members.map(m => utils.escapeHtml(m)).join(', ')}
          </p>
        </div>
      `;
    });

    container.innerHTML = html;
    this.lastCommunities = result.communities;
  },

  highlightCommunitiesOnGraph() {
    if (this.lastCommunities) {
      graphModule.highlightCommunities(this.lastCommunities);
      app.switchPage('graph');
    }
  },

  /**
   * 网络扩展
   */
  async expandNetwork() {
    const targetId = document.getElementById('expand-target').value.trim();
    const depth = parseInt(document.getElementById('expand-depth').value) || 2;
    const nodeType = document.getElementById('expand-node-type').value;

    if (!targetId) {
      app.showToast('请输入目标 ID', 'error');
      return;
    }

    try {
      // 切换到图谱页面并加载
      app.switchPage('graph');
      await graphModule.loadNetworkData(targetId, depth, nodeType);
    } catch (error) {
      app.showToast('扩展失败: ' + error.message, 'error');
    }
  },

  /**
   * 通话模式分析
   */
  async callPattern() {
    const targetId = document.getElementById('pattern-target').value.trim();
    const days = parseInt(document.getElementById('pattern-days').value) || 30;

    if (!targetId) {
      app.showToast('请输入目标号码', 'error');
      return;
    }

    try {
      app.showLoading('分析通话模式...');
      const result = await api.callPattern(targetId, days);
      app.hideLoading();

      this.showCallPatternResult(result);
    } catch (error) {
      app.hideLoading();
      app.showToast('分析失败: ' + error.message, 'error');
    }
  },

  showCallPatternResult(result) {
    const container = document.getElementById('call-pattern-result');
    if (!container) return;

    if (!result || Object.keys(result).length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-chart-line"></i>
          <h4>暂无通话记录</h4>
          <p>未找到该号码的通话数据</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="stats-grid" style="grid-template-columns: repeat(2, 1fr);">
        <div class="stat-card">
          <div class="stat-icon phone"><i class="fas fa-phone"></i></div>
          <div class="stat-info">
            <h3>${result.total_calls || 0}</h3>
            <p>总通话次数</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon edges"><i class="fas fa-clock"></i></div>
          <div class="stat-info">
            <h3>${result.avg_duration || 0}s</h3>
            <p>平均通话时长</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon nodes"><i class="fas fa-users"></i></div>
          <div class="stat-info">
            <h3>${result.unique_contacts || 0}</h3>
            <p>不同联系人</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon wechat"><i class="fas fa-hourglass-half"></i></div>
          <div class="stat-info">
            <h3>${result.total_duration || 0}s</h3>
            <p>总通话时长</p>
          </div>
        </div>
      </div>
    `;
  }
};

// 导出模块
window.analysisModule = analysisModule;
