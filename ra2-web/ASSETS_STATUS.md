# 红警2 Web版 - 资源获取状态

## 📊 当前状态

| 组件 | 状态 | 说明 |
|------|------|------|
| 调色板 | ✅ 就绪 | unittem.pal, unitsno.pal, uniturb.pal |
| MIX解析器 | ✅ 就绪 | 支持RA2格式 |
| SHP解析器 | ✅ 就绪 | 支持LCW解压 |
| 资源管理器 | ✅ 就绪 | 完整功能 |
| 游戏资源 | ❌ 缺失 | 需要ra2.mix等文件 |

## 🔧 已创建的工具

### 1. 资源提取器
```bash
# 如果你有原版RA2安装
python3 scripts/extract-assets.py --auto

# 或指定路径
python3 scripts/extract-assets.py --source /path/to/ra2
```

### 2. 资源检查
```bash
./scripts/check-assets.sh
```

### 3. 手动导入
启动游戏后使用导入界面拖放文件

## 📁 需要的文件

从原版游戏或演示版中提取:
- `ra2.mix` (~250MB) - 主要资源
- `language.mix` (~30MB) - 本地化
- `theme.mix` (~40MB) - 音乐

## 🌐 下载源

### Internet Archive (当前环境受限)
- https://archive.org/download/CnC-RedAlert2Demo/RA2Demo.zip
- 文件大小: ~210MB

### OpenRA 资源
- 安装 OpenRA 后从 `~/.openra/Content/ra2/` 复制

## ⚡ 无资源运行

即使没有原始资源，游戏也可以启动和运行:
- ✅ 游戏逻辑完整
- ✅ 界面功能正常
- ✅ 使用占位图形

启动命令:
```bash
npm run dev
```

## 📝 下一步

1. **如果你有原版游戏**: 使用 `extract-assets.py` 自动提取
2. **如果你能访问 archive.org**: 手动下载并解压
3. **否则**: 游戏仍可以运行，使用占位图形

## 📚 文档

- 完整指南: `docs/RESOURCES.md`
- 快速参考: `RESOURCES_QUICK.md`
