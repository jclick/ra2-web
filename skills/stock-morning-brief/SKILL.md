---
name: stock-morning-brief
description: 早间金融资讯简报自动化工具。获取全球市场数据（美股科技股、中概股、A50、日韩），搜索全球热点资讯（战争、金融、科技、重磅人物发言），预测A股当日板块热点，生成Markdown格式简报。支持定时任务（早上8:30自动执行）和手动触发。
---

# 早间金融资讯简报

自动化生成每日开盘前金融资讯简报，帮助把握全球市场动态和A股开盘预期。

## 功能概述

### 1. 全球市场数据
- **美股科技股**: 苹果、微软、谷歌、亚马逊、Meta、特斯拉、英伟达等10只明星股
- **美股三大指数**: 标普500、道琼斯、纳斯达克、VIX恐慌指数
- **中概股**: 互联网（阿里、京东、拼多多、腾讯ADR等）+ 科技板块
- **亚太市场**: 日经225、韩国KOSPI、恒生指数

### 2. 热点资讯框架
- **战争地缘**: 俄乌、中东、台海局势
- **金融政策**: 美联储、中国央行、全球利率决议
- **科技前沿**: AI突破、机器人、低空经济
- **重磅人物**: 马斯克、黄仁勋、巴菲特动态

### 3. A股预测
- 外围市场对A股开盘的情绪传导分析
- 板块映射关系（美股强势板块→A股受益板块）
- 操作策略建议

### 4. 输出格式
- **Markdown格式**: 结构清晰，便于阅读和编辑
- **存储位置**: `{workspace}/stock-review/morning-brief/`

## 触发方式

### 1. 提示词触发
用户说以下任意内容时触发：
- "早间简报"
- "早上资讯"
- "开盘前简报"
- "全球市场简报"

### 2. 定时任务
每天早上8:30自动执行（建议工作日执行）。

## 使用方法

### 手动触发

```
用户：早间简报
→ 获取美股数据 → 生成简报 → 保存文件 → 展示给用户
```

### 查看报告

报告生成后会自动展示给用户，文件位置：
- Markdown: `stock-review/morning-brief/YYYY-MM-DD_早间资讯.md`

## 工作流

### Step 1: 获取市场数据

```bash
python3 scripts/fetch_market_data.py
```

输出: `stock-review/morning-brief/market_data_YYYY-MM-DD.json`

数据包括：
- 美股指数收盘及涨跌幅
- 美股科技股涨跌排行
- 中概股互联网/科技板块表现
- 日韩早盘走势

### Step 2: 生成简报

```bash
python3 scripts/generate_brief.py
```

输出: `stock-review/morning-brief/YYYY-MM-DD_早间资讯.md`

### Step 3: 一键执行

```bash
python3 scripts/run_morning_brief.py
```

## 数据源说明

| 数据源 | 数据类型 | 可靠性 |
|:---:|:---|:---:|
| **Yahoo Finance** | 美股、中概股、全球指数 | ⭐⭐⭐⭐ |
| **网络搜索** | 热点资讯、政策动态 | ⭐⭐⭐ |

## 报告结构

```markdown
# 早间金融资讯简报

## 第一部分：全球市场概览
  - 美股市场表现（三大指数、科技股）
  - 中概股表现（互联网、科技）
  - 日韩早盘走势

## 第二部分：全球热点资讯
  - 战争与地缘局势
  - 金融政策动态
  - 科技前沿动态
  - 重磅人物发言

## 第三部分：A股今日预测
  - 外围市场对A股开盘影响
  - 今日板块热点预测
  - 重点个股关注
  - 操作策略建议
```

## 定时任务配置

在 OpenClaw 中配置 cron 任务：

```json
{
  "schedule": {"kind": "cron", "expr": "30 8 * * 1-5", "tz": "Asia/Shanghai"},
  "payload": {"kind": "agentTurn", "message": "早间简报"},
  "sessionTarget": "isolated"
}
```

## 文件结构

```
stock-morning-brief/
├── SKILL.md                          # 本文件
├── scripts/
│   ├── fetch_market_data.py          # 获取全球市场数据
│   ├── generate_brief.py             # 生成简报
│   ├── search_news.py                # 搜索任务定义
│   └── run_morning_brief.py          # 一键执行脚本
└── references/                       # 参考模板
```

## 依赖安装

```bash
pip install yfinance
```

## 注意事项

1. **数据延迟**: Yahoo Finance 数据可能有15-30分钟延迟
2. **资讯获取**: 当前版本为框架，实际资讯需要通过搜索API补充
3. **交易日**: 建议只在工作日执行（周一至周五）
4. **时区**: 所有时间均为北京时间（Asia/Shanghai）

## 故障排查

### 数据获取失败
- 检查网络连接
- Yahoo Finance 偶尔限流，可稍后重试
- 检查 `yfinance` 是否已安装

### 报告生成失败
- 检查数据文件是否存在
- 检查输出目录权限
