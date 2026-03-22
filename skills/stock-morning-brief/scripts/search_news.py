#!/usr/bin/env python3
"""
早间资讯搜索脚本
搜索全球热点资讯
"""

import json
import os
from datetime import datetime, timedelta

def search_news_topics():
    """定义需要搜索的资讯主题"""
    return {
        "战争地缘": [
            "俄乌局势最新进展",
            "中东局势最新消息",
            "台海局势最新"
        ],
        "金融政策": [
            "美联储最新表态",
            "中国央行最新政策",
            "全球央行利率决议"
        ],
        "科技前沿": [
            "AI人工智能最新突破 2026",
            "人形机器人最新进展",
            "低空经济政策消息"
        ],
        "重磅人物": [
            "马斯克最新消息",
            "黄仁勋英伟达最新消息",
            "巴菲特持仓变动"
        ],
        "全球市场": [
            "美股科技股走势分析",
            "中概股最新走势",
            "原油价格走势"
        ]
    }

def main():
    """主函数"""
    date_str = datetime.now().strftime("%Y-%m-%d")
    
    # 获取搜索主题
    topics = search_news_topics()
    
    # 保存搜索任务
    output_dir = "/root/.openclaw/workspace/stock-review/morning-brief"
    os.makedirs(output_dir, exist_ok=True)
    
    output_file = os.path.join(output_dir, f"search_tasks_{date_str}.json")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            "date": date_str,
            "topics": topics,
            "sources": [
                "雅虎财经",
                "财联社",
                "雪球",
                "格隆汇",
                "华尔街见闻",
                "淘股吧",
                "爱股票"
            ]
        }, f, ensure_ascii=False, indent=2)
    
    print(f"搜索任务已保存: {output_file}")
    print("\n需要搜索的资讯主题:")
    for category, queries in topics.items():
        print(f"\n【{category}】")
        for q in queries:
            print(f"  - {q}")

if __name__ == "__main__":
    main()
