# 阶段 2：冲突检测与解决（偏倚感知 + 叙事依赖检测）

## 目标

由 AI agent 直接阅读原始来源，语义级识别多版本冲突，检测偏倚叠加和叙事依赖，引导用户选择蓝本和融合策略。

## 核心原则

**不依赖脚本做冲突检测。** 脚本只能做字符串比较，无法理解语义。冲突检测是最需要理解能力的环节，必须由 AI agent 直接阅读原始材料完成。

参考：
- `references/source-policy.md` 的来源等级和断言入库规则
- `references/source-integrity.md` 的偏倚标注和叙事依赖检测

## 输入

- `data/raw/`（阶段 1 收集的原始数据）
- `data/sources/catalog.json`（文献元数据 + 偏倚标注）
- `data/sources/evidence/`（阶段 1 生成的初始证据链）
- `data/raw/local_sources/source-catalog.json`（本地来源阅读策略）
- `data/generation-brief.md` 中的 `source_preference`

## 输出

- `data/resolved/{entity_name}-resolution.json`（每个实体的解决结果）
- `data/conflicts/conflict-report.md`（冲突报告，供用户审阅）
- `data/sources/evidence/{entity}-evidence.json`（更新后的证据链）

## 进度追踪

```json
"2": {
  "status": "in_progress",
  "started_at": "{{ISO8601}}",
  "subtasks": {
    "global_strategy_decided": false,
    "entities_scanned": 0,
    "entities_total": 0,
    "conflicts_found": 0,
    "conflicts_high": 0,
    "conflicts_resolved": 0,
    "bias_overlay_suspicions": 0,
    "bias_overlay_confirmed": 0,
    "current_entity_index": 0
  }
}
```

## 流程

### 2.1 确定全局蓝本策略

根据 `source_preference` 确定策略：

| 策略 | 说明 |
|------|------|
| `history_first` | 正史为硬锚点，其他来源仅补充 |
| `fiction_first` | 文学蓝本，正史补充制度细节 |
| `custom_per_entity` | 每个实体单独选择 |
| `fusion` | 多版本综合，用户主导取舍 |

如果 `source_preference` 不是 `custom_per_entity`，向用户确认全局策略。记录到进度。

### 2.2 逐实体语义冲突检测

对 `data/raw/` 中的每个实体，AI agent 执行以下操作：

**2.2.1 阅读该实体的所有来源数据**

读取 `data/raw/{entity_type}/{entity_name}.json`，该文件包含多个版本的 `structured_data`。

如果有本地来源，根据 `source-catalog.json` 的阅读策略，直接阅读原始文件的相关章节/段落。**不要仅依赖已提取的结构化字段**，原始上下文是判断冲突性质的关键。

**同时读取 catalog.json 中相关来源的偏倚标注**，用于后续偏倚感知评估。

**2.2.2 语义级对比**

AI agent 对比不同来源时，识别以下类型的冲突：

| 冲突类型 | 说明 | 示例 |
|----------|------|------|
| 事实分歧 | 同一事件不同记载 | 三国志记载 X 战死，资治通鉴记载 X 未参战 |
| 人物塑造分歧 | 同一人物不同形象 | 演义中诸葛亮多谋，正史中偏重政务 |
| 时间线分歧 | 同一事件不同时间 | 各来源对赤壁之战月份记载不同 |
| 有无分歧 | 某来源有，其他来源无 | 空城计仅演义有载 |
| 评价分歧 | 同一人物/事件不同评价 | 曹操在魏史和蜀汉视角中的评价截然不同 |

**2.2.3 偏倚感知严重度评估**

AI agent 在评估严重度时，**必须考虑来源的偏倚标注**：

| 严重度 | 判定标准 |
|--------|---------|
| **high** | 影响人物核心能力判断、改变重大事件走向、或直接决定某角色是否存在于本世界 |
| **medium** | 影响人物性格刻画或事件细节，但不改变核心走向 |
| **low** | 仅影响描写风格、措辞偏好、次要细节 |

**偏倚因素**：在 `agent_notes` 中注明偏倚对冲突的影响：

```
agent_notes: "该冲突中，《魏书》记载曹操仁义，《蜀记》记载曹操残暴。
catalog.json 标注《魏书》作者为曹魏官修，political_stance 为亲曹。
评估时需考虑《魏书》的亲曹立场可能影响其记载客观性。"
```

**关键区别：与脚本硬编码字段名不同，AI agent 按冲突的实际影响评估严重度。** 同一个 `positions_held` 字段的差异，如果只涉及某次临时署理，可能是 low；如果涉及核心权力基础，则是 high。

**2.2.4 记录冲突**

每发现一个冲突，立即记录到内存列表，格式：

```json
{
  "conflict_id": 1,
  "entity_name": "诸葛亮",
  "field": "空城计",
  "conflict_type": "absence_vs_addition",
  "severity": "high",
  "versions": {
    "三国志": "无此事件记录",
    "三国演义": "诸葛亮独坐城楼抚琴，司马懿疑有伏兵退去",
    "资治通鉴": "无此事件记录"
  },
  "bias_factors": {
    "三国志": "陈寿蜀汉旧臣但西晋立场，不记载可能是因为确实没有",
    "三国演义": "文学创作，偏向塑造诸葛亮智谋形象",
    "资治通鉴": "叙事依赖《三国志》，非独立来源"
  },
  "agent_notes": "空城计是演义经典桥段，正史无载。资治通鉴此处依赖三国志，不算独立验证。是否纳入直接影响诸葛亮'军事谋略'的核心定位。"
}
```

### 2.3 偏倚叠加检测

**在每个实体的冲突检测完成后**，执行偏倚叠加检查。

#### 触发条件

多个来源对同一事实的记载高度一致（措辞相似度 > 80%），且这些来源可能存在传抄关系。

#### AI 检查步骤

1. 识别一致记载的来源组
2. 检查 catalog.json 中这些来源的 `narrative_dependencies` 字段
3. 如果 `narrative_dependencies` 已标记依赖关系，直接判定为 `narrative_dependent`
4. 如果未标记但存在可疑依赖（作者时代先后、编写参考关系等），标记为待确认

#### 向用户展示

```
偏倚叠加嫌疑 #1：

以下来源对"关羽斩颜良"的记载高度一致：
- 《三国志》："羽望见良麾盖，策马刺良于万众之中"
- 《资治通鉴》："羽望见良麾盖，策马刺良于万众之中"
- 《册府元龟》："羽望见良麾盖，策马刺良于万众之中"

后两者的记载与《三国志》几乎一致，可能存在传抄关系。
如果确实传抄，则这不是三个独立来源的交叉验证。

请确认：
[A] 确认存在传抄依赖 -- 降级交叉验证
[B] 确认独立来源 -- 保持原验证等级
[C] 不确定 -- 按传抄依赖处理
```

#### 用户确认后

- 选择 A：更新 catalog.json 的 `narrative_dependencies`，相关断言的 `corroboration_type` 改为 `narrative_dependent`，置信度降一级
- 选择 B：保持原等级，记录用户判断理由
- 选择 C：按 `narrative_dependent` 处理，标注为"待定"

更新进度：
```json
"bias_overlay_suspicions": 3,
"bias_overlay_confirmed": 2
```

### 2.4 自动解决低严重度冲突

使用全局策略自动解决 `severity: low` 的冲突。

### 2.5 逐个解决高严重度冲突

对冲突报告中每个 `severity: high` 的冲突，向用户展示：

```
冲突 #7: 诸葛亮 -- 空城计

| 来源 | 内容 | 偏倚提示 |
|------|------|---------|
| 三国志 | 无此事件记录 | 陈寿蜀汉旧臣但西晋立场 |
| 三国演义 | 诸葛亮独坐城楼，司马懿退兵 | 文学创作，塑造智谋形象 |
| 资治通鉴 | 无此事件记录 | 此处叙事依赖《三国志》 |

冲突类型: 有无分歧（演义独有情节）
严重度: 高
交叉验证类型: absence_vs_addition（资治通鉴非独立验证）
AI agent 分析: 空城计是演义经典桥段，正史无载。资治通鉴三国部分依赖三国志，不算独立印证。

请选择:
[A] 采用正史版本 -- 不纳入
[B] 采用文学版本 -- 纳入
[C] 融合（用户描述如何融合）
[D] 排除（本世界不包含此内容）
[S] 跳过（后续决定）
```

每解决一个冲突，更新进度：
```json
"conflicts_resolved": 3,
"current_entity_index": 3
```

### 2.6 中严重度冲突处理

`severity: medium` 的冲突：
- 如果全局策略能覆盖，自动解决
- 如果全局策略不明确，批量展示给用户一次确认

### 2.7 记录解决结果

每个实体的解决结果写入 `data/resolved/{entity_name}-resolution.json`：

```json
{
  "entity_name": "诸葛亮",
  "global_strategy": "literature_first",
  "resolution_date": "2025-01-15",
  "resolutions": [
    {
      "conflict_id": 7,
      "field": "空城计",
      "conflict_type": "absence_vs_addition",
      "severity": "high",
      "decision": "include",
      "blueprint": "三国演义",
      "bias_factors": {
        "三国志": "正史无载",
        "三国演义": "文学创作",
        "资治通鉴": "叙事依赖三国志"
      },
      "agent_notes": "空城计是演义经典桥段，正史无载。用户选择纳入。",
      "resolved_at": "2025-01-15T14:30:00"
    }
  ]
}
```

### 2.8 更新证据链

冲突解决完成后，更新 `data/sources/evidence/{entity}-evidence.json`：

1. 新增冲突相关的断言条目
2. 更新断言的 `assertion_strength`（disputed 类型根据用户决策确定最终强度）
3. 更新 `corroboration_type`（加入叙事依赖检测结果）
4. 更新 `confidence`（根据偏倚叠加检测结果调整）

### 2.9 生成冲突报告

所有冲突检测和解决完成后，生成 `data/conflicts/conflict-report.md`：

- 统计概览（总冲突数、高/中/低分布）
- 偏倚叠加统计（嫌疑数、确认数、影响断言数）
- 按实体分组列出所有冲突及其解决结果
- 标注未解决的冲突（如有跳过的）

## 完成标准

- 所有高严重度冲突已解决
- 低/中严重度冲突已用全局策略处理
- 偏倚叠加检测已完成（所有嫌疑已确认或标记待定）
- 解决结果已持久化到 `data/resolved/`
- 证据链文件已更新
- 冲突报告已写入 `data/conflicts/conflict-report.md`
- catalog.json 的 narrative_dependencies 已更新（如有）
- 进度文件已更新，current_phase 推进到 "3"

## 上下文管理

- 每次处理一个实体，检测冲突 → 偏倚叠加检测 → 解决 → 写入文件 → 从上下文丢弃原文
- 如果实体特别复杂（如核心人物有 10+ 冲突），分批展示，每批 5 个冲突
- 总冲突数 50+ 时，先全部检测完，按严重度排序后逐批解决
