#!/usr/bin/env python3
"""
早间资讯数据获取脚本
获取全球市场数据：美股、中概股、A50、日韩市场
"""

import json
import sys
import os
from datetime import datetime, timedelta
import yfinance as yf

# 配置
TICKERS = {
    # 美股科技股 - 明星股
    "美股科技": {
        "AAPL": "苹果",
        "MSFT": "微软", 
        "GOOGL": "谷歌",
        "AMZN": "亚马逊",
        "META": "Meta",
        "TSLA": "特斯拉",
        "NVDA": "英伟达",
        "AMD": "AMD",
        "INTC": "英特尔",
        "AVGO": "博通"
    },
    # 中概股 - 互联网
    "中概互联网": {
        "BABA": "阿里巴巴",
        "JD": "京东",
        "PDD": "拼多多",
        "BIDU": "百度",
        "TCEHY": "腾讯(ADR)",
        "NIO": "蔚来",
        "XPEV": "小鹏",
        "LI": "理想",
        "DIDI": "滴滴",
        "BILI": "哔哩哔哩"
    },
    # 中概股 - 科技
    "中概科技": {
        "JD": "京东",
        "NTES": "网易",
        "WB": "微博",
        "ZTO": "中通快递",
        "VIPS": "唯品会",
        "TCOM": "携程",
        "BEKE": "贝壳"
    },
    # 美股指数
    "美股指数": {
        "^GSPC": "标普500",
        "^DJI": "道琼斯",
        "^IXIC": "纳斯达克",
        "^VIX": "VIX恐慌指数"
    },
    # A50期货
    "A50相关": {
        "^N225": "日经225",
        "^KS11": "韩国KOSPI",
        "XIAOFENG": "富时A50期货(需替代方案)"
    }
}

def fetch_us_market():
    """获取美股数据"""
    results = {
        "美股指数": {},
        "美股科技": {},
        "中概互联网": {},
        "中概科技": {}
    }
    
    # 获取美股指数
    index_symbols = ["^GSPC", "^DJI", "^IXIC", "^VIX"]
    try:
        data = yf.download(index_symbols, period="2d", progress=False)
        for symbol in index_symbols:
            if symbol in data['Close'].columns:
                close = data['Close'][symbol].iloc[-1]
                prev_close = data['Close'][symbol].iloc[-2]
                change_pct = ((close - prev_close) / prev_close) * 100 if prev_close else 0
                results["美股指数"][symbol] = {
                    "name": TICKERS["美股指数"].get(symbol, symbol),
                    "close": round(close, 2),
                    "change_pct": round(change_pct, 2)
                }
    except Exception as e:
        print(f"获取美股指数失败: {e}", file=sys.stderr)
    
    # 获取美股科技股
    tech_symbols = list(TICKERS["美股科技"].keys())
    try:
        data = yf.download(tech_symbols, period="2d", progress=False)
        for symbol in tech_symbols:
            if symbol in data['Close'].columns:
                close = data['Close'][symbol].iloc[-1]
                prev_close = data['Close'][symbol].iloc[-2]
                change_pct = ((close - prev_close) / prev_close) * 100 if prev_close else 0
                results["美股科技"][symbol] = {
                    "name": TICKERS["美股科技"][symbol],
                    "close": round(close, 2),
                    "change_pct": round(change_pct, 2)
                }
    except Exception as e:
        print(f"获取美股科技股失败: {e}", file=sys.stderr)
    
    # 获取中概股
    china_symbols = list(TICKERS["中概互联网"].keys()) + list(TICKERS["中概科技"].keys())
    china_symbols = list(set(china_symbols))  # 去重
    try:
        data = yf.download(china_symbols, period="2d", progress=False)
        for symbol in china_symbols:
            if symbol in data['Close'].columns:
                close = data['Close'][symbol].iloc[-1]
                prev_close = data['Close'][symbol].iloc[-2]
                change_pct = ((close - prev_close) / prev_close) * 100 if prev_close else 0
                if symbol in TICKERS["中概互联网"]:
                    results["中概互联网"][symbol] = {
                        "name": TICKERS["中概互联网"][symbol],
                        "close": round(close, 2),
                        "change_pct": round(change_pct, 2)
                    }
                elif symbol in TICKERS["中概科技"]:
                    results["中概科技"][symbol] = {
                        "name": TICKERS["中概科技"][symbol],
                        "close": round(close, 2),
                        "change_pct": round(change_pct, 2)
                    }
    except Exception as e:
        print(f"获取中概股失败: {e}", file=sys.stderr)
    
    return results

def fetch_asia_market():
    """获取日韩市场数据"""
    results = {}
    
    # 日韩指数
    asia_symbols = ["^N225", "^KS11", "^HSI"]
    try:
        data = yf.download(asia_symbols, period="2d", progress=False)
        for symbol in asia_symbols:
            if symbol in data['Close'].columns:
                close = data['Close'][symbol].iloc[-1]
                prev_close = data['Close'][symbol].iloc[-2]
                change_pct = ((close - prev_close) / prev_close) * 100 if prev_close else 0
                name_map = {"^N225": "日经225", "^KS11": "韩国KOSPI", "^HSI": "恒生指数"}
                results[symbol] = {
                    "name": name_map.get(symbol, symbol),
                    "close": round(close, 2),
                    "change_pct": round(change_pct, 2)
                }
    except Exception as e:
        print(f"获取日韩市场失败: {e}", file=sys.stderr)
    
    return results

def main():
    """主函数"""
    date = datetime.now().strftime("%Y-%m-%d")
    
    print(f"获取 {date} 早间市场数据...")
    
    # 获取数据
    us_data = fetch_us_market()
    asia_data = fetch_asia_market()
    
    # 整合数据
    market_data = {
        "date": date,
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "us_market": us_data,
        "asia_market": asia_data
    }
    
    # 保存数据
    output_dir = "/root/.openclaw/workspace/stock-review/morning-brief"
    os.makedirs(output_dir, exist_ok=True)
    
    output_file = os.path.join(output_dir, f"market_data_{date}.json")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(market_data, f, ensure_ascii=False, indent=2)
    
    print(f"数据已保存到: {output_file}")
    return market_data

if __name__ == "__main__":
    main()
