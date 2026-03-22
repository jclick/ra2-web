#!/bin/bash
# 下载红警2资源脚本
# 注意：这些资源来自 OpenRA 或其他开源项目，仅供学习研究使用

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ASSETS_DIR="$SCRIPT_DIR/../public/assets"

echo "=========================================="
echo "  红警2 Web版 - 资源获取脚本"
echo "=========================================="
echo ""

# 创建目录
mkdir -p "$ASSETS_DIR"/{shp,vxl,tmp,audio,maps,palettes}

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印信息
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 下载函数
download_file() {
    local url=$1
    local output=$2
    
    if [ -f "$output" ]; then
        warn "文件已存在: $(basename "$output")"
        return 0
    fi
    
    info "下载: $(basename "$output")"
    curl -L -o "$output" "$url" --progress-bar || {
        error "下载失败: $url"
        return 1
    }
}

# 从 OpenRA 资源镜像下载
# OpenRA 是开源的红警重制项目，资源可供学习使用
OPENRA_MIRROR="https://github.com/OpenRA/ra2/archive/refs/heads"

echo "步骤 1/3: 检查依赖"
if ! command -v curl >/dev/null 2>&1; then
    error "需要安装 curl"
    exit 1
fi

if ! command -v unzip >/dev/null 2>&1; then
    error "需要安装 unzip"
    exit 1
fi

info "依赖检查通过"
echo ""

echo "步骤 2/3: 下载示例资源"

# 下载示例调色板
cat > "$ASSETS_DIR/palettes/unittem.pal" << 'PALETTE_DATA'
# 这是示例调色板数据
# 实际游戏需要 768 字节 (256色 * 3 RGB)
PALETTE_DATA

info "创建了示例调色板文件"

# 尝试从 Internet Archive 下载演示资源
# 这些是 abandonware 或演示版资源
IA_URL="https://archive.org/download/CnC-RedAlert2Demo/RA2Demo.zip"

if [ ! -f "$ASSETS_DIR/../RA2Demo.zip" ]; then
    warn "正在从 Internet Archive 下载红警2演示版..."
    warn "这可能需要几分钟时间"
    
    curl -L -o "$ASSETS_DIR/../RA2Demo.zip" "$IA_URL" --progress-bar 2>&1 || {
        warn "下载演示版失败，将使用占位资源"
    }
fi

# 解压演示版资源
if [ -f "$ASSETS_DIR/../RA2Demo.zip" ]; then
    info "解压演示版资源..."
    unzip -o "$ASSETS_DIR/../RA2Demo.zip" -d "$ASSETS_DIR/../demo_temp" 2>&1 || true
    
    # 移动 MIX 文件
    find "$ASSETS_DIR/../demo_temp" -name "*.mix" -exec cp {} "$ASSETS_DIR/" \; 2>&1 || true
    
    # 清理临时文件
    rm -rf "$ASSETS_DIR/../demo_temp"
    
    info "演示版资源解压完成"
fi

echo ""
echo "步骤 3/3: 创建占位资源"

# 创建占位 SHP 文件
for unit in "gi" "e1" "htnk" "mtnk"; do
    touch "$ASSETS_DIR/shp/$unit.shp"
done

# 创建占位调色板
python3 << 'PYTHON_SCRIPT'
import os

palette_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../public/assets/palettes')
os.makedirs(palette_dir, exist_ok=True)

# 创建一个标准的 VGA 调色板 (256色)
palette = bytearray()

# 前 16 色是标准 VGA 颜色
vga_colors = [
    (0, 0, 0),       # 0: 黑
    (0, 0, 170),     # 1: 蓝
    (0, 170, 0),     # 2: 绿
    (0, 170, 170),   # 3: 青
    (170, 0, 0),     # 4: 红
    (170, 0, 170),   # 5: 紫
    (170, 85, 0),    # 6: 棕
    (170, 170, 170), # 7: 灰
    (85, 85, 85),    # 8: 深灰
    (85, 85, 255),   # 9: 亮蓝
    (85, 255, 85),   # 10: 亮绿
    (85, 255, 255),  # 11: 亮青
    (255, 85, 85),   # 12: 亮红
    (255, 85, 255),  # 13: 亮紫
    (255, 255, 85),  # 14: 黄
    (255, 255, 255), # 15: 白
]

for r, g, b in vga_colors:
    palette.extend([r, g, b])

# 填充剩余颜色 (16-255)
for i in range(16, 256):
    # 简单的渐变
    gray = i
    palette.extend([gray, gray, gray])

# 确保是 768 字节
while len(palette) < 768:
    palette.append(0)

# 保存调色板
with open(os.path.join(palette_dir, 'unittem.pal'), 'wb') as f:
    f.write(palette[:768])

with open(os.path.join(palette_dir, 'unitsno.pal'), 'wb') as f:
    f.write(palette[:768])

with open(os.path.join(palette_dir, 'uniturb.pal'), 'wb') as f:
    f.write(palette[:768])

print("创建了标准调色板文件")
PYTHON_SCRIPT

echo ""
echo "=========================================="
echo "  资源获取完成"
echo "=========================================="
echo ""
echo "资源位置: $ASSETS_DIR"
echo ""
echo "目录结构:"
find "$ASSETS_DIR" -type f | head -20 || echo "  (空)"
echo ""
echo "提示:"
echo "  1. 如果你有原版红警2，可以将 .mix 文件复制到:"
echo "     $ASSETS_DIR/"
echo ""
echo "  2. 需要的主要文件:"
echo "     - ra2.mix (主要资源)"
echo "     - language.mix (本地化)"
echo "     - theme.mix (主题音乐)"
echo ""
echo "  3. 调色板文件已创建，可直接使用"
echo ""
