"""
历史模拟器 -- 人物日期校验 (timeline-check.py)

Phase 3 附带检查：所有人物 knowledge_boundary 不超过 start_date，死亡人物无 active 行为。

用法:
  python scripts/timeline-check.py --sim-dir chongzhen-1643
  python scripts/timeline-check.py --data-dir chongzhen-1643/data --start-date 1643-01-01

依赖: Python 3.8+，无外部依赖
"""

import json
import re
import sys
from pathlib import Path
from typing import Dict, List


def read_file(path: str) -> str:
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()


def read_json(path: str):
    if not Path(path).exists():
        return None
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def extract_date_field(data: dict, field: str) -> str:
    """提取日期字段，支持多种格式"""
    val = data.get(field, '')
    if isinstance(val, str):
        return val.strip()
    return str(val)


def compare_dates(date_a: str, date_b: str) -> int:
    """比较两个日期字符串。返回 -1/0/1"""
    # 尝试 YYYY-MM 格式
    def normalize(d):
        m = re.match(r'(\d{4})-(\d{2})', d)
        if m:
            return int(m.group(1)) * 12 + int(m.group(2))
        return 0

    a = normalize(date_a)
    b = normalize(date_b)

    if a < b: return -1
    if a > b: return 1
    return 0


def main():
    import argparse

    parser = argparse.ArgumentParser(description='人物日期校验')
    parser.add_argument('--sim-dir', help='模拟器目录')
    parser.add_argument('--data-dir', help='数据目录')
    parser.add_argument('--start-date', help='模拟器起始日期 (YYYY-MM)')

    args = parser.parse_args()

    # 确定路径
    if args.sim_dir:
        data_dir = Path(args.sim_dir) / 'data'
        state_path = Path(args.sim_dir) / 'state.json'
    elif args.data_dir:
        data_dir = Path(args.data_dir)
        state_path = None
    else:
        print('[ERROR] 需要指定 --sim-dir 或 --data-dir')
        sys.exit(1)

    # 确定起始日期
    start_date = args.start_date
    if not start_date and state_path and state_path.exists():
        state = read_json(str(state_path))
        if state:
            start_date = state.get('meta', {}).get('current_date', '')

    if not start_date:
        print('[ERROR] 无法确定起始日期')
        sys.exit(1)

    print(f'[INFO] 人物日期校验启动')
    print(f'  数据目录: {data_dir}')
    print(f'  起始日期: {start_date}')

    # 读取人物数据
    person_dir = data_dir / 'raw' / 'person'
    if not person_dir.exists():
        person_dir = data_dir / 'distilled' / 'person'

    if not person_dir.exists():
        print('[WARNING] 人物数据目录不存在')
        sys.exit(0)

    issues = []

    for person_file in sorted(person_dir.glob('*.json')):
        person_data = read_json(str(person_file))
        if not person_data:
            continue

        name = person_data.get('entity_name', person_file.stem)

        # 检查1: knowledge_boundary
        knowledge_boundary = extract_date_field(person_data, 'knowledge_boundary')
        if knowledge_boundary and start_date:
            cmp = compare_dates(knowledge_boundary, start_date)
            if cmp > 0:
                issues.append({
                    'type': 'knowledge_boundary_exceeded',
                    'person': name,
                    'detail': f'知识边界 {knowledge_boundary} 超过起始日期 {start_date}',
                    'file': str(person_file),
                })

        # 检查2: 死亡人物无 active 行为
        death_date = extract_date_field(person_data, 'death_date')
        if death_date and start_date:
            cmp = compare_dates(death_date, start_date)
            if cmp < 0:  # 死于模拟开始前
                # 检查是否有 active 状态
                lifecycle = person_data.get('lifecycle_state', '')
                status = person_data.get('status', '')
                if lifecycle == 'active' or status == 'active':
                    issues.append({
                        'type': 'dead_person_active',
                        'person': name,
                        'detail': f'已死亡 ({death_date}) 但状态为 active',
                        'file': str(person_file),
                    })

    # 输出结果
    if issues:
        print(f'\n[FAIL] 发现 {len(issues)} 个问题:')
        for issue in issues:
            print(f'  [{issue["type"]}] {issue["person"]}: {issue["detail"]}')
        sys.exit(1)
    else:
        print(f'\n[PASS] 所有人物日期校验通过')
        sys.exit(0)


if __name__ == '__main__':
    main()
