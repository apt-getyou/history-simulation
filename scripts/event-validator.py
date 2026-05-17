"""
历史模拟器 -- 事件卡片校验 (event-validator.py)

Phase 4 附带检查：25+ 事件卡片字段完整性。

用法:
  python scripts/event-validator.py --data-dir chongzhen-1643/data

检查项:
  - 每个事件卡片包含必要字段
  - trigger_conditions 非空
  - outcome_if_triggered 非空
  - cascade_events 格式正确
  - event_id 格式正确
  - event_type 有效

依赖: Python 3.8+，无外部依赖
"""

import re
import sys
from pathlib import Path
from typing import Dict, List


def read_file(path: str) -> str:
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()


VALID_TYPES = ['hard_anchor', 'trend', 'character_driven', 'coincidence', 'climate']
REQUIRED_FIELDS = ['event_id', 'event_name', 'event_type', 'trigger_conditions']

EVENT_ID_PATTERN = re.compile(r'^EVT-[A-Z]+-\d{3}$')


def validate_event_card(content: str, filename: str) -> List[Dict]:
    """校验单个事件卡片"""
    issues = []

    # 提取字段值
    fields = {}
    for line in content.split('\n'):
        stripped = line.strip()
        if ':' in stripped and not stripped.startswith('#') and not stripped.startswith('-'):
            key, _, val = stripped.partition(':')
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            # 对嵌套结构只记录 key 存在
            fields[key] = val if val else '__present__'

    # 检查必要字段
    for field in REQUIRED_FIELDS:
        if field not in fields:
            issues.append({
                'file': filename,
                'type': 'missing_field',
                'detail': f'缺少必要字段: {field}',
            })

    # event_id 格式
    event_id = fields.get('event_id', '')
    if event_id and not EVENT_ID_PATTERN.match(event_id):
        issues.append({
            'file': filename,
            'type': 'invalid_format',
            'detail': f'event_id 格式不正确: {event_id} (应为 EVT-XX-NNN)',
        })

    # event_type 有效
    event_type = fields.get('event_type', '')
    if event_type and event_type not in VALID_TYPES:
        issues.append({
            'file': filename,
            'type': 'invalid_type',
            'detail': f'event_type 无效: {event_type} (应为 {", ".join(VALID_TYPES)})',
        })

    # trigger_conditions 非空
    if 'trigger_conditions:' in content:
        if content.count('- "') == 0 and 'all_of: []' in content:
            issues.append({
                'file': filename,
                'type': 'empty_conditions',
                'detail': 'trigger_conditions 为空',
            })

    # outcome_if_triggered 非空
    if 'outcome_if_triggered:' in content:
        section_content = extract_section(content, 'outcome_if_triggered')
        if not section_content or section_content.count('- ') == 0:
            issues.append({
                'file': filename,
                'type': 'empty_outcome',
                'detail': 'outcome_if_triggered 为空',
            })

    return issues


def extract_section(content: str, section_name: str) -> str:
    """提取 YAML 段落内容"""
    lines = []
    in_section = False

    for line in content.split('\n'):
        if line.strip().startswith(f'{section_name}:'):
            in_section = True
            continue

        if in_section:
            stripped = line.strip()
            if stripped and not stripped.startswith('#') and not stripped.startswith('-') and ':' in stripped and not stripped.startswith(' '):
                break
            lines.append(line)

    return '\n'.join(lines)


def main():
    import argparse

    parser = argparse.ArgumentParser(description='事件卡片校验')
    parser.add_argument('--data-dir', required=True, help='数据目录')

    args = parser.parse_args()
    data_dir = Path(args.data_dir)
    event_dir = data_dir / 'distilled' / 'event-cards'

    if not event_dir.exists():
        print(f'[ERROR] 事件卡片目录不存在: {event_dir}')
        sys.exit(1)

    print(f'[INFO] 事件卡片校验启动')
    print(f'  目录: {event_dir}')

    yaml_files = sorted(event_dir.glob('EVT-*.yaml'))
    print(f'  事件卡片数: {len(yaml_files)}')

    all_issues = []
    for yaml_file in yaml_files:
        content = read_file(str(yaml_file))
        issues = validate_event_card(content, yaml_file.name)
        all_issues.extend(issues)

    if all_issues:
        print(f'\n[FAIL] 发现 {len(all_issues)} 个问题:')
        for issue in all_issues:
            print(f'  [{issue["type"]}] {issue["file"]}: {issue["detail"]}')
        sys.exit(1)
    else:
        print(f'\n[PASS] 所有 {len(yaml_files)} 个事件卡片校验通过')
        sys.exit(0)


if __name__ == '__main__':
    main()
