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

## RA2 Web 游戏项目 (2026-03-22 更新)

**项目仓库**: https://github.com/jclick/ra2-web

### 已实现功能
- **Stage 1**: 基础引擎、地图系统、单位移动
- **Stage 2**: 科技树、超级武器、AI系统 ✓ 完成
- **资源系统**: MIX/SHP/INI 解析器
- **MIX 解密**: Blowfish 算法支持，可处理加密 MIX 文件
- **导入界面**: 3步流程，支持测试资源

### 新增: MIX 文件解密支持
- **算法**: Westwood 修改版 Blowfish
- **加密标志**: `0x00020000` (TS格式 MIX)
- **密钥结构**: 80字节 key source + RSA 加密密钥
- **文件位置**: `src/data/parser/MixDecrypt.ts`, `EncryptedMixParser.ts`
- **使用方式**: ResourceManager 自动检测并尝试解密

**限制**: 简化版实现，复杂加密可能需要 XCC Mixer 预处理

### 技术栈
- TypeScript + React + Three.js
- Vite 构建工具
- 支持 WebGL 渲染
- 浏览器自动化测试 (Playwright API)

### 关键文件位置
- 项目: `/root/.openclaw/workspace/ra2-web/`
- 资源: `public/assets/`
- 文档: `docs/`
- 解密: `src/data/parser/MixDecrypt.ts`

### 启动方法
```bash
cd /root/.openclaw/workspace/ra2-web
npm run dev
# 访问 http://localhost:4000
```

### 注意事项
- 大 MIX 文件已做内存优化（使用 File.slice() 按需加载，不保存完整文件）
- 无原版资源可用"测试资源"运行（带5秒超时保护）
- 游戏使用占位图形显示单位
- 即使测试资源全部加载失败也能启动游戏
- 加密 MIX 文件会自动尝试解密，失败则跳过

### 最新提交
- `134b011`: WebGL 检测 + MIX 解密支持

---
*最后更新: 2026-03-22*
