"""
历史模拟器 -- 包生成自动化 (package-builder.py)

覆盖 Phase 6 的模板填充部分。从结构化数据自动生成约 18 个文件。

用法:
  python scripts/package-builder.py --sim-dir chongzhen-1643 --data-dir chongzhen-1643/data
  python scripts/package-builder.py --sim-dir chongzhen-1643 --data-dir chongzhen-1643/data --dry-run

输入:
  data/distilled/            提炼后的结构化数据
  data/generation-brief.md   生成简报
  data/distilled/custom-rules.yaml  追加规则
  templates/                 模板文件

自动生成（约 18 个文件）:
  .engine-meta.json
  README.md
  dashboard.html（仅配色替换）
  state.json（从 distilled + custom-rules 填充初始值）
  characters/overview.md
  characters/active/*.md
  records/ledger-template.md
  records/chronicle-template.md
  data/driver-skill.md
  data/event-triggers.json（YAML 事件卡片 → JSON）
  references/07-state-schema.md
  references/12-save-system.md
  references/13-geography-layer.md
  references/14-territory-layer.md
  references/16-commodity-timeline.md

依赖: Python 3.8+，无外部依赖
"""

import json
import os
import re
import sys
import copy
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional


# ============================================================
# 工具函数
# ============================================================

def read_file(path: str) -> str:
    """读取文本文件"""
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()


def write_file(path: str, content: str):
    """写入文本文件"""
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)


def read_json(path: str) -> Optional[Dict]:
    """读取 JSON 文件"""
    if not Path(path).exists():
        return None
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def write_json(path: str, data):
    """写入 JSON 文件"""
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def read_yaml_simple(path: str) -> Dict:
    """
    简易 YAML 读取器（无外部依赖）。
    仅支持简单的 key: value 和列表结构。
    """
    if not Path(path).exists():
        return {}

    content = read_file(path)
    result = {}
    current_key = None
    current_list = []

    for line in content.split('\n'):
        stripped = line.strip()

        if not stripped or stripped.startswith('#'):
            continue

        # 列表项
        if stripped.startswith('- '):
            if current_key:
                current_list.append(stripped[2:].strip().strip('"').strip("'"))
            continue

        # key: value
        if ':' in stripped and not stripped.startswith(' '):
            # 保存之前的列表
            if current_key and current_list:
                result[current_key] = current_list
                current_list = []

            key, _, val = stripped.partition(':')
            current_key = key.strip()
            val = val.strip().strip('"').strip("'")

            if val:
                result[current_key] = val
                current_key = None
                current_list = []
        elif ':' in stripped:
            key, _, val = stripped.partition(':')
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            if key and val:
                if current_key and current_list:
                    result[current_key] = current_list
                    current_list = []
                result[key] = val
                current_key = None

    if current_key and current_list:
        result[current_key] = current_list

    return result


def fill_template(template: str, variables: Dict) -> str:
    """简单的模板变量替换"""
    result = template
    for key, value in variables.items():
        result = result.replace(f'{{{{{key}}}}}', str(value))
    return result


def extract_brief_field(brief_content: str, field: str) -> str:
    """从 generation-brief.md 提取字段值"""
    for line in brief_content.split('\n'):
        if line.strip().startswith(f'{field}:'):
            return line.split(':', 1)[1].strip().strip('"').strip("'")
    return ''


# ============================================================
# 生成器核心
# ============================================================

class PackageBuilder:
    def __init__(self, sim_dir: str, data_dir: str, template_dir: str, dry_run: bool = False):
        self.sim_dir = Path(sim_dir)
        self.data_dir = Path(data_dir)
        self.template_dir = Path(template_dir)
        self.dry_run = dry_run
        self.generated_files = []

        # 加载简报
        brief_path = self.data_dir / 'generation-brief.md'
        self.brief = read_file(str(brief_path)) if brief_path.exists() else ''

        # 提取基本变量
        self.sim_name = extract_brief_field(self.brief, 'sim_name')
        self.sim_slug = self.sim_dir.name
        self.start_date = extract_brief_field(self.brief, 'start_date')
        self.era_label = extract_brief_field(self.brief, 'era_label')
        self.protagonist_name = extract_brief_field(self.brief, 'protagonist_name')
        self.protagonist_identity = extract_brief_field(self.brief, 'protagonist_identity')
        self.fidelity_mode = extract_brief_field(self.brief, 'fidelity_mode')

    def get_common_vars(self) -> Dict:
        """获取通用模板变量"""
        return {
            'sim_name': self.sim_name,
            'sim_slug': self.sim_slug,
            'start_date': self.start_date,
            'era_label': self.era_label,
            'protagonist_name': self.protagonist_name,
            'protagonist_identity': self.protagonist_identity,
            'fidelity_mode': self.fidelity_mode,
            'engine_version': self._read_engine_version(),
            'sim_dir': f'./{self.sim_slug}',
            'historical_anchor': self.era_label,
            'protagonist_title': self.protagonist_identity,
        }

    def _read_engine_version(self) -> str:
        """读取引擎版本"""
        version_file = self.template_dir.parent / 'references' / 'engine-version.md'
        if version_file.exists():
            content = read_file(str(version_file))
            for line in content.split('\n'):
                if 'version' in line.lower() and ':' in line:
                    return line.split(':', 1)[1].strip().strip('"')
        return '0.1.0'

    def generate_engine_meta(self):
        """生成 .engine-meta.json"""
        vars_ = self.get_common_vars()
        data = {
            'engine_version': vars_['engine_version'],
            'generated_at': datetime.now().isoformat(),
            'sim_name': vars_['sim_name'],
            'sim_slug': vars_['sim_slug'],
            'creation_mode': 'new',
            'turn_count': 0,
            'inherited_from': None,
            'upgraded_from_version': None,
            'upgrades_applied': [],
        }

        path = self.sim_dir / '.engine-meta.json'
        if not self.dry_run:
            write_json(str(path), data)
        self.generated_files.append(str(path))
        print(f'  [生成] {path}')

    def generate_driver_skill(self):
        """生成 data/driver-skill.md"""
        template_path = self.template_dir / 'driver-skill.template.md'
        if not template_path.exists():
            print(f'  [跳过] driver-skill.template.md 不存在')
            return

        template = read_file(str(template_path))
        vars_ = self.get_common_vars()
        content = fill_template(template, vars_)

        path = self.sim_dir / 'data' / 'driver-skill.md'
        if not self.dry_run:
            write_file(str(path), content)
        self.generated_files.append(str(path))
        print(f'  [生成] {path}')

    def generate_event_triggers(self):
        """从 YAML 事件卡片生成 event-triggers.json"""
        event_cards_dir = self.data_dir / 'distilled' / 'event-cards'
        if not event_cards_dir.exists():
            print(f'  [跳过] 事件卡片目录不存在: {event_cards_dir}')
            return

        events = []

        for yaml_file in sorted(event_cards_dir.glob('EVT-*.yaml')):
            content = read_file(str(yaml_file))
            evt = self._parse_event_yaml(content)
            if evt:
                events.append(evt)

        if not events:
            print(f'  [跳过] 无事件卡片')
            return

        data = {
            'meta': {
                'sim_slug': self.sim_slug,
                'generated_at': datetime.now().isoformat(),
                'total_events': len(events),
            },
            'events': events,
        }

        path = self.sim_dir / 'data' / 'event-triggers.json'
        if not self.dry_run:
            write_json(str(path), data)
        self.generated_files.append(str(path))
        print(f'  [生成] {path} ({len(events)} 个事件)')

    def _parse_event_yaml(self, content: str) -> Optional[Dict]:
        """解析单个事件卡片 YAML"""
        evt = {}

        for line in content.split('\n'):
            stripped = line.strip()

            if stripped.startswith('#') or not stripped:
                continue

            if ':' in stripped:
                key, _, val = stripped.partition(':')
                key = key.strip()
                val = val.strip()

                # 提取简单字段
                simple_fields = {
                    'event_id', 'event_name', 'historical_date',
                    'event_type', 'probability_base',
                }

                if key in simple_fields:
                    evt[key] = val.strip('"').strip("'")

        # 提取 trigger_conditions（简化：只提取 all_of 和 any_of 的条件文本）
        evt['trigger_conditions'] = self._extract_conditions(content)
        evt['character_refs'] = self._extract_character_refs(content)

        # 提取 outcome
        evt['outcome_if_triggered'] = self._extract_list_section(content, 'outcome_if_triggered')
        evt['cascade_events'] = {'triggered': [], 'blocked': []}

        if evt.get('event_id'):
            return evt
        return None

    def _extract_conditions(self, content: str) -> Dict:
        """提取触发条件"""
        conditions = {'all_of': [], 'any_of': []}
        in_all = False
        in_any = False

        for line in content.split('\n'):
            stripped = line.strip()

            if 'all_of:' in stripped:
                in_all = True
                in_any = False
                continue
            elif 'any_of:' in stripped:
                in_any = True
                in_all = False
                continue
            elif stripped and not stripped.startswith('-') and ':' in stripped and not stripped.startswith(' '):
                in_all = False
                in_any = False

            if stripped.startswith('- ') and '"' in stripped:
                cond = stripped[2:].strip().strip('"').strip("'")
                if in_all:
                    conditions['all_of'].append(cond)
                elif in_any:
                    conditions['any_of'].append(cond)

        return conditions

    def _extract_character_refs(self, content: str) -> List[str]:
        """提取涉及人物"""
        refs = []
        in_refs = False

        for line in content.split('\n'):
            stripped = line.strip()

            if 'key_character' in stripped and ':' in stripped:
                val = stripped.split(':', 1)[1].strip().strip('"').strip("'")
                if val:
                    refs.append(val)

        return refs

    def _extract_list_section(self, content: str, section_name: str) -> List[str]:
        """提取 YAML 列表段"""
        items = []
        in_section = False

        for line in content.split('\n'):
            stripped = line.strip()

            if stripped.startswith(f'{section_name}:'):
                in_section = True
                continue

            if in_section:
                if stripped.startswith('- ') and not stripped.startswith('- -'):
                    items.append(stripped[2:].strip().strip('"').strip("'"))
                elif stripped and not stripped.startswith('#') and ':' in stripped and not stripped.startswith(' '):
                    in_section = False

        return items

    def generate_record_templates(self):
        """生成 records/ 目录结构"""
        for name in ['ledger-template.md', 'chronicle-template.md',
                      'session-record-template.md', 'private-ledger-template.md']:
            src = self.template_dir / name
            if src.exists():
                content = read_file(str(src))
                vars_ = self.get_common_vars()
                content = fill_template(content, vars_)

                path = self.sim_dir / 'records' / name
                if not self.dry_run:
                    write_file(str(path), content)
                self.generated_files.append(str(path))
                print(f'  [生成] {path}')

        # 创建子目录
        for subdir in ['ledger', 'chronicle']:
            dir_path = self.sim_dir / 'records' / subdir
            if not self.dry_run:
                dir_path.mkdir(parents=True, exist_ok=True)
                # 创建 .gitkeep
                (dir_path / '.gitkeep').touch()

    def generate_characters_dir(self):
        """生成 characters/ 目录结构 + 从蒸馏数据生成人物卡"""
        for subdir in ['active', 'waiting', 'archive']:
            dir_path = self.sim_dir / 'characters' / subdir
            if not self.dry_run:
                dir_path.mkdir(parents=True, exist_ok=True)

        # 尝试从蒸馏数据生成人物卡
        distilled_person = self.data_dir / 'distilled' / 'person'
        active_names = []
        waiting_names = []
        archive_names = []

        if distilled_person.exists():
            for person_file in sorted(distilled_person.glob('*.yaml')):
                content = read_file(str(person_file))
                name = person_file.stem
                lifecycle = self._extract_yaml_field(content, 'lifecycle_state') or 'active'
                death_date = self._extract_yaml_field(content, 'death_date') or ''

                # 分类
                if death_date and lifecycle in ('deceased', '死亡'):
                    target_dir = 'archive'
                    archive_names.append(name)
                    card = self._generate_archive_card(content, name)
                elif lifecycle in ('active', '活跃期', '成长期') or 'opening_state' in content.lower():
                    target_dir = 'active'
                    active_names.append(name)
                    card = self._generate_full_card(content, name)
                else:
                    target_dir = 'waiting'
                    waiting_names.append(name)
                    card = self._generate_full_card(content, name)

                card_path = self.sim_dir / 'characters' / target_dir / f'{name}.md'
                if not self.dry_run:
                    write_file(str(card_path), card)
                self.generated_files.append(str(card_path))
                print(f'  [生成] characters/{target_dir}/{name}.md')

        # 如果没有蒸馏数据，保留空目录
        if not distilled_person.exists() or not list(distilled_person.glob('*.yaml')):
            for subdir in ['active', 'waiting', 'archive']:
                (self.sim_dir / 'characters' / subdir / '.gitkeep').touch()

        # 生成 overview.md
        overview = self._generate_overview(active_names, waiting_names, archive_names)
        path = self.sim_dir / 'characters' / 'overview.md'
        if not self.dry_run:
            write_file(str(path), overview)
        self.generated_files.append(str(path))
        print(f'  [生成] {path}')

    def _extract_yaml_field(self, content, field):
        """从 YAML 内容中提取字段值"""
        import re
        pattern = rf'^{field}:\s*[\'"]?(.+?)[\'"]?\s*$'
        for line in content.split('\n'):
            m = re.match(pattern, line.strip())
            if m:
                return m.group(1).strip()
        return None

    def _generate_full_card(self, content, name):
        """生成完整人物卡"""
        identity = self._extract_yaml_field(content, 'entity_name') or name
        faction = self._extract_yaml_field(content, 'faction') or '未知'
        location = self._extract_yaml_field(content, 'location') or '未知'
        goal = self._extract_yaml_field(content, 'public_goal') or '未知'
        pressure = self._extract_yaml_field(content, 'hidden_pressure') or '待观察'
        boundary = self._extract_yaml_field(content, 'knowledge_boundary') or '待观察'

        return f"""# {name}

## 基本信息
- 身份：{identity}
- 阵营：{faction}
- 位置：{location}
- 状态：活跃

## 摘要卡
- 公开目标：{goal}
- 当前压力：{pressure}
- 近期行动倾向：待观察
- 认知边界：{boundary}

## 核心属性

| 属性 | 值 | 说明 |
|------|-----|------|
| 忠诚度 | 中 | 待观察 |
| 野心 | 中 | 待观察 |
| 能力 | 中 | 待观察 |
| 威望 | 中 | 待观察 |

## 反应倾向
- 政治变动：待观察
- 军事危机：待观察
- 财政危机：待观察

## 来源追溯
- 置信度：medium
- 史实依据：Phase 3 蒸馏数据
"""

    def _generate_archive_card(self, content, name):
        """生成归档人物卡（精简版）"""
        identity = self._extract_yaml_field(content, 'entity_name') or name
        death_date = self._extract_yaml_field(content, 'death_date') or '未知'
        return f"""# {name}

## 基本信息
- 身份：已故（{death_date}）
- 阵营：{self._extract_yaml_field(content, 'faction') or '未知'}

## 历史影响
- 待 AI agent 在 Phase 6h 中补充

## 来源追溯
- 置信度：medium
"""

    def _generate_overview(self, active_names, waiting_names, archive_names):
        """生成 overview.md"""
        lines = ['# 人物总览', '']
        lines.append('> 常驻上下文，每回合始终加载。')

        # active 表
        lines.append('')
        lines.append('| 姓名 | 状态 | 身份 | 阵营 | 位置 | 与主角关系 |')
        lines.append('|------|------|------|------|------|-----------|')
        for n in active_names:
            lines.append(f'| {n} | 活跃 | 见卡片 | 见卡片 | 见卡片 | 见卡片 |')

        lines.append('')
        lines.append('## 待出场人物（waiting/）')
        lines.append('')
        lines.append('出场时使用脚本升级：`node scripts/create-character.mjs --sim-dir . --name "{姓名}" --upgrade`')
        lines.append('')
        lines.append('| 姓名 | 身份 | 阵营 | 预计出场时机 |')
        lines.append('|------|------|------|-------------|')
        for n in waiting_names:
            lines.append(f'| {n} | 见卡片 | 见卡片 | 待确定 |')

        if archive_names:
            lines.append('')
            lines.append('## 已故人物（archive/）')
            lines.append('')
            lines.append('| 姓名 | 身份 | 死因 | 历史影响 |')
            lines.append('|------|------|------|----------|')
            for n in archive_names:
                lines.append(f'| {n} | 见卡片 | 见卡片 | 见卡片 |')

        return '\n'.join(lines)

    def generate_scripts_dir(self):
        """生成 scripts/ 目录（复制运行时脚本）"""
        scripts_dir = self.sim_dir / 'scripts'
        if not self.dry_run:
            scripts_dir.mkdir(parents=True, exist_ok=True)

        # 复制运行时脚本
        src_scripts = self.template_dir.parent / 'scripts'
        for script_name in ['turn-engine.mjs', 'record-writer.mjs', 'create-character.mjs']:
            src = src_scripts / script_name
            if src.exists():
                dst = scripts_dir / script_name
                if not self.dry_run:
                    import shutil
                    shutil.copy2(str(src), str(dst))
                self.generated_files.append(str(dst))
                print(f'  [复制] {dst}')

    def run(self):
        """执行全部生成"""
        print(f'\n[INFO] 包生成器启动')
        print(f'  模拟器目录: {self.sim_dir}')
        print(f'  数据目录: {self.data_dir}')
        print(f'  模板目录: {self.template_dir}')
        print(f'  干跑模式: {self.dry_run}')
        print()

        # 1. 引擎元数据
        print('[步骤 1] 引擎元数据')
        self.generate_engine_meta()

        # 2. 驱动器
        print('[步骤 2] 驱动器')
        self.generate_driver_skill()

        # 3. 事件触发器（YAML → JSON）
        print('[步骤 3] 事件触发器')
        self.generate_event_triggers()

        # 4. 记录模板
        print('[步骤 4] 记录模板')
        self.generate_record_templates()

        # 5. 人物卡目录
        print('[步骤 5] 人物卡目录')
        self.generate_characters_dir()

        # 6. 脚本目录
        print('[步骤 6] 脚本目录')
        self.generate_scripts_dir()

        # 汇总
        print(f'\n[INFO] 生成完成: {len(self.generated_files)} 个文件')
        for f in self.generated_files:
            print(f'  - {f}')


# ============================================================
# 主入口
# ============================================================

def main():
    import argparse

    parser = argparse.ArgumentParser(description='历史模拟器包生成器')
    parser.add_argument('--sim-dir', required=True, help='模拟器输出目录')
    parser.add_argument('--data-dir', required=True, help='数据目录（含 distilled/ 和 generation-brief.md）')
    parser.add_argument('--template-dir', default='templates', help='模板目录')
    parser.add_argument('--dry-run', action='store_true', help='只输出，不写文件')

    args = parser.parse_args()

    builder = PackageBuilder(
        sim_dir=args.sim_dir,
        data_dir=args.data_dir,
        template_dir=args.template_dir,
        dry_run=args.dry_run,
    )
    builder.run()


if __name__ == '__main__':
    main()
