#!/usr/bin/env python3
"""
GitHub 自动推送脚本
将生成的复盘报告 push 到远程仓库
"""

import argparse
import subprocess
import sys
import os
from datetime import datetime
from pathlib import Path


def run_git_command(cmd, cwd=None):
    """运行 git 命令"""
    try:
        result = subprocess.run(
            cmd, 
            shell=True, 
            cwd=cwd, 
            capture_output=True, 
            text=True,
            check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Git command failed: {e}")
        print(f"stderr: {e.stderr}")
        return None


def check_git_repo(repo_path):
    """检查是否为 git 仓库"""
    git_dir = Path(repo_path) / ".git"
    if not git_dir.exists():
        print(f"Error: {repo_path} is not a git repository")
        return False
    return True


def has_changes(repo_path):
    """检查是否有未提交的更改"""
    output = run_git_command("git status --porcelain", cwd=repo_path)
    if output is None:
        return False
    return len(output) > 0


def push_to_github(repo_path, date_str, commit_msg=None):
    """Push 到 GitHub"""
    if not check_git_repo(repo_path):
        return 1
    
    # 检查是否有更改
    if not has_changes(repo_path):
        print("No changes to commit")
        return 0
    
    # 配置 git（如果没有配置）
    email = run_git_command("git config user.email", cwd=repo_path)
    if not email:
        run_git_command('git config user.email "bot@openclaw.ai"', cwd=repo_path)
        run_git_command('git config user.name "OpenClaw Bot"', cwd=repo_path)
    
    # 添加所有更改
    print("Adding changes...")
    result = run_git_command("git add .", cwd=repo_path)
    if result is None:
        return 1
    
    # 提交
    if commit_msg is None:
        commit_msg = f"Add daily stock review for {date_str}"
    
    print(f"Committing: {commit_msg}")
    result = run_git_command(f'git commit -m "{commit_msg}"', cwd=repo_path)
    if result is None:
        return 1
    
    # Push
    print("Pushing to remote...")
    result = run_git_command("git push origin main", cwd=repo_path)
    if result is None:
        # 尝试 master 分支
        result = run_git_command("git push origin master", cwd=repo_path)
        if result is None:
            return 1
    
    print("✓ Successfully pushed to GitHub")
    return 0


def main():
    parser = argparse.ArgumentParser(description="Push daily stock review to GitHub")
    parser.add_argument("--date", type=str, required=True, help="Date in YYYY-MM-DD format")
    parser.add_argument("--repo", type=str, default="stock-review", 
                        help="Path to git repository")
    parser.add_argument("--message", type=str, help="Custom commit message")
    args = parser.parse_args()
    
    # 获取仓库绝对路径
    repo_path = Path(args.repo).resolve()
    
    if not repo_path.exists():
        print(f"Error: Repository path does not exist: {repo_path}")
        return 1
    
    print(f"Pushing changes from {repo_path}...")
    return push_to_github(repo_path, args.date, args.message)


if __name__ == "__main__":
    sys.exit(main())
