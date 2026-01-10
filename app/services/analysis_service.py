"""
研判分析服务
包含多种图算法：共同联系人、路径分析、团伙挖掘、中心节点分析等
"""
from typing import List, Dict, Optional
from app.database import db
import logging
from collections import defaultdict

logger = logging.getLogger(__name__)


def analyze_target(target_number: str) -> Dict:
    """
    以目标为中心的关系分析
    
    输入一个电话号码，查找：
    1. 谁的通讯录里有这个号码
    2. 这个号码(对应的人)的通讯录里有谁
    3. 与这个号码相关的人之间的关系
    
    Args:
        target_number: 目标电话号码
    
    Returns:
        包含节点和关系的图谱数据，可直接用于可视化
    """
    result = {
        "target": target_number,
        "target_info": None,        # 目标号码信息
        "owners": [],               # 谁的通讯录里有这个号码
        "contacts": [],             # 如果目标是机主，他的联系人
        "related_persons": [],      # 相关人物之间的关系
        "nodes": [],                # 图谱节点
        "edges": [],                # 图谱边
        "summary": {}
    }
    
    try:
        # ==================== 1. 查找目标号码信息 ====================
        target_query = """
        MATCH (phone:Phone {number: $number})
        OPTIONAL MATCH (person:Person)-[:HAS_CONTACT]->(phone)
        RETURN phone.number as number, 
               phone.name as name,
               collect(DISTINCT person.name) as in_contacts_of
        """
        target_results = db.execute_query(target_query, {"number": target_number})
        
        if target_results:
            r = target_results[0]
            result["target_info"] = {
                "number": r["number"],
                "name": r["name"] or "未知",
                "in_contacts_of": r["in_contacts_of"] or []
            }
            result["owners"] = r["in_contacts_of"] or []
        
        # ==================== 2. 查找目标是否是某个机主 ====================
        # 通过号码或姓名匹配
        owner_query = """
        MATCH (owner:Person)-[:HAS_CONTACT]->(contact:Phone)
        WHERE owner.name = $number OR contact.number = $number
        WITH owner, collect({number: contact.number, name: contact.name}) as contacts
        RETURN owner.name as owner_name, contacts
        LIMIT 1
        """
        owner_results = db.execute_query(owner_query, {"number": target_number})
        
        if owner_results and owner_results[0]["contacts"]:
            result["contacts"] = owner_results[0]["contacts"][:20]  # 限制数量
        
        # ==================== 3. 查找相关人物之间的关系（通过共同联系人）====================
        if result["owners"]:
            # 查找这些人之间的关系
            relation_query = """
            MATCH (p1:Person)-[:HAS_CONTACT]->(phone:Phone)<-[:HAS_CONTACT]-(p2:Person)
            WHERE p1.name IN $owners AND p2.name IN $owners AND p1 <> p2 AND id(p1) < id(p2)
            WITH p1.name as person1, p2.name as person2, 
                 collect(DISTINCT phone.number) as common_phones,
                 count(DISTINCT phone) as common_count
            RETURN person1, person2, common_phones, common_count
            ORDER BY common_count DESC
            """
            relation_results = db.execute_query(relation_query, {"owners": result["owners"]})
            result["related_persons"] = [
                {
                    "person1": r["person1"],
                    "person2": r["person2"],
                    "common_phones": r["common_phones"][:5],
                    "common_count": r["common_count"]
                }
                for r in relation_results
            ]
        
        # ==================== 4. 构建图谱数据 ====================
        nodes = []
        edges = []
        node_ids = set()
        
        # 添加目标节点
        target_node_id = f"target_{target_number}"
        nodes.append({
            "id": target_node_id,
            "label": result["target_info"]["name"] if result["target_info"] else target_number,
            "type": "Target",
            "number": target_number,
            "size": 40
        })
        node_ids.add(target_node_id)
        
        # 添加机主节点（谁的通讯录有目标号码）
        for owner in result["owners"]:
            owner_id = f"person_{owner}"
            if owner_id not in node_ids:
                nodes.append({
                    "id": owner_id,
                    "label": owner,
                    "type": "Person",
                    "size": 30
                })
                node_ids.add(owner_id)
            
            # 添加边：机主 -> 目标
            edges.append({
                "from": owner_id,
                "to": target_node_id,
                "label": "HAS_CONTACT",
                "type": "contact"
            })
        
        # 添加目标的联系人（如果目标是机主）
        for contact in result["contacts"][:15]:
            contact_id = f"phone_{contact['number']}"
            if contact_id not in node_ids and contact["number"] != target_number:
                nodes.append({
                    "id": contact_id,
                    "label": contact["name"] or contact["number"],
                    "type": "Phone",
                    "number": contact["number"],
                    "size": 20
                })
                node_ids.add(contact_id)
                
                # 添加边：目标 -> 联系人
                edges.append({
                    "from": target_node_id,
                    "to": contact_id,
                    "label": "KNOWS",
                    "type": "knows"
                })
        
        # 添加人物之间的关系边
        for rel in result["related_persons"]:
            p1_id = f"person_{rel['person1']}"
            p2_id = f"person_{rel['person2']}"
            edges.append({
                "from": p1_id,
                "to": p2_id,
                "label": f"{rel['common_count']}个共同联系人",
                "type": "common",
                "strength": rel["common_count"]
            })
        
        result["nodes"] = nodes
        result["edges"] = edges
        
        # ==================== 5. 汇总 ====================
        result["summary"] = {
            "target": target_number,
            "target_name": result["target_info"]["name"] if result["target_info"] else "未知",
            "owner_count": len(result["owners"]),
            "contact_count": len(result["contacts"]),
            "node_count": len(nodes),
            "edge_count": len(edges)
        }
        
        logger.info(f"🔍 Target analysis completed for {target_number}: {result['summary']}")
        return result
        
    except Exception as e:
        logger.error(f"❌ Failed to analyze target {target_number}: {str(e)}")
        raise


def auto_collision_analysis() -> Dict:
    """
    自动碰撞分析：从所有数据中自动发现关联关系
    
    分析内容：
    1. 共同联系人：查找所有人之间的共同联系人
    2. 跨源关联：手机通讯录和微信好友的交叉
    3. 热点号码：被多人共同联系的号码
    
    Returns:
        碰撞分析结果
    """
    results = {
        "common_contacts": [],      # 共同联系人
        "cross_source_links": [],   # 跨数据源关联
        "hot_numbers": [],          # 热点号码（被多人共同联系）
        "person_relations": [],     # 人物之间的间接关系
        "summary": {}
    }
    
    try:
        # ==================== 1. 查找所有人的共同联系人 ====================
        common_query = """
        MATCH (p1:Person)-[:HAS_CONTACT]->(phone:Phone)<-[:HAS_CONTACT]-(p2:Person)
        WHERE p1 <> p2 AND id(p1) < id(p2)
        WITH p1.name as person1, p2.name as person2, collect(DISTINCT phone.number) as common_phones, count(phone) as common_count
        WHERE common_count >= 1
        RETURN person1, person2, common_phones, common_count
        ORDER BY common_count DESC
        LIMIT 50
        """
        common_results = db.execute_query(common_query)
        results["common_contacts"] = [
            {
                "person1": r["person1"],
                "person2": r["person2"],
                "common_phones": r["common_phones"],
                "common_count": r["common_count"]
            }
            for r in common_results
        ]
        
        # ==================== 2. 热点号码分析 ====================
        hot_query = """
        MATCH (p:Person)-[:HAS_CONTACT]->(phone:Phone)
        WITH phone.number as number, phone.name as name, collect(DISTINCT p.name) as owners, count(DISTINCT p) as owner_count
        WHERE owner_count >= 2
        RETURN number, name, owners, owner_count
        ORDER BY owner_count DESC
        LIMIT 30
        """
        hot_results = db.execute_query(hot_query)
        results["hot_numbers"] = [
            {
                "number": r["number"],
                "name": r["name"],
                "owners": r["owners"],
                "owner_count": r["owner_count"]
            }
            for r in hot_results
        ]
        
        # ==================== 3. 微信-电话交叉分析 ====================
        # 查找同一个人（通过名字模糊匹配）在微信和通讯录中都出现
        cross_query = """
        MATCH (p:Person)-[:HAS_CONTACT]->(phone:Phone)
        WHERE phone.name IS NOT NULL AND phone.name <> ''
        OPTIONAL MATCH (owner:WeChat)-[:FRIEND]-(friend:WeChat)
        WHERE friend.nickname = phone.name OR friend.nickname CONTAINS phone.name
        WITH p.name as owner, phone.number as phone, phone.name as contact_name, 
             collect(DISTINCT friend.wxid) as matched_wxids
        WHERE size(matched_wxids) > 0
        RETURN owner, phone, contact_name, matched_wxids
        LIMIT 30
        """
        try:
            cross_results = db.execute_query(cross_query)
            results["cross_source_links"] = [
                {
                    "owner": r["owner"],
                    "phone": r["phone"],
                    "contact_name": r["contact_name"],
                    "matched_wxids": r["matched_wxids"]
                }
                for r in cross_results
            ]
        except:
            results["cross_source_links"] = []
        
        # ==================== 4. 人物关系网络 ====================
        relation_query = """
        MATCH (p1:Person)-[:HAS_CONTACT]->(phone:Phone)<-[:HAS_CONTACT]-(p2:Person)
        WHERE p1 <> p2
        WITH p1.name as person1, p2.name as person2, count(DISTINCT phone) as shared_contacts
        WHERE shared_contacts >= 1
        RETURN person1, person2, shared_contacts
        ORDER BY shared_contacts DESC
        LIMIT 20
        """
        relation_results = db.execute_query(relation_query)
        results["person_relations"] = [
            {
                "person1": r["person1"],
                "person2": r["person2"],
                "shared_contacts": r["shared_contacts"],
                "relation_strength": "强" if r["shared_contacts"] >= 5 else ("中" if r["shared_contacts"] >= 2 else "弱")
            }
            for r in relation_results
        ]
        
        # ==================== 5. 汇总统计 ====================
        results["summary"] = {
            "common_contact_pairs": len(results["common_contacts"]),
            "hot_numbers_count": len(results["hot_numbers"]),
            "cross_links_count": len(results["cross_source_links"]),
            "person_pairs": len(results["person_relations"]),
            "analysis_status": "completed"
        }
        
        logger.info(f"🔍 Auto collision analysis completed: {results['summary']}")
        return results
        
    except Exception as e:
        logger.error(f"❌ Failed to perform collision analysis: {str(e)}")
        raise


def find_common_contacts(id_a: str, id_b: str, node_type: str = "Phone") -> List[Dict]:
    """
    查找 A 和 B 的共同联系人
    
    Args:
        id_a: 目标 A 的 ID
        id_b: 目标 B 的 ID
        node_type: 节点类型 ("Phone" 或 "WeChat")
    
    Returns:
        共同联系人列表，包含联系次数统计
    """
    label = "Phone" if node_type == "Phone" else "WeChat"
    id_prop = "number" if node_type == "Phone" else "wxid"
    
    query = f"""
    MATCH (a:{label} {{{id_prop}: $id_a}})-[r1:CALL|FRIEND]-(common)-[r2:CALL|FRIEND]-(b:{label} {{{id_prop}: $id_b}})
    WHERE a <> b AND common <> a AND common <> b
    RETURN DISTINCT common.{id_prop} as common_id, 
           labels(common)[0] as type,
           COUNT(DISTINCT r1) + COUNT(DISTINCT r2) as contact_strength
    ORDER BY contact_strength DESC
    """
    
    try:
        results = db.execute_query(query, {"id_a": id_a, "id_b": id_b})
        logger.info(f"🔍 Found {len(results)} common contacts between {id_a} and {id_b}")
        return results
    except Exception as e:
        logger.error(f"❌ Failed to find common contacts: {str(e)}")
        raise


def find_shortest_path(source_id: str, target_id: str, max_depth: int = 5) -> Dict:
    """
    查找两个目标之间的最短关联路径
    
    Args:
        source_id: 起点 ID
        target_id: 终点 ID
        max_depth: 最大搜索深度
    
    Returns:
        路径信息（节点列表和跳数）
    """
    query = f"""
    MATCH (start), (end)
    WHERE (start.number = $source OR start.wxid = $source)
      AND (end.number = $target OR end.wxid = $target)
    MATCH path = shortestPath((start)-[*1..{max_depth}]-(end))
    RETURN [n in nodes(path) | COALESCE(n.number, n.wxid)] as path_nodes,
           [r in relationships(path) | type(r)] as relationship_types,
           length(path) as hops
    LIMIT 1
    """
    
    try:
        results = db.execute_query(query, {"source": source_id, "target": target_id})
        if results:
            logger.info(f"🔍 Found path from {source_id} to {target_id} with {results[0]['hops']} hops")
            return results[0]
        else:
            logger.info(f"❌ No path found between {source_id} and {target_id}")
            return {"message": "No path found", "path_nodes": [], "hops": -1}
    except Exception as e:
        logger.error(f"❌ Failed to find shortest path: {str(e)}")
        raise


def find_frequent_contacts(target_id: str, node_type: str = "Phone", top_n: int = 10) -> List[Dict]:
    """
    查找某个目标的频繁联系人（按联系次数排序）
    
    Args:
        target_id: 目标 ID
        node_type: 节点类型
        top_n: 返回前 N 个结果
    
    Returns:
        频繁联系人列表
    """
    label = "Phone" if node_type == "Phone" else "WeChat"
    id_prop = "number" if node_type == "Phone" else "wxid"
    
    query = f"""
    MATCH (target:{label} {{{id_prop}: $target_id}})-[r:CALL|FRIEND]-(contact)
    WITH contact, 
         COALESCE(contact.{id_prop}, contact.number, contact.wxid) as contact_id,
         CASE WHEN type(r) = 'CALL' THEN r.count ELSE 1 END as contact_count,
         CASE WHEN type(r) = 'CALL' THEN r.total_duration ELSE NULL END as total_duration
    RETURN contact_id,
           labels(contact)[0] as type,
           SUM(contact_count) as total_contacts,
           SUM(total_duration) as total_duration_seconds
    ORDER BY total_contacts DESC
    LIMIT $top_n
    """
    
    try:
        results = db.execute_query(query, {"target_id": target_id, "top_n": top_n})
        logger.info(f"🔍 Found {len(results)} frequent contacts for {target_id}")
        return results
    except Exception as e:
        logger.error(f"❌ Failed to find frequent contacts: {str(e)}")
        raise


def find_central_nodes(node_type: str = "Phone", top_n: int = 10) -> List[Dict]:
    """
    查找中心节点（按度中心性排序）
    
    Args:
        node_type: 节点类型
        top_n: 返回前 N 个结果
    
    Returns:
        中心节点列表
    """
    label = "Phone" if node_type == "Phone" else "WeChat"
    id_prop = "number" if node_type == "Phone" else "wxid"
    
    query = f"""
    MATCH (n:{label})
    WITH n, SIZE([(n)-[]-(neighbor) | neighbor]) as degree
    WHERE degree > 0
    RETURN n.{id_prop} as node_id,
           degree,
           degree * 1.0 / (SELECT COUNT(*) FROM (MATCH (m:{label}) RETURN m)) as centrality_score
    ORDER BY degree DESC
    LIMIT $top_n
    """
    
    try:
        results = db.execute_query(query, {"top_n": top_n})
        logger.info(f"🔍 Found {len(results)} central nodes")
        return results
    except Exception as e:
        logger.error(f"❌ Failed to find central nodes: {str(e)}")
        raise


def find_communities(node_type: str = "Phone", min_size: int = 3) -> List[Dict]:
    """
    社区发现（团伙挖掘）- 查找紧密联系的群组
    使用标签传播算法（Label Propagation）
    
    Args:
        node_type: 节点类型
        min_size: 最小社区规模
    
    Returns:
        社区列表
    """
    label = "Phone" if node_type == "Phone" else "WeChat"
    id_prop = "number" if node_type == "Phone" else "wxid"
    
    # 简化版社区检测：查找连通子图
    query = f"""
    CALL {{
        MATCH (n:{label})
        WITH collect(n) as nodes
        UNWIND nodes as node
        MATCH path = (node)-[*1..2]-(neighbor:{label})
        WITH node, collect(DISTINCT neighbor) as neighbors
        WHERE SIZE(neighbors) >= $min_size - 1
        RETURN node.{id_prop} as member, 
               [n in neighbors | n.{id_prop}] as community_members,
               SIZE(neighbors) as community_size
        ORDER BY community_size DESC
    }}
    RETURN member, community_members, community_size
    LIMIT 10
    """
    
    try:
        results = db.execute_query(query, {"min_size": min_size})
        logger.info(f"🔍 Found {len(results)} potential communities")
        return results
    except Exception as e:
        logger.error(f"❌ Failed to find communities: {str(e)}")
        raise


def expand_network(target_id: str, depth: int = 2, node_type: str = "Phone") -> Dict:
    """
    扩展联系网络（N 度关系）
    
    Args:
        target_id: 目标 ID
        depth: 扩展深度（1=直接联系人，2=二度关系，等等）
        node_type: 节点类型
    
    Returns:
        网络扩展结果
    """
    label = "Phone" if node_type == "Phone" else "WeChat"
    id_prop = "number" if node_type == "Phone" else "wxid"
    
    query = f"""
    MATCH path = (target:{label} {{{id_prop}: $target_id}})-[*1..{depth}]-(contact)
    WITH target, contact, length(path) as distance
    WHERE target <> contact
    RETURN DISTINCT COALESCE(contact.{id_prop}, contact.number, contact.wxid) as contact_id,
           labels(contact)[0] as type,
           MIN(distance) as degree,
           COUNT(*) as path_count
    ORDER BY degree, path_count DESC
    """
    
    try:
        results = db.execute_query(query, {"target_id": target_id})
        
        # 按度数分组
        network = {}
        for item in results:
            degree = item["degree"]
            if degree not in network:
                network[degree] = []
            network[degree].append({
                "contact_id": item["contact_id"],
                "type": item["type"],
                "path_count": item["path_count"]
            })
        
        logger.info(f"🔍 Expanded network for {target_id} to depth {depth}, found {len(results)} contacts")
        return {
            "target": target_id,
            "depth": depth,
            "total_contacts": len(results),
            "network": network
        }
    except Exception as e:
        logger.error(f"❌ Failed to expand network: {str(e)}")
        raise


def analyze_call_pattern(target_id: str, time_window_days: int = 30) -> Dict:
    """
    通话模式分析（时间分布、通话时长统计）
    
    Args:
        target_id: 目标电话号码
        time_window_days: 分析时间窗口（天）
    
    Returns:
        通话模式统计
    """
    query = """
    MATCH (target:Phone {number: $target_id})-[r:CALL]-(contact)
    WHERE r.last_call >= datetime() - duration({days: $time_window_days})
    WITH target, contact, r
    RETURN COALESCE(contact.number, contact.wxid) as contact_id,
           r.count as call_count,
           r.total_duration as total_duration,
           r.last_call as last_call_time,
           CASE 
               WHEN r.total_duration / r.count < 60 THEN 'short'
               WHEN r.total_duration / r.count < 300 THEN 'medium'
               ELSE 'long'
           END as avg_duration_category
    ORDER BY call_count DESC
    """
    
    try:
        results = db.execute_query(query, {
            "target_id": target_id,
            "time_window_days": time_window_days
        })
        
        # 统计分析
        total_calls = sum(r["call_count"] for r in results)
        total_duration = sum(r["total_duration"] or 0 for r in results)
        
        logger.info(f"🔍 Analyzed call pattern for {target_id}")
        return {
            "target": target_id,
            "time_window_days": time_window_days,
            "total_contacts": len(results),
            "total_calls": total_calls,
            "total_duration_seconds": total_duration,
            "contacts": results
        }
    except Exception as e:
        logger.error(f"❌ Failed to analyze call pattern: {str(e)}")
        raise


def get_statistics() -> Dict:
    """
    获取数据库统计信息
    
    Returns:
        统计数据
    """
    query = """
    MATCH (n)
    WITH labels(n)[0] as label, COUNT(n) as node_count
    RETURN label, node_count
    ORDER BY node_count DESC
    """
    
    rel_query = """
    MATCH ()-[r]->()
    WITH type(r) as rel_type, COUNT(r) as rel_count
    RETURN rel_type, rel_count
    ORDER BY rel_count DESC
    """
    
    try:
        nodes = db.execute_query(query)
        relationships = db.execute_query(rel_query)
        
        total_nodes = sum(n["node_count"] for n in nodes)
        total_relationships = sum(r["rel_count"] for r in relationships)
        
        return {
            "total_nodes": total_nodes,
            "total_relationships": total_relationships,
            "nodes_by_type": nodes,
            "relationships_by_type": relationships
        }
    except Exception as e:
        logger.error(f"❌ Failed to get statistics: {str(e)}")
        raise
