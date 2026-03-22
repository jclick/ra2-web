# 资源快速获取

## 当前状态

✅ 已就绪:
- 调色板文件 (unittem.pal, unitsno.pal, uniturb.pal)
- 资源解析器 (MIX, SHP, PAL)
- 导入界面

❌ 缺失:
- 原始游戏资源 (ra2.mix 等)

---

## 获取资源的三种方式

### 方式1: 从 GitHub Releases 下载 (推荐)

如果资源已上传到项目 Release:

```bash
curl -L -o public/assets/ra2.mix \
  https://github.com/yourusername/ra2-web/releases/download/v0.1.0/ra2.mix
```

### 方式2: 手动上传

如果你有原版游戏或演示版:

```bash
# 上传文件到服务器
cp /path/to/ra2.mix ./ra2-web/public/assets/
cp /path/to/language.mix ./ra2-web/public/assets/
```

### 方式3: 使用浏览器下载

1. 在浏览器中访问: https://archive.org/download/CnC-RedAlert2Demo/RA2Demo.zip
2. 下载后解压
3. 将 ra2.mix 等文件拖放到游戏的导入界面

---

## 无资源运行

即使没有原始资源，游戏也可以运行:
- 使用占位图形 (彩色方块)
- 使用生成的测试调色板
- 所有游戏逻辑正常工作

启动命令:
```bash
npm run dev
```

---

## 需要帮助?

查看完整文档: `docs/RESOURCES.md`
