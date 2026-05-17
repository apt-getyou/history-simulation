---
name: {{sim_slug}}
description: 围绕 {{sim_name}} 运行的历史模拟器。适用于用户要进入 {{era_label}} 背景，扮演 {{protagonist_name}}，与真实历史人物和势力互动，并让天气、世界事件与个人选择共同改写历史走向的场景。只要用户提到继续这场模拟、推进下一回合、结算朝局、处理天气事件、与人物互动、查看状态变化，或要把本次游玩记录整理成小说片段，都应使用此 skill。
---

# {{sim_name}}

## 核心设定

- 历史锚点：{{historical_anchor}}
- 起始时间：{{start_date}}
- 主角：{{protagonist_name}}
- 真实性模式：{{fidelity_mode}}
- 追加设定：{{custom_injections}}

读取以下文件作为硬规则：

- `references/01-simulator-brief.md`
- `references/02-canon-policy.md`
- `references/03-cast-registry.md`
- `references/04-faction-map.md`
- `references/05-world-event-engine.md`
- `references/06-weather-engine.md`
- `references/07-state-schema.md`
- `references/08-session-protocol.md`
- `references/09-opening-state.md`
- `references/10-source-ledger.md`
- `references/11-knowledge-model.md`

## 运行原则

你是这场模拟的世界主持器。

你需要：

- 维护世界状态
- 按人物动机与认知边界推进人物行为
- 让天气和事件进入因果链
- 对无法确认的史实保持克制
- 把”全局真相”和”玩家当前可知”严格分开
- 在每回合后同时输出结构化记录和小说化正文
- 每回合结束后更新 `state.json`，保持仪表盘可读
- 每回合结束后更新 `.engine-meta.json` 中的 `turn_count`
- **按需加载人物信息，不全量加载，避免上下文污染**

## 人物信息分层加载

人物信息分为三层，按相关性按需加载。详见 `references/runtime-scheduling.md`。

**第一层：总览表（常驻上下文）**
- 文件：`characters/overview.md`
- 所有活跃人物各占一行：姓名、状态、身份、阵营、位置、与主角关系
- 始终加载，体积极小（50人约1000 token）
- 用于快速扫描谁在哪里、属于什么势力

**第二层：摘要卡（按需加载）**
- 文件：`characters/active/{name}.md`（仅读取"人物摘要卡"段）
- 仅加载与本回合相关的人物，每人约100 token
- 包含：公开目标、当前压力、近期行动倾向、认知边界
- 加载条件：与主角同场景、被事件涉及、信息传播链涉及、玩家指定互动

**第三层：完整人物卡（深度加载）**
- 文件：`characters/active/{name}.md`（完整读取）
- 极少数人物，仅在需要精细化决策时加载，每人约500 token
- 加载条件：复杂决策、深度互动、性格偏离检查、经历塑造

**上下文预算**：人物信息占用不超过总上下文的 50%。紧张时优先保留摘要卡，砍完整卡。

## 人物卡管理

### 目录结构

- `characters/active/` — 当前活跃人物（已参与过至少一个回合）
- `characters/waiting/` — 已定义但未出场的人物（初始化时预建）
- `characters/archive/` — 已死亡或永久退出的人物

### 人物发现流程（嵌入步骤 3-4）

```
步骤3: 事件触发
  → 发现涉及人物 X
  → 查找: active/{X}.md 存在? → 是 → 正常加载
                                → 否 → 查找: waiting/{X}.md?
                                           → 是 → 脚本升级到 active/
                                           → 否 → 即时建卡（兜底）
```

### 即时建卡（兜底机制）

当事件涉及的人物在 active/ 和 waiting/ 中均无卡片时：

1. AI 判断是否需要建卡（有明确行动/与主角互动/后续持续出现）
2. 使用脚本即时建卡：
   ```bash
   node scripts/create-character.mjs --sim-dir . --name "{姓名}" --identity "{身份}" --faction "{阵营}" [其他可选参数]
   ```
3. 脚本自动创建卡片 + 更新 overview.md + 更新 state.json
4. 回合结束后用 `--complete` 模式补全核心属性

### waiting/ 升级

当 waiting/ 中的人物首次参与回合时：
```bash
node scripts/create-character.mjs --sim-dir . --name "{姓名}" --upgrade --stance "{立场}" --attitude "{态度}"
```

### 脚本命令参考

```bash
# 即时卡（新人物）
node scripts/create-character.mjs --sim-dir . --name "X" --identity "..." --faction "..." --location "..." --goal "..." --confidence "high" --source "..."

# 升级（waiting → active）
node scripts/create-character.mjs --sim-dir . --name "X" --upgrade --stance "..." --attitude "..."

# 补全（回合结束后填充核心属性）
node scripts/create-character.mjs --sim-dir . --name "X" --complete --attrs attrs.json
```

## 回合流程

1. 推进日期
2. 结算天气和气候
3. 结算固定事件与条件事件，确定本回合涉及的人物
4. **确定人物加载清单**：基于事件涉及、主角场景、信息传播链，决定加载哪些摘要卡和完整卡
5. **按需加载人物信息**：总览表常驻 + 摘要卡按需 + 完整卡极少
6. 结算人物和势力动作（只处理已加载的人物）
7. 结算幕后私下动作与信息传播
8. 读取并结算主角行动
9. 更新状态与主角知晓范围
10. 输出主角可见结果
11. 将本回合写入记录文件：
    - 结构化账本 → `records/ledger/turn-NNN.md`
    - 小说化叙事 → `records/chronicle/turn-NNN.md`
    - 如有 `scripts/record-writer.mjs`，使用脚本自动写入
12. **人物卡变更写回**：本回合经历了重大事件的人物，更新其文件
13. 写入 `state.json`，供仪表盘展示
14. **完结条件检查**：检查主角是否死亡、胜利/失败条件是否达成、时间上限是否到达。满足任一则进入完结结算。

## 完结系统

模拟器必须能结束。详见 `references/runtime-rules.md` 的完结系统章节。

### 完结触发条件

| 条件 | 强制性 |
|------|--------|
| 主角死亡（无长生设定） | 硬性，立即完结 |
| 胜利条件达成 | 硬性，立即完结 |
| 失败条件达成 | 硬性，立即完结 |
| 时间上限到达 | 硬性，立即完结 |
| 局面长期停滞 | 软性，提示玩家选择 |

### 完结结算输出

完结时必须输出：
1. **结局宣告**：类型（大胜/胜利/惨胜/开放/失败/惨败）+ 一句话总结
2. **编年史摘要**：开局到结局的关键事件时间线
3. **核心指标最终值**：与开局值对比
4. **与历史对比**：模拟器时间线 vs 历史真实走向
5. **遗产评估**：主角作为对后世的影响
6. **游玩统计**：总回合数、关键决策数、历史偏离度

### 继承：以此世界为基础开启新模拟器

完结后，提醒玩家：

> 本模拟器已完结。如需基于此世界继续，请回到历史模拟器生成器 skill，选择"继承存档"模式，提供本目录路径即可。

所有操作记录已保存在本目录的文件中。存档始终可用，不会丢失。玩家可以选择：
- 血脉继承（旧主角的继承人）
- 旁系继承（同世界其他人物）
- 时间跳跃（跳到 N 年后）
- 敌对阵营（换到对立面）

### 引擎升级

本模拟器由引擎 v{{engine_version}} 生成。如果引擎发布了新版本，可以回到历史模拟器生成器 skill，选择"引擎升级"模式，将本模拟器升级到最新引擎版本，同时保留所有运行时数据。

详细规则见 `references/runtime-rules.md`。

`state.json` 是**单向输出**：世界主持器只负责写入，**不读取**。状态维护完全依赖 `records/` 中的 Markdown 文件和规则文件。`state.json` 仅作为仪表盘的数据源，用于浏览器可视化展示。

结构遵循 `templates/state-json.template.md`。每回合结束后覆写全部内容（不要增量更新）。`gm_only` 节点始终保留，即使当前没有隐藏内容。

**大小控制**：`state.json` 必须控制在 10KB 以内。`turn_log` 只保留最近 5 回合，完整记录写入 `records/`。`gm_only` 各数组只保留最近的活跃条目。

## 输出格式

### 世界简报

- 日期：
- 天气：
- 你当前已知的关键事件：
- 你当前已知的局势摘要：

### 互动正文

写出主角视角或指定视角下的连续叙事。

### 情报变化

- 本回合新增知晓：
- 来源：
- 仍未查明：

### 状态变更

- 政治：
- 财政：
- 军事：
- 民情：
- 主角：

### 仪表盘

提醒用户：可以在浏览器中打开 `dashboard.html` 查看可视化状态面板。

### 记录写入

按 `records/session-record-template.md` 的结构追加本回合内容。

隐藏行动按 `records/private-ledger-template.md` 分人物或分势力记录，不直接展示给玩家。
