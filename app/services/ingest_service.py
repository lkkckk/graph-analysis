"""
数据导入服务
支持 JSON、Excel、CSV 格式的数据导入
"""
import pandas as pd
from typing import List, Dict
from app.database import db
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def import_cdr_data(call_records: List[Dict]) -> Dict:
    """
    导入话单数据（Call Detail Records）
    
    Args:
        call_records: 话单列表，格式: [{"caller": "138001", "callee": "138002", "duration": 60, "timestamp": "2024-01-01 10:00:00"}]
    
    Returns:
        导入结果统计
    """
    query = """
    UNWIND $batch AS row
    MERGE (p1:Phone {number: row.caller})
    MERGE (p2:Phone {number: row.callee})
    MERGE (p1)-[r:CALL]->(p2)
    ON CREATE SET r.count = 1, r.total_duration = row.duration
    ON MATCH SET r.count = r.count + 1, r.total_duration = r.total_duration + row.duration
    SET r.last_call = COALESCE(row.timestamp, datetime()),
        r.updated_at = datetime()
    """
    
    try:
        with db.get_session() as session:
            session.run(query, batch=call_records)
        logger.info(f"✅ Imported {len(call_records)} call records")
        return {"status": "success", "count": len(call_records)}
    except Exception as e:
        logger.error(f"❌ Failed to import CDR data: {str(e)}")
        raise


def import_wechat_friends(friend_list: List[Dict]) -> Dict:
    """
    导入微信好友关系
    
    Args:
        friend_list: 好友列表，格式: [{"user": "wx_alice", "friend": "wx_bob", "nickname": "Bob"}]
    
    Returns:
        导入结果统计
    """
    query = """
    UNWIND $batch AS row
    MERGE (u1:WeChat {wxid: row.user})
    MERGE (u2:WeChat {wxid: row.friend})
    ON CREATE SET u2.nickname = COALESCE(row.nickname, row.friend)
    MERGE (u1)-[r:FRIEND]-(u2)
    SET r.created_at = COALESCE(r.created_at, datetime())
    """
    
    try:
        with db.get_session() as session:
            session.run(query, batch=friend_list)
        logger.info(f"✅ Imported {len(friend_list)} WeChat friend relationships")
        return {"status": "success", "count": len(friend_list)}
    except Exception as e:
        logger.error(f"❌ Failed to import WeChat data: {str(e)}")
        raise


def import_contacts(contact_list: List[Dict]) -> Dict:
    """
    导入手机通讯录数据
    
    Args:
        contact_list: 通讯录列表，格式: [{"owner": "张三", "name": "李四", "phone": "13800138001"}]
    
    Returns:
        导入结果统计
    """
    query = """
    UNWIND $batch AS row
    MERGE (owner:Person {name: row.owner})
    MERGE (contact:Phone {number: row.phone})
    ON CREATE SET contact.name = COALESCE(row.name, row.phone)
    ON MATCH SET contact.name = COALESCE(row.name, contact.name)
    MERGE (owner)-[r:HAS_CONTACT]->(contact)
    SET r.remark = COALESCE(row.remark, ''),
        r.updated_at = datetime()
    """
    
    try:
        with db.get_session() as session:
            session.run(query, batch=contact_list)
        logger.info(f"✅ Imported {len(contact_list)} phone contacts")
        return {"status": "success", "count": len(contact_list), "type": "contacts"}
    except Exception as e:
        logger.error(f"❌ Failed to import contacts: {str(e)}")
        raise


def detect_data_type(df: pd.DataFrame, file_path: str) -> str:
    """
    根据列名自动检测数据类型
    
    Returns:
        'cdr' | 'wechat' | 'contacts' | 'unknown'
    """
    columns = set(df.columns)
    file_name = Path(file_path).stem.lower()
    
    # 检测话单数据 (CDR)
    cdr_patterns = {'caller', 'callee', 'duration', '主叫', '被叫', '通话时长'}
    if columns & cdr_patterns:
        return 'cdr'
    
    # 检测微信好友
    wechat_patterns = {'微信ID', '微信昵称', 'wxid', 'friend', 'user'}
    if columns & wechat_patterns or '微信' in file_name:
        return 'wechat'
    
    # 检测手机通讯录
    contacts_patterns = {'姓名', '电话号码', '电话', '手机号', 'name', 'phone'}
    if columns & contacts_patterns or '通讯录' in file_name or '联系人' in file_name:
        return 'contacts'
    
    return 'unknown'


def import_from_excel(file_path: str, data_type: str = "auto") -> Dict:
    """
    从 Excel 文件导入数据并进行清洗
    
    Args:
        file_path: Excel 文件路径
        data_type: 数据类型，可选值: 'auto', 'cdr', 'wechat', 'contacts'
    
    Returns:
        导入结果
    """
    try:
        df = pd.read_excel(file_path)
        logger.info(f"📊 Loaded Excel file with {len(df)} rows, columns: {list(df.columns)}")
        
        # 自动检测数据类型
        if data_type == "auto":
            data_type = detect_data_type(df, file_path)
            logger.info(f"🔍 Auto-detected data type: {data_type}")
        
        # ==================== 话单数据 (CDR) ====================
        if data_type == "cdr":
            # 中文列名映射
            column_mapping = {
                '主叫': 'caller', '主叫号码': 'caller',
                '被叫': 'callee', '被叫号码': 'callee',
                '通话时长': 'duration', '时长': 'duration', '时长(秒)': 'duration',
                '通话时间': 'timestamp', '时间': 'timestamp'
            }
            df = df.rename(columns=column_mapping)
            
            required_fields = ["caller", "callee"]
            if not all(field in df.columns for field in required_fields):
                raise ValueError(f"话单数据缺少必要字段: {required_fields}，当前列: {list(df.columns)}")
            
            # 数据清洗
            df = df.dropna(subset=['caller', 'callee'])
            df['caller'] = df['caller'].astype(str).str.replace(r'\D', '', regex=True)
            df['callee'] = df['callee'].astype(str).str.replace(r'\D', '', regex=True)
            df = df[(df['caller'] != '') & (df['callee'] != '')]
            if 'duration' not in df.columns:
                df['duration'] = 0
            df['duration'] = pd.to_numeric(df['duration'], errors='coerce').fillna(0).astype(int)
            
            return import_cdr_data(df.to_dict('records'))
        
        # ==================== 微信好友 ====================
        elif data_type == "wechat":
            # 中文列名映射
            column_mapping = {
                '微信ID': 'friend', '微信号': 'friend', 'wxid': 'friend',
                '微信昵称': 'nickname', '昵称': 'nickname',
                '备注': 'remark',
                '联系人UID': 'uid'
            }
            df = df.rename(columns=column_mapping)
            
            # 从文件名提取用户
            if 'user' not in df.columns:
                file_name = Path(file_path).stem
                user_name = file_name.split('_')[0] if '_' in file_name else file_name
                df['user'] = user_name
                logger.info(f"📝 从文件名提取用户: {user_name}")
            
            if 'friend' not in df.columns:
                raise ValueError(f"微信数据缺少好友ID字段，当前列: {list(df.columns)}")
            
            # 数据清洗
            df = df.dropna(subset=['friend'])
            df['user'] = df['user'].astype(str).str.strip()
            df['friend'] = df['friend'].astype(str).str.strip()
            if 'nickname' in df.columns:
                df['nickname'] = df['nickname'].fillna('').astype(str).str.strip()
            
            return import_wechat_friends(df.to_dict('records'))
        
        # ==================== 手机通讯录 ====================
        elif data_type == "contacts":
            # 中文列名映射
            column_mapping = {
                '姓名': 'name', '联系人': 'name', '名称': 'name',
                '电话号码': 'phone', '电话': 'phone', '手机号': 'phone', '手机': 'phone',
                '备注': 'remark',
                '联系人UID': 'uid'
            }
            df = df.rename(columns=column_mapping)
            
            # 从文件名提取机主
            file_name = Path(file_path).stem
            owner_name = file_name.split('_')[0] if '_' in file_name else file_name
            df['owner'] = owner_name
            logger.info(f"📝 从文件名提取机主: {owner_name}")
            
            if 'phone' not in df.columns:
                raise ValueError(f"通讯录数据缺少电话号码字段，当前列: {list(df.columns)}")
            
            # 数据清洗
            df = df.dropna(subset=['phone'])
            df['phone'] = df['phone'].astype(str).str.replace(r'\D', '', regex=True)
            df = df[df['phone'] != '']
            if 'name' in df.columns:
                df['name'] = df['name'].fillna('').astype(str).str.strip()
            else:
                df['name'] = df['phone']
            if 'remark' in df.columns:
                df['remark'] = df['remark'].fillna('').astype(str).str.strip()
            
            return import_contacts(df.to_dict('records'))
        
        # ==================== 未知类型 ====================
        else:
            raise ValueError(f"无法识别的数据类型。检测到的列: {list(df.columns)}。"
                           f"请确保文件包含正确的列名，或在上传时选择正确的数据类型。"
                           f"\n支持的格式:\n"
                           f"- 话单: caller/主叫, callee/被叫\n"
                           f"- 微信: 微信ID, 微信昵称\n"
                           f"- 通讯录: 姓名, 电话号码")
            
    except Exception as e:
        logger.error(f"❌ Failed to import from Excel: {str(e)}")
        raise


def import_from_csv(file_path: str, data_type: str = "cdr") -> Dict:
    """从 CSV 文件导入数据并进行清洗"""
    try:
        df = pd.read_csv(file_path)
        logger.info(f"📊 Loaded CSV file with {len(df)} rows")
        
        if data_type == "cdr":
            required_fields = ["caller", "callee", "duration"]
            if not all(field in df.columns for field in required_fields):
                raise ValueError(f"CSV 缺少必要字段: {required_fields}")
            
            # --- 数据清洗 (CDR) ---
            df = df.dropna(subset=['caller', 'callee'])
            df['caller'] = df['caller'].astype(str).str.replace(r'\D', '', regex=True)
            df['callee'] = df['callee'].astype(str).str.replace(r'\D', '', regex=True)
            df = df[(df['caller'] != '') & (df['callee'] != '')]
            df['duration'] = pd.to_numeric(df['duration'], errors='coerce').fillna(0).astype(int)
            # ---------------------
            
            return import_cdr_data(df.to_dict('records'))
        
        elif data_type == "wechat":
            required_fields = ["user", "friend"]
            if not all(field in df.columns for field in required_fields):
                raise ValueError(f"CSV 缺少必要字段: {required_fields}")
            
            # --- 数据清洗 (WeChat) ---
            df = df.dropna(subset=['user', 'friend'])
            df['user'] = df['user'].astype(str).str.strip()
            df['friend'] = df['friend'].astype(str).str.strip()
            # -------------------------
            
            return import_wechat_friends(df.to_dict('records'))
        
        else:
            raise ValueError(f"不支持的数据类型: {data_type}")
            
    except Exception as e:
        logger.error(f"❌ Failed to import from CSV: {str(e)}")
        raise


def clear_all_data() -> Dict:
    """
    清空数据库中的所有数据（谨慎使用！）
    
    Returns:
        清空结果
    """
    query = """
    MATCH (n)
    DETACH DELETE n
    """
    
    try:
        with db.get_session() as session:
            session.run(query)
        logger.warning("⚠️  All data has been cleared from the database")
        return {"status": "success", "message": "All data cleared"}
    except Exception as e:
        logger.error(f"❌ Failed to clear data: {str(e)}")
        raise
