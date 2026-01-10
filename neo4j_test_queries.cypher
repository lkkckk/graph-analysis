// ================================================
// 情报研判系统 - Neo4j 测试脚本
// 请在 Neo4j Browser (http://localhost:7474) 中执行
// ================================================

// ========== 第一步：清空旧数据 ==========
MATCH (n) DETACH DELETE n;

// ========== 第二步：导入话单数据 ==========
CREATE (p1:Phone {number: '13800138001'})
CREATE (p2:Phone {number: '13800138002'})
CREATE (p3:Phone {number: '13800138003'})
CREATE (p4:Phone {number: '13800138004'})
CREATE (p5:Phone {number: '13800138005'})

CREATE (p1)-[:CALL {duration: 120, count: 1, total_duration: 120}]->(p2)
CREATE (p1)-[:CALL {duration: 60, count: 1, total_duration: 60}]->(p3)
CREATE (p2)-[:CALL {duration: 180, count: 1, total_duration: 180}]->(p3)
CREATE (p2)-[:CALL {duration: 90, count: 1, total_duration: 90}]->(p4)
CREATE (p3)-[:CALL {duration: 150, count: 1, total_duration: 150}]->(p4)
CREATE (p4)-[:CALL {duration: 200, count: 1, total_duration: 200}]->(p5)
CREATE (p1)-[:CALL {duration: 75, count: 1, total_duration: 75}]->(p5)
CREATE (p3)-[:CALL {duration: 95, count: 1, total_duration: 95}]->(p5);

// ========== 第三步：导入微信数据 ==========
CREATE (w1:WeChat {wxid: 'wx_alice', nickname: 'Alice'})
CREATE (w2:WeChat {wxid: 'wx_bob', nickname: '小王'})
CREATE (w3:WeChat {wxid: 'wx_charlie', nickname: '老张'})
CREATE (w4:WeChat {wxid: 'wx_david', nickname: 'David'})
CREATE (w5:WeChat {wxid: 'wx_eve', nickname: 'Eve'})

CREATE (w1)-[:FRIEND]->(w2)
CREATE (w1)-[:FRIEND]->(w3)
CREATE (w2)-[:FRIEND]->(w3)
CREATE (w2)-[:FRIEND]->(w4)
CREATE (w3)-[:FRIEND]->(w4)
CREATE (w4)-[:FRIEND]->(w5)
CREATE (w1)-[:FRIEND]->(w5);

// ========== 验证：查看所有数据 ==========
MATCH (n) RETURN n LIMIT 50;

// ================================================
// 分析查询示例
// ================================================

// 1️⃣ 查找共同联系人
MATCH (a:Phone {number: '13800138001'})--(common)--(b:Phone {number: '13800138002'})
WHERE a <> b AND common <> a AND common <> b
RETURN DISTINCT common.number as common_contact;

// 2️⃣ 最短路径分析
MATCH (start:Phone {number: '13800138001'}), (end:Phone {number: '13800138005'})
MATCH path = shortestPath((start)-[*]-(end))
RETURN [n in nodes(path) | n.number] as path_nodes, 
       [r in relationships(path) | type(r)] as relationship_types,
       length(path) as hops;

// 3️⃣ 中心节点分析（度中心性）
MATCH (p:Phone)
WITH p, SIZE([(p)-[]-(neighbor) | neighbor]) as degree
WHERE degree > 0
RETURN p.number, degree, degree * 1.0 / 5 as centrality_score
ORDER BY degree DESC;

// 4️⃣ 频繁联系人分析
MATCH (target:Phone {number: '13800138001'})-[r:CALL]-(contact)
RETURN contact.number, 
       r.count as call_count, 
       r.total_duration as total_duration_seconds
ORDER BY call_count DESC;

// 5️⃣ 网络扩展（2度关系）
MATCH path = (target:Phone {number: '13800138001'})-[*1..2]-(contact)
WHERE target <> contact
WITH contact, length(path) as distance
RETURN DISTINCT contact.number, MIN(distance) as degree, COUNT(*) as path_count
ORDER BY degree, path_count DESC;

// 6️⃣ 微信好友共同分析
MATCH (a:WeChat {wxid: 'wx_alice'})--(common)--(b:WeChat {wxid: 'wx_bob'})
WHERE a <> b AND common <> a AND common <> b
RETURN DISTINCT common.wxid, common.nickname;

// 7️⃣ 统计信息
MATCH (n)
WITH labels(n)[0] as label, COUNT(n) as node_count
RETURN label, node_count
ORDER BY node_count DESC;

// 8️⃣ 关系统计
MATCH ()-[r]->()
WITH type(r) as rel_type, COUNT(r) as rel_count
RETURN rel_type, rel_count
ORDER BY rel_count DESC;

// ================================================
// 🎉 测试完成！
// 您已成功验证了所有核心分析功能！
// ================================================
