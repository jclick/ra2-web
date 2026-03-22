#!/usr/bin/env python3
"""
红警2资源提取工具
帮助用户从本地游戏目录提取资源到项目
"""

import os
import sys
import shutil
import argparse
from pathlib import Path

def find_ra2_installation():
    """查找可能的RA2安装位置"""
    possible_paths = []
    
    # Windows 常见位置
    if sys.platform == 'win32':
        possible_paths.extend([
            r"C:\Program Files\EA Games\Command and Conquer Red Alert 2",
            r"C:\Program Files (x86)\EA Games\Command and Conquer Red Alert 2",
            r"C:\Program Files (x86)\Steam\steamapps\common\Command and Conquer Red Alert 2",
            r"C:\Games\RA2",
            r"D:\Games\RA2",
        ])
        
        # 检查注册表
        try:
            import winreg
            key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, 
                r"SOFTWARE\WOW6432Node\Electronic Arts\EA Games\Red Alert 2")
            install_path, _ = winreg.QueryValueEx(key, "InstallPath")
            possible_paths.insert(0, install_path)
        except:
            pass
    else:
        # Linux/macOS - 检查 Wine 安装
        home = Path.home()
        possible_paths.extend([
            home / ".wine/drive_c/Program Files/EA Games/Command and Conquer Red Alert 2",
            home / ".wine/drive_c/Games/RA2",
            "/mnt/c/Program Files/EA Games/Command and Conquer Red Alert 2",
        ])
    
    found = []
    for path in possible_paths:
        p = Path(path)
        if p.exists():
            mix_files = list(p.glob("*.mix"))
            if mix_files:
                found.append((p, mix_files))
    
    return found

def extract_resources(source_dir, output_dir):
    """从源目录提取资源"""
    source = Path(source_dir)
    output = Path(output_dir)
    
    # 确保输出目录存在
    output.mkdir(parents=True, exist_ok=True)
    
    # 需要复制的文件
    required_files = [
        "ra2.mix",
        "language.mix", 
        "theme.mix",
        "ra2md.mix",
    ]
    
    copied = []
    for filename in required_files:
        src_file = source / filename
        if src_file.exists():
            dst_file = output / filename
            print(f"复制: {filename} ({src_file.stat().st_size / 1024 / 1024:.1f} MB)")
            shutil.copy2(src_file, dst_file)
            copied.append(filename)
        else:
            print(f"跳过: {filename} (未找到)")
    
    # 同时查找并复制 PAL 文件
    pal_files = list(source.glob("*.pal"))
    pal_output = output / "palettes"
    pal_output.mkdir(exist_ok=True)
    
    for pal in pal_files:
        print(f"复制调色板: {pal.name}")
        shutil.copy2(pal, pal_output / pal.name)
        copied.append(f"palettes/{pal.name}")
    
    return copied

def main():
    parser = argparse.ArgumentParser(description='红警2资源提取工具')
    parser.add_argument('--source', '-s', help='RA2安装目录')
    parser.add_argument('--output', '-o', default='./public/assets', 
                       help='输出目录 (默认: ./public/assets)')
    parser.add_argument('--auto', '-a', action='store_true',
                       help='自动查找并提取')
    
    args = parser.parse_args()
    
    print("="*60)
    print("红色警戒2 Web版 - 资源提取工具")
    print("="*60)
    print()
    
    if args.auto:
        print("正在自动查找RA2安装...")
        found = find_ra2_installation()
        
        if not found:
            print("未找到RA2安装!")
            print()
            print("常见安装位置:")
            print("  - Windows: C:\\Program Files\\EA Games\\Command and Conquer Red Alert 2")
            print("  - Steam: C:\\Program Files (x86)\\Steam\\steamapps\\common\\Command and Conquer Red Alert 2")
            print("  - Wine: ~/.wine/drive_c/Program Files/EA Games/Command and Conquer Red Alert 2")
            print()
            print("请使用 --source 手动指定路径")
            return 1
        
        print(f"找到 {len(found)} 个可能的安装:")
        for i, (path, files) in enumerate(found, 1):
            print(f"  {i}. {path} ({len(files)} 个MIX文件)")
        
        # 使用第一个找到的
        source_dir = found[0][0]
        print(f"\n使用: {source_dir}")
    else:
        source_dir = args.source
        if not source_dir:
            print("请指定源目录: --source /path/to/ra2")
            print("或使用自动查找: --auto")
            return 1
    
    # 提取资源
    print(f"\n提取资源到: {args.output}")
    print("-"*60)
    
    copied = extract_resources(source_dir, args.output)
    
    print("-"*60)
    print(f"\n完成! 复制了 {len(copied)} 个文件")
    print()
    print("下一步:")
    print("  1. 运行 npm run dev 启动游戏")
    print("  2. 点击'开始游戏'导入资源")
    print()
    
    return 0

if __name__ == '__main__':
    sys.exit(main())
