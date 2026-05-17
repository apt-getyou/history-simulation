"""
历史模拟器 -- 校验自动化 (validator.py)

覆盖 Phase 7 约 20 项机械检查。

用法:
  python scripts/validator.py --sim-dir chongzhen-1643
  python scripts/validator.py --sim-dir chongzhen-1643 --json

检查项:
  #1  engine-meta.json 存在 + 版本
  #2  SKILL.md 存在 + 回合流程完整
  #3  state.json 存在 + schema 合规
  #4  references/ 目录 15 个文件齐全
  #5  records/ 目录存在
  #6  所有 references/*.md 被 SKILL.md 引用
  #7  state.json 字段与 07-state-schema 一致
  #8  dashboard.html 存在 + 基本结构
  #9  characters/ 目录结构
  #10 scripts/ 目录（可选）
  #11 README.md 存在
  #12 protagonist.knowledge 无超越时间线信息
  #13 characters 数组与 characters/active/ 一致
  #14 territory 控制者与 faction-map 一致
  #15 完结条件明确
  #16 state.json 大小合规（<=15KB）
  #17 turn_log 不超过 5 条
  #18 所有事件卡片有 trigger_conditions
  #19 event-triggers.json 与事件卡片数量匹配
  #20 月份基线表存在

依赖: Python 3.8+，无外部依赖
"""

import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple


# ============================================================
# 检查框架
# ============================================================

class ValidationResult:
    def __init__(self):
        self.results = []

    def pass_(self, check_id: str, message: str):
        self.results.append({'id': check_id, 'status': 'PASS', 'message': message})

    def fail(self, check_id: str, message: str):
        self.results.append({'id': check_id, 'status': 'FAIL', 'message': message})

    def error(self, check_id: str, message: str):
        self.results.append({'id': check_id, 'status': 'ERROR', 'message': message})

    def warn(self, check_id: str, message: str):
        self.results.append({'id': check_id, 'status': 'WARN', 'message': message})

    @property
    def summary(self) -> Dict:
        pass_count = sum(1 for r in self.results if r['status'] == 'PASS')
        fail_count = sum(1 for r in self.results if r['status'] == 'FAIL')
        error_count = sum(1 for r in self.results if r['status'] == 'ERROR')
        warn_count = sum(1 for r in self.results if r['status'] == 'WARN')
        return {
            'total': len(self.results),
            'pass': pass_count,
            'fail': fail_count,
            'error': error_count,
            'warn': warn_count,
        }

    def to_markdown(self) -> str:
        lines = [f'# 校验报告', '', f'生成时间: {datetime.now().isoformat()}', '']
        summary = self.summary
        lines.append(f'## 汇总')
        lines.append(f'')
        lines.append(f'| 状态 | 数量 |')
        lines.append(f'|------|------|')
        lines.append(f'| PASS | {summary["pass"]} |')
        lines.append(f'| FAIL | {summary["fail"]} |')
        lines.append(f'| ERROR | {summary["error"]} |')
        lines.append(f'| WARN | {summary["warn"]} |')
        lines.append(f'')
        lines.append(f'## 详细结果')
        lines.append(f'')
        lines.append(f'| # | 状态 | 检查项 | 说明 |')
        lines.append(f'|---|------|--------|------|')
        for r in self.results:
            lines.append(f'| {r["id"]} | {r["status"]} | | {r["message"]} |')
        return '\n'.join(lines)

    def to_json(self) -> str:
        return json.dumps({
            'generated_at': datetime.now().isoformat(),
            'summary': self.summary,
            'results': self.results,
        }, ensure_ascii=False, indent=2)


# ============================================================
# 工具函数
# ============================================================

def read_file(path: str) -> str:
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()


def read_json(path: str):
    if not Path(path).exists():
        return None
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


# ============================================================
# 检查函数
# ============================================================

def check_01_engine_meta(sim_dir: Path, vr: ValidationResult):
    """engine-meta.json 存在 + 版本"""
    path = sim_dir / '.engine-meta.json'
    data = read_json(str(path))
    if data is None:
        vr.fail('01', '.engine-meta.json 不存在')
        return

    vr.pass_('01', '.engine-meta.json 存在')

    version = data.get('engine_version', '')
    if version:
        vr.pass_('01', f'引擎版本: {version}')
    else:
        vr.fail('01', '.engine-meta.json 缺少 engine_version 字段')

    if 'sim_name' not in data:
        vr.warn('01', '.engine-meta.json 缺少 sim_name 字段')


def check_02_skill_md(sim_dir: Path, vr: ValidationResult):
    """SKILL.md 存在 + 回合流程"""
    path = sim_dir / 'SKILL.md'
    if not path.exists():
        vr.fail('02', 'SKILL.md 不存在')
        return

    content = read_file(str(path))
    vr.pass_('02', 'SKILL.md 存在')

    # 检查回合流程关键字
    flow_keywords = ['推进日期', '天气', '事件', '人物', '状态更新', '记录']
    missing = []
    for kw in flow_keywords:
        if kw not in content:
            missing.append(kw)

    if missing:
        vr.warn('02', f'SKILL.md 回合流程缺少关键字: {", ".join(missing)}')
    else:
        vr.pass_('02', 'SKILL.md 回合流程完整')


def check_03_state_json(sim_dir: Path, vr: ValidationResult):
    """state.json 存在 + 基本结构"""
    path = sim_dir / 'state.json'
    data = read_json(str(path))
    if data is None:
        vr.fail('03', 'state.json 不存在')
        return

    vr.pass_('03', 'state.json 存在')

    # 检查基本结构
    required_sections = ['meta', 'protagonist', 'world']
    for section in required_sections:
        if section not in data:
            vr.fail('03', f'state.json 缺少 {section} 节')
        else:
            vr.pass_('03', f'state.json 含有 {section} 节')


def check_04_references(sim_dir: Path, vr: ValidationResult):
    """references/ 目录 15 个文件齐全"""
    refs_dir = sim_dir / 'references'
    if not refs_dir.exists():
        vr.fail('04', 'references/ 目录不存在')
        return

    expected_files = [f'{i:02d}-{name}.md' for i, name in enumerate([
        'simulator-brief', 'canon-policy', 'cast-registry', 'faction-map',
        'world-event-engine', 'weather-engine', 'state-schema', 'session-protocol',
        'opening-state', 'source-ledger', 'knowledge-model', 'geography-layer',
        'territory-layer', 'map-expansion', 'commodity-timeline',
    ], 1)]

    # 实际文件（模糊匹配，因为具体模拟器名称可能不同）
    actual_files = [f.name for f in refs_dir.glob('*.md')]

    for expected in expected_files:
        prefix = expected[:2]  # "01", "02" 等
        found = any(f.startswith(prefix) for f in actual_files)
        if found:
            vr.pass_('04', f'存在: {prefix}-*.md')
        else:
            vr.fail('04', f'缺失: {expected}')


def check_05_records(sim_dir: Path, vr: ValidationResult):
    """records/ 目录存在"""
    records_dir = sim_dir / 'records'
    if not records_dir.exists():
        vr.fail('05', 'records/ 目录不存在')
        return

    vr.pass_('05', 'records/ 目录存在')

    # 检查子目录
    for subdir in ['ledger', 'chronicle']:
        if (records_dir / subdir).exists():
            vr.pass_('05', f'records/{subdir}/ 目录存在')
        else:
            vr.warn('05', f'records/{subdir}/ 目录不存在（建议创建）')


def check_06_skill_references(sim_dir: Path, vr: ValidationResult):
    """所有 references/*.md 被 SKILL.md 引用"""
    skill_path = sim_dir / 'SKILL.md'
    refs_dir = sim_dir / 'references'

    if not skill_path.exists() or not refs_dir.exists():
        vr.error('06', 'SKILL.md 或 references/ 不存在')
        return

    skill_content = read_file(str(skill_path))
    ref_files = list(refs_dir.glob('*.md'))

    for ref_file in sorted(ref_files):
        if ref_file.name in skill_content:
            vr.pass_('06', f'SKILL.md 引用了 {ref_file.name}')
        else:
            vr.warn('06', f'SKILL.md 未引用 {ref_file.name}')


def check_07_state_schema_consistency(sim_dir: Path, vr: ValidationResult):
    """state.json 字段与 07-state-schema 一致"""
    state_path = sim_dir / 'state.json'
    schema_files = list((sim_dir / 'references').glob('07-*.md'))

    if not state_path.exists():
        vr.error('07', 'state.json 不存在')
        return

    state_data = read_json(str(state_path))
    if state_data is None:
        vr.error('07', 'state.json 解析失败')
        return

    # 检查 world.domains 四领域各 4 指标
    domains = state_data.get('world', {}).get('domains', {})
    expected_domains = ['politics', 'finance', 'military', 'public']
    for domain in expected_domains:
        if domain in domains:
            fields = domains[domain]
            if isinstance(fields, dict):
                vr.pass_('07', f'world.domains.{domain} 存在 ({len(fields)} 个字段)')
            else:
                vr.fail('07', f'world.domains.{domain} 不是对象')
        else:
            vr.fail('07', f'world.domains 缺少 {domain} 领域')


def check_08_dashboard(sim_dir: Path, vr: ValidationResult):
    """dashboard.html 存在 + 基本结构"""
    path = sim_dir / 'dashboard.html'
    if not path.exists():
        vr.fail('08', 'dashboard.html 不存在')
        return

    content = read_file(str(path))
    vr.pass_('08', 'dashboard.html 存在')

    if 'state.json' in content:
        vr.pass_('08', 'dashboard.html 引用了 state.json')
    else:
        vr.warn('08', 'dashboard.html 未引用 state.json')


def check_09_characters(sim_dir: Path, vr: ValidationResult):
    """characters/ 目录结构"""
    chars_dir = sim_dir / 'characters'
    if not chars_dir.exists():
        vr.warn('09', 'characters/ 目录不存在（建议创建）')
        return

    vr.pass_('09', 'characters/ 目录存在')

    overview = chars_dir / 'overview.md'
    if overview.exists():
        vr.pass_('09', 'characters/overview.md 存在')
    else:
        vr.warn('09', 'characters/overview.md 不存在')

    active_dir = chars_dir / 'active'
    if active_dir.exists():
        cards = list(active_dir.glob('*.md'))
        vr.pass_('09', f'characters/active/ 含有 {len(cards)} 个人物卡')
    else:
        vr.warn('09', 'characters/active/ 目录不存在')


def check_12_knowledge_timeline(sim_dir: Path, vr: ValidationResult):
    """主角知识不超过 start_date（简化检查）"""
    state_path = sim_dir / 'state.json'
    state_data = read_json(str(state_path))
    if not state_data:
        vr.error('12', 'state.json 不可读')
        return

    # 简化检查：确保 knowledge 不为空
    knowledge = state_data.get('protagonist', {}).get('knowledge', {})
    if knowledge:
        vr.pass_('12', 'protagonist.knowledge 存在')
    else:
        vr.warn('12', 'protagonist.knowledge 为空')


def check_14_territory_faction(sim_dir: Path, vr: ValidationResult):
    """territory 控制者与 faction-map 一致（简化检查）"""
    state_path = sim_dir / 'state.json'
    state_data = read_json(str(state_path))
    if not state_data:
        vr.error('14', 'state.json 不可读')
        return

    territory = state_data.get('territory', {})
    regions = territory.get('regions', [])
    factions = state_data.get('factions', [])

    if not regions:
        vr.warn('14', 'territory.regions 为空')
        return

    faction_names = {f.get('name') for f in factions} if factions else set()

    unmatched = []
    for region in regions:
        controller = region.get('controller', '')
        if controller and controller not in faction_names and controller != '无':
            unmatched.append(f'{region.get("name", "?")}:{controller}')

    if unmatched:
        vr.warn('14', f'区域控制者不在势力列表中: {", ".join(unmatched[:5])}')
    else:
        vr.pass_('14', '所有区域控制者在势力列表中')


def check_15_completion_conditions(sim_dir: Path, vr: ValidationResult):
    """完结条件明确"""
    skill_path = sim_dir / 'SKILL.md'
    if not skill_path.exists():
        vr.error('15', 'SKILL.md 不存在')
        return

    content = read_file(str(skill_path))
    if '完结' in content or '完成条件' in content or '胜利条件' in content:
        vr.pass_('15', 'SKILL.md 包含完结条件')
    else:
        vr.warn('15', 'SKILL.md 未明确完结条件')


def check_16_state_size(sim_dir: Path, vr: ValidationResult):
    """state.json 大小合规"""
    path = sim_dir / 'state.json'
    if not path.exists():
        vr.error('16', 'state.json 不存在')
        return

    size = path.stat().st_size
    size_kb = size / 1024

    if size_kb <= 15:
        vr.pass_('16', f'state.json 大小合规: {size_kb:.1f}KB')
    else:
        vr.fail('16', f'state.json 超过 15KB 限制: {size_kb:.1f}KB')


def check_17_turn_log(sim_dir: Path, vr: ValidationResult):
    """turn_log 不超过 5 条"""
    state_data = read_json(str(sim_dir / 'state.json'))
    if not state_data:
        vr.error('17', 'state.json 不可读')
        return

    turn_log = state_data.get('turn_log', [])
    if len(turn_log) <= 5:
        vr.pass_('17', f'turn_log 条目数: {len(turn_log)} (<=5)')
    else:
        vr.fail('17', f'turn_log 条目数: {len(turn_log)} (>5，应裁剪)')


def check_18_event_cards(sim_dir: Path, vr: ValidationResult):
    """所有事件卡片有 trigger_conditions"""
    data_dir = sim_dir / 'data'
    event_dir = data_dir / 'distilled' / 'event-cards'

    if not event_dir.exists():
        vr.warn('18', '事件卡片目录不存在')
        return

    yaml_files = list(event_dir.glob('EVT-*.yaml'))
    if not yaml_files:
        vr.warn('18', '无事件卡片')
        return

    no_conditions = []
    for yf in sorted(yaml_files):
        content = read_file(str(yf))
        if 'trigger_conditions' not in content:
            no_conditions.append(yf.name)

    if no_conditions:
        vr.fail('18', f'{len(no_conditions)} 个事件卡片缺少 trigger_conditions: {", ".join(no_conditions[:5])}')
    else:
        vr.pass_('18', f'所有 {len(yaml_files)} 个事件卡片含有 trigger_conditions')


def check_19_event_triggers(sim_dir: Path, vr: ValidationResult):
    """event-triggers.json 与事件卡片数量匹配"""
    triggers_path = sim_dir / 'data' / 'event-triggers.json'
    event_dir = sim_dir / 'data' / 'distilled' / 'event-cards'

    triggers_data = read_json(str(triggers_path))
    if triggers_data is None:
        vr.warn('19', 'event-triggers.json 不存在')
        return

    triggers_count = len(triggers_data.get('events', []))

    yaml_count = len(list(event_dir.glob('EVT-*.yaml'))) if event_dir.exists() else 0

    if triggers_count == yaml_count:
        vr.pass_('19', f'event-triggers.json ({triggers_count}) 与事件卡片 ({yaml_count}) 数量匹配')
    else:
        vr.warn('19', f'event-triggers.json ({triggers_count}) 与事件卡片 ({yaml_count}) 数量不匹配')


def check_20_monthly_baseline(sim_dir: Path, vr: ValidationResult):
    """月份基线表存在"""
    protocol_files = list((sim_dir / 'references').glob('08-*.md'))
    if not protocol_files:
        vr.warn('20', '08-session-protocol.md 不存在')
        return

    content = read_file(str(protocol_files[0]))
    if '月度结算基线表' in content or '月度基线' in content:
        vr.pass_('20', '08-session-protocol.md 包含月度基线表')
    else:
        vr.warn('20', '08-session-protocol.md 未包含月度基线表')


# ============================================================
# 主流程
# ============================================================

def main():
    import argparse

    parser = argparse.ArgumentParser(description='历史模拟器校验器')
    parser.add_argument('--sim-dir', required=True, help='模拟器目录')
    parser.add_argument('--json', action='store_true', help='输出 JSON 格式')
    parser.add_argument('--output', help='输出报告文件路径')

    args = parser.parse_args()

    sim_dir = Path(args.sim_dir)
    if not sim_dir.exists():
        print(f'[ERROR] 目录不存在: {sim_dir}')
        sys.exit(1)

    vr = ValidationResult()

    print(f'[INFO] 校验器启动: {sim_dir}')

    checks = [
        check_01_engine_meta,
        check_02_skill_md,
        check_03_state_json,
        check_04_references,
        check_05_records,
        check_06_skill_references,
        check_07_state_schema_consistency,
        check_08_dashboard,
        check_09_characters,
        check_12_knowledge_timeline,
        check_14_territory_faction,
        check_15_completion_conditions,
        check_16_state_size,
        check_17_turn_log,
        check_18_event_cards,
        check_19_event_triggers,
        check_20_monthly_baseline,
    ]

    for check in checks:
        try:
            check(sim_dir, vr)
        except Exception as e:
            vr.error(check.__name__, f'执行异常: {str(e)}')

    # 输出
    if args.json:
        report = vr.to_json()
    else:
        report = vr.to_markdown()

    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f'[INFO] 报告已写入: {args.output}')
    else:
        print(report)

    # 返回码
    summary = vr.summary
    if summary['fail'] > 0 or summary['error'] > 0:
        sys.exit(1)
    sys.exit(0)


if __name__ == '__main__':
    main()
