"""
历史模拟器 -- 多源数据收集脚本

用法:
  python scripts/collect.py --brief data/generation-brief.md --output data/raw/
  python scripts/collect.py --brief data/generation-brief.md --output data/raw/ --local-source "path/to/book.txt" --source-alias "三国演义" --source-type fiction --source-tier B
  python scripts/collect.py --report data/raw/

功能:
  1. 读取 generation-brief.md，提取需要收集的实体清单
  2. 支持用户提供本地著作文件作为来源（TXT/MD 等）
  3. 为本地来源生成元数据目录（不切块，由 AI agent 直接阅读原文）
  4. 对每个实体生成 Web 搜索任务（补充来源）
  5. 将搜索结果结构化保存为 JSON 文件
  6. 为每个实体标记来源版本和置信度

设计原则:
  - 本地来源不切块：保持信息完整性，避免 RAG 式截断导致丢失上下文
  - 脚本只管元数据：记录文件路径、别名、类型、等级，不处理内容
  - 大文件按自然结构分段：有章节标记的按章节，无章节的按空行段落群
  - 每条数据都标注来源，可追溯

依赖:
  - Python 3.8+
  - 无外部依赖（仅使用标准库）

注意:
  本脚本不直接调用 Web API，也不对本地文件做内容提取。
  实际数据收集由 AI agent 完成：
  - Web 来源：AI agent 在执行阶段通过 WebSearch 工具搜索
  - 本地来源：AI agent 用 Read 工具直接阅读原文后提取
  本脚本负责：
  1. 解析 brief，生成搜索任务清单
  2. 为本地来源生成元数据目录（供 AI agent 决定阅读策略）
  3. 接收 AI agent 的搜索结果并结构化存储
  4. 生成搜索报告摘要
"""

import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional


# ============================================================
# 数据结构定义
# ============================================================

ENTITY_TYPES = [
    "person",
    "faction",
    "event",
    "institution",
    "climate",
    "geography",
]

SOURCE_TYPES = {
    "primary": "一手史料（正史、实录、奏疏等）",
    "fiction": "文学作品（演义、小说、戏剧等）",
    "academic": "学术研究（专著、论文等）",
    "popular": "通俗读物（科普、纪录片等）",
}

SOURCE_TIERS = {
    "A": "一手史料",
    "B": "高质量现代研究",
    "C": "经过整理的可靠参考",
}

CONFLICT_TYPES = [
    "factual_divergence",        # 事实分歧：同一事件不同记载
    "characterization_divergence", # 人物塑造分歧：同一人物不同形象
    "timeline_divergence",       # 时间线分歧：同一事件不同时间
    "absence_vs_addition",       # 有无分歧：某来源有，其他来源无
    "value_divergence",          # 评价分歧：同一人物/事件不同评价
]

# 阅读策略阈值
FULL_READ_THRESHOLD = 200_000  # 200K 字符以下，AI agent 全文阅读

# 章节标记正则（中文古典文本常见模式）
CHAPTER_PATTERNS = [
    r"第[一二三四五六七八九十百千零\d]+[回章卷节集篇部]",
    r"Chapter\s+\d+",
    r"卷[一二三四五六七八九十百千零\d]+",
    r"[\d]+[、.]",  # "1、" "2." 等简单编号
]


def create_entity_template(
    entity_type: str,
    entity_name: str,
    search_queries: List[str],
) -> Dict:
    """创建实体数据收集模板"""
    return {
        "entity_type": entity_type,
        "entity_name": entity_name,
        "collection_date": datetime.now().strftime("%Y-%m-%d"),
        "status": "pending",
        "search_queries": search_queries,
        "versions": [],
    }


def create_version_template(
    source_name: str,
    source_type: str,
    source_tier: str,
) -> Dict:
    """创建来源版本模板"""
    return {
        "source_name": source_name,
        "source_type": source_type,
        "source_tier": source_tier,
        "raw_extracts": [],
        "structured_data": {
            "birth_year": None,
            "death_year": None,
            "active_period": None,
            "positions_held": [],
            "key_events": [],
            "relationships": [],
            "motivations": [],
            "decision_patterns": [],
            "speech_style_examples": [],
            "pressure_reactions": [],
        },
    }


# ============================================================
# 本地来源 -- 元数据目录生成（不处理内容）
# ============================================================

def _read_file_size(file_path: str) -> int:
    """读取文件字符数（自动检测编码）"""
    encodings = ["utf-8", "gbk", "gb2312", "gb18030", "big5", "latin-1"]
    for enc in encodings:
        try:
            with open(file_path, "r", encoding=enc) as f:
                return len(f.read())
        except (UnicodeDecodeError, UnicodeError):
            continue
    return -1


def _detect_chapter_pattern(file_path: str) -> Optional[Dict]:
    """
    扫描文件，检测是否存在章节标记。

    返回匹配到的章节信息，或 None。
    """
    encodings = ["utf-8", "gbk", "gb2312", "gb18030", "big5", "latin-1"]
    lines = None
    for enc in encodings:
        try:
            with open(file_path, "r", encoding=enc) as f:
                lines = f.readlines()
            break
        except (UnicodeDecodeError, UnicodeError):
            continue

    if lines is None:
        return None

    # 逐个模式尝试匹配
    for pattern in CHAPTER_PATTERNS:
        chapters = []
        for i, line in enumerate(lines):
            match = re.search(pattern, line)
            if match:
                chapters.append({
                    "title": line.strip()[:80],
                    "line_number": i + 1,
                })

        if len(chapters) >= 3:
            # 至少匹配到 3 个章节才认为该模式有效
            return {
                "pattern": pattern,
                "chapter_count": len(chapters),
                "chapters": chapters,
            }

    return None


def _detect_paragraph_breaks(file_path: str) -> Optional[Dict]:
    """
    兜底策略：检测连续空行作为段落群边界。

    返回段落群信息，或 None（如果没有明显的段落群结构）。
    """
    encodings = ["utf-8", "gbk", "gb2312", "gb18030", "big5", "latin-1"]
    lines = None
    for enc in encodings:
        try:
            with open(file_path, "r", encoding=enc) as f:
                lines = f.readlines()
            break
        except (UnicodeDecodeError, UnicodeError):
            continue

    if lines is None:
        return None

    # 找连续 2 个以上空行的位置
    segments = []
    current_start = 0
    blank_count = 0

    for i, line in enumerate(lines):
        if line.strip() == "":
            blank_count += 1
        else:
            if blank_count >= 2:
                # 段落群边界
                if i > current_start:
                    segments.append({
                        "line_start": current_start + 1,
                        "line_end": i - blank_count,
                        "preview": lines[current_start].strip()[:60] if current_start < len(lines) else "",
                    })
                current_start = i
            blank_count = 0

    # 最后一个段落群
    if current_start < len(lines):
        segments.append({
            "line_start": current_start + 1,
            "line_end": len(lines),
            "preview": lines[current_start].strip()[:60] if current_start < len(lines) else "",
        })

    if len(segments) >= 2:
        return {
            "segment_count": len(segments),
            "segments": segments,
        }

    return None


def generate_source_catalog(
    local_sources: List[Dict],
    output_dir: str,
) -> str:
    """
    为本地来源生成元数据目录。

    不读取文件内容，只记录元数据和阅读策略。
    AI agent 根据目录决定如何阅读每个文件。

    输出: data/raw/local_sources/source-catalog.json
    """
    catalog = {
        "generated_date": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "sources": [],
    }

    for ls in local_sources:
        file_path = ls["path"]
        file_size = _read_file_size(file_path)

        entry = {
            "alias": ls["alias"],
            "file_path": file_path,
            "source_type": ls["source_type"],
            "source_tier": ls["source_tier"],
            "file_size_chars": file_size,
            "reading_strategy": "full",
            "reading_hint": "",
        }

        if file_size < 0:
            entry["reading_strategy"] = "error"
            entry["reading_hint"] = "无法读取文件，请检查文件路径和编码"
        elif file_size < FULL_READ_THRESHOLD:
            entry["reading_strategy"] = "full"
            entry["reading_hint"] = (
                f"文件约 {file_size:,} 字符，"
                f"AI agent 应全文阅读后按七层模型提取"
            )
        else:
            # 大文件：尝试检测章节结构
            chapter_info = _detect_chapter_pattern(file_path)

            if chapter_info:
                entry["reading_strategy"] = "chapter"
                entry["reading_hint"] = (
                    f"文件约 {file_size:,} 字符，检测到 "
                    f"{chapter_info['chapter_count']} 个章节标记。"
                    f"AI agent 按章节选择性阅读"
                )
                entry["chapter_info"] = chapter_info
            else:
                # 兜底：检测段落群
                para_info = _detect_paragraph_breaks(file_path)

                if para_info:
                    entry["reading_strategy"] = "segments"
                    entry["reading_hint"] = (
                        f"文件约 {file_size:,} 字符，无章节标记，"
                        f"检测到 {para_info['segment_count']} 个段落群。"
                        f"AI agent 按段落群分段阅读"
                    )
                    entry["segment_info"] = para_info
                else:
                    entry["reading_strategy"] = "linear"
                    entry["reading_hint"] = (
                        f"文件约 {file_size:,} 字符，无章节标记和段落群。"
                        f"AI agent 按 offset 分批阅读，每批留 10% 重叠"
                    )

        catalog["sources"].append(entry)

    # 保存
    dir_path = Path(output_dir) / "local_sources"
    dir_path.mkdir(parents=True, exist_ok=True)

    catalog_path = dir_path / "source-catalog.json"
    with open(catalog_path, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)

    return str(catalog_path)


# ============================================================
# Brief 解析
# ============================================================

def parse_brief(brief_path: str) -> Dict:
    """
    解析 generation-brief.md，提取收集任务清单。

    返回:
    {
        "sim_name": "...",
        "start_date": "...",
        "entities": [
            {"type": "person", "name": "诸葛亮", "search_hints": [...]},
            ...
        ],
        "local_sources": [
            {"path": "...", "alias": "...", "source_type": "...", "source_tier": "..."},
            ...
        ]
    }
    """
    result = {
        "sim_name": "",
        "start_date": "",
        "entities": [],
        "local_sources": [],
    }

    with open(brief_path, "r", encoding="utf-8") as f:
        content = f.read()

    lines = content.split("\n")

    # 解析简单 key: value 字段
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("sim_name:"):
            result["sim_name"] = stripped.split(":", 1)[1].strip().strip('"')
        elif stripped.startswith("start_date:"):
            result["start_date"] = stripped.split(":", 1)[1].strip().strip('"')

    # 解析 entities 列表
    result["entities"] = _parse_yaml_list(lines, "entities", ["type", "name", "search_hints"])

    # 解析 local_sources 列表
    result["local_sources"] = _parse_yaml_list(
        lines, "local_sources",
        ["path", "alias", "source_type", "source_tier"]
    )

    return result


def _parse_yaml_list(lines: List[str], list_key: str, allowed_keys: List[str]) -> List[Dict]:
    """
    解析 YAML 风格的列表结构。

    核心逻辑：
    1. 遇到 `list_key:` 进入列表模式
    2. 遇到 `- key: value` 开启新项（key 必须在 allowed_keys 中）
    3. 遇到 `- value`（无冒号）作为上一个 key 的子列表值
    4. 遇到 `key: value`（无连字符）作为当前项的续行属性
    5. 遇到非列表内容时结束
    """
    items: List[Dict] = []
    in_list = False
    current_item: Optional[Dict] = None
    current_key = None
    current_list_val: List[str] = []

    def _flush_item():
        nonlocal current_item, current_key, current_list_val
        if current_item is not None:
            if current_key and current_list_val:
                current_item[current_key] = current_list_val
            if any(current_item.get(k) for k in allowed_keys if k != "search_hints") or \
               any(k in current_item for k in allowed_keys if k in ("type", "name", "path", "alias")):
                items.append(current_item)
            current_item = None
            current_key = None
            current_list_val = []

    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if not stripped:
            i += 1
            continue

        if stripped == f"{list_key}:":
            in_list = True
            i += 1
            continue

        if not in_list:
            i += 1
            continue

        if not stripped.startswith("-") and not stripped.startswith("#"):
            if ":" in stripped:
                key_part = stripped.split(":", 1)[0].strip()
                if key_part not in allowed_keys:
                    _flush_item()
                    in_list = False
                    i += 1
                    continue
            else:
                _flush_item()
                in_list = False
                i += 1
                continue

        if stripped.startswith("- "):
            rest = stripped[2:].strip()

            has_key_value = ":" in rest and not rest.startswith('"') and not rest.startswith("'")
            if has_key_value:
                key, _, val = rest.partition(":")
                key = key.strip()
                val = val.strip().strip('"').strip("'")

                if key in allowed_keys:
                    _flush_item()
                    current_item = {key: val}
                    current_key = key
                elif current_key is not None:
                    current_list_val.append(rest.strip('"').strip("'"))
            else:
                if current_key is not None:
                    current_list_val.append(rest.strip('"').strip("'"))

        elif ":" in stripped and current_item is not None:
            key, _, val = stripped.partition(":")
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            if key in allowed_keys:
                if current_key and current_list_val:
                    current_item[current_key] = current_list_val
                    current_list_val = []

                current_key = key
                if val:
                    current_item[key] = val

        i += 1

    _flush_item()
    return items


def generate_search_tasks(brief: Dict) -> List[Dict]:
    """
    根据 brief 生成搜索任务清单。

    每个任务是一个搜索指令，供 AI agent 执行。
    """
    tasks = []
    entities = brief.get("entities", [])

    for entity in entities:
        entity_type = entity["type"]
        name = entity["name"]
        hints = entity.get("search_hints", [])

        search_queries = []

        if entity_type == "person":
            search_queries = [
                f"{name} 生平 正史 记载",
                f"{name} 官职 制度 地位",
                f"{name} 关系 盟友 对手",
                f"{name} 决策 重大事件",
                f"{name} 学术研究 评价",
            ]
            if hints:
                search_queries.extend(hints)

        elif entity_type == "event":
            search_queries = [
                f"{name} 经过 史料记载",
                f"{name} 原因 背景",
                f"{name} 结果 影响",
                f"{name} 学术研究 不同观点",
            ]

        elif entity_type == "faction":
            search_queries = [
                f"{name} 组织结构 资源",
                f"{name} 利益 目标 策略",
                f"{name} 与其他势力关系",
            ]

        elif entity_type == "climate":
            search_queries = [
                f"{name} 气候 学术研究",
                f"{name} 灾害 记录",
                f"{name} 对农业 军事影响",
            ]

        elif entity_type == "institution":
            search_queries = [
                f"{name} 制度 规则",
                f"{name} 执行 约束",
                f"{name} 演变 学术研究",
            ]

        elif entity_type == "geography":
            search_queries = [
                f"{name} 地理 交通",
                f"{name} 资源 产出的",
                f"{name} 战略地位",
            ]

        tasks.append({
            "entity_type": entity_type,
            "entity_name": name,
            "search_queries": search_queries,
        })

    return tasks


# ============================================================
# 搜索结果存储
# ============================================================

def save_entity_data(output_dir: str, entity_data: Dict) -> str:
    """
    将实体数据保存为 JSON 文件。

    保存路径: {output_dir}/{entity_type}/{entity_name}.json
    """
    entity_type = entity_data["entity_type"]
    entity_name = entity_data["entity_name"]

    dir_path = Path(output_dir) / entity_type
    dir_path.mkdir(parents=True, exist_ok=True)

    safe_name = entity_name.replace(" ", "_").replace("/", "-")
    file_path = dir_path / f"{safe_name}.json"

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(entity_data, f, ensure_ascii=False, indent=2)

    return str(file_path)


def load_entity_data(output_dir: str, entity_type: str, entity_name: str) -> Optional[Dict]:
    """加载已保存的实体数据"""
    safe_name = entity_name.replace(" ", "_").replace("/", "-")
    file_path = Path(output_dir) / entity_type / f"{safe_name}.json"

    if not file_path.exists():
        return None

    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


# ============================================================
# 收集报告生成
# ============================================================

def generate_collection_report(output_dir: str) -> str:
    """
    生成收集报告摘要。

    返回 markdown 格式的报告文本。
    """
    report_lines = ["# 数据收集报告\n"]
    report_lines.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n")

    total_entities = 0
    total_versions = 0
    total_extracts = 0

    for entity_type in ENTITY_TYPES:
        type_dir = Path(output_dir) / entity_type
        if not type_dir.exists():
            continue

        files = list(type_dir.glob("*.json"))
        if not files:
            continue

        report_lines.append(f"\n## {entity_type}\n")
        report_lines.append("| 实体 | 版本数 | 提取条目数 | 状态 |")
        report_lines.append("|------|--------|-----------|------|")

        for f in files:
            with open(f, "r", encoding="utf-8") as fh:
                data = json.load(fh)

            name = data.get("entity_name", f.stem)
            versions = data.get("versions", [])
            extracts = sum(
                len(v.get("raw_extracts", [])) for v in versions
            )
            status = data.get("status", "unknown")

            report_lines.append(
                f"| {name} | {len(versions)} | {extracts} | {status} |"
            )

            total_entities += 1
            total_versions += len(versions)
            total_extracts += extracts

    # 本地来源统计
    catalog_path = Path(output_dir) / "local_sources" / "source-catalog.json"
    if catalog_path.exists():
        with open(catalog_path, "r", encoding="utf-8") as fh:
            catalog = json.load(fh)

        sources = catalog.get("sources", [])
        if sources:
            report_lines.append(f"\n## 本地来源\n")
            report_lines.append("| 别名 | 类型 | 等级 | 字符数 | 阅读策略 |")
            report_lines.append("|------|------|------|--------|----------|")
            for s in sources:
                size = s.get("file_size_chars", -1)
                size_str = f"{size:,}" if size >= 0 else "读取失败"
                report_lines.append(
                    f"| {s['alias']} | {s['source_type']} | {s['source_tier']} "
                    f"| {size_str} | {s['reading_strategy']} |"
                )

    report_lines.append(f"\n## 总计\n")
    report_lines.append(f"- 实体数: {total_entities}")
    report_lines.append(f"- 来源版本数: {total_versions}")
    report_lines.append(f"- 提取条目数: {total_extracts}")

    return "\n".join(report_lines)


# ============================================================
# 主入口
# ============================================================

def main():
    """
    主入口。

    用法:
      python scripts/collect.py --brief data/generation-brief.md --output data/raw/
      python scripts/collect.py --brief data/generation-brief.md --output data/raw/ --local-source "book.txt" --source-alias "三国演义" --source-type fiction --source-tier B
      python scripts/collect.py --report data/raw/
    """
    import argparse

    parser = argparse.ArgumentParser(description="历史模拟器数据收集")
    parser.add_argument("--brief", help="generation-brief.md 路径")
    parser.add_argument("--output", default="data/raw/", help="输出目录")
    parser.add_argument("--report", help="生成收集报告（指定数据目录）")

    # 本地来源参数（可多次使用）
    parser.add_argument(
        "--local-source", action="append", default=[],
        help="本地来源文件路径（可多次指定）",
    )
    parser.add_argument(
        "--source-alias", action="append", default=[],
        help="来源别名（与 --local-source 一一对应）",
    )
    parser.add_argument(
        "--source-type", action="append", default=[],
        choices=list(SOURCE_TYPES.keys()),
        help="来源类型（与 --local-source 一一对应）",
    )
    parser.add_argument(
        "--source-tier", action="append", default=[],
        choices=list(SOURCE_TIERS.keys()),
        help="来源等级（与 --local-source 一一对应）",
    )

    args = parser.parse_args()

    if args.report:
        report = generate_collection_report(args.report)
        print(report)
        return

    if not args.brief:
        print("错误: 需要指定 --brief 或 --report")
        sys.exit(1)

    # 解析 brief
    brief = parse_brief(args.brief)
    print(f"模拟器: {brief['sim_name']}")
    print(f"起始日期: {brief['start_date']}")

    # 合并本地来源配置
    local_sources = _resolve_local_sources(args, brief)
    if local_sources:
        print(f"\n本地来源: {len(local_sources)} 个")
        for ls in local_sources:
            print(f"  - {ls['alias']} ({ls['source_type']}, 等级 {ls['source_tier']})")

    # 生成搜索任务
    tasks = generate_search_tasks(brief)
    print(f"\n待收集实体: {len(tasks)} 个")

    for i, task in enumerate(tasks, 1):
        print(f"\n{i}. [{task['entity_type']}] {task['entity_name']}")
        for q in task["search_queries"]:
            print(f"   - {q}")

    # 创建实体模板并保存
    for task in tasks:
        template = create_entity_template(
            task["entity_type"],
            task["entity_name"],
            task["search_queries"],
        )
        path = save_entity_data(args.output, template)
        print(f"\n已创建: {path}")

    # 生成本地来源元数据目录
    if local_sources:
        print(f"\n{'='*60}")
        print("生成本地来源目录...")
        print(f"{'='*60}")

        catalog_path = generate_source_catalog(local_sources, args.output)
        print(f"\n来源目录已保存: {catalog_path}")

        # 打印每个来源的阅读策略
        with open(catalog_path, "r", encoding="utf-8") as f:
            catalog = json.load(f)

        for source in catalog["sources"]:
            strategy = source["reading_strategy"]
            alias = source["alias"]
            size = source.get("file_size_chars", 0)

            if strategy == "full":
                print(f"  {alias}: 全文阅读 ({size:,} 字符)")
            elif strategy == "chapter":
                info = source.get("chapter_info", {})
                print(f"  {alias}: 按章节阅读 ({info.get('chapter_count', '?')} 章)")
            elif strategy == "segments":
                info = source.get("segment_info", {})
                print(f"  {alias}: 按段落群阅读 ({info.get('segment_count', '?')} 段)")
            elif strategy == "linear":
                print(f"  {alias}: 按 offset 分批阅读 ({size:,} 字符，无自然分段)")
            else:
                print(f"  {alias}: 读取失败")

    print(f"\n下一步:")
    if local_sources:
        print(f"  1. AI agent 读取 source-catalog.json 了解阅读策略")
        print(f"  2. AI agent 用 Read 工具直接阅读本地来源文件，按七层模型提取")
        print(f"  3. AI agent 将提取结果写入对应实体的 JSON 文件")
    print(f"  4. AI agent 执行 WebSearch 补充本地来源未覆盖的信息")
    print(f"  收集完成后运行: python scripts/collect.py --report {args.output}")


def _resolve_local_sources(args, brief: Dict) -> List[Dict]:
    """
    合并命令行参数和 brief 中的本地来源配置。

    命令行参数优先级高于 brief 文件。
    """
    sources = []

    # 从 brief 文件中读取
    for ls in brief.get("local_sources", []):
        sources.append({
            "path": ls.get("path", ""),
            "alias": ls.get("alias", Path(ls.get("path", "")).stem),
            "source_type": ls.get("source_type", "local"),
            "source_tier": ls.get("source_tier", "C"),
        })

    # 从命令行参数读取
    cli_sources = args.local_source or []
    cli_aliases = args.source_alias or []
    cli_types = args.source_type or []
    cli_tiers = args.source_tier or []

    for i, path in enumerate(cli_sources):
        alias = cli_aliases[i] if i < len(cli_aliases) else Path(path).stem
        source_type = cli_types[i] if i < len(cli_types) else "local"
        source_tier = cli_tiers[i] if i < len(cli_tiers) else "C"
        sources.append({
            "path": path,
            "alias": alias,
            "source_type": source_type,
            "source_tier": source_tier,
        })

    return sources


if __name__ == "__main__":
    main()
