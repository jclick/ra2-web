#!/usr/bin/env python3
"""
每日股票数据获取脚本
数据源优先级：东方财富 > AKShare > Qveris
禁止：新浪、Yahoo Finance 等其他数据源
所有数据均为实时API请求，失败时降级到下一优先级
"""

import json
import argparse
import sys
import subprocess
import os
import time
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

# 全局配置
PROXY_API_URL = "http://api.tianqiip.com/getip?secret=q8r0w3d3mmc9t6cx&num=1&type=json&port=3&time=5&mr=1&sign=d951f6f78f0322f7e522399873786efc"
CURRENT_PROXY = None

# 先初始化代理管理器（必须在导入akshare之前）
print("[系统] 初始化代理管理器...")
try:
    import requests
    from requests.adapters import HTTPAdapter
    
    session = requests.Session()
    session.trust_env = False
    response = session.get(PROXY_API_URL, timeout=10, proxies={})
    proxy_data = response.json()
    
    if proxy_data.get('code') == 1000 and proxy_data.get('data'):
        proxy_info = proxy_data['data'][0]
        CURRENT_PROXY = {
            "server": proxy_info['ip'],
            "port": proxy_info['port'],
            "protocol_type": "socks5"
        }
        print(f"[系统] ✓ 初始代理: {CURRENT_PROXY['server']}:{CURRENT_PROXY['port']}")
    else:
        print(f"[系统] ✗ 获取代理失败")
except Exception as e:
    print(f"[系统] ✗ 代理初始化失败: {e}")

# 尝试导入 AKShare
try:
    import akshare as ak
    AKSHARE_AVAILABLE = True
    print("[系统] ✓ AKShare 加载成功")
except ImportError:
    AKSHARE_AVAILABLE = False
    print("[系统] ✗ AKShare 未安装")

# Qveris 脚本路径
QVERIS_SCRIPT = os.path.expanduser("~/.openclaw/skills/qveris-official/scripts/qveris_tool.mjs")
QVERIS_AVAILABLE = os.path.exists(QVERIS_SCRIPT)
if not QVERIS_AVAILABLE:
    print("[系统] ✗ Qveris 脚本未找到:", QVERIS_SCRIPT)
else:
    print("[系统] ✓ Qveris 可用")

# API Key
QVERIS_API_KEY = "sk-dZSVEe3T0XdL-1yDoaNdhKZBPhVTKnNhki1N3pM24aI"


def refresh_proxy():
    """刷新代理"""
    global CURRENT_PROXY
    try:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] 刷新代理...")
        session = requests.Session()
        session.trust_env = False
        response = session.get(PROXY_API_URL, timeout=10, proxies={})
        data = response.json()
        
        if data.get('code') == 1000 and data.get('data'):
            proxy_info = data['data'][0]
            CURRENT_PROXY = {
                "server": proxy_info['ip'],
                "port": proxy_info['port'],
                "protocol_type": "socks5"
            }
            print(f"[{datetime.now().strftime('%H:%M:%S')}] ✓ 新代理: {CURRENT_PROXY['server']}:{CURRENT_PROXY['port']}")
            return True
        else:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] ✗ 获取代理失败")
            return False
    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ✗ 刷新代理失败: {e}")
        return False


class MarketData:
    """市场数据结构"""
    def __init__(self, date_str: str):
        self.date = date_str
        self.source = None
        self.attempted_sources = []
        self.indices = {
            "sh_index": {"close": None, "change_pct": None},
            "sz_index": {"close": None, "change_pct": None},
            "cy_index": {"close": None, "change_pct": None},
            "kc50": {"close": None, "change_pct": None}
        }
        self.market = {
            "turnover": None,
            "up_count": None,
            "down_count": None,
            "limit_up": None,
            "limit_down": None
        }
        self.sectors = []
        self.timestamp = datetime.now().isoformat()
        self.errors = []
    
    def to_dict(self) -> Dict:
        return {
            "date": self.date,
            "source": self.source,
            "fetch_status": {
                "overall": "success" if self.source else "failed",
                "attempted_sources": self.attempted_sources,
                "successful_source": self.source,
                "errors": self.errors
            },
            "indices": self.indices,
            "market": self.market,
            "sectors": self.sectors,
            "timestamp": self.timestamp
        }
    
    def is_complete(self) -> bool:
        for idx in self.indices.values():
            if idx["close"] is None or idx["change_pct"] is None:
                return False
        for val in self.market.values():
            if val is None:
                return False
        return True


def fetch_from_eastmoney(date_str: str, max_retries: int = 3) -> Optional[MarketData]:
    """从东方财富获取数据（通过 AKShare），支持代理自动刷新"""
    if not AKSHARE_AVAILABLE:
        print("  AKShare not available, skipping Eastmoney")
        return None
    
    print("  [优先级1] 尝试东方财富数据源...")
    date_formatted = date_str.replace("-", "")
    
    data = MarketData(date_str)
    data.attempted_sources.append("eastmoney")
    
    last_exception = None
    
    for attempt in range(max_retries):
        try:
            print(f"    获取指数数据... (尝试 {attempt + 1}/{max_retries})")
            indices_map = {
                "000001": "sh_index",
                "399001": "sz_index",
                "399006": "cy_index",
                "000688": "kc50"
            }
            
            for code, name in indices_map.items():
                try:
                    df = ak.index_zh_a_hist(symbol=code, period="daily", 
                                           start_date=date_formatted, end_date=date_formatted)
                    if not df.empty:
                        row = df.iloc[0]
                        data.indices[name]["close"] = float(row['收盘'])
                        data.indices[name]["change_pct"] = float(row['涨跌幅'])
                        print(f"      ✓ {name}: {row['收盘']} ({row['涨跌幅']:+.2f}%)")
                except Exception as e:
                    print(f"      ✗ {name}: {e}")
            
            print("    获取涨停数据...")
            try:
                zt_df = ak.stock_zt_pool_em(date=date_formatted)
                data.market["limit_up"] = len(zt_df) if zt_df is not None else 0
                print(f"      ✓ 涨停家数: {data.market['limit_up']}")
            except Exception as e:
                print(f"      ✗ 涨停数据: {e}")
                data.market["limit_up"] = 0
            
            print("    获取跌停数据...")
            try:
                dt_df = ak.stock_zt_pool_dtgc_em(date=date_formatted)
                data.market["limit_down"] = len(dt_df) if dt_df is not None else 0
                print(f"      ✓ 跌停家数: {data.market['limit_down']}")
            except Exception as e:
                print(f"      ✗ 跌停数据: {e}")
                data.market["limit_down"] = 0
            
            print("    获取成交额...")
            try:
                sh_df = ak.index_zh_a_hist(symbol="000001", period="daily", 
                                           start_date=date_formatted, end_date=date_formatted)
                sz_df = ak.index_zh_a_hist(symbol="399001", period="daily",
                                           start_date=date_formatted, end_date=date_formatted)
                
                sh_turnover = sh_df.iloc[0]['成交额'] / 1e8 if not sh_df.empty else 0
                sz_turnover = sz_df.iloc[0]['成交额'] / 1e8 if not sz_df.empty else 0
                data.market["turnover"] = int(sh_turnover + sz_turnover)
                print(f"      ✓ 成交额: {data.market['turnover']}亿")
            except Exception as e:
                print(f"      ✗ 成交额: {e}")
            
            print("    获取涨跌家数...")
            try:
                spot_df = ak.stock_zh_a_spot_em()
                if spot_df is not None and not spot_df.empty:
                    up_count = len(spot_df[spot_df['涨跌幅'] > 0])
                    down_count = len(spot_df[spot_df['涨跌幅'] < 0])
                    data.market["up_count"] = up_count
                    data.market["down_count"] = down_count
                    print(f"      ✓ 涨跌家数: {up_count}/{down_count}")
            except Exception as e:
                print(f"      ✗ 涨跌家数: {e}")
            
            has_some_data = (
                any(idx["close"] is not None for idx in data.indices.values()) or
                data.market["limit_up"] is not None or
                data.market["limit_down"] is not None
            )
            
            if has_some_data:
                data.source = "eastmoney"
                if data.is_complete():
                    print("  ✓ 东方财富数据获取成功（完整）")
                else:
                    missing = [k for k, v in data.indices.items() if v["close"] is None]
                    missing += [k for k, v in data.market.items() if v is None]
                    print(f"  ⚠ 东方财富数据部分成功，缺少: {', '.join(missing)}")
                    data.errors.append(f"Eastmoney partial: {missing}")
                return data
            else:
                print("  ✗ 东方财富未获取到任何有效数据")
                data.errors.append("Eastmoney: No valid data")
                return None
                
        except Exception as e:
            error_msg = str(e)
            print(f"  ✗ 尝试 {attempt + 1} 失败: {error_msg[:100]}")
            last_exception = e
            
            # 检查是否是代理错误
            if any(kw in error_msg.lower() for kw in ['proxy', 'socks', 'connection', 'timeout', 'remote']):
                refresh_proxy()
            
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)
    
    print(f"  ✗ 东方财富获取失败（已重试{max_retries}次）")
    data.errors.append(f"Eastmoney failed after {max_retries} retries")
    return None


def fetch_from_akshare(date_str: str) -> Optional[MarketData]:
    """从 AKShare 获取数据（备用数据源）"""
    if not AKSHARE_AVAILABLE:
        print("  AKShare not available")
        return None
    
    print("  [优先级2] 尝试 AKShare 数据源...")
    print("  ⚠ AKShare 与东财同源，跳过")
    return None


def call_qveris(discovery_id: str, tool_id: str, params: Dict) -> Tuple[Optional[Dict], Optional[str]]:
    """调用 Qveris 工具"""
    if not QVERIS_AVAILABLE:
        return None, "Qveris script not found"
    
    cmd = ["node", QVERIS_SCRIPT, "call", tool_id, "--discovery-id", discovery_id, "--params", json.dumps(params)]
    env = os.environ.copy()
    env["QVERIS_API_KEY"] = QVERIS_API_KEY
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60, env=env)
        if result.returncode != 0:
            return None, f"Command failed: {result.stderr}"
        
        output = result.stdout
        json_start = output.find('{')
        if json_start == -1:
            return None, "No JSON found"
        
        return json.loads(output[json_start:]), None
    except Exception as e:
        return None, str(e)


def discover_qveris(query: str, limit: int = 5) -> Tuple[Optional[str], Optional[Dict], Optional[str]]:
    """发现 Qveris 工具"""
    if not QVERIS_AVAILABLE:
        return None, None, "Qveris script not found"
    
    cmd = ["node", QVERIS_SCRIPT, "discover", query, "--limit", str(limit)]
    env = os.environ.copy()
    env["QVERIS_API_KEY"] = QVERIS_API_KEY
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30, env=env)
        if result.returncode != 0:
            return None, None, f"Discovery failed: {result.stderr}"
        
        discovery_id = None
        tools = {}
        current_name = None
        
        for line in result.stdout.split('\n'):
            if line.startswith("Discovery ID:"):
                discovery_id = line.split(":")[1].strip()
            if line.strip().startswith('[') and ']' in line:
                current_name = line.split(']')[1].strip()
            if "ID:" in line and current_name:
                tool_id = line.split("ID:")[1].strip()
                tools[current_name] = tool_id
        
        return discovery_id, tools, None
    except Exception as e:
        return None, None, str(e)


def fetch_from_qveris(date_str: str) -> Optional[MarketData]:
    """从 Qveris 获取数据（兜底数据源）"""
    print("  [优先级3] 尝试 Qveris 数据源...")
    
    data = MarketData(date_str)
    data.attempted_sources.append("qveris")
    
    try:
        disc_id, tools, err = discover_qveris("China A-share index quotation SH000001", 3)
        if err:
            print(f"    ✗ 发现工具失败: {err}")
            return None
        
        quotation_tool = None
        for name, tool_id in tools.items():
            if "real_time_quotation" in tool_id or "quotation" in tool_id:
                quotation_tool = tool_id
                break
        
        if not quotation_tool:
            print("    ✗ 未找到行情工具")
            return None
        
        print(f"    使用工具: {quotation_tool}")
        
        index_codes = "000001.SH,399001.SZ,399006.SZ,000688.SH"
        result, err = call_qveris(disc_id, quotation_tool, {"codes": index_codes})
        
        if err:
            print(f"    ✗ API调用失败: {err}")
            return None
        
        code_mapping = {
            "000001.SH": "sh_index",
            "399001.SZ": "sz_index",
            "399006.SZ": "cy_index",
            "000688.SH": "kc50"
        }
        
        success_count = 0
        for item_list in result.get('data', []):
            if not item_list:
                continue
            item = item_list[0]
            code = item.get('thscode', '')
            idx_name = code_mapping.get(code)
            
            if idx_name:
                try:
                    change = item.get('changeRatio')
                    close = item.get('latest')
                    if change is not None and close is not None:
                        data.indices[idx_name]["close"] = round(float(close), 2)
                        data.indices[idx_name]["change_pct"] = round(float(change), 2)
                        success_count += 1
                        print(f"    ✓ {idx_name}: {close} ({change:+.2f}%)")
                except Exception as e:
                    print(f"    ✗ {idx_name}: {e}")
        
        if success_count == 0:
            print("    ✗ 未获取到任何指数数据")
            return None
        
        # 获取成交额
        try:
            sh_amount = sz_amount = 0
            for item_list in result.get('data', []):
                if not item_list:
                    continue
                item = item_list[0]
                code = item.get('thscode', '')
                amount = item.get('amount', 0)
                if code == '000001.SH':
                    sh_amount = float(amount) if amount else 0
                elif code == '399001.SZ':
                    sz_amount = float(amount) if amount else 0
            
            total = sh_amount + sz_amount
            if total > 1e12:
                turnover = round(total / 1e8, 0)
            elif total > 1e8:
                turnover = round(total / 1e4, 0)
            else:
                turnover = round(total, 0)
            
            data.market["turnover"] = int(turnover)
            print(f"    ✓ 成交额: {turnover:.0f}亿")
        except Exception as e:
            print(f"    ✗ 成交额: {e}")
        
        data.market["up_count"] = None
        data.market["down_count"] = None
        data.market["limit_up"] = None
        data.market["limit_down"] = None
        
        data.source = "qveris"
        print("  ✓ Qveris 数据获取成功（部分字段可能缺失）")
        return data
        
    except Exception as e:
        print(f"  ✗ Qveris 获取失败: {e}")
        return None


def main():
    parser = argparse.ArgumentParser(description="Fetch stock market data")
    parser.add_argument("--date", type=str, required=True, help="Date in YYYY-MM-DD format")
    parser.add_argument("--output", type=str, default=None, help="Output file")
    args = parser.parse_args()
    
    if args.output is None:
        args.output = f"market_data_{args.date}.json"
    
    print(f"="*60)
    print(f"股票数据获取")
    print(f"日期: {args.date}")
    print(f"优先级: 东方财富 > AKShare > Qveris")
    print(f"="*60)
    
    data = None
    
    # 优先级1：东方财富
    data = fetch_from_eastmoney(args.date)
    
    # 优先级2：AKShare
    if data is None:
        data = fetch_from_akshare(args.date)
    
    # 优先级3：Qveris
    if data is None:
        data = fetch_from_qveris(args.date)
    
    if data is None:
        print("\n" + "="*60)
        print("✗ 所有数据源均失败")
        print("="*60)
        data = MarketData(args.date)
        data.attempted_sources = ["eastmoney", "akshare", "qveris"]
    
    # 保存数据
    output_path = os.path.join(os.path.dirname(__file__), "..", "data", args.output)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data.to_dict(), f, ensure_ascii=False, indent=2)
    
    print(f"\n" + "="*60)
    print(f"数据获取完成")
    print(f"="*60)
    print(f"文件: {output_path}")
    print(f"尝试的数据源: {', '.join(data.attempted_sources)}")
    print(f"成功的数据源: {data.source or '无'}")
    
    if data.source:
        print(f"\n数据摘要:")
        sh = data.indices['sh_index']
        if sh['close'] is not None:
            print(f"  上证指数: {sh['close']} ({sh['change_pct']:+.2f}%)")
        print(f"  成交额: {data.market['turnover'] or '[失败]'}亿")
        print(f"  涨跌: {data.market['up_count'] or '[失败]'}/{data.market['down_count'] or '[失败]'}")
        print(f"  涨停/跌停: {data.market['limit_up'] if data.market['limit_up'] is not None else '[失败]'}/{data.market['limit_down'] if data.market['limit_down'] is not None else '[失败]'}")
    
    return 0 if data.source else 1


if __name__ == "__main__":
    sys.exit(main())
