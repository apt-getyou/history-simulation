"""
历史模拟器 -- 安装自动化 (installer.py)

覆盖 Phase 8: 安装和报告自动化。

用法:
  python scripts/installer.py --sim-dir chongzhen-1643
  python scripts/installer.py --sim-dir chongzhen-1643 --target claude

处理:
  - 检测 .claude/ / .cursor/ / .windsurf/ 目录
  - 读取 driver-skill.md，写入相应 skill 目录
  - 统计：文件数 / 人物数 / 事件数 / 区域数 / 物产数
  - 生成交付报告数据部分

依赖: Python 3.8+，无外部依赖
"""

import json
import os
import re
import shutil
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional


def read_file(path: str) -> str:
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()


def read_json(path: str):
    if not Path(path).exists():
        return None
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def count_files(directory: Path, pattern: str = '**/*') -> int:
    """计算目录中匹配模式的文件数"""
    return len([f for f in directory.glob(pattern) if f.is_file()])


def count_md_items(directory: Path, header_prefix: str) -> int:
    """计算 Markdown 文件中以某前缀开头的条目数"""
    count = 0
    for f in directory.glob('**/*.md'):
        content = read_file(str(f))
        for line in content.split('\n'):
            stripped = line.strip()
            if stripped.startswith('|') and not stripped.startswith('|--') and not stripped.startswith('| #'):
                if stripped != '| 姓名 |' and stripped != '|------|':
                    count += 1
    return count


def count_yaml_items(directory: Path) -> int:
    """计算 YAML 事件卡片数"""
    if not directory.exists():
        return 0
    return len(list(directory.glob('EVT-*.yaml')))


def detect_targets() -> list:
    """检测可用的 AI agent 目标"""
    targets = []

    home = Path.home()

    # Claude Code
    claude_dir = home / '.claude' / 'skills'
    if claude_dir.exists() or (home / '.claude').exists():
        targets.append({
            'name': 'claude',
            'dir': str(claude_dir),
            'ext': '.md',
        })

    # Cursor
    cursor_dir = Path.cwd() / '.cursor' / 'commands'
    if (Path.cwd() / '.cursor').exists():
        targets.append({
            'name': 'cursor',
            'dir': str(cursor_dir),
            'ext': '.md',
        })

    # Windsurf
    windsurf_dir = Path.cwd() / '.windsurf' / 'rules'
    if (Path.cwd() / '.windsurf').exists():
        targets.append({
            'name': 'windsurf',
            'dir': str(windsurf_dir),
            'ext': '.md',
        })

    return targets


def install_skill(sim_dir: Path, target: Dict, dry_run: bool = False):
    """安装 driver skill 到目标"""
    driver_path = sim_dir / 'data' / 'driver-skill.md'
    if not driver_path.exists():
        print(f'  [跳过] driver-skill.md 不存在')
        return False

    content = read_file(str(driver_path))

    # 修正路径变量
    abs_sim_dir = sim_dir.resolve()
    content = content.replace('./{sim-slug}', str(abs_sim_dir))
    content = content.replace('./{sim_slug}', str(abs_sim_dir))

    target_dir = Path(target['dir'])
    target_file = target_dir / f'{sim_dir.name}{target["ext"]}'

    if dry_run:
        print(f'  [干跑] 将写入: {target_file}')
        return True

    target_dir.mkdir(parents=True, exist_ok=True)
    with open(str(target_file), 'w', encoding='utf-8') as f:
        f.write(content)

    print(f'  [安装] {target["name"]}: {target_file}')
    return True


def collect_stats(sim_dir: Path) -> Dict:
    """收集模拟器统计信息"""
    stats = {
        'total_files': count_files(sim_dir),
        'references_files': count_files(sim_dir / 'references') if (sim_dir / 'references').exists() else 0,
        'record_files': count_files(sim_dir / 'records') if (sim_dir / 'records').exists() else 0,
        'character_files': count_files(sim_dir / 'characters' / 'active') if (sim_dir / 'characters' / 'active').exists() else 0,
        'event_count': count_yaml_items(sim_dir / 'data' / 'distilled' / 'event-cards'),
    }

    # 从 state.json 提取统计
    state = read_json(str(sim_dir / 'state.json'))
    if state:
        stats['character_count'] = len(state.get('characters', []))
        stats['faction_count'] = len(state.get('factions', []))
        stats['region_count'] = len(state.get('territory', {}).get('regions', []))
        stats['turn_count'] = state.get('meta', {}).get('current_turn', 0)
        stats['crop_count'] = len(state.get('world_crops', {}).get('available_crops', []))

    return stats


def generate_report(sim_dir: Path, stats: Dict, installed_targets: list) -> str:
    """生成交付报告"""
    lines = [
        '# 交付报告',
        '',
        f'生成时间: {datetime.now().isoformat()}',
        f'模拟器目录: {sim_dir}',
        '',
        '## 文件统计',
        '',
        f'| 项目 | 数量 |',
        f'|------|------|',
        f'| 总文件数 | {stats.get("total_files", 0)} |',
        f'| 规则文件 | {stats.get("references_files", 0)} |',
        f'| 记录文件 | {stats.get("record_files", 0)} |',
        f'| 人物卡 | {stats.get("character_files", 0)} |',
        f'| 事件数 | {stats.get("event_count", 0)} |',
        f'| 活跃人物 | {stats.get("character_count", 0)} |',
        f'| 势力数 | {stats.get("faction_count", 0)} |',
        f'| 区域数 | {stats.get("region_count", 0)} |',
        f'| 可用作物 | {stats.get("crop_count", 0)} |',
        f'| 已玩回合 | {stats.get("turn_count", 0)} |',
        '',
        '## 安装目标',
        '',
    ]

    if installed_targets:
        for t in installed_targets:
            lines.append(f'- {t}')
    else:
        lines.append('- 未安装到任何目标')

    return '\n'.join(lines)


def main():
    import argparse

    parser = argparse.ArgumentParser(description='历史模拟器安装器')
    parser.add_argument('--sim-dir', required=True, help='模拟器目录')
    parser.add_argument('--target', choices=['claude', 'cursor', 'windsurf', 'all'],
                        default='all', help='安装目标')
    parser.add_argument('--dry-run', action='store_true', help='只输出，不写入')
    parser.add_argument('--report', help='输出报告文件路径')

    args = parser.parse_args()

    sim_dir = Path(args.sim_dir)
    if not sim_dir.exists():
        print(f'[ERROR] 目录不存在: {sim_dir}')
        sys.exit(1)

    print(f'[INFO] 安装器启动: {sim_dir}')

    # 收集统计
    stats = collect_stats(sim_dir)
    print(f'[INFO] 统计: {stats.get("total_files", 0)} 文件, {stats.get("event_count", 0)} 事件')

    # 检测目标
    targets = detect_targets()
    if args.target != 'all':
        targets = [t for t in targets if t['name'] == args.target]

    print(f'[INFO] 可用目标: {[t["name"] for t in targets]}')

    # 安装
    installed = []
    for target in targets:
        if install_skill(sim_dir, target, args.dry_run):
            installed.append(target['name'])

    # 生成报告
    report = generate_report(sim_dir, stats, installed)

    if args.report:
        with open(args.report, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f'[INFO] 报告已写入: {args.report}')
    else:
        print('\n' + report)


if __name__ == '__main__':
    main()
