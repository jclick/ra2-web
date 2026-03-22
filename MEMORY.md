# 记忆

## 工具配置

### Qveris (股票数据)
- **API Key**: sk-dZSVEe3T0XdL-1yDoaNdhKZBPhVTKnNhki1N3pM24aI
- **安装位置**: ~/.openclaw/skills/qveris-official/
- **配置时间**: 2026-03-14
- **用途**: A股实时行情、历史数据、资金流向、财务数据

**可用工具**:
- `ths_ifind.real_time_quotation.v1` - 同花顺实时行情
- `ths_ifind.quotation.v1` - 同花顺历史+实时行情
- `ths_ifind.money_flow.v1` - 资金流向数据
- `eodhd.live_prices.retrieve.v1` - 全球股票实时价格

**使用方法**:
```bash
# 发现工具
node ~/.openclaw/skills/qveris-official/scripts/qveris_tool.mjs discover "A股实时行情"

# 调用工具获取数据
node ~/.openclaw/skills/qveris-official/scripts/qveris_tool.mjs call <tool_id> --discovery-id <id> --params '{"codes":"000001.SH"}'
```

---

## 股票复盘

### 每日复盘流程
1. 使用 Qveris 获取实时行情数据
2. 使用 stock-daily-review skill 生成复盘报告
3. 保存到 stock-review/stocks/history/

### 已生成的复盘
- 2026-03-13: 化工高潮期、锂电池/风电启动期

---

*最后更新: 2026-03-14*

### 复盘报告结构 (2026-03-14 更新)
新增**第四部分：市场结构分析**，包含：
1. **总龙头分析** - 市场总龙头识别、各板块龙头对比
2. **中军分析** - 板块中军梳理、深度分析、参与优先级
3. **主线龙头分析** - 各主线龙头详情、抗跌测试、走势预测

新增功能：龙头梯队完整性展示、龙头联动竞争关系、中军角色定位

---
*最后更新: 2026-03-14*
