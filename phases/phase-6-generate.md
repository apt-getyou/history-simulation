# 阶段 6：包生成

## 目标

在当前工作目录下创建目标模拟器的完整 skill 包。由于产物文件多（15+），必须分批生成以控制上下文消耗。

## 输入

- `data/generation-brief.md`
- `data/distilled/`（所有提炼后的数据）
- `data/resolved/`（冲突解决结果）
- `references/generated-package-spec.md`（包规范）
- `templates/`（模板文件）

## 输出

`{sim-slug}/` 完整 skill 包

## 进度追踪

```json
"6": {
  "status": "in_progress",
  "started_at": "{{ISO8601}}",
  "subtasks": {
    "6a_skeleton": "pending",
    "6b_rules_A": "pending",
    "6c_rules_B": "pending",
    "6d_rules_C": "pending",
    "6e_rules_D": "pending",
    "6f_map_commodity": "pending",
    "6g_records": "pending",
    "6h_characters": "pending",
    "files_generated": [],
    "files_total": 28
  }
}
```

## 执行模式

### 成长模式适配

当 `data/generation-brief.md` 中 `simulation_mode` 不为 `standard` 时，Phase 6 需额外执行以下操作：

1. **额外生成文件**：
   - `references/growth-system.md`（从 `templates/growth-system.template.md` 生成，填充具体数据）
   - `references/growth-event-pool.md`（从 `templates/growth-event-pool.template.md` 生成，填充具体事件）

2. **修改已有文件**：
   - `SKILL.md`：添加 `references/growth-system.md` 到硬规则引用列表（替换 `{{growth_system_reference}}`）
   - `references/08-session-protocol.md`：添加成长模式回合规则段落（替换 `{{growth_mode_section}}`）
   - `state.json`：填充 `protagonist.status.growth` 字段
   - `references/12-geography-layer.md`：添加 L0 个人活动空间定义

3. **人物卡适配**：
   - 幼年主角的人物卡增加 `## 教育者角色` 段落，标注该人物对主角的教育作用
   - 增加虚拟"玩伴"角色到 waiting/ 池（如适用）

Phase 6 支持两种执行模式，由 `data/generation-brief.md` 中的 `execution_strategy.mode` 决定。

### 模式一：直接执行（默认）

当 `execution_strategy.mode = "direct"` 或未设置时使用。

按 6a → 6b → 6c → ... → 6h 顺序，在主上下文中依次完成。

### 模式二：subagent 分布式

当 `execution_strategy.mode = "hybrid"` 且 `phase_6_distribution = "subagent"` 时启用。

详细方案见 `references/context-strategy.md` 的 "Phase 6 subagent 分布方案" 章节。

#### 执行流程

1. **主控读取参数**（主上下文，轻量）
   - 读取 generation-brief.md 中的 execution_strategy
   - 读取 .generation-progress.json 确认前置数据完备
   - 读取 data/distilled/ 和 data/raw/ 的文件清单

2. **按批次启动 subagent**（并行）

   **批次 1**（三个 agent 并行，无依赖）：

   | Agent | 子任务 | 输出文件 |
   |-------|--------|---------|
   | Agent 1 | 6a 骨架 | .engine-meta.json, SKILL.md, dashboard.html, state.json, data/driver-skill.md, README.md |
   | Agent 2 | 6b-6e 规则文件 | references/01 ~ 11 (10个文件) |
   | Agent 3 | 6f-6g 地图+记录 | references/12 ~ 15, records/*.md (8个文件) |

   **批次 2**（三个 agent 并行，依赖批次 1 完成）：

   | Agent | 子任务 | 输出文件 |
   |-------|--------|---------|
   | Agent 4 | 6h-active | characters/active/*.md |
   | Agent 5 | 6h-waiting | characters/waiting/*.md |
   | Agent 6 | 6h-archive+triggers | characters/archive/*.md, data/event-triggers.json |

3. **主控汇总**（批次 1+2 全部完成后）
   - 检查所有文件是否已生成
   - 生成 characters/overview.md（汇总 active/waiting/archive 三池）
   - 更新 .generation-progress.json

#### Subagent 指令格式

每个 subagent 启动时使用以下指令结构（通过 Agent tool 调用）：

```
你是历史模拟器生成器的子任务代理。

## 任务
{具体批次描述}

## 输入文件
- {文件路径列表}

## 输出文件
- {目标文件路径列表}

## 格式要求
- 参考模板：{template_path}
- 每个文件必须包含：{必填字段}

## 约束
- 只生成指定文件，不要修改其他文件
- 完成后报告生成的文件列表
```

#### 容错机制

1. 单个 agent 失败不影响其他 agent，已生成文件保留
2. 主控检查完成状态，未完成的 agent 可单独重试
3. 如果某个 agent 反复失败，可降级为在主上下文中直接生成
4. 主控汇总时校验文件数量，与 generation-brief 中数据对比，缺漏则补充

#### 进度更新

混合模式下 .generation-progress.json 的 subtasks 改为：

```json
{
  "6a_skeleton": "delegated",
  "6b_rules_A": "delegated",
  "6c_rules_B": "delegated",
  "6d_rules_C": "delegated",
  "6e_rules_D": "delegated",
  "6f_map_commodity": "delegated",
  "6g_records": "delegated",
  "6h_active": "delegated",
  "6h_waiting": "delegated",
  "6h_archive_triggers": "delegated"
}
```

subagent 完成后由主控统一更新为 `"completed"`。

## 子阶段拆分

阶段 6 拆为 7 个子阶段，每个子阶段生成 2-4 个文件。

### 子阶段 6a：基础骨架

生成目录结构和核心文件：

| 文件 | 数据来源 | 模板 |
|------|---------|------|
| `.engine-meta.json` | `references/engine-version.md` | `templates/engine-meta.template.md` |
| `SKILL.md` | `data/generation-brief.md` | `templates/generated-skill.template.md` |
| `dashboard.html` | `data/generation-brief.md` | `templates/dashboard.template.html` |
| `state.json` | `data/distilled/` 开场状态 | `templates/state-json.template.md` |
| `data/driver-skill.md` | `data/generation-brief.md` | `templates/driver-skill.template.md` |
| `README.md` | `data/generation-brief.md` | `templates/simulator-readme.template.md` |

**成长模式额外文件**（当 `simulation_mode != "standard"` 时）：

| 文件 | 数据来源 | 模板 |
|------|---------|------|
| `references/growth-system.md` | `data/generation-brief.md` + 成长原则 | `templates/growth-system.template.md` |
| `references/growth-event-pool.md` | 年龄阶段 + 历史背景 | `templates/growth-event-pool.template.md` |

**`data/driver-skill.md` 生成要求**：

- 从 `templates/driver-skill.template.md` 读取模板
- 替换模板变量：`{{sim_slug}}`、`{{sim_name}}`、`{{era_label}}`、`{{protagonist_name}}`
- `{{sim_dir}}` 暂时填入 `./{sim-slug}`（项目相对路径），Phase 8 安装时根据实际路径修正
- 写入 `{sim-slug}/data/driver-skill.md`
- 此文件不在模拟器运行时使用，仅供 Phase 8 安装驱动器时读取

**`README.md` 生成要求**：

- 从 `templates/simulator-readme.template.md` 读取模板
- 替换模板变量：
  - `{{sim_slug}}`、`{{sim_name}}`、`{{era_label}}`
  - `{{protagonist_name}}`、`{{protagonist_title}}`、`{{protagonist_age}}`、`{{protagonist_location}}`、`{{protagonist_dilemma}}`
  - `{{story_background}}`：从 `data/generation-brief.md` 中提取历史背景，生成 3-5 段叙事性描述
  - `{{tagline}}`：一句话概括模拟器核心体验
  - `{{turn_granularity}}`：回合时间粒度（如"一天"、"一旬"、"一个月"）
  - `{{fidelity_mode_description}}`：真实性模式的简要说明
  - `{{victory_conditions}}`、`{{defeat_conditions}}`、`{{time_limit}}`：从简报中提取
- 写入 `{sim-slug}/README.md`
- 此文件供用户阅读，不参与模拟器运行

完成后更新进度：`"6a_skeleton": "completed"`

### 子阶段 6b：规则文件 A（简报 + 正典 + 人物）

| 文件 | 数据来源 | 模板 |
|------|---------|------|
| `references/01-simulator-brief.md` | `data/generation-brief.md` | - |
| `references/02-canon-policy.md` | `data/resolved/` | `templates/canon-policy.template.md` |
| `references/03-cast-registry.md` | `data/distilled/` (人物) | `templates/cast-registry.template.md` |

完成后更新进度：`"6b_rules_A": "completed"`

### 子阶段 6c：规则文件 B（势力 + 事件 + 天气）

| 文件 | 数据来源 | 模板 |
|------|---------|------|
| `references/04-faction-map.md` | `data/distilled/` (势力) | `templates/faction-map.template.md` |
| `references/05-world-event-engine.md` | `data/distilled/event-cards/` | `templates/world-event-engine.template.md` |
| `references/06-weather-engine.md` | `data/generation-brief.md` (天气设定) | `templates/weather-engine.template.md` |

完成后更新进度：`"6c_rules_B": "completed"`

### 子阶段 6d：规则文件 C（状态 + 协议 + 开场）

| 文件 | 数据来源 | 模板 |
|------|---------|------|
| `references/07-state-schema.md` | `data/generation-brief.md` (状态层) | `templates/state-schema.template.md` |
| `references/08-session-protocol.md` | 阶段 5 追加设定规则 | - |
| `references/09-opening-state.md` | `data/distilled/` (开场状态) | `templates/opening-state.template.md` |

完成后更新进度：`"6d_rules_C": "completed"`

### 子阶段 6e：规则文件 D（来源 + 知识模型）

| 文件 | 数据来源 | 模板 |
|------|---------|------|
| `references/10-source-ledger.md` | 所有来源数据 | `templates/source-ledger.template.md` |
| `references/11-knowledge-model.md` | 阶段 3 时间线切割 | `templates/knowledge-model.template.md` |

完成后更新进度：`"6e_rules_D": "completed"`

### 子阶段 6f：地图与物产文件

| 文件 | 数据来源 | 模板 |
|------|---------|------|
| `references/12-geography-layer.md` | `data/distilled/geography-layer.yaml` | `templates/geography-layer.template.md` |
| `references/13-territory-layer.md` | 地理底盘 + 开场势力分配 | `templates/territory-layer.template.md` |
| `references/14-map-expansion.md` | 地理底盘外部世界定义 | - |
| `references/15-commodity-timeline.md` | `data/distilled/commodity-timeline.yaml` | `templates/commodity-timeline.template.md` |

完成后更新进度：`"6f_map_commodity": "completed"`

### 子阶段 6g：记录模板

| 文件 | 数据来源 | 模板 |
|------|---------|------|
| `records/ledger-template.md` | - | `templates/ledger-template.md` |
| `records/chronicle-template.md` | - | `templates/chronicle-template.md` |
| `records/session-record-template.md` | - | `templates/session-record.template.md` |
| `records/private-ledger-template.md` | - | `templates/private-ledger.template.md` |

完成后更新进度：`"6g_records": "completed"`

### 子阶段 6h：人物卡与事件触发器

**人物卡生成（全量预建）**：

从 `data/distilled/` 中的人物数据和 `references/03-cast-registry.md` 中的人物名册，按 `templates/character-card.template.md` **全量**生成人物卡。初始化时即建好所有可预见的人物，避免运行中临时建卡打断体验。

**三池分类**：

| 目录 | 人物类型 | 卡片内容 |
|------|---------|---------|
| `characters/active/` | 模拟开始时已出场/已活跃的人物 | 完整卡（基本信息+摘要卡+核心属性+反应倾向+运行时状态） |
| `characters/waiting/` | 已定义但未出场的人物（含扩展人物） | 完整卡（基本信息+摘要卡+核心属性+反应倾向，无运行时状态） |
| `characters/archive/` | 模拟开始前已故人物 | 精简卡（基本信息+死因+历史影响） |

**分类规则**：

1. `active/`：在 `09-opening-state.md` 开场状态中被提及的人物、与主角直接相关的人物
2. `waiting/`：在 `03-cast-registry.md` 核心人物表和扩展人物表中列出但未在开场中活跃的人物
3. `archive/`：`knowledge_boundary` 早于 `start_date` 且已标记为死亡的人物

**overview.md 格式**：

```markdown
# 人物总览

| 姓名 | 状态 | 身份 | 阵营 | 位置 | 与主角关系 |
|------|------|------|------|------|-----------|
| {{name}} | {{status}} | {{identity}} | {{faction}} | {{location}} | {{relation}} |

## 待出场人物（waiting/）

| 姓名 | 身份 | 阵营 | 预计出场时机 |
|------|------|------|-------------|
| {{name}} | {{identity}} | {{faction}} | {{trigger}} |

## 已故人物（archive/）

| 姓名 | 身份 | 死因 | 历史影响 |
|------|------|------|----------|
```

每行控制在 100 字符以内，50 人约 1000 token。

**扩展人物**：

在 `03-cast-registry.md` 中补充"扩展人物"表，列出不在核心表中但运行中可能出场的人物。每个人物标注：姓名、身份、阵营、预计触发条件、史实依据。这些人物也生成 waiting/ 卡片。

**event-triggers.json 生成**：

从 `data/distilled/event-cards/*.yaml` 中提取所有事件的触发条件和 state.json 映射，合并为一个 JSON 文件。

| 文件 | 数据来源 | 说明 |
|------|---------|------|
| `data/event-triggers.json` | `data/distilled/event-cards/*.yaml` | YAML → JSON 转换 |

`event-triggers.json` 结构：

```json
{
  "meta": { "sim_slug": "...", "version": "1.0" },
  "events": [
    {
      "event_id": "EVT-XX-001",
      "event_name": "...",
      "event_type": "trend",
      "trigger_conditions": { "all_of": [...], "any_of": [...] },
      "state_conditions": [...],
      "character_refs": [...],
      "outcome_if_triggered": [...],
      "cascade_events": { "triggered": [...], "blocked": [...] }
    }
  ]
}
```

**人物卡数量控制**：

- `characters/active/` 中的活跃人物卡不超过 20 个
- `characters/waiting/` 无硬性上限，但每个卡片应包含足够信息（至少摘要卡 + 核心属性）
- `characters/archive/` 仅保留对当前模拟有影响（遗产/追忆/对比）的已故人物

**脚本安装**：

将 `scripts/create-character.mjs` 复制到目标模拟器的 `scripts/` 目录。该脚本用于运行时处理：
- waiting → active 升级
- 扩展表之外的新人物即时建卡（兜底机制）

完成后更新进度：`"6h_characters": "completed"`

## 关键原则

由于阶段 0-5 已做了大量预处理，本阶段只需：
1. 读取已结构化的数据文件
2. 按模板格式填入
3. 不需要重新收集、分析、判断

这显著减少了本阶段的 token 消耗。

## 完成标准

- 所有文件已生成
- **量化校验**（6h 子任务专属）：
  - `characters/active/` 文件数 >= `references/03-cast-registry.md` 中标记为 active 的人物数
  - `characters/waiting/` 文件数 >= waiting 人数
  - `characters/archive/` 文件数 >= archive 人数
  - 人物卡总数 >= 03-cast-registry.md 中的人物总数
  - 不满足时标记 `"6h_characters": "partial"` 而非 `"completed"`
- 内容来源可追溯
- 进度文件已更新，current_phase 推进到 "7"

## 上下文管理

**每个子阶段完成后**：
1. 检查上下文剩余空间
2. 不足 → 写入进度 → 提示 `/clear`
3. 充足 → 继续下一个子阶段

**恢复时**：读取进度文件的 `subtasks`，跳过已完成的子阶段。

**上下文不足提示**：
```
[WARNING] 上下文空间即将用尽。

当前进度：阶段 6 -- 包生成
已完成：6a-6c（基础骨架 + 规则文件 A/B）
下一个：6d（规则文件 C）

请执行 /clear 后重新运行 /history-simulation，系统将从 6d 继续。
已生成的文件已保存在 {sim-slug}/ 目录中。
```
