# 红色警戒2 Web版开发方案

## 📋 项目概述

基于 TypeScript + React + Three.js 实现浏览器版《红色警戒2》，支持原版资源导入、完整的游戏逻辑和多人对战。

---

## 🎯 现有开源参考

### 1. Chrono Divide (推荐参考)
- **网站**: https://chronodivide.com/
- **特点**: 功能完整的Web版红警2，支持多人对战
- **技术**: WebAssembly + WebGL + TypeScript
- **状态**: Beta版可用，支持所有原版地图
- **注意**: 核心代码未开源，但有Mod SDK

### 2. RA2Web React (参考架构)
- **GitHub**: https://github.com/huangkaoya/redalert2
- **技术栈**: React 18 + TypeScript 5.3 + Three.js 0.177 + Vite
- **特点**: 完整的TypeScript重构，支持原版文件格式

### 3. OpenRA
- **网站**: https://www.openra.net/
- **技术**: C# / .NET + OpenGL
- **特点**: 红警1/2的开源引擎重制

### 4. EA官方源码
- **GitHub**: https://github.com/electronicarts/CnC_Remastered_Collection
- **内容**: 红警1和泰伯利亚之日的源码(2020年开源)
- **注意**: 红警2源码未开源

---

## 🛠️ 技术架构

### 核心技术栈
```
前端框架: React 18 + TypeScript 5.3
构建工具: Vite
渲染引擎: Three.js (WebGL 2.0)
音频系统: Web Audio API
文件系统: File System Access API
压缩解压: 7z-wasm
网络通信: WebSocket
状态管理: Zustand / Redux Toolkit
```

### 项目结构
```
ra2-web/
├── src/
│   ├── engine/          # 游戏引擎核心
│   │   ├── gfx/         # WebGL渲染系统
│   │   ├── sound/       # 音频系统
│   │   ├── renderable/  # 可渲染对象
│   │   └── gameRes/     # 资源管理
│   ├── gui/             # 用户界面
│   │   ├── screen/      # 游戏屏幕
│   │   ├── component/   # React组件
│   │   └── jsx/         # 自定义JSX渲染器
│   ├── data/            # 数据处理
│   │   ├── vfs/         # 虚拟文件系统
│   │   ├── encoding/    # 编码解析
│   │   └── map/         # 地图数据
│   ├── game/            # 游戏逻辑
│   │   ├── gameobject/  # 游戏对象
│   │   ├── event/       # 事件系统
│   │   ├── trigger/     # 触发器
│   │   └── trait/       # 特性系统
│   ├── network/         # 网络系统
│   ├── parser/          # 文件格式解析器
│   └── util/            # 工具函数
├── public/
│   └── assets/          # 静态资源
└── docs/                # 文档
```

---

## 📦 支持的文件格式

### 资源文件
| 格式 | 说明 | 状态 |
|------|------|------|
| .MIX | 游戏资源包 | ✅ 需实现 |
| .SHP | 精灵图/单位动画 | ✅ 需实现 |
| .VXL | 3D体素模型 | ✅ 需实现 |
| .HVA | 模型动画数据 | ✅ 需实现 |
| .TMP | 地形贴图 | ✅ 需实现 |
| .PCX | 图片格式 | ✅ 需实现 |
| .WAV | 音频 | ✅ 需实现 |
| .AUD | 压缩音频 | ✅ 需实现 |
| .INI | 配置文件 | ✅ 需实现 |
| .MAP | 地图文件 | ✅ 需实现 |

### 编码格式
- Blowfish 加密
- Format80 压缩
- Format5 压缩
- Mini-LZO 压缩

---

## 🔧 资源提取方案

### 工具推荐

#### 1. XCC Mixer (Windows)
- 经典的C&C资源管理工具
- 支持打开MIX文件、提取SHP/VXL等资源
- 下载: 搜索 "XCC Mixer Red Alert 2"

#### 2. OS Big Editor
- 支持打开.meg文件(重制版格式)
- 支持批量提取资源
- 下载: https://www.ppmsite.com/osbigeditorinfo/

#### 3. Bibber's C&C Asset Extractor
- 支持RA3/Uprising资源提取
- 支持转换为可用格式
- 下载: http://bibber.eu/downloads/cnc-asset-extractor/get

### 提取流程
1. 获取红警2游戏文件(ra2.mix, ra2md.mix等)
2. 使用XCC Mixer打开MIX文件
3. 提取SHP/VXL/WAV等资源
4. 转换为Web可用格式(PNG/WebP/MP3)

---

## 🎮 核心功能模块

### 1. 渲染引擎 (engine/gfx)
- 等距视角相机
- Sprite批处理渲染
- 体素模型渲染(VXL)
- 地形渲染(TMP)
- 阴影和光照
- 粒子效果

### 2. 音频系统 (engine/sound)
- Web Audio API封装
- 多通道音量控制
- 音频混合器
- 音效播放
- 背景音乐

### 3. 游戏逻辑 (game/)
- 单位系统
- 建筑系统
- 科技树
- 经济系统(矿石/金钱)
- 战争迷雾
- AI系统

### 4. 地图系统 (data/map)
- 地图解析
- 地形渲染
- 触发器系统
- 路径寻路(A*)

### 5. 网络系统 (network)
- WebSocket连接
- 房间系统
- 同步机制
- 回放系统

---

## 📚 学习资源

### 文件格式文档
- **ModEnc**: https://modenc.renegadeprojects.com/
  - 红警2文件格式详细文档
  - MIX, SHP, VXL等格式说明

- **C&C Modding Wiki**: 
  - 资源格式规范
  - 编程参考

### 开源项目参考
1. **Chrono Divide** - Web实现参考
2. **OpenRA** - 游戏引擎架构参考
3. **RA2Web React** - TypeScript实现参考

---

## ⚠️ 法律声明

- 红色警戒2是EA公司的知识产权
- 本项目仅用于学习研究目的
- 用户需要拥有合法的游戏副本才能使用原版资源
- 不得用于商业用途

---

## 🚀 开发路线图

### 第一阶段: 基础架构 (2-3周)
- [ ] 项目搭建 (Vite + React + TS)
- [ ] 文件系统API封装
- [ ] MIX文件解析器
- [ ] 基础渲染引擎

### 第二阶段: 资源系统 (3-4周)
- [ ] SHP文件解析和渲染
- [ ] VXL/HVA模型渲染
- [ ] TMP地形渲染
- [ ] 音频系统

### 第三阶段: 游戏逻辑 (4-6周)
- [ ] 单位系统
- [ ] 建筑系统
- [ ] 地图系统
- [ ] 基础AI

### 第四阶段: 完善功能 (4-6周)
- [ ] 完整游戏机制
- [ ] 战役模式
- [ ] 多人对战
- [ ] 优化和测试

---

## 🔗 相关链接

- Chrono Divide: https://chronodivide.com/
- OpenRA: https://www.openra.net/
- ModEnc Wiki: https://modenc.renegadeprojects.com/
- PPM Forums: https://ppmforums.com/
