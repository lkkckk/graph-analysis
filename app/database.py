"""
Neo4j 数据库连接管理
"""
from neo4j import GraphDatabase
from app.config import settings
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class Neo4jDriver:
    """Neo4j 驱动单例模式"""
    
    def __init__(self):
        self.uri = settings.NEO4J_URI
        self.user = settings.NEO4J_USER
        self.password = settings.NEO4J_PASSWORD
        self.driver: Optional[GraphDatabase.driver] = None

    def connect(self):
        """建立数据库连接"""
        try:
            self.driver = GraphDatabase.driver(
                self.uri, 
                auth=(self.user, self.password)
            )
            # 验证连接
            self.driver.verify_connectivity()
            logger.info("✅ Connected to Neo4j at %s", self.uri)
        except Exception as e:
            logger.error("❌ Failed to connect to Neo4j: %s", str(e))
            raise

    def close(self):
        """关闭数据库连接"""
        if self.driver:
            self.driver.close()
            logger.info("🛑 Disconnected from Neo4j")

    def get_session(self):
        """获取数据库会话"""
        if not self.driver:
            self.connect()
        return self.driver.session()
    
    def execute_query(self, query: str, parameters: dict = None):
        """执行查询并返回结果"""
        with self.get_session() as session:
            result = session.run(query, parameters or {})
            return [record.data() for record in result]


# 全局数据库实例
db = Neo4jDriver()
