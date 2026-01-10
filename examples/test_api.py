"""
API 测试脚本
演示如何使用 Python 调用情报研判系统的 API
"""
import requests
import json

# API 基础地址
BASE_URL = "http://localhost:8000"


def test_import_cdr_json():
    """测试：导入话单数据（JSON 格式）"""
    print("\n=== 测试 1: 导入话单数据（JSON） ===")
    
    url = f"{BASE_URL}/ingest/cdr"
    data = [
        {"caller": "13800138001", "callee": "13800138002", "duration": 120},
        {"caller": "13800138001", "callee": "13800138003", "duration": 60},
        {"caller": "13800138002", "callee": "13800138003", "duration": 180}
    ]
    
    response = requests.post(url, json=data)
    print(f"状态码: {response.status_code}")
    print(f"返回结果: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")


def test_upload_csv():
    """测试：上传 CSV 文件"""
    print("\n=== 测试 2: 上传 CSV 文件 ===")
    
    url = f"{BASE_URL}/ingest/upload/csv"
    
    with open("examples/test_data_cdr.csv", "rb") as f:
        files = {"file": ("test_data_cdr.csv", f, "text/csv")}
        data = {"data_type": "cdr"}
        response = requests.post(url, files=files, data=data)
    
    print(f"状态码: {response.status_code}")
    print(f"返回结果: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")


def test_common_contacts():
    """测试：查找共同联系人"""
    print("\n=== 测试 3: 查找共同联系人 ===")
    
    url = f"{BASE_URL}/analysis/common-contacts"
    data = {
        "target_a": "13800138001",
        "target_b": "13800138002",
        "node_type": "Phone"
    }
    
    response = requests.post(url, json=data)
    print(f"状态码: {response.status_code}")
    print(f"返回结果: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")


def test_shortest_path():
    """测试：查找最短路径"""
    print("\n=== 测试 4: 查找最短路径 ===")
    
    url = f"{BASE_URL}/analysis/path"
    params = {
        "source": "13800138001",
        "target": "13800138005",
        "max_depth": 5
    }
    
    response = requests.get(url, params=params)
    print(f"状态码: {response.status_code}")
    print(f"返回结果: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")


def test_frequent_contacts():
    """测试：查找频繁联系人"""
    print("\n=== 测试 5: 查找频繁联系人 ===")
    
    url = f"{BASE_URL}/analysis/frequent-contacts"
    params = {
        "target_id": "13800138001",
        "node_type": "Phone",
        "top_n": 5
    }
    
    response = requests.get(url, params=params)
    print(f"状态码: {response.status_code}")
    print(f"返回结果: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")


def test_central_nodes():
    """测试：查找中心节点"""
    print("\n=== 测试 6: 查找中心节点 ===")
    
    url = f"{BASE_URL}/analysis/central-nodes"
    params = {
        "node_type": "Phone",
        "top_n": 5
    }
    
    response = requests.get(url, params=params)
    print(f"状态码: {response.status_code}")
    print(f"返回结果: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")


def test_expand_network():
    """测试：扩展联系网络"""
    print("\n=== 测试 7: 扩展联系网络 ===")
    
    url = f"{BASE_URL}/analysis/expand-network"
    data = {
        "target_id": "13800138001",
        "depth": 2,
        "node_type": "Phone"
    }
    
    response = requests.post(url, json=data)
    print(f"状态码: {response.status_code}")
    print(f"返回结果: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")


def test_statistics():
    """测试：获取统计信息"""
    print("\n=== 测试 8: 获取统计信息 ===")
    
    url = f"{BASE_URL}/statistics"
    response = requests.get(url)
    print(f"状态码: {response.status_code}")
    print(f"返回结果: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")


if __name__ == "__main__":
    print("=========================================")
    print("    情报研判系统 API 测试脚本")
    print("=========================================")
    
    try:
        # 依次执行测试
        test_import_cdr_json()
        test_upload_csv()
        test_common_contacts()
        test_shortest_path()
        test_frequent_contacts()
        test_central_nodes()
        test_expand_network()
        test_statistics()
        
        print("\n✅ 所有测试完成！")
        
    except requests.exceptions.ConnectionError:
        print("\n❌ 连接失败！请确保：")
        print("   1. Docker 容器已启动：docker-compose up -d")
        print("   2. FastAPI 服务已运行：python -m app.main")
        print("   3. 服务地址正确：http://localhost:8000")
    except Exception as e:
        print(f"\n❌ 测试失败: {str(e)}")
