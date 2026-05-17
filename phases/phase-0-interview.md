# 阶段 0：需求访谈

## 目标

与用户交互，确认模拟器所有核心参数，生成结构化简报。

## 输入

- 用户的原始需求描述
- `references/interview-checklist.md`（访谈清单）

## 输出

- `{sim-slug}/data/generation-brief.md`
- `{sim-slug}/data/.generation-progress.json`（进度文件，phase 0 = in_progress）

## 进度追踪

开始时创建进度文件：

```json
{
  "sim_slug": "",
  "mode": "A",
  "current_phase": "0",
  "started_at": "{{ISO8601}}",
  "updated_at": "{{ISO8601}}",
  "phases": {
    "0": { "status": "in_progress" },
    "1": { "status": "pending" },
    "2": { "status": "pending" },
    "3": { "status": "pending" },
    "3.4": { "status": "pending" },
    "3.6": { "status": "pending" },
    "3.7": { "status": "pending" },
    "4": { "status": "pending" },
    "5": { "status": "pending" },
    "6": { "status": "pending" },
    "7": { "status": "pending" },
    "8": { "status": "pending" }
  }
}
```

## 流程

### 0.1 创建工作目录

基于 sim_slug 创建目录结构：

```
{sim-slug}/
└── data/
    ├── .generation-progress.json
    └── sources/
        ├── catalog.json          # 文献总目录
        ├── primary/              # 原始文献
        ├── secondary/            # 学术著作
        └── evidence/             # 证据链
```

### 0.1.1 文献清单收集

向用户收集已有的原始文献和学术著作信息。

必须询问：

| 问题 | 目的 |
|------|------|
| 已有哪些原始文献？（如《三国志》《资治通鉴》等） | 确定第一层来源 |
| 已有哪些学术著作或研究资料？ | 确定第二层来源 |
| 文献版本偏好？（如中华书局点校本 vs 其他版本） | 确保版本一致性 |
| 是否有特定视角的文献？（如外文译本、敌对阵营记载） | 发现偏倚互补来源 |
| 是否有考古相关资料？ | 出土文献作为独立验证源 |

将收集到的文献清单记入 `data/sources/catalog.json`（骨架，后续阶段填充偏倚标注）。

参考 `references/source-integrity.md` 的文献入库规则。

### 0.2 逐项确认

基于 `references/interview-checklist.md` 逐项与用户确认。

必须确认的字段：

| 字段 | 说明 | 默认值 |
|------|------|--------|
| `sim_name` | 模拟器显示名称 | 无 |
| `sim_slug` | 目录名（英文小写+连字符） | 无 |
| `historical_anchor` | 历史锚点 | 无 |
| `start_date` | 起始时间（精确到年月日） | 无 |
| `protagonist` | 主角信息 | 无 |
| `fidelity_mode` | 真实性模式 | `reasonable_fiction` |
| `custom_injections` | 追加设定 | `[]` |
| `turn_granularity` | 回合粒度 | `month` |
| `core_systems` | 核心系统 | 全部 |
| `recording_mode` | 记录模式 | `balanced` |
| `source_strictness` | 来源严格度 | `primary_plus_academic` |
| `dashboard_style` | 仪表盘样式 | `strategy_hud` |
| `source_preference` | 史料版本偏好 | `history_first` |
| `timeline_strictness` | 时间线严格度 | `strict` |
| `event_certainty` | 事件确定性 | `conditional` |
| `local_sources` | 本地来源文件列表 | `[]` |
| `map_config` | 地图配置 | 见下方 |
| `commodity_config` | 物产配置 | 见下方 |
| `victory_conditions` | 胜利条件 | 至少一个 |
| `defeat_conditions` | 失败条件 | 至少一个 |
| `time_limit` | 时间上限 | 主角自然寿命 |
| `protagonist_death_is_end` | 主角死亡是否结局 | `true` |

#### 主角年龄与成长模式检测

确认主角信息后，**必须**计算主角在 `start_date` 时的年龄：

```
protagonist_age = start_date - protagonist.birth_year
```

根据年龄判断模拟模式：

| 条件 | simulation_mode | 说明 |
|------|----------------|------|
| age < 7 | `growth_infancy` | 幼年期：无决策能力，季度/半年推进 |
| 7 <= age < 14 | `growth_childhood` | 童年期：微小决策，季度推进 |
| 14 <= age < 17 | `growth_adolescence` | 少年期：有限决策，月推进 |
| age >= 17 | `standard` | 成年：完整决策权 |

当 `simulation_mode` 不为 `standard` 时，必须额外确认以下字段：

| 字段 | 说明 | 默认值 |
|------|------|--------|
| `growth_personality_dimensions` | 性格维度名称列表 | `["courage", "caution", "benevolence", "decisiveness", "trust", "wisdom", "resilience"]` |
| `growth_educators` | 初始教师/监护人列表 | 从 active 人物中自动匹配 |
| `growth_initial_personality` | 性格维度初始值（JSON） | 所有维度默认 50 |
| `growth_milestones` | 关键成长里程碑（用户自定义） | `[]` |

将 `simulation_mode` 写入 `generation-brief.md`。当值为 `growth_*` 时，后续阶段需启用成长模式分支（详见各阶段文件）。

#### 地图配置默认值

```yaml
map_config:
  geography_scope: "根据历史时期和主角位置自动推断"
  region_granularity: "州"
  outer_world_enabled: true
  commodity_strictness: "strict"
```

#### 物产配置默认值

```yaml
commodity_config:
  historical_accuracy: "strict"
  穿越者_knowledge_override: false
```

### 0.2.5 上下文策略评估

参数确认完成后，基于收集到的数据估算生成工作量，向用户展示策略选择。

参考 `references/context-strategy.md`。

#### 估算步骤

1. 统计以下参数（粗估即可，不需要精确）：
   - C = 核心人物 + 重要配角数（约估）
   - E = 事件数量（约估）
   - R = 区域数量（约估）
   - T = 时间跨度（年）

2. 按 `references/context-strategy.md` 的公式估算各阶段 token 消耗

3. 向用户展示评估结果和策略选项

#### 输出格式

```
[上下文策略评估]

模拟器规模参数：
- 人物数量：~{N}（核心{n1} + 重要{n2} + 次要{n3}）
- 事件数量：~{E}
- 区域数量：~{R}
- 时间跨度：{T}年

预估工作量：
- 阶段 0-5（研究+提炼）：~{X}K tokens
- 阶段 6（包生成）：~{Y}K tokens（其中人物卡 ~{Z}K）
- 阶段 7-8（验证+交付）：~{W}K tokens
- 总预估输出：~{total}K tokens

请选择执行策略：
A. 直接执行 — 所有阶段在同一会话完成
B. 混合模式 — Phase 6 使用 subagent 并行生成，主上下文只做编排
C. 分段执行 — Phase 0-5 完成后 /clear，Phase 6-8 在新会话继续
```

#### 用户选择处理

将选择的策略记入 generation-brief.md（在 0.3 中一并写入）：

```yaml
execution_strategy:
  mode: "direct" | "hybrid" | "segmented"
  phase_6_distribution: null | "subagent"
  estimated_output_tokens: {total}K
```

**策略映射**：
- 用户选 A → `mode: "direct"`, `phase_6_distribution: null`
- 用户选 B → `mode: "hybrid"`, `phase_6_distribution: "subagent"`
- 用户选 C → `mode: "segmented"`, `phase_6_distribution: null`（Phase 6 策略在新会话中重新评估）

#### 模型上下文信息获取

如果当前环境可识别模型信息（系统提示中包含模型标识），自动填入。否则向用户确认：

> 请确认当前使用的模型及其上下文窗口大小（如不确定，可回答"不确定"）。
> 常见参考：Claude Opus/Sonnet 4.6 — 200K 上下文

如果用户不确定，默认按 200K 上下文、60K 有效输出空间估算。

### 0.3 生成简报

将所有确认的字段和 `execution_strategy` 一并写入 `data/generation-brief.md`，格式参考 `references/enhanced-generation-flow.md` 的阶段 0 产物格式。

### 0.4 更新进度

```json
{
  "0": {
    "status": "completed",
    "output": "data/generation-brief.md",
    "completed_at": "{{ISO8601}}"
  },
  "1": { "status": "pending" }
}
```

## 完成标准

- 用户确认所有字段，无遗留问题
- `generation-brief.md` 已写入
- 进度文件已更新，current_phase 推进到 "1"

## 上下文管理

本阶段为纯交互，token 消耗低。完成后提示用户：

> 阶段 0 完成。接下来进入数据收集阶段，需要大量搜索和处理。如需暂停，随时可以 /clear，下次继续会从此处恢复。
