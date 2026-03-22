#!/bin/bash
# 资源检查和准备脚本

echo "=========================================="
echo "红色警戒2 Web版 - 资源检查"
echo "=========================================="
echo ""

ASSETS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../public/assets" && pwd)"

echo "资源目录: $ASSETS_DIR"
echo ""

# 检查调色板
echo "✓ 调色板文件:"
for pal in unittem.pal unitsno.pal uniturb.pal; do
    if [ -f "$ASSETS_DIR/palettes/$pal" ]; then
        size=$(stat -f%z "$ASSETS_DIR/palettes/$pal" 2>/dev/null || stat -c%s "$ASSETS_DIR/palettes/$pal" 2>/dev/null)
        echo "  ✓ $pal (${size} 字节)"
    else
        echo "  ✗ $pal (缺失)"
    fi
done
echo ""

# 检查MIX文件
echo "✓ MIX资源文件:"
mix_count=$(find "$ASSETS_DIR" -name "*.mix" -type f 2>/dev/null | wc -l)
if [ "$mix_count" -gt 0 ]; then
    echo "  找到 $mix_count 个MIX文件:"
    find "$ASSETS_DIR" -name "*.mix" -type f -exec basename {} \; | sed 's/^/    - /'
else
    echo "  ✗ 未找到MIX文件"
    echo ""
    echo "  资源缺失! 游戏将以占位图形运行。"
    echo ""
    echo "  获取资源的选项:"
    echo "    1. 如果你有原版RA2:"
    echo "       python3 scripts/extract-assets.py --auto"
    echo ""
    echo "    2. 手动下载演示版:"
    echo "       浏览器访问: https://archive.org/download/CnC-RedAlert2Demo/RA2Demo.zip"
    echo "       解压后将 .mix 文件放入 $ASSETS_DIR"
    echo ""
    echo "    3. 使用OpenRA资源:"
    echo "       查看 docs/RESOURCES.md"
    echo ""
fi
echo ""

# 检查SHP缓存目录
echo "✓ SHP缓存: $(ls -1 $ASSETS_DIR/shp/ 2>/dev/null | wc -l) 个文件"
echo ""

# 启动建议
echo "=========================================="
echo "你可以现在启动游戏进行测试!"
echo "=========================================="
echo ""
echo "启动命令:"
echo "  npm run dev"
echo ""
echo "然后访问: http://localhost:4000"
echo ""
echo "注意: 没有MIX文件时游戏会使用占位图形显示"
echo ""
