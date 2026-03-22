---
name: stock-daily-review
description: 每日股票情绪复盘自动化工具。通过实时API获取数据，优先级：东方财富 > AKShare > Qveris。所有数据均为实时请求，若获取失败则明确标记失败原因。基于情绪复盘模板自动生成Markdown和HTML格式的复盘报告，存储到指定目录。支持提示词触发（"每日复盘"/"每日股票复盘"）和定时任务（交易日16:00自动执行）。
---

# 每日股票情绪复盘

自动化生成每日A股情绪复盘报告。

## 核心规则（重要）

### 数据源优先级
⚠️ **只使用实时请求的数据，按以下优先级尝试**

| 优先级 | 数据源 | 状态 | 说明 |
|:---:|:---|:---:|:---|
| **1** | **东方财富** | ✅ 首选 | 通过 AKShare 访问东财数据 |
| **2** | **AKShare** | ✅ 备选 | 东方财富接口封装 |
| **3** | **Qveris** | ✅ 兜底 | 同花顺 iFinD 数据 |
| **其他** | Yahoo Finance 等 | ❌ 禁用 | 禁止使用 |

### 数据获取规则
1. **优先尝试东财数据**（通过 AKShare）
2. **东财失败时尝试 AKShare 其他接口**
3. **AKShare 失败时尝试 Qveris**
4. **所有数据源均失败时，明确标记失败原因**
5. **禁止硬编码数据，禁止估算填充**

### 失败处理规则
- **某数据源失败时，自动降级到下一优先级**
- **所有数据源均失败时，在报告中明确标记失败原因**
- **报告必须真实反映数据获取状态**
- **禁止使用估算或缓存数据**

## 功能概述

1. **数据获取**：按优先级获取实时数据
   - 大盘指数（上证、深证、创业板、科创50）
   - 成交额、涨跌家数统计
   - 热点板块、涨停/跌停数据

2. **报告生成**：基于 `references/template_emotion.md` 模板
   - 自动填充大盘数据（成功或失败状态）
   - 分析热点板块（Top3）
   - 判断情绪周期
   - 生成次日预案

3. **输出格式**：
   - Markdown 格式（原始数据）
   - HTML 格式（可视化展示）

4. **存储位置**：`{workspace}/stock-review/stocks/history/`

## 触发方式

### 1. 提示词触发
用户说以下任意内容时触发：
- "每日复盘"
- "每日股票复盘"
- "生成今天的复盘"
- "跑一下今天的复盘"

### 2. 定时任务
在交易日（周一到周五）16:00 自动执行。

## 使用方法

### 手动触发

```
用户：每日复盘
→ 执行数据获取（东财→AKShare→Qveris） → 生成报告 → 保存文件
```

### 查看报告

报告生成后会自动展示给用户，文件位置：
- Markdown: `stock-review/stocks/history/YYYY-MM-DD_情绪复盘.md`
- HTML: `stock-review/stocks/history/YYYY-MM-DD_情绪复盘.html`

## 工作流

### Step 1: 获取数据

使用 `scripts/fetch_data.py` 获取市场数据：

```bash
# 获取实时数据（按优先级：东财→AKShare→Qveris）
python3 scripts/fetch_data.py --date 2026-03-17
```

输出：`data/market_data_2026-03-17.json`

**数据字段说明**：
- 所有字段均为实时API获取
- 记录每个字段的数据源来源
- 若某字段获取失败，`status` 为 `"failed"`，`reason` 包含失败原因
- 报告生成时需处理 null 值，显示"数据获取失败"而非估算值

### Step 2: 生成报告

使用 `scripts/generate_review.py` 生成复盘报告：

```bash
python3 scripts/generate_review.py --date 2026-03-17 --data data/market_data_2026-03-17.json
```

输出：
- `stock-review/stocks/history/2026-03-17_情绪复盘.md`
- `stock-review/stocks/history/2026-03-17_情绪复盘.html`

## 数据源说明

### 东方财富（通过 AKShare）
- **第一优先数据源**
- 提供最完整的 A 股数据
- 包括涨停/跌停家数、热点板块等
- 获取速度较慢（约 1-2 分钟）
- 可能被限流

### AKShare
- **第二优先数据源**
- 东方财富接口封装
- 当东财接口失败时尝试

### Qveris（同花顺 iFinD）
- **第三优先数据源**
- 实时行情数据
- 需要配置 `QVERIS_API_KEY`
- 若获取失败，报告需明确标注

### 禁止使用的数据源
- Yahoo Finance ❌
- 其他第三方数据源 ❌
- 硬编码/缓存数据 ❌

## 数据结构

### market_data.json

```json
{
  "date": "2026-03-17",
  "source": "eastmoney",
  "fetch_status": {
    "overall": "success",
    "attempted_sources": ["eastmoney", "akshare", "qveris"],
    "successful_source": "eastmoney",
    "failed_fields": []
  },
  "indices": {
    "sh_index": {"close": 4095.45, "change_pct": -0.82},
    "sz_index": {"close": 14280.78, "change_pct": -0.65},
    "cy_index": {"close": 3310.28, "change_pct": -0.22},
    "kc50": {"close": 1373.64, "change_pct": -0.72}
  },
  "market": {
    "turnover": 24003,
    "up_count": 1502,
    "down_count": 3824,
    "limit_up": 71,
    "limit_down": 36
  },
  "sectors": [...],
  "timestamp": "2026-03-17T16:05:00"
}
```

## 依赖安装

```bash
# Python 依赖
pip install akshare jinja2

# Qveris 需要 Node.js >= 18
# Qveris skill 安装位置：~/.openclaw/skills/qveris-official/
```

## 环境变量配置

配置 Qveris API Key（当需要使用 Qveris 时）：

```bash
export QVERIS_API_KEY="your-api-key"
```

或在 `~/.openclaw/openclaw.json` 中添加：

```json
{
  "env": {
    "QVERIS_API_KEY": "your-api-key"
  }
}
```

## 定时任务配置

在 OpenClaw 中配置 cron 任务：

```json
{
  "schedule": {"kind": "cron", "expr": "0 16 * * 1-5", "tz": "Asia/Shanghai"},
  "payload": {"kind": "agentTurn", "message": "每日股票复盘"},
  "sessionTarget": "isolated"
}
```

## 故障排查

### 东财/AKShare 获取失败
- 检查网络连接
- 可能是东方财富限流，等待几分钟后重试
- 会自动降级到 Qveris

### Qveris 获取失败
- 检查 `QVERIS_API_KEY` 是否配置正确
- 检查 Node.js 版本 >= 18
- 检查网络连接

### 所有数据源均失败
- 检查网络连接
- 查看各数据源的错误日志
- 报告将明确标记所有数据获取失败
