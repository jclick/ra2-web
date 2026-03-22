#!/usr/bin/env python3
"""
红警2资源下载器
尝试从多个源下载演示版资源
"""

import os
import sys
import zipfile
import urllib.request
import urllib.error
import ssl
from pathlib import Path

# 下载源列表 (按优先级排序)
MIRRORS = [
    {
        "name": "Internet Archive",
        "url": "https://archive.org/download/CnC-RedAlert2Demo/RA2Demo.zip",
        "filename": "RA2Demo.zip"
    },
    {
        "name": "Archive.org (备用)",
        "url": "https://archive.org/download/RedAlert2Demo/RA2Demo.zip",
        "filename": "RA2Demo.zip"
    },
]

# 测试用的小型资源
TEST_RESOURCES = {
    "unittem.pal": {
        "url": None,  # 本地生成
        "description": "温带调色板"
    }
}

class ResourceDownloader:
    def __init__(self, output_dir="./public/assets"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.temp_dir = Path("./temp")
        self.temp_dir.mkdir(exist_ok=True)
        
        # 创建SSL上下文
        self.ssl_ctx = ssl.create_default_context()
        self.ssl_ctx.check_hostname = False
        self.ssl_ctx.verify_mode = ssl.CERT_NONE
        
    def download_with_progress(self, url, output_path):
        """带进度显示的下载"""
        try:
            print(f"正在连接: {url}")
            
            # 打开连接
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            
            with urllib.request.urlopen(req, context=self.ssl_ctx, timeout=300) as response:
                total_size = int(response.headers.get('Content-Length', 0))
                
                if total_size == 0:
                    print("警告: 无法获取文件大小")
                    total_size = None
                else:
                    print(f"文件大小: {total_size / 1024 / 1024:.1f} MB")
                
                # 下载数据
                downloaded = 0
                block_size = 8192
                
                with open(output_path, 'wb') as f:
                    while True:
                        chunk = response.read(block_size)
                        if not chunk:
                            break
                        
                        f.write(chunk)
                        downloaded += len(chunk)
                        
                        if total_size:
                            percent = (downloaded / total_size) * 100
                            bar_length = 40
                            filled = int(bar_length * downloaded / total_size)
                            bar = '█' * filled + '░' * (bar_length - filled)
                            print(f"\r[{bar}] {percent:.1f}% ({downloaded/1024/1024:.1f} MB)", end='', flush=True)
                        else:
                            print(f"\r已下载: {downloaded/1024/1024:.1f} MB", end='', flush=True)
                
                print()  # 换行
                return True
                
        except Exception as e:
            print(f"\n下载失败: {e}")
            return False
    
    def extract_mix_files(self, zip_path, extract_dir):
        """从zip中提取MIX文件"""
        print(f"\n解压文件: {zip_path}")
        
        try:
            with zipfile.ZipFile(zip_path, 'r') as zf:
                mix_files = [f for f in zf.namelist() if f.lower().endswith('.mix')]
                
                if not mix_files:
                    print("未在压缩包中找到MIX文件")
                    return []
                
                print(f"找到 {len(mix_files)} 个MIX文件")
                
                extracted = []
                for mix_file in mix_files:
                    print(f"  提取: {mix_file}")
                    zf.extract(mix_file, extract_dir)
                    extracted.append(Path(extract_dir) / mix_file)
                
                return extracted
                
        except Exception as e:
            print(f"解压失败: {e}")
            return []
    
    def generate_test_palette(self):
        """生成测试调色板"""
        palette_dir = self.output_dir / "palettes"
        palette_dir.mkdir(exist_ok=True)
        
        # 标准VGA调色板
        palette = bytearray()
        
        # 前16色是标准VGA颜色
        vga_colors = [
            (0, 0, 0), (0, 0, 170), (0, 170, 0), (0, 170, 170),
            (170, 0, 0), (170, 0, 170), (170, 85, 0), (170, 170, 170),
            (85, 85, 85), (85, 85, 255), (85, 255, 85), (85, 255, 255),
            (255, 85, 85), (255, 85, 255), (255, 255, 85), (255, 255, 255)
        ]
        
        for r, g, b in vga_colors:
            palette.extend([r, g, b])
        
        # 剩余颜色使用渐变
        for i in range(16, 256):
            gray = int((i - 16) * 255 / 239)
            palette.extend([gray, gray, gray])
        
        # 保存调色板
        for name in ["unittem.pal", "unitsno.pal", "uniturb.pal"]:
            with open(palette_dir / name, 'wb') as f:
                f.write(palette)
        
        print("已生成测试调色板")
        return True
    
    def download_demo(self):
        """下载演示版资源"""
        print("="*60)
        print("红色警戒2 Web版 - 资源下载器")
        print("="*60)
        print()
        
        # 首先生成测试资源
        print("步骤 1/3: 生成测试调色板")
        self.generate_test_palette()
        print()
        
        # 尝试从各个镜像下载
        zip_path = self.temp_dir / "RA2Demo.zip"
        
        for mirror in MIRRORS:
            print(f"步骤 2/3: 尝试从 {mirror['name']} 下载")
            print("-"*60)
            
            if self.download_with_progress(mirror['url'], zip_path):
                print("下载成功!")
                break
            else:
                print(f"{mirror['name']} 下载失败，尝试下一个源...")
        else:
            print("所有下载源都失败了")
            print()
            print("可能原因:")
            print("  - 网络连接问题")
            print("  - 防火墙限制")
            print("  - 下载源不可用")
            print()
            print("请手动下载资源，参考 docs/RESOURCES.md")
            return False
        
        print()
        print("步骤 3/3: 提取资源")
        print("-"*60)
        
        # 提取MIX文件
        extracted = self.extract_mix_files(zip_path, self.temp_dir / "extracted")
        
        if extracted:
            print(f"\n将MIX文件复制到 {self.output_dir}")
            for mix_file in extracted:
                dest = self.output_dir / mix_file.name
                shutil.copy2(mix_file, dest)
                print(f"  已复制: {mix_file.name}")
        
        # 清理临时文件
        print("\n清理临时文件...")
        shutil.rmtree(self.temp_dir, ignore_errors=True)
        
        print()
        print("="*60)
        print("完成!")
        print("="*60)
        print()
        print(f"资源已保存到: {self.output_dir}")
        print()
        print("文件列表:")
        for f in self.output_dir.iterdir():
            if f.is_file():
                size = f.stat().st_size / 1024 / 1024
                print(f"  {f.name:30} {size:>8.1f} MB")
            elif f.is_dir():
                files = list(f.iterdir())
                print(f"  {f.name:30} ({len(files)} 个文件)")
        print()
        
        return True

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='红警2资源下载器')
    parser.add_argument('--output', '-o', default='./public/assets',
                       help='输出目录')
    
    args = parser.parse_args()
    
    downloader = ResourceDownloader(args.output)
    
    try:
        success = downloader.download_demo()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n用户取消")
        sys.exit(1)

if __name__ == '__main__':
    main()
