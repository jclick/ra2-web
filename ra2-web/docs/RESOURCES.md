# 红色警戒2 Web版 - 资源获取指南

## 快速开始

由于原始资源文件较大且下载速度受限，我们提供以下多种方式获取游戏资源：

---

## 方式一：使用 OpenRA 资源 (推荐)

OpenRA 是开源的红警重制项目，其资源文件可以兼容使用。

### 步骤：

1. **下载 OpenRA 的 RA2 资源包**
   ```bash
   # Linux/macOS
   wget https://github.com/OpenRA/ra2/releases/download/2023.10/ra2-2023.10-x86_64.AppImage
   
   # 或者从官网下载
   # https://www.openra.net/download/
   ```

2. **提取资源文件**
   ```bash
   # 运行 AppImage 后，资源会下载到 ~/.openra/Content/ra2/
   # 复制 MIX 文件到项目
   cp ~/.openra/Content/ra2/*.mix ./public/assets/
   ```

---

## 方式二：手动下载演示版

从 Internet Archive 下载红警2演示版：

### 直接下载链接：
- https://archive.org/download/CnC-RedAlert2Demo/RA2Demo.zip

### 解压并提取资源：
```bash
# 下载
wget https://archive.org/download/CnC-RedAlert2Demo/RA2Demo.zip

# 解压
unzip RA2Demo.zip -d ra2demo/

# 找到 MIX 文件并复制
find ra2demo/ -name "*.mix" -exec cp {} ./public/assets/ \;
```

---

## 方式三：使用原版游戏资源

如果你有原版红警2游戏：

### 需要的文件：

| 文件名 | 大小 | 说明 |
|--------|------|------|
| `ra2.mix` | ~250MB | 主要游戏资源 |
| `language.mix` | ~30MB | 本地化资源 |
| `theme.mix` | ~40MB | 主题音乐 |
| `ra2md.mix` | ~150MB | 尤里的复仇资源 |

### 文件位置：
- **Windows**: `C:\Program Files\EA Games\Command & Conquer Red Alert 2\`
- **Origin**: 查看游戏安装目录
- **Steam**: `Steam\steamapps\common\Command and Conquer Red Alert 2\`

### 复制到项目：
```bash
# Windows PowerShell
Copy-Item "C:\Games\RA2\ra2.mix" ".\public\assets\"
Copy-Item "C:\Games\RA2\language.mix" ".\public\assets\"

# 或者手动复制到 ra2-web/public/assets/ 目录
```

---

## 方式四：使用测试资源 (无需原版)

如果暂时没有原版资源，可以使用项目自带的测试资源：

```bash
# 项目已创建测试调色板
ls -la public/assets/palettes/
# unittem.pal  - 温带调色板
# unitsno.pal  - 雪地调色板  
# uniturb.pal  - 城市调色板
```

这些调色板足够运行游戏基础功能，但单位图像需要原版 SHP 文件。

---

## 导入资源到游戏

### 方式 A：网页导入 (推荐)

1. 启动游戏：`npm run dev`
2. 打开 http://localhost:4000
3. 点击"开始游戏"
4. 拖放 MIX/SHP 文件到导入界面
5. 点击"开始导入"

### 方式 B：直接放置

```bash
# 直接将 MIX 文件放入 assets 目录
cp /path/to/ra2.mix ./public/assets/
cp /path/to/language.mix ./public/assets/
```

---

## 提取的资源类型

成功导入后会自动解析：

- **SHP 文件** → 单位和建筑的精灵图
- **PAL 文件** → 调色板 (256色)
- **INI 文件** → 游戏规则配置
- **MAP 文件** → 游戏地图

---

## 故障排除

### 问题：导入后没有图像

**原因**：可能是加密的 MIX 文件
**解决**：尝试导入其他 MIX 文件，或使用未加密的资源

### 问题：调色板颜色不对

**原因**：缺少正确的 PAL 文件
**解决**：确保导入 `unittem.pal` 或 `unitsno.pal`

### 问题：文件太大导入慢

**原因**：MIX 文件包含大量资源
**解决**：等待解析完成，大型 MIX 文件可能需要几分钟

---

## 法律声明

⚠️ **重要提示**

- 本项目仅供学习研究使用
- 使用原版游戏资源需要您拥有正版游戏
- Westwood Studios、EA 拥有红警2的所有版权
- 请勿分发受版权保护的游戏资源

---

## 资源用途说明

| 资源类型 | 用途 | 是否必需 |
|----------|------|----------|
| MIX 文件 | 包含 SHP、PAL 等 | 是 |
| SHP 文件 | 单位/建筑图像 | 是 |
| PAL 文件 | 调色板 | 是 (已内置测试版) |
| INI 文件 | 游戏规则 | 否 |
| MAP 文件 | 地图 | 否 |
| WAV 文件 | 音效 | 否 |

---

## 下一步

获取资源后，参考 `README.md` 开始游戏开发或游玩！
