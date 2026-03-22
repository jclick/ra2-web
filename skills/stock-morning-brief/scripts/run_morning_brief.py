#!/usr/bin/env python3
"""
早间资讯简报主运行脚本
整合数据获取和报告生成
"""

import subprocess
import sys
import os
from datetime import datetime

def run_command(cmd, description):
    """运行命令并打印输出"""
    print(f"\n{'='*60}")
    print(f"【{description}】")
    print('='*60)
    
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print("错误:", result.stderr, file=sys.stderr)
    return result.returncode == 0

def main():
    """主函数"""
    date_str = datetime.now().strftime("%Y-%m-%d")
    
    print("="*60)
    print(f"  早间金融资讯简报生成 - {date_str}")
    print("="*60)
    
    script_dir = "/root/.openclaw/workspace/skills/stock-morning-brief/scripts"
    
    # 步骤1: 获取市场数据
    if not run_command(f"cd {script_dir} && python3 fetch_market_data.py", "获取全球市场数据"):
        print("警告: 市场数据获取部分失败，继续生成报告...")
    
    # 步骤2: 搜索热点资讯（记录搜索主题）
    run_command(f"cd {script_dir} && python3 search_news.py", "记录资讯搜索主题")
    
    # 步骤3: 生成简报
    if run_command(f"cd {script_dir} && python3 generate_brief.py", "生成资讯简报"):
        output_file = f"/root/.openclaw/workspace/stock-review/morning-brief/{date_str}_早间资讯.md"
        print(f"\n✅ 简报生成成功!")
        print(f"📄 文件位置: {output_file}")
        
        # 读取并显示报告
        if os.path.exists(output_file):
            with open(output_file, 'r', encoding='utf-8') as f:
                content = f.read()
            print(f"\n{'='*60}")
            print("报告预览:")
            print('='*60)
            print(content[:2000] + "..." if len(content) > 2000 else content)
    else:
        print("❌ 简报生成失败")
        sys.exit(1)

if __name__ == "__main__":
    main()
