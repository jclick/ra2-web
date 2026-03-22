# 红色警戒2 Web版

基于 TypeScript + React + Three.js 的浏览器版《红色警戒2》实现。

## 技术栈

- **前端框架**: React 18 + TypeScript 5.3
- **构建工具**: Vite
- **3D渲染**: Three.js + WebGL 2.0
- **音频系统**: Web Audio API
- **文件系统**: File System Access API

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 准备游戏资源

你需要拥有合法的红警2游戏副本才能提取资源。

#### 方式一：使用提取脚本

```bash
node scripts/extract-resources.mjs "<游戏目录>"
```

例如：
```bash
# Windows (通过 WSL 或 Git Bash)
node scripts/extract-resources.mjs "/mnt/c/Program Files/Red Alert 2"

# 或者手动指定输出目录
node scripts/extract-resources.mjs "C:\\Games\\RA2" ./public/assets
```

#### 方式二：手动复制

从游戏目录复制以下文件到 `public/assets/`：
- `ra2.mix` - 主资源包
- `ra2md.mix` - 尤里的复仇资源（可选）
- `language.mix` - 本地化资源
- `rules.ini` - 游戏规则
- `*.map` - 地图文件（可选）

### 3. 启动开发服务器

```bash
npm run dev
```

打开浏览器访问 http://localhost:4000

### 4. 导入游戏资源

- 在首页点击"开始游戏"
- 将提取的资源文件拖放到导入页面
- 或点击"浏览文件"选择文件
- 点击"开始导入"

## 项目结构

```
ra2-web/
├── src/
│   ├── engine/          # 游戏引擎核心
│   │   ├── gfx/         # WebGL渲染系统
│   │   ├── sound/       # 音频系统
│   │   └── gameRes/     # 资源管理
│   ├── gui/             # 用户界面
│   │   ├── component/   # React组件
│   │   └── screen/      # 游戏屏幕
│   ├── data/            # 数据处理
│   │   ├── vfs/         # 虚拟文件系统
│   │   └── parser/      # 文件格式解析器
│   ├── game/            # 游戏逻辑
│   └── util/            # 工具函数
├── scripts/             # 工具脚本
├── public/              # 静态资源
└── docs/                # 文档
```

## 支持的文件格式

| 格式 | 说明 | 状态 |
|------|------|------|
| MIX | 游戏资源包 | ✅ 已支持 |
| SHP | 精灵图 | ✅ 已支持 |
| VXL/HVA | 3D体素模型 | 🚧 开发中 |
| TMP | 地形贴图 | 🚧 开发中 |
| INI | 配置文件 | ✅ 已支持 |
| MAP | 地图文件 | ✅ 已支持 |

## 参考项目

- [Chrono Divide](https://chronodivide.com/) - 功能完整的Web版红警2
- [OpenRA](https://www.openra.net/) - 开源重制引擎
- [EA官方源码](https://github.com/electronicarts/CnC_Remastered_Collection)

## 免责声明

- 本项目仅供学习研究目的
- 红色警戒2是EA公司的知识产权
- 用户需要拥有合法的游戏副本才能使用原版资源
- 不得用于商业用途

## 许可证

MIT License - 详见 [LICENSE](./LICENSE)
