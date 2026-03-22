#!/usr/bin/env python3
"""
早间资讯报告生成脚本
生成Markdown格式的早间金融资讯简报
"""

import json
import sys
import os
from datetime import datetime, timedelta

def load_market_data(date_str):
    """加载市场数据"""
    file_path = f"/root/.openclaw/workspace/stock-review/morning-brief/market_data_{date_str}.json"
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None

def generate_section1_us_market(data):
    """生成第一部分：全球市场"""
    us = data.get("us_market", {})
    asia = data.get("asia_market", {})
    
    md = """# 第一部分：全球市场概览

## 一、美股市场表现

### 1.1 美股三大指数

| 指数 | 收盘 | 涨跌 | 涨跌幅 |
|:---:|:---:|:---:|:---:|
"""
    
    indices = us.get("美股指数", {})
    for symbol, info in indices.items():
        if symbol != "^VIX":
            emoji = "📈" if info["change_pct"] > 0 else "📉" if info["change_pct"] < 0 else "➡️"
            md += f"| {info['name']} | {info['close']} | {emoji} | {info['change_pct']}% |\n"
    
    # VIX
    if "^VIX" in indices:
        vix = indices["^VIX"]
        md += f"\n**VIX恐慌指数**: {vix['close']} ({vix['change_pct']}%)\n""
    
    # 美股科技股
    md += """
### 1.2 美股科技股走势

| 股票 | 名称 | 收盘 | 涨跌幅 | 点评 |
|:---:|:---:|:---:|:---:|:---|
"""
    
    tech_stocks = us.get("美股科技", {})
    for symbol, info in sorted(tech_stocks.items(), key=lambda x: x[1]["change_pct"], reverse=True):
        trend = "强势上涨" if info["change_pct"] > 3 else "上涨" if info["change_pct"] > 0 else "下跌" if info["change_pct"] < 0 else "平盘"
        md += f"| {symbol} | {info['name']} | ${info['close']} | {info['change_pct']}% | {trend} |\n"
    
    md += """
**明星股重点点评**:
- **英伟达(NVDA)**: 作为AI芯片龙头，走势对A股AI板块有重要指引作用
- **特斯拉(TSLA)**: 电动车风向标，影响A股新能源整车板块
- **苹果(AAPL)**: 消费电子龙头，影响果链及消费电子板块

"""
    
    # 中概股
    md += """## 二、中概股表现

### 2.1 互联网中概股

| 股票 | 名称 | 收盘 | 涨跌幅 |
|:---:|:---:|:---:|:---:|
"""
    
    china_internet = us.get("中概互联网", {})
    for symbol, info in sorted(china_internet.items(), key=lambda x: x[1]["change_pct"], reverse=True)[:10]:
        md += f"| {symbol} | {info['name']} | ${info['close']} | {info['change_pct']}% |\n"
    
    md += """
### 2.2 科技中概股

| 股票 | 名称 | 收盘 | 涨跌幅 |
|:---:|:---:|:---:|:---:|
"""
    
    china_tech = us.get("中概科技", {})
    for symbol, info in sorted(china_tech.items(), key=lambda x: x[1]["change_pct"], reverse=True):
        md += f"| {symbol} | {info['name']} | ${info['close']} | {info['change_pct']}% |\n"
    
    md += """
**中概股对A股影响**:
- 中概互联网走强 → A股港股通互联网、传媒板块可能受益
- 中概电动车走强 → A股新能源车产业链情绪提振

"""
    
    # 日韩早盘
    md += """## 三、日韩早盘走势

| 市场 | 指数 | 涨跌 | 涨跌幅 |
|:---:|:---:|:---:|:---:|
"""
    
    for symbol, info in asia.items():
        md += f"| {info['name']} | {info['close']} | {info['change_pct']}% | {'📈' if info['change_pct'] > 0 else '📉' if info['change_pct'] < 0 else '➡️'} |\n"
    
    md += """
**亚太市场联动**: 日韩早盘表现对A股开盘情绪有一定指引作用
"""
    
    return md

def generate_section2_hot_news():
    """生成第二部分：全球热点资讯"""
    md = """# 第二部分：全球热点资讯

> **注**: 以下为资讯收集框架，实际执行时将通过网络搜索获取最新资讯

## 一、战争与地缘局势

### 1.1 俄乌局势
- 最新进展: [待获取]
- 对大宗商品、能源、军工板块影响: [待分析]

### 1.2 中东局势
- 最新进展: [待获取]
- 对油价、黄金影响: [待分析]

## 二、金融政策动态

### 2.1 美联储动态
- 最新表态: [待获取]
- 对全球流动性的影响: [待分析]

### 2.2 中国政策
- 央行操作: [待获取]
- 产业政策: [待获取]

## 三、科技前沿动态

### 3.1 AI发展
- 最新突破: [待获取]
- 受益板块: 算力、应用、芯片

### 3.2 新兴产业
- 机器人: [待获取]
- 低空经济: [待获取]
- 新能源技术: [待获取]

## 四、重磅人物发言

### 4.1 马斯克相关
- 最新动态: [待获取]
- 影响领域: 电动车、SpaceX、AI、数字货币

### 4.2 黄仁勋相关
- 最新动态: [待获取]
- 影响领域: AI芯片、算力、数据中心

### 4.3 其他重要人物
- 巴菲特持仓变动: [待获取]
- 木头姐观点: [待获取]
"""
    return md

def generate_section3_prediction():
    """生成第三部分：A股预测"""
    md = """# 第三部分：A股今日预测

## 一、外围市场对A股开盘影响

### 1.1 情绪传导
- **美股上涨** → A股高开概率大
- **美股下跌** → A股低开概率大
- **中概股强势** → 港股互联网带动A股情绪

### 1.2 板块映射
| 美股强势板块 | 对应A股板块 |
|:---:|:---:|
| AI芯片(NVDA) | 算力、CPO、AI应用 |
| 电动车(TSLA) | 新能源车、锂电池 |
| 消费电子(AAPL) | 果链、消费电子 |

## 二、今日板块热点预测

### 2.1 可能受外围提振的板块
1. **AI算力**: 若NVDA/AMD强势，关注CPO、服务器、算力租赁
2. **新能源车**: 若TSLA及中概电动车强势，关注整车、电池
3. **消费电子**: 若AAPL强势，关注果链、MR/VR概念

### 2.2 可能承压的板块
1. **资源股**: 若大宗商品走弱
2. **出口链**: 若美元指数走强

## 三、重点个股关注

### 3.1 潜在高开标的
- [待根据外围走势填充]

### 3.2 风险提示
- 高开不追，注意获利了结
- 关注成交量变化

## 四、操作策略建议

1. **开盘观察**: 观察半小时内资金流向
2. **板块选择**: 跟随外围强势方向，但避免追高
3. **仓位控制**: 若外围波动大，保持适度仓位
"""
    return md

def generate_full_report(date_str):
    """生成完整报告"""
    # 加载数据
    market_data = load_market_data(date_str)
    
    if not market_data:
        print(f"错误: 未找到 {date_str} 的市场数据")
        return None
    
    # 生成报告
    report = f"""# 早间金融资讯简报

**生成时间**: {market_data.get('generated_at', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))}
**数据来源**: Yahoo Finance

---

"""
    
    report += generate_section1_us_market(market_data)
    report += "\n\n---\n\n"
    report += generate_section2_hot_news()
    report += "\n\n---\n\n"
    report += generate_section3_prediction()
    report += """

---

## 附：数据来源说明

- **美股数据**: Yahoo Finance 实时行情
- **资讯来源**: 财联社、雪球、格隆汇、华尔街见闻等（待接入）

---

*本简报仅供参考，不构成投资建议*
"""
    
    return report

def main():
    """主函数"""
    date_str = datetime.now().strftime("%Y-%m-%d")
    
    print(f"生成 {date_str} 早间资讯简报...")
    
    report = generate_full_report(date_str)
    if report:
        # 保存报告
        output_dir = "/root/.openclaw/workspace/stock-review/morning-brief"
        os.makedirs(output_dir, exist_ok=True)
        
        output_file = os.path.join(output_dir, f"{date_str}_早间资讯.md")
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(report)
        
        print(f"报告已保存到: {output_file}")
        return output_file
    return None

if __name__ == "__main__":
    main()
