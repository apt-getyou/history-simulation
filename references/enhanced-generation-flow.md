# 增强版生成流程设计

## 设计目标

在现有 SKILL.md 的 5 步流程基础上，增强为 9 阶段强制流程。

核心改进：
1. **脚本辅助数据收集** -- 用 Python 脚本预处理原始史料，减少生成阶段 token 消耗
2. **多版本冲突处理** -- 同一人物/事件可能有多个史料版本（正史 vs 演义 vs 其他），让用户选择蓝本
3. **时间线隔离** -- 人物只能知道 start_date 之前的信息，未来事件是条件触发的
4. **历史事件不必然发生** -- 所有史实事件建模为"条件触发"，玩家行动可能阻止其发生

---

## 总览步骤表

| 阶段 | 名称 | 输入 | 输出 | 强制 |
|------|------|------|------|------|
| 0 | 需求访谈 | 用户原始需求 | `generation-brief.md` | YES |
| 1 | 数据收集 | brief 中的实体清单 | `data/raw/` 结构化原始数据 | YES |
| 2 | 冲突检测与解决 | `data/raw/` | `data/resolved/` 已解决数据 | YES |
| 3 | 时间线感知人物提炼 | `data/resolved/` + start_date | `data/distilled/` 人物/势力/事件档案 | YES |
| 3.4 | 人物生态层设计 | 人物档案 + 时间跨度 | 生命周期管理 + 出生条件 + 血脉追踪 | YES（长跨度时） |
| 3.6 | 地理底盘构建 | 地理/区域数据 | `data/distilled/geography-layer.yaml` | YES |
| 3.7 | 物产时间线构建 | 作物/物产数据 | `data/distilled/commodity-timeline.yaml` | YES |
| 4 | 历史事件建模 | `data/distilled/` | 条件触发事件引擎规则 | YES |
| 5 | 追加设定规则化 | 用户设定 | 可执行规则 | YES |
| 6 | 包生成 | 所有已处理数据 | `{sim-slug}/` 完整 skill 包 | YES |
| 7 | 一致性校验 | 完整包 | 校验报告 + 修复 | YES |
| 8 | 交付 | 校验通过的包 | 交付汇报 | YES |

---

## 阶段 0：需求访谈

**目标**：与用户交互，确认模拟器所有核心参数。

**流程**：

1. 基于 `references/interview-checklist.md` 逐项确认
2. 新增确认项：
   - **史料版本偏好**：用户对同一人物/事件的蓝本偏好（默认"正史优先，演义补充"）
   - **时间线严格度**：人物是否严格不知道未来（默认"严格"）
   - **事件确定性**：历史事件是否必然发生（默认"条件触发，可阻止"）
3. 生成 `generation-brief.md`

**产物**：`data/generation-brief.md`

```yaml
sim_name: ""
sim_slug: ""
historical_anchor: ""
start_date: ""           # 精确到年月日
geography: ""
protagonist:
  name: ""
  identity: ""
  is_player: true
  modern_knowledge: false
fidelity_mode: ""        # strict_history / reasonable_fiction / mixed_fantasy
custom_injections: []
turn_granularity: ""     # day / ten_day / month / season / event_node
core_systems: []         # politics / finance / military / public / weather
recording_mode: ""       # game / balanced / novel
source_strictness: ""    # primary_only / primary_plus_academic / relaxed
dashboard_style: ""      # strategy_hud / classical_scroll / data_panel

# 新增字段
source_preference: ""    # history_first / fiction_first / custom_per_entity
timeline_strictness: ""  # strict / relaxed
event_certainty: ""      # conditional / guaranteed / custom

# 地图系统
map_config:
  geography_scope: ""    # 模拟覆盖的地理范围，如"中原及周边"、"已知世界"
  region_granularity: "" # 州/郡/县 -- 区域划分粒度
  outer_world_enabled: true/false  # 是否允许地图扩展到已知世界之外
  commodity_strictness: ""  # strict (严格按史实) / relaxed (允许提前获取，但有条件)

# 物产系统
commodity_config:
  historical_accuracy: ""  # strict (严格按引入时间线) / educational (提示真实历史但允许游戏化)
 穿越者_knowledge_override: false  # 穿越者是否知道未来作物（知识不等于获取能力）
```

**完成标准**：用户确认所有字段，无遗留问题。

---

## 阶段 1：数据收集（脚本辅助）

**目标**：用脚本收集和预处理原始史料数据，生成结构化文件，减少后续阶段的 token 消耗。

**核心思路**：

传统流程中，所有史料由 AI agent 在上下文中阅读、提取、结构化。这导致：
- 大量原文占用上下文窗口
- 重复处理相同信息
- 每次生成都要从头收集

改进方案：**脚本离线预处理 + 结构化文件输出**。AI agent 在生成阶段只读取已经结构化的小文件。

### 1.1 数据收集范围

根据 `generation-brief.md` 确定需要收集的实体：

| 实体类型 | 收集内容 | 收集维度 |
|----------|----------|----------|
| 人物 | 生平、官职、关系、决策、动机、制度位置 | 多版本对比 |
| 势力 | 组织结构、资源、利益、制度约束 | 多版本对比 |
| 事件 | 时间、参与方、因果、结果、影响 | 多版本对比 |
| 制度 | 规则、执行方式、约束边界 | 学术来源优先 |
| 气候 | 长期趋势、季节规律、灾害记录 | 学术来源优先 |
| 地理 | 关键地点、交通、资源分布 | 学术来源优先 |
| 区域 | 行政区划、地形地貌、物产、人口、关隘 | 学术来源优先 |
| 物产 | 作物/技术引入时间线、传播路线、获取条件 | 学术来源优先 |
| 外部世界 | 周边文明、贸易路线、可获取资源 | 学术来源优先 |

### 1.2 收集脚本

#### `scripts/collect.py` -- 主收集脚本

```python
"""
历史模拟器数据收集脚本

用法:
  python scripts/collect.py --brief data/generation-brief.md --output data/raw/

功能:
  1. 读取 generation-brief.md，提取实体清单
  2. 对每个实体执行多源搜索（正史、演义、学术研究、通俗读物）
  3. 将原始搜索结果结构化保存为 JSON 文件
  4. 为每个实体标记来源版本和置信度
"""

# 输出文件格式: data/raw/{entity_type}/{entity_name}.json
# {
#   "entity_type": "person|faction|event|institution|climate|geography",
#   "entity_name": "诸葛亮",
#   "collection_date": "2026-05-13",
#   "versions": [
#     {
#       "source_name": "三国志",
#       "source_type": "primary|fiction|academic|popular",
#       "source_tier": "A|B|C",
#       "raw_extracts": [
#         {
#           "content": "...",
#           "url": "...",
#           "retrieved_at": "..."
#         }
#       ],
#       "structured_data": {
#         "birth_year": null,
#         "death_year": null,
#         "active_period": "...",
#         "positions_held": [],
#         "key_events": [],
#         "relationships": [],
#         "motivations": [],
#         "decision_patterns": [],
#         "speech_style_examples": [],
#         "pressure_reactions": []
#       }
#     }
#   ]
# }
```

#### `scripts/extract.py` -- 结构化提取脚本

```python
"""
从原始收集数据中提取结构化人物七层档案

用法:
  python scripts/extract.py --input data/raw/ --output data/extracted/

功能:
  1. 读取每个实体的多版本原始数据
  2. 按 character-distillation.md 的七层模型提取
  3. 为每条提取结果标注来源版本和置信度
  4. 输出结构化 JSON 文件
"""

# 输出文件格式: data/extracted/{entity_name}.json
# {
#   "entity_name": "诸葛亮",
#   "layers": {
#     "hard_anchors": {
#       "birth_death": { "value": "181-234", "sources": [...], "confidence": "high" },
#       "positions": { "value": [...], "sources": [...], "confidence": "high" },
#       "key_events": { "value": [...], "sources": [...], "confidence": "high" }
#     },
#     "institutional_position": { ... },
#     "motivations": { ... },
#     "relationships": { ... },
#     "decision_heuristics": { ... },
#     "pressure_reactions": { ... },
#     "honesty_boundary": { ... }
#   },
#   "version_differences": [
#     {
#       "field": "草船借箭是否真实发生",
#       "versions": {
#         "三国志": "无此记录",
#         "三国演义": "详尽描写，诸葛亮主动策划"
#       },
#       "conflict_type": "factual_divergence|characterization_divergence|timeline_divergence|absence_vs_addition",
#       "severity": "high|medium|low"
#     }
#   ]
# }
```

#### 冲突检测（由 AI agent 直接执行）

冲突检测不使用脚本。由 AI agent 直接阅读原始来源进行语义级对比。

原因：脚本只能做字符串比较（`str(val_A) != str(val_B)`），无法理解语义。冲突检测是最需要理解能力的环节。

AI agent 的冲突检测方式：
1. 读取每个实体的所有来源数据（包括本地来源原文）
2. 语义级对比，识别事实分歧/人物塑造分歧/时间线分歧/有无分歧/评价分歧
3. 根据冲突对世界构建的实际影响评估严重度（不是按字段名硬编码）
4. 为每个冲突附加 `agent_notes`（语义分析，帮助用户决策）
5. 生成冲突报告，供用户审阅

详见 `phases/phase-2-resolve.md`。

### 1.3 收集执行流程

```
[用户确认 brief]
    |
    v
collect.py -- 收集原始史料
    |
    v
extract.py -- 结构化提取
    |
    v
[进入阶段 2: AI agent 语义冲突检测与解决]
```

**重要**：脚本收集的原始数据保存在 `data/raw/` 中。后续阶段读取的是已处理的结构化文件（`data/extracted/`），体积远小于原文，显著减少 token 消耗。

**完成标准**：
- 所有实体至少有 1 个来源版本的结构化数据
- 冲突检测报告已生成
- 每条数据都标注了来源和置信度

---

## 阶段 2：冲突检测与解决

**目标**：让用户审阅多版本冲突，选择蓝本和融合策略。

### 2.1 全局蓝本策略

首先让用户选择全局策略：

| 策略 | 说明 | 示例 |
|------|------|------|
| **正史优先** | 以正史为硬锚点，其他来源仅作补充 | 三国志为准，演义用于丰富细节 |
| **文学优先** | 以文学作品为蓝本，正史补充 | 三国演义为准，三国志补充制度细节 |
| **逐实体自定义** | 每个人物/事件单独选择蓝本 | 诸葛亮用演义版，曹操用正史版 |
| **融合创新** | 多版本综合，用户主导取舍 | 诸葛亮的能力取演义版，历史结局取正史版 |

### 2.2 逐冲突解决

对于冲突检测报告中的每个冲突，向用户展示：

```
冲突 #7: 诸葛亮 -- 空城计

| 来源 | 内容 |
|------|------|
| 三国志 | 无此事件记录 |
| 三国演义 | 诸葛亮独坐城楼，司马懿退兵 |
| 资治通鉴 | 无此事件记录 |
| 晋书 | 无此事件记录 |

冲突类型: 有无分歧（演义独有情节）
严重度: 高

请选择:
[A] 不纳入 -- 本世界的诸葛亮没有用过空城计
[B] 纳入 -- 本世界的诸葛亮确实用过空城计
[C] 变体 -- 类似事件发生过，但细节不同（请描述）
[D] 跳过 -- 后续决定
```

### 2.3 解决结果记录

每个解决结果记录在 `data/resolved/{entity_name}-resolution.json`：

```json
{
  "entity_name": "诸葛亮",
  "global_strategy": "literature_first",
  "resolutions": [
    {
      "conflict_id": 7,
      "field": "空城计",
      "decision": "include",
      "blueprint": "三国演义",
      "notes": "用户选择纳入，作为诸葛亮胆识的体现",
      "source_tier_override": null
    }
  ],
  "fusion_notes": "以三国演义为蓝本，正史补充制度细节。演义独有情节选择性纳入。"
}
```

**完成标准**：
- 所有高严重度冲突已解决
- 中低严重度冲突可使用全局策略默认处理
- 解决结果已持久化到文件

---

## 阶段 3：时间线感知人物提炼

**目标**：基于已解决数据和 start_date，提炼人物七层档案。严格限制人物只能知道 start_date 之前的信息。

### 3.1 知识层与行为模式层分离

这是本设计的**核心创新点**。

必须区分两层截然不同的东西：

**知识层**（人物知道了什么事实）-- 严格受时间线约束：

| 层级 | 内容 | 可见性 | 说明 |
|------|------|--------|------|
| **历史锚点** | start_date 之前的确切史实 | 人物可知 | 人物的实际经历和已知信息 |
| **趋势推演** | start_date 之前的经验总结 | 人物可知 | 基于过往经历形成的判断模式 |
| **未来盲区** | start_date 之后发生的一切 | 人物不可知 | 只有 GM 知道，人物不可能据此行动 |

**行为模式层**（人物会怎么做事）-- 可塑性分级：

行为模式层的关键问题不是"能不能用完整史料"，而是**性格在 start_date 这个时间点塑造成了多少**。

| 层级 | 内容 | 来源 | 说明 |
|------|------|------|------|
| **决策启发式** | 人物的判断模式、行动偏好 | 人物完整一生的史料 | 用于提炼模式，但根据可塑性分级决定在模拟中的权重 |
| **压力反应模式** | 遇到特定情境的反应倾向 | 人物完整一生的史料 | 同上 |
| **价值排序** | 人物最在意什么、最怕失去什么 | 人物完整一生的史料 | 同上 |

**性格可塑性分级**（决定行为模式在模拟中的约束强度）：

对每个人物，根据 start_date 与其人生关键塑造事件的关系，评估性格可塑性：

| 可塑性等级 | 判定条件 | 行为模式约束 | 示例 |
|------------|----------|-------------|------|
| **定型** | start_date 在人物成熟期之后，关键经历已发生 | 历史行为模式作为硬约束 | 诸葛亮 start_date=227，经历已成，性格固定 |
| **半成型** | start_date 在人物青年期，部分关键经历已发生，部分未发生 | 已发生的经历塑造的模式保留，未发生的标为"可变" | 诸葛亮 start_date=207，出山时已有学问和志向，但缺乏实战经验 |
| **未成型** | start_date 在人物幼年/少年期，核心经历均未发生 | 仅保留天性基底（天赋倾向），其余全部可变 | 诸葛亮 start_date=190，9岁，一切未定 |

### 3.1.1 性格可塑性评估方法

对每个人物执行以下评估：

**Step 1：识别关键塑造事件**

从史料中识别塑造该人物核心性格的关键事件。每个事件标记：

```yaml
character_shaping_events:
  - event: "随叔父逃避战乱"
    date: "194"
    shaped_traits: ["对乱世苦难的切身体会", "对安定的渴望"]
    reversibility: "irreversible"  # 此经历不可撤销，即使模拟中改变了外部环境，记忆已形成

  - event: "躬耕南阳十年"
    date: "197-207"
    shaped_traits: ["博览群书的学识积累", "对天下大势的独立判断力", "淡泊明志的处世态度"]
    reversibility: "partially_reversible"  # 如果模拟中诸葛亮没机会读书，学识不会积累

  - event: "三顾茅庐"
    date: "207"
    shaped_traits: ["君臣互信的起点", "兴复汉室的政治承诺"]
    reversibility: "reversible"  # 如果模拟中刘备没来，或来了但诸葛亮没答应

  - event: "赤壁之战"
    date: "208"
    shaped_traits: ["对孙刘联盟策略的实战验证", "军事自信"]
    reversibility: "reversible"

  - event: "北伐"
    date: "227-234"
    shaped_traits: ["谨慎用兵的决策模式", "事必躬亲的管理风格"]
    reversibility: "reversible"
```

**Step 2：按 start_date 切割已发生 / 未发生**

```yaml
# 假设 start_date = 200（诸葛亮19岁）
shaping_status:
  occurred:
    - event: "随叔父逃避战乱(194)"
      traits_absorbed: ["对乱世苦难的切身体会", "对安定的渴望"]
      locked: true       # 已经历的塑造，不可撤销
    - event: "躬耕南阳(197-200，进行了3年)"
      traits_absorbed: ["部分学识积累（但未完成十年沉淀）"]
      locked: true
      note: "只完成了3年，学识和判断力远未到历史水平"

  not_yet_occurred:
    - event: "躬耕南阳剩余7年(200-207)"
      potential_traits: ["博览群书的完整学识", "对天下大势的独立判断力"]
      depends_on: "诸葛亮是否继续留在南阳读书"
    - event: "三顾茅庐(207)"
      potential_traits: ["君臣互信", "政治承诺"]
      depends_on: "刘备是否来，诸葛亮是否答应"
    - event: "北伐(227-234)"
      potential_traits: ["谨慎用兵", "事必躬亲"]
      depends_on: "一系列前置条件"
```

**Step 3：评估可塑性等级并生成人物状态**

基于切割结果，将人物的行为模式分为三类：

```yaml
personality_state:
  # 天性基底：天赋倾向，天生如此，不受经历改变
  innate_traits:
    - trait: "聪慧，记忆力强"
      evidence: "早年即以才学闻名"
      confidence: "high"
      malleability: "locked"  # 天赋不可改变

    - trait: "对秩序和体系的天然偏好"
      evidence: "后续所有行为都体现系统性思维"
      confidence: "medium"
      malleability: "locked"

  # 已成型特质：start_date 前的经历已塑造，目前生效
  formed_traits:
    - trait: "对乱世的厌恶和对安定的渴望"
      source_event: "随叔父逃避战乱(194)"
      confidence: "high"
      malleability: "formed"  # 已形成，但极端经历可能改变
      reshaping_conditions:   # 什么情况下可能改变
        - "如果玩家给诸葛亮提供了完全不同的安全感来源"
        - "如果战乱被提前平定，诸葛亮从未体验过流离失所"

    - trait: "初步的学识积累"
      source_event: "躬耕南阳前3年(197-200)"
      confidence: "high"
      malleability: "forming"  # 正在形成中，可被改变
      current_level: "partial" # 只完成了部分
      reshaping_conditions:
        - "如果不再有读书的环境和资源"
        - "如果被卷入其他事务无暇读书"

  # 未成型特质：start_date 后的塑造事件尚未发生，可能永远不会发生
  potential_traits:
    - trait: "谨慎用兵的决策模式"
      source_event: "北伐(227-234)"  # 历史来源
      confidence: "high"              # 对历史人物的判断有信心
      malleability: "unformed"        # 但在模拟中尚未形成
      formation_conditions:           # 需要什么才会形成
        - "经历了长期战争"
        - "承担了军事决策责任"
        - "经历过因冒进而失败的教训"
      alternative_outcomes:           # 如果条件不同，可能变成什么
        - "如果早期军事行动全部成功 → 可能形成'果断用兵'模式"
        - "如果从未承担军事责任 → 可能永远不展现军事性格"
        - "如果只经历游击战 → 可能形成'灵活应变'而非'谨慎'模式"
```

### 3.1.2 可塑性在模拟运行中的动态机制

目标模拟器运行时，不是静态查表，而是动态判定：

**规则 1：天性基底始终生效**

天赋级别的特质（聪慧、记忆力、性格底色）不受任何经历改变。这是人物的"硬件"。

**规则 2：已成型特质作为默认行为，但可被新经历改写**

已形成的性格模式作为初始默认。但如果模拟中发生了与历史不同的重大经历，GM 需要评估：

```
判断逻辑：
  新经历是否与塑造原始特质的经历冲突？
    - 是 → 原始特质开始动摇，标记为"不稳定"
    - 否 → 原始特质保持

  "不稳定"特质是否持续受到冲突经历的强化？
    - 是（累积 >= 3 次冲突经历）→ 原始特质被替换为新特质
    - 否（冲突经历是孤立的）→ 原始特质恢复稳定
```

**规则 3：未成型特质不预设为必然形成**

未成型特质只记录在 GM 的"历史参考"中，不写入人物卡作为当前行为约束。只有当模拟中的经历恰好满足形成条件时，特质才会"激活"。

激活后的特质写入人物卡，从此生效。

**规则 4：人物偏离历史的判定**

当人物行为严重偏离历史模板时，GM 不需要强行拉回，但需要：

1. 记录偏离原因（什么经历导致了偏离）
2. 评估偏离是否合理（基于天性基底和已成型特质）
3. 如果偏离与天性基底矛盾，需要足够强的经历支撑
4. 通知玩家"此人物已显著偏离历史轨迹"

### 3.1.3 示例场景

**场景：玩家穿越到 190 年的琅琊，遇到 9 岁的诸葛亮**

```yaml
personality_state:
  innate_traits:
    - trait: "聪慧"
      malleability: "locked"
    - trait: "好奇心强"
      malleability: "locked"

  formed_traits: []  # 9岁，几乎没有任何已成型特质

  potential_traits:
    - trait: "博览群书的学识"
      source_event: "躬耕南阳(197-207)"
      malleability: "unformed"
      formation_conditions: ["有安静的读书环境", "有书可读", "有人指导"]
      alternative_outcomes:
        - "如果玩家把诸葛亮带到军营长大 → 可能成为军事天才但缺乏文治素养"
        - "如果诸葛亮从未接触典籍 → 可能成为完全不同的人"
        - "如果玩家培养其商业才能 → 可能成为杰出的商人而非政治家"

    - trait: "兴复汉室的政治理想"
      source_event: "时代背景 + 躬耕期间思考"
      malleability: "unformed"
      formation_conditions: ["接触到汉室衰微的现实", "形成忠汉的价值观"]
      alternative_outcomes:
        - "如果玩家帮汉室中兴 → 诸葛亮可能根本不会有这个理想"
        - "如果诸葛亮在曹魏治下长大 → 可能成为曹魏的忠臣"
```

在这个场景下，模拟器应该：
- 不预设诸葛亮一定会成为蜀汉丞相
- 不预设诸葛亮一定谨慎用兵（还没打过仗）
- 只锁定"聪慧""好奇心强"这样的天性
- 根据模拟中实际发生的经历，逐步塑造性格
- 允许玩家把诸葛亮培养成完全不同的人

### 3.2 提炼七层（带时间标记）

对每个人物按七层提炼，每条信息标记时间属性、层级归属、可塑性等级：

```yaml
name: "诸葛亮"
start_date: "207"  # 假设模拟器起始时间
malleability_level: "semi_formed"  # 定型 / 半成型 / 未成型

layers:
  # === 知识层（受时间线约束） ===

  hard_anchors:
    - fact: "生于阳都，琅琊诸葛氏"
      time_scope: "181-207"
      layer_type: "knowledge"
      knowable_by: "character"
      sources: [...]
    - fact: "刘备三顾茅庐"
      time_scope: "207"
      layer_type: "knowledge"
      knowable_by: "character"
      sources: [...]

  institutional_position:
    - fact: "丞相，录尚书事"
      time_scope: "221-234"
      layer_type: "knowledge"
      knowable_by: "gm_only"
      note: "start_date 后，仅 GM 可知。人物当前身份是军师"

  motivations:
    - fact: "兴复汉室"
      time_scope: "207-234"
      layer_type: "knowledge"
      knowable_by: "character"
      formation_date: "207"
      note: "三顾之后确立"

  relationships:
    - target: "刘备"
      type: "君臣"
      start_date: "207"
      layer_type: "knowledge"
      knowable_by: "character"

  # === 行为模式层（按可塑性分级） ===

  personality_state:
    # 天性基底（locked）
    innate_traits:
      - trait: "聪慧，记忆力超群"
        malleability: "locked"
        evidence: "年少即以才学闻名"
      - trait: "对秩序和体系的天然偏好"
        malleability: "locked"
        evidence: "一生行事均体现系统性思维"

    # 已成型特质（formed / forming）
    formed_traits:
      - trait: "博览群书的深厚学识"
        source_event: "躬耕南阳十年(197-207)"
        malleability: "formed"
        confidence: "high"
      - trait: "对天下大势的独立判断力"
        source_event: "躬耕期间观察思考"
        malleability: "formed"
        confidence: "high"

    # 未成型特质（unformed）-- 仅 GM 参考
    potential_traits:
      - trait: "谨慎用兵的决策模式"
        source_event: "北伐(227-234)"
        malleability: "unformed"
        formation_conditions:
          - "经历了长期战争并承担军事决策"
          - "经历过因冒进或准备不足而失败的教训"
        alternative_outcomes:
          - "如果早期军事行动全部成功 → 可能形成'果断用兵'模式"
          - "如果从未承担军事责任 → 可能永远不展现军事性格"

      - trait: "事必躬亲的管理风格"
        source_event: "北伐期间(227-234)"
        malleability: "unformed"
        formation_conditions:
          - "承担了超出个人精力的事务"
          - "缺乏足够信任的下属"
        alternative_outcomes:
          - "如果有可信赖的班子 → 可能形成'善用人才'的管理风格"

  # === 诚实边界 ===

  honesty_boundary:
    - gap: "早年（207前）的真实性格细节"
      reason: "史料主要记载其成名后的事迹，少年时期性格多属推测"
      confidence: "low"
```

**不同 start_date 下同一人物的对比**：

| start_date | 可塑性等级 | innate_traits | formed_traits | potential_traits |
|------------|-----------|---------------|---------------|------------------|
| 227（北伐前夜） | 定型 | 聪慧、系统思维 | 谨慎、学识、政治理想、军政经验 | 几乎没有（性格已完全形成） |
| 207（三顾茅庐） | 半成型 | 聪慧、系统思维 | 学识、判断力 | 谨慎用兵、事必躬亲、兴复汉室的执念 |
| 194（战乱童年） | 半成型 | 聪慧 | 对乱世的恐惧 | 学识、政治理想、一切军事性格 |
| 190（9岁） | 未成型 | 聪慧、好奇心 | 几乎没有 | 一切皆有可能 |

### 3.3 未来事件处理

对于 start_date 之后的历史事件，不作为人物知识，而是作为 **GM 事件池**：

```yaml
# 仅存在于 GM 视角
future_events_pool:
  - event: "五丈原之战"
    historical_date: "234"
    trigger_conditions:
      - "诸葛亮仍在世"
      - "蜀汉与曹魏仍处于战争状态"
      - "蜀汉粮草与兵力仍可支撑北伐"
    probability_modifier: 0.8  # 默认发生概率
    blockable: true            # 玩家行动是否可以阻止
    block_conditions:
      - "蜀汉提前与曹魏议和"
      - "诸葛亮病逝于其他原因"
      - "蜀汉内乱导致北伐中止"
```

**完成标准**：
- 所有人物七层档案已提炼
- 每条信息标记了时间范围和可知性
- start_date 之后的事件已转入 GM 事件池
- 来源标注完整

### 3.4 人物生态层：全生命周期管理

**目标**：长时间跨度模拟器必须管理人物的出生、成长、衰老和死亡。历史人物不是从天而降的，他们的出生依赖于前置条件。

#### 3.4.1 核心问题

以下场景在长时间跨度模拟器中必然出现：

- **初始人物死亡**：start_date 的人物终将老死或战死
- **历史人物尚未出生**：start_date 远早于他们的出生年
- **出生条件被破坏**：玩家行动导致某个人物的家族覆灭，该人物永远不会出生
- **历史严重偏离**：前置条件全部改变，历史人物即使出生也处于完全不同的世界
- **新人物涌现**：长时间跨度下，非历史人物需要被生成以填充世界

#### 3.4.2 人物生命周期状态

每个人物在模拟器中拥有一个生命周期状态，随时间推移在状态间转换：

```
不存在 → 可孕育 → 在孕 → 已出生 → 成长期 → 活跃期 → 衰退期 → 死亡 → 已故
```

| 状态 | 说明 | 进入条件 | 退出条件 |
|------|------|----------|----------|
| **不存在** | 人物尚未被孕育 | 默认 | 父母存活且条件满足 |
| **可孕育** | 出生前置条件已满足 | 父母存活、在合适地点、条件满足 | 受孕（进入在孕）或条件失效（回到不存在） |
| **在孕** | 已受孕，等待出生 | 生物规律 | 出生（约10个月）或流产 |
| **已出生** | 婴幼儿，无法独立行动 | 在孕期满 | 达到成长年龄 |
| **成长期** | 性格正在被经历塑造 | 年龄达到成长阈值 | 经历足够的塑造事件 |
| **活跃期** | 完全参与世界运作 | 性格基本成型 | 年龄、疾病、意外 |
| **衰退期** | 体力下降，影响力减弱 | 达到年龄阈值或健康恶化 | 死亡 |
| **死亡** | 退出活跃世界 | 上述条件触发 | 不可逆 |
| **已故** | 仅存在于记忆和记录中 | 死亡 | 永久 |

#### 3.4.3 出生条件系统

每个尚未出生的历史人物必须定义出生前置条件：

```yaml
character_birth_card:
  name: "诸葛亮"
  historical_birth_date: "181"

  birth_preconditions:
    # 硬性条件：不满足则绝对不可能出生
    hard_conditions:
      - condition: "诸葛珪（父）在 180-181 年间存活"
        type: "ancestor_alive"
        ancestor: "诸葛珪"
        required_date_range: "180-181"
        current_status: "check"   # 需要在模拟中动态检查

      - condition: "诸葛珪在 180-181 年间有配偶/伴侣"
        type: "parent_partnership"
        note: "章氏（母）"

      - condition: "诸葛家族未被灭族"
        type: "clan_survival"
        clan: "琅琊诸葛氏"

    # 软性条件：影响出生概率但不绝对阻断
    soft_conditions:
      - condition: "琅琊阳都地区社会秩序相对稳定"
        type: "regional_stability"
        impact_if_failed: "出生概率降低，家庭可能流离导致无法养育"

      - condition: "家庭经济条件足以养育后代"
        type: "economic_viability"
        impact_if_failed: "可能出生但夭折率高"

    # 出生时间窗口
    conception_window:
      earliest: "180"
      latest: "182"
      note: "历史记录为181年，允许±1年波动"

  birth_failure_consequences:
    - condition: "诸葛珪在 180 年前死亡"
      result: "诸葛亮不可能出生"
      cascade: "诸葛瑾（兄）可能仍然出生，但家庭结构不同"

    - condition: "琅琊诸葛氏在 180 年前被灭族"
      result: "整个诸葛家族后代均不存在"
      cascade: "蜀汉失去核心谋主，三国格局可能完全不同"

    - condition: "阳都地区被屠城（如曹操征陶谦波及）"
      result: "如果发生在 181 年前，诸葛亮可能未出生即死亡"
      cascade: "如果已出生，则成为战乱孤儿，成长经历完全不同"
```

#### 3.4.4 家族/血脉追踪

模拟器需要维护一个简化的血脉关系图，用于判定出生条件：

```yaml
# 简化的血脉追踪
bloodline_registry:
  clan_name: "琅琊诸葛氏"
  members:
    - name: "诸葛珪"
      role: "族中长辈/诸葛亮之父"
      birth: "?"
      death: "约189"   # 历史死亡时间（在模拟中可能不同）
      status: "alive"  # 模拟中当前状态
      children: ["诸葛瑾", "诸葛亮", "诸葛均"]

    - name: "诸葛玄"
      role: "族中长辈/诸葛亮叔父"
      birth: "?"
      death: "约197"
      status: "alive"
      children: []

    - name: "诸葛瑾"
      role: "诸葛亮之兄"
      birth: "174"
      death: "241"
      status: "active"
      children: ["诸葛恪"]
      birth_preconditions:
        hard_conditions:
          - "诸葛珪存活至 173 年"

  birth_queue:
    # 按历史出生时间排序的待出生人物队列
    - name: "诸葛亮"
      expected_birth: "181"
      preconditions_met: true   # 动态更新
      blocked: false
      block_reason: null

    - name: "诸葛均"
      expected_birth: "约183"
      preconditions_met: true
      blocked: false
      block_reason: null
```

**关键规则**：

1. 每回合结算时，检查所有待出生人物的出生条件
2. 条件满足 → 进入"可孕育"状态，按概率判定是否在本回合受孕
3. 条件不满足 → 标记为"blocked"，记录阻断原因
4. 一旦标记 blocked，后续回合重新检查时如果条件恢复，可重新激活

#### 3.4.5 死亡系统

人物的死亡不是脚本杀，而是基于条件判定：

```yaml
death_system:
  death_causes:
    natural_aging:
      trigger: "年龄超过该时代平均寿命"
      probability: "随年龄递增"
      note: "修仙题材需要单独定义寿命规则"

    disease:
      trigger: "健康状态持续下降 或 疫病事件"
      probability: "基于年龄、健康、医疗条件"

    violence:
      trigger: "战死、谋杀、处刑"
      probability: "基于军事参与度、政治风险、敌对关系"

    starvation:
      trigger: "饥荒事件 且 人物处于灾区"
      probability: "基于阶层（底层更高）、是否有资源逃离"

  death_settlement:
    # 每回合对每个活跃人物执行死亡判定
    process:
      1. "检查年龄，超过阈值进入衰老概率区"
      2. "检查健康状态和当前环境风险"
      3. "检查是否处于战斗/冲突中"
      4. "综合判定死亡概率"
      5. "如果触发死亡，执行死亡结算"

    death_consequences:
      - "更新血脉追踪，标记已故"
      - "检查待出生人物的出生条件是否受影响"
      - "触发继承/权力转移"
      - "更新势力结构"
      - "提取遗产，写入遗产池"
      - "将人物卡从活跃池移入归档池"
      - "记录到人物传记和编年史"
```

#### 3.4.6 人物退场与遗产系统

**核心原则**：人物卡和人物影响力是两个东西。人物死后，卡归档，影响力留下。

##### 人物池隔离

模拟器维护两个物理隔离的人物池，调度器只扫描活跃池：

```
人物总库
├── 活跃池 (active_pool)      ← 调度器每回合扫描此池
│   ├── 成长期人物
│   ├── 活跃期人物
│   └── 衰退期人物
│
├── 等待池 (waiting_pool)     ← 出生条件检查器扫描此池
│   ├── 不存在（待出生）
│   └── 可孕育
│
└── 归档池 (archive_pool)     ← 调度器不扫描，仅做历史查询
    └── 已故人物卡
```

**硬规则**：

1. 调度器的回合结算**只扫描活跃池**，不会错误调用已故人物
2. 已故人物卡移入归档池，保持完整记录不删除
3. 归档池可被查询（如玩家调查历史、后代追溯祖先），但不参与回合结算

##### 人物退场流程

人物死亡时执行以下退场结算：

```
退场结算流程:

1. 冻结人物卡
   - 将 lifecycle_state 标记为 "deceased"
   - 将 last_active_date 标记为当前日期
   - 人物卡所有字段变为只读

2. 提取遗产
   - 遍历人物卡的已成型特质和成就
   - 将可延续的影响力提取为遗产条目
   - 写入遗产池

3. 转移资源
   - 权力/职位 → 继承人
   - 财产/领地 → 继承人
   - 人脉/势力关系 → 按关系类型分配
   - 未完成的计划 → 标记为"中断"，可能被他人接手

4. 移入归档池
   - 人物卡从活跃池移除
   - 完整写入归档池，保留所有历史记录

5. 通知
   - 如果是主角关注的人物，在回合输出中通知
   - 如果是势力核心人物，触发势力动荡事件
```

##### 遗产系统

人物死后的影响力通过"遗产条目"继续存在于世界中。遗产条目是独立于人物卡的实体：

```yaml
# 遗产池是独立的数据结构，不依赖人物卡
legacy_pool:
  - legacy_id: "LEG-001"
    source_character: "诸葛亮"
    death_date: "234"

    # 遗产类型 1：制度遗产
    type: "institutional"
    content: "蜀汉政治制度框架"
    influence:
      - "蜀汉后续统治者仍在沿用诸葛亮制定的行政体系"
      - "法制框架持续约束蜀汉朝局"
    decay:
      rate: "slow"          # 制度遗产衰退慢
      half_life: "约30年"    # 约30年后影响力减半
      current_strength: 1.0  # 初始强度

    # 遗产类型 2：精神遗产
  - legacy_id: "LEG-002"
    source_character: "诸葛亮"
    death_date: "234"
    type: "spiritual"
    content: "鞠躬尽瘁、死而后已的忠臣形象"
    influence:
      - "成为后世忠臣的标杆"
      - "影响蜀汉臣子的自我期许"
      - "可能被后人利用作为政治号召的符号"
    decay:
      rate: "very_slow"
      half_life: "约100年"
      current_strength: 1.0
      note: "精神遗产可以跨越代际，甚至在人物出生前就作为文化符号存在"

    # 遗产类型 3：人脉遗产
  - legacy_id: "LEG-003"
    source_character: "诸葛亮"
    death_date: "234"
    type: "relational"
    content: "门生故吏网络"
    influence:
      - "蒋琬、费祎等继承其政治遗产"
      - "诸葛瞻因其父声望获得特殊地位"
    decay:
      rate: "medium"
      half_life: "约15年"
      current_strength: 1.0
      transfer_to: ["蒋琬", "费祎", "董允", "诸葛瞻"]

    # 遗产类型 4：未完成计划
  - legacy_id: "LEG-004"
    source_character: "诸葛亮"
    death_date: "234"
    type: "unfinished_plan"
    content: "北伐统一中原的战略规划"
    influence:
      - "姜维继承北伐意愿"
      - "但执行能力和资源已不如诸葛亮在世时"
    decay:
      rate: "fast"
      half_life: "约5年"
      current_strength: 1.0
      transfer_to: ["姜维"]
      note: "计划类遗产衰退最快，因为执行环境已经变化"

    # 遗产类型 5：秘密/隐患
  - legacy_id: "LEG-005"
    source_character: "某权臣"
    death_date: "xxx"
    type: "hidden_legacy"
    content: "生前隐藏的密谋、账目、把柄"
    influence:
      - "可能被后人发现并引发事件"
      - "知情人可能利用或掩盖"
    decay:
      rate: "none"       # 秘密不会自然衰退
      exposure_risk: "随时间可能因线索暴露而增加"
      current_strength: 1.0
      note: "秘密类遗产在退场后可能比在世时更有影响力"
```

##### 遗产衰退规则

所有遗产都有衰退机制，不会永远保持初始强度：

| 遗产类型 | 衰退速度 | 说明 |
|----------|----------|------|
| 制度遗产 | 慢 | 法度、行政体系，需要主动改革才会改变 |
| 精神遗产 | 极慢 | 文化符号、道德标杆，可以跨代际 |
| 人脉遗产 | 中 | 门生故吏，随他们也老去而消退 |
| 未完成计划 | 快 | 执行环境已变，后继者能力不同 |
| 秘密/隐患 | 不衰退 | 可能随时间暴露概率增加 |

**衰退结算**：每回合检查所有活跃遗产条目，按类型乘以衰减系数。强度降到阈值以下时，遗产条目标记为"消散"，从活跃遗产池移入历史遗产池。

##### 归档池的使用场景

调度器不扫描归档池，但以下场景会读取：

| 场景 | 读取方式 |
|------|----------|
| 玩家询问某人物生平 | 查询归档池，展示传记 |
| 后代追溯祖先 | 查询血脉关系，追溯到已故祖先 |
| 秘密暴露事件 | 检查已故人物的隐藏遗产 |
| 精神遗产被引用 | 检查已故人物的文化影响 |
| 编年史/小说化记录 | 引用已故人物的完整档案 |
| 偏离度评估 | 对比已故人物的历史轨迹和模拟轨迹 |

##### 人物卡归档格式

归档后的人物卡保持完整，但增加归档头：

```yaml
# 归档池中的人物卡
archive_header:
  lifecycle_state: "deceased"
  birth_date: "181"
  death_date: "234"         # 实际死亡日期（可能与历史不同）
  historical_death: "234"   # 历史死亡日期
  death_cause: "病逝于五丈原" # 实际死因
  active_turns: 120          # 参与了多少个回合
  divergence_from_history: "low"  # 与历史轨迹的偏离度

  # 归档时的状态快照
  final_state:
    last_position: "蜀汉丞相"
    last_location: "五丈原"
    prestige_at_death: 95
    relationships_at_death: [...]

  # 遗产索引
  legacies: ["LEG-001", "LEG-002", "LEG-003", "LEG-004"]

# 以下是完整的人物卡内容（冻结，不可修改）
personality_state:
  innate_traits: [...]
  formed_traits: [...]
  # 完整保留
```

#### 3.4.6 新人物涌现

长时间跨度下，历史人物会用完。模拟器需要生成非历史人物填充世界。

**新人物分类**：

| 类型 | 来源 | 行为模式 |
|------|------|----------|
| **历史人物** | 史料记录 | 基于提炼的七层档案 |
| **血脉延续人物** | 历史人物的子孙，史料有记载但记载极少 | 天性基底从父母推演，其余由经历塑造 |
| **涌现人物** | 完全由模拟中产生，史料无记载 | 天性基底随机生成，全部由经历塑造 |

**涌现人物的生成规则**：

```yaml
emergent_character_generation:
  trigger_conditions:
    - "某个势力缺乏足够人手运作"
    - "某个地区缺少行政/军事管理者"
    - "玩家主动培养/提拔了某个 NPC"
    - "随机事件产生了有潜力的人物"

  generation_process:
    1. "确定需求：势力需要什么类型的人才"
    2. "生成天性基底：基于家族背景、地域文化、时代特征"
    3. "生成初始状态：年龄、身份、资源、关系"
    4. "标记为'涌现人物'：无历史参考，完全由模拟驱动"
    5. "进入成长期：由实际经历塑造性格"

  quality_control:
    - "涌现人物的初始能力不应超过'合理范围'"
    - "涌现人物的成长速度应有上限"
    - "涌现人物不应莫名其妙成为核心角色，需要有合理的晋升路径"
    - "涌现人物的性格应该有内在一致性"
```

#### 3.4.7 历史偏离度追踪

长时间跨度下，历史偏离会累积到不可逆转的程度。GM 需要追踪偏离度：

```yaml
divergence_tracker:
  # 偏离度维度
  dimensions:
    personnel:
      description: "核心人物的存在和状态是否与历史一致"
      level: 0  # 0=完全一致, 1=轻微偏离, 2=显著偏离, 3=完全不同
      triggers:
        level_1: "某个核心人物的性格发生显著变化"
        level_2: "某个核心人物站在了历史上的对立面"
        level_3: "某个核心人物从未出生"

    events:
      description: "重大历史事件是否按预期发生"
      level: 0
      triggers:
        level_1: "某个重大事件发生了但细节不同"
        level_2: "某个重大事件被阻止"
        level_3: "一连串重大事件全部偏移"

    geography:
      description: "领土和控制范围是否与历史一致"
      level: 0

    institutions:
      description: "制度和组织是否与历史一致"
      level: 0

  # 综合偏离度
  overall_divergence: 0  # 各维度的加权平均

  # 偏离度影响
  divergence_effects:
    - threshold: 1
      effect: "历史事件概率下调 20%，增加随机事件"
    - threshold: 2
      effect: "大部分历史事件不再触发，涌入更多涌现人物"
    - threshold: 3
      effect: "进入自由演化模式，仅保留天性基底作为参考"

  # 偏离度通知
  notification_rules:
    - "每次偏离度升级时通知玩家"
    - "说明导致升级的关键事件"
    - "给出当前世界与历史的对比摘要"
```

#### 3.4.8 极端场景：修仙题材长跨度

修仙题材可能跨越数百年甚至上千年。这需要额外规则：

```yaml
cultivation_specific_rules:
  lifespan:
    normal_human: "60-80年"
    cultivation_base: "视境界而定，可能数百到数千年"
    effect_on_character_system: "历史人物寿命可能大幅延长，改变政治格局"

  power_system:
    - "修仙者能力远超凡人，个人力量可以改变战局"
    - "修仙家族有血脉传承，增强后代的修炼天赋"
    - "但修仙者可能闭关数十年，期间完全不参与世事"

  history_divergence_acceleration:
    - "修仙者介入凡间争端 → 历史偏离加速"
    - "修仙者闭关 → 凡间按自身逻辑运行"
    - "修仙资源争夺 → 可能提前引发历史冲突"

  character_pool:
    - "修仙者可以活很久，缓解了人物死亡的问题"
    - "但弟子和后辈仍然需要生成"
    - "修仙家族的血脉追踪更加重要"
```

---

### 阶段 3.6：地理底盘构建

**触发条件**：所有模拟器都必须执行。

**目标**：基于历史时期的行政区划和地理信息，构建 L1 静态地理底盘、定义外部世界区域、建立区域邻接图。

**数据来源**：阶段 1 收集的地理和区域数据。

**流程**：

#### 3.6.1 区域划分

根据 `map_config.region_granularity` 确定区域粒度，划分模拟覆盖范围内的所有区域：

```yaml
region_generation:
  granularity: "州"  # 州级 / 郡级 / 县级
  scope: "中原及周边"
  source: "《汉书·地理志》/《后汉书·郡国志》/对应时期的行政区划"

  process:
    1. "确定目标时期的行政区划体系"
    2. "按粒度划分区域，为每个区域分配唯一 ID"
    3. "填写地形、气候、资源、人口等静态属性"
    4. "建立区域邻接关系和关隘信息"
    5. "标注战略要地和交通枢纽"
```

#### 3.6.2 外部世界定义

当 `map_config.outer_world_enabled` 为 true 时，定义已知世界之外的可接触区域：

```yaml
outer_world_generation:
  process:
    1. "确定已知世界的边界区域"
    2. "为每个边界方向定义外部区域（如西域、南洋、北方草原、东北）"
    3. "定义每个外部区域的接入条件、贸易难度、可用资源"
    4. "标注该时期的历史贸易路线（如丝绸之路）"
    5. "定义作物/物产可获取性矩阵"
```

#### 3.6.3 地形与系统影响映射

为每种地形类型定义对军事、财政、民情的系统影响数值，确保地形不是描述性文字而是可计算参数。

**产物**：`data/distilled/geography-layer.yaml`

**完成标准**：
- 所有区域已划分，静态属性已填写
- 邻接关系和关隘信息已建立
- 外部世界区域（如启用）已定义
- 地形系统影响数值已映射

---

### 阶段 3.7：物产时间线构建

**触发条件**：所有模拟器都必须执行。

**目标**：基于历史时期和地理范围，构建作物/物产的引入时间线，定义获取条件和渠道。

**流程**：

#### 3.7.1 作物可用性评估

对每种可能的作物，评估其在目标时期是否可用：

```yaml
crop_assessment:
  for_each_crop:
    1. "确认作物原产地和驯化时间"
    2. "确认作物传入中国的时间和历史路线"
    3. "判定在 start_date 时该作物是否已在中国境内"
    4. "如未在中国境内，判定是否可通过外部世界获取"
    5. "评估获取难度（地理距离、贸易条件、外交关系）"
```

#### 3.7.2 引入时间线生成

基于评估结果生成时间线：

```yaml
timeline_generation:
  already_available: []     # start_date 时已广泛存在的作物
  potentially_available: [] # 通过主动探索可获取的作物
  future_introduction: []   # 历史上有明确引入时间的作物（未来可能自然出现）
  impossible: []            # 该时期不可能获得的作物
```

#### 3.7.3 获取渠道定义

为每种可获取但尚未引入的作物定义获取渠道和条件。

**产物**：`data/distilled/commodity-timeline.yaml`

**完成标准**：
- 所有相关作物的可用性已评估
- 引入时间线已生成
- 获取渠道和条件已定义
- 与外部世界定义的贸易路线已关联

---

## 阶段 4：历史事件建模

**目标**：将所有历史事件建模为"条件触发"，而非"时间到达即触发"。

### 4.1 事件分类

| 事件类型 | 说明 | 触发方式 | 可阻止 |
|----------|------|----------|--------|
| **硬锚点** | 发生在 start_date 之前的事件 | 已发生，写入背景 | 不可阻止 |
| **趋势事件** | 基于历史趋势大概率发生 | 条件满足时触发 | 可阻止 |
| **偶然事件** | 历史上发生了但有偶然性 | 条件满足 + 概率判定 | 可阻止 |
| **人物驱动事件** | 由特定人物行动引发 | 人物行动触发 | 改变条件即可改变 |
| **气候/天灾事件** | 天气灾害 | 独立概率判定 | 不可阻止（除非有超自然设定） |

### 4.2 事件卡片格式

每个事件写成条件卡片：

```yaml
event_id: "EVT-SG-001"
event_name: "赤壁之战"
historical_date: "208冬"
event_type: "trend"         # hard_anchor / trend / accidental / character_driven / climate
probability_base: 0.9       # 基础发生概率

trigger_conditions:
  all_of:
    - "曹操已率军南下"
    - "孙刘联盟已形成或即将形成"
    - "曹军已抵达长江北岸"
  any_of: []

block_conditions:
  - "曹操放弃南下"
  - "孙刘未能结盟"
  - "曹操选择其他进军路线（如从汉中入蜀）"

modify_conditions:
  - condition: "诸葛亮成功说服孙权"
    modifier: "+0.1 概率"
  - condition: "曹操军中已爆发大规模疫病"
    modifier: "+0.2 概率（曹方劣势增大）"
  - condition: "黄盖诈降失败"
    modifier: "-0.3 概率（火攻条件不满足）"

outcome_if_triggered:
  - outcome: "曹军大败，退回北方"
    probability: 0.7
  - outcome: "曹军小败，仍占据荆州部分"
    probability: 0.2
  - outcome: "双方僵持，曹操缓退"
    probability: 0.1

outcome_if_blocked:
  - "曹操稳固荆州，从侧翼压制江东"
  - "孙刘联盟可能瓦解"

cascade_events:
  triggered:
    - "刘备占据荆州南部"
    - "三国鼎立格局加速形成"
  blocked:
    - "曹操可能提前统一南方"
    - "刘备可能继续流亡"
```

### 4.3 事件引擎规则

目标模拟器的事件引擎必须遵循：

1. **每回合检查**：所有待触发事件检查条件
2. **概率判定**：条件满足后按概率判定是否触发
3. **玩家影响**：玩家行动可改变触发条件
4. **连锁反应**：一个事件触发后，检查其级联事件
5. **不触发也有后果**：历史事件未发生时，世界按新条件自行演化
6. **GM 记录**：无论是否触发，都在 GM 账本中记录原因

**完成标准**：
- 所有历史事件已建模为条件卡片
- 每个事件有明确的触发条件、阻止条件、概率
- 级联事件链已梳理
- 事件可追溯来源

---

## 阶段 5：追加设定规则化

**目标**：把用户追加的每个创意设定翻译成可执行规则。

与现有 SKILL.md 第二步相同，但增加与阶段 3、4 的交叉验证：

- 设定是否改变了某些事件的触发条件？
- 设定是否赋予了人物超越时间线的知识？
- 设定是否需要修改事件概率？

**完成标准**：每个设定都有对应的可执行规则，无模糊地带。

---

## 阶段 6：包生成

**目标**：基于前面所有阶段的产物，生成完整的目标模拟器 skill 包。

### 6.1 数据流向

```
data/generation-brief.md    --> references/01-simulator-brief.md
data/resolved/               --> references/02-canon-policy.md
data/distilled/ (人物)       --> references/03-cast-registry.md
data/distilled/ (势力)       --> references/04-faction-map.md
阶段4 事件卡片               --> references/05-world-event-engine.md
generation-brief (天气设定)   --> references/06-weather-engine.md
generation-brief (状态层)     --> references/07-state-schema.md
阶段5 追加设定规则            --> references/08-session-protocol.md
data/distilled/ (开场状态)    --> references/09-opening-state.md
所有来源数据                  --> references/10-source-ledger.md
阶段3 时间线切割              --> references/11-knowledge-model.md
阶段3.6 地理底盘              --> references/12-geography-layer.md
阶段3.6 + 开场势力分配        --> references/13-territory-layer.md
阶段3.6 外部世界定义          --> references/14-map-expansion.md
阶段3.7 物产时间线            --> references/15-commodity-timeline.md
```

### 6.2 生成文件列表

与现有 `references/generated-package-spec.md` 相同，但所有文件内容由已处理的数据驱动，而非 AI agent 临时编造。

**关键区别**：由于阶段 1-4 已经做了大量预处理，AI agent 在本阶段只需要：
1. 读取已结构化的数据文件
2. 按模板格式填入
3. 不需要重新收集、分析、判断

这显著减少了本阶段的 token 消耗。

**完成标准**：
- `generated-package-spec.md` 中列出的所有文件已生成
- 所有文件内容来源可追溯
- `state.json` 初始值与 `09-opening-state.md` 一致
- `dashboard.html` 可正确渲染 `state.json`

---

## 阶段 7：一致性校验

**目标**：交付前全面检查，确保无矛盾。

与现有 SKILL.md 第五步相同，但增加以下检查项：

| 检查项 | 检查内容 |
|--------|----------|
| **时间线一致性** | 人物知识不超过 start_date |
| **事件独立性** | 历史事件有条件触发而非自动触发 |
| **蓝本一致性** | 人物行为与用户选择的蓝本一致 |
| **冲突解决覆盖** | 阶段 2 的所有冲突解决都已反映在规则中 |
| **信息隔离** | 主角不知道人物的未来盲区信息 |
| **来源可追溯** | 关键断言能在 `10-source-ledger.md` 找到出处 |

**完成标准**：所有检查项通过。未通过的项必须修复后重新检查。

---

## 阶段 8：交付

**目标**：向用户汇报并交付。

汇报内容：
- 目标模拟器目录名
- 关键架构判断
- 真实性模式
- 蓝本策略和融合方式
- 追加设定如何落成规则
- 历史事件条件触发机制
- 后续迭代建议

---

## Token 节省估算

| 方案 | 阶段 6 的 token 消耗 | 说明 |
|------|---------------------|------|
| **传统方案** | 高（约 80k-120k） | AI agent 在生成时需要阅读、分析、结构化大量原始史料 |
| **增强方案** | 低（约 20k-40k） | 脚本已预处理，AI agent 只读取结构化文件并按模板填入 |
| **节省比例** | **约 60-70%** | 预处理数据体积约为原始史料的 1/5 |

---

## 目录结构

增强后的生成器工作目录：

```text
history-simulation/
├── SKILL.md                          # 生成器主流程（增强版）
├── scripts/                          # 数据收集辅助脚本
│   ├── collect.py                    # 多源数据收集
│   └── extract.py                    # 结构化提取
├── references/                       # 设计文档
│   ├── enhanced-generation-flow.md   # 本文档
│   ├── architecture.md
│   ├── character-distillation.md
│   ├── interview-checklist.md
│   ├── generated-package-spec.md
│   ├── knowledge-model.md
│   ├── runtime-rules.md
│   └── source-policy.md
├── templates/                        # 模板文件
└── external_refs/                    # 外部参考（链接索引，不下载文件）
    └── INDEX.md                      # 参考项目 URL 与借鉴点
```

运行时生成的数据目录：

```text
{sim-slug}/
├── data/                             # 生成过程数据（可选保留）
│   ├── generation-brief.md           # 阶段 0 产物
│   ├── raw/                          # 阶段 1 原始收集
│   │   ├── person/
│   │   ├── faction/
│   │   ├── event/
│   │   ├── institution/
│   │   └── climate/
│   ├── extracted/                    # 阶段 1 结构化提取
│   ├── conflicts/                    # 阶段 1 冲突报告
│   ├── resolved/                     # 阶段 2 解决结果
│   └── distilled/                    # 阶段 3 提炼档案
├── SKILL.md                          # 目标模拟器
├── dashboard.html
├── state.json
├── references/                       # 规则文件
└── records/                          # 记录模板
```
