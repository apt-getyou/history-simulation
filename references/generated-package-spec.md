# 目标模拟器产物规范

生成器默认在当前工作目录创建：

`{sim-slug}/`

建议目录结构如下：

```text
{sim-slug}/
├── .engine-meta.json
├── SKILL.md
├── README.md
├── dashboard.html
├── state.json
├── data/
│   └── driver-skill.md
├── characters/
│   ├── overview.md               ← 人物总览表（第一层：常驻上下文）
│   ├── active/                   ← 活跃人物卡
│   │   ├── 诸葛亮.md
│   │   └── ...
│   ├── waiting/                  ← 待出场人物（出生条件待满足）
│   └── archive/                  ← 已故人物（冻结）
├── scripts/                      ← 运行时脚本（可选）
│   ├── turn-engine.mjs
│   ├── record-writer.mjs
│   ├── save-manager.mjs
│   └── event-triggers.json
├── references/
│   ├── 01-simulator-brief.md
│   ├── 02-canon-policy.md
│   ├── 03-cast-registry.md
│   ├── 04-faction-map.md
│   ├── 05-world-event-engine.md
│   ├── 06-weather-engine.md
│   ├── 07-state-schema.md
│   ├── 08-session-protocol.md
│   ├── 09-opening-state.md
│   ├── 10-source-ledger.md
│   ├── 11-knowledge-model.md
│   ├── 12-save-system.md
│   ├── 13-geography-layer.md
│   ├── 14-territory-layer.md
│   ├── 15-map-expansion.md
│   └── 16-commodity-timeline.md
├── saves/                        ← 存档系统
│   ├── save-index.json           ← 存档索引
│   ├── auto/                     ← 自动存档（每回合）
│   ├── manual/                   ← 手动存档（玩家命名）
│   └── rollback-snapshots/       ← 回档安全快照
└── records/
    ├── ledger/
    │   └── turn-001.md          ← 结构化账本（每回合一个文件）
    ├── chronicle/
    │   └── turn-001.md          ← 小说化叙事（每回合一个文件）
    ├── archived/                 ← 回档时移出的记录
    ├── session-record-template.md
    └── private-ledger-template.md
```

## 文件职责

### `.engine-meta.json`

引擎版本标记。记录生成此模拟器所使用的引擎版本，用于升级机制判断。

字段说明：

| 字段 | 类型 | 说明 |
|------|------|------|
| `engine_version` | string | 生成时的引擎版本号（语义化版本） |
| `generated_at` | string | 生成时间（ISO 8601） |
| `sim_name` | string | 模拟器名称 |
| `sim_slug` | string | 目录名 |
| `creation_mode` | string | 创建模式：`new` / `inherited` / `upgraded` |
| `turn_count` | number | 已游玩回合数（生成时为 0） |
| `inherited_from` | string \| null | 继承来源目录（仅模式 B） |
| `upgraded_from_version` | string \| null | 升级前的引擎版本（仅模式 C） |
| `upgrades_applied` | string[] | 已应用的升级路径列表 |

基于 `templates/engine-meta.template.md` 生成。

### `SKILL.md`

目标模拟器的运行入口。

必须定义：

- 何时触发
- 核心设定
- 回合流程
- 输出格式
- 记录机制

### `01-simulator-brief.md`

本模拟器的总简报，写清：

- 题材
- 时段
- 主角
- 真实性模式
- 追加设定
- 目标体验

### `02-canon-policy.md`

说明什么是：

- 不可变史实
- 可推演史实
- 可改写区域
- 用户设定优先级

### `03-cast-registry.md`

人物与关键势力代理人名册。

### `04-faction-map.md`

朝廷、地方、军阀、宗教、商帮、秘密势力等关系。

### `05-world-event-engine.md`

固定事件、条件事件、连锁事件。

### `06-weather-engine.md`

长期气候、季节天气、异常天气和系统影响。

### `07-state-schema.md`

定义状态字段、取值范围、更新规则。

### `08-session-protocol.md`

定义每回合怎么结算、怎么展示、怎么记录。

### `09-opening-state.md`

开局时的世界状态、人物位置、危机、资源和已知信息。

### `10-source-ledger.md`

来源账本。

记录每个关键历史断言、人物判断、制度规则、气候规则的出处和置信度。

### `11-knowledge-model.md`

知晓模型。

定义什么是：

- 全局真相
- 角色私知
- 势力内部知情
- 公共信息
- 玩家当前已知

### `13-geography-layer.md`

地理底盘（L1 层）。

定义：

- 区域划分和静态属性（地形、气候、资源、人口）
- 区域邻接关系和关隘信息
- 地形类型对军事、财政、民情的系统影响
- 战略要地和交通枢纽

基于 `templates/geography-layer.template.md` 生成。所有地理断言必须有史料或学术来源。

### `14-territory-layer.md`

领土控制（L2 层）和可视区域（L3 层）。

定义：

- 每个区域的当前控制者、控制强度、驻军、民心
- 控制强度等级（牢固/稳定/松散/名义/失控）
- 战争结算与领土变更规则
- 主角对每个区域的可见性等级
- 可见性提升途径

基于 `templates/territory-layer.template.md` 生成。开局时根据势力分配初始化控制状态。

### `15-map-expansion.md`

地图扩展规则。

定义：

- 已知世界范围和边界
- 外部世界区域（西域、南洋、北方草原等）
- 每个外部区域的接入条件、贸易难度、可用资源
- 地图扩展的三步流程（探知/接触/融入）
- 历史贸易路线和外交通道

仅在 `map_config.outer_world_enabled` 为 true 时生成详细外部世界定义。

### `16-commodity-timeline.md`

物产引入时间线。

定义：

- 每种作物的原产地、传入中国时间、传入路线
- 作物在 start_date 时的可用性状态
- 获取渠道机制（历史性引入/主动探索/系统奖励/意外获取）
- 穿越者知识约束规则
- 作物引入对世界的影响（人口承载力、饥荒风险等）

基于 `templates/commodity-timeline.template.md` 生成。

### `records/session-record-template.md`

实际游玩时可直接沿用的记录模板。

### `records/private-ledger-template.md`

角色或势力的私密账本模板。

用于记录尚未暴露给玩家的行动、密谋、误判、汇报链和曝光条件。

## 生成要求

- 文件名固定，便于后续自动读取
- 内容可具体，但结构不要散
- 能用表格时优先表格
- 历史人物、势力、事件、天气都要能被追踪
- 关键历史信息都要能回溯到来源账本
- 隐藏信息要有明确的暴露条件与知晓路径
- `.engine-meta.json` 必须携带当前引擎版本号
- 地理底盘（`13-geography-layer.md`）的区域划分必须基于目标时期的行政区划
- 领土控制（`14-territory-layer.md`）的开局状态必须与势力分配一致
- 物产时间线（`16-commodity-timeline.md`）中的作物引入时间必须有学术来源
- 所有作物获取渠道必须遵守"不能无中生有"原则

### `dashboard.html`

可视化仪表盘。零外部依赖，浏览器直接打开即可使用。

从同目录 `state.json` 读取数据，每 3 秒轮询刷新。

包含主角视角和 GM 全局视角的切换。

生成时基于 `templates/dashboard.template.html`，替换模拟器名称和配色方案。

### `state.json`

当前模拟状态的 JSON 快照。

每回合结束后由世界主持器更新。

数据结构遵循 `templates/state-json.template.md` 中定义的 schema。

开局时根据 `09-opening-state.md` 初始化所有字段。

### `data/driver-skill.md`

驱动器 skill 文件（中间产物）。

由 Phase 6 子阶段 6a 基于模板 `templates/driver-skill.template.md` 生成。

这是一个**薄代理** skill，不在模拟器运行时使用。它的职责是：
- 被 AI agent 的 skill 扫描机制发现并触发
- 加载模拟器目录中的完整 `SKILL.md` 和规则文件
- 驱动回合流程

Phase 8（交付阶段）会读取此文件，修正路径变量后安装到 AI agent 的 skill 目录中：

| Agent | 安装路径 |
|-------|---------|
| Claude Code | `.claude/skills/{sim-slug}.md` |
| Cursor | `.cursor/commands/{sim-slug}.md` |
| Windsurf | `.windsurf/rules/{sim-slug}.md` |

### `README.md`

模拟器说明文档。

由 Phase 6 子阶段 6a 基于模板 `templates/simulator-readme.template.md` 生成。

面向用户阅读，包含：
- 模拟器名称和一句话简介
- 故事背景（3-5 段叙事性描述）
- 主角身份（姓名、头衔、年龄、起始位置、核心困境）
- 玩法说明（启动方式、回合制规则、信息不对称机制、输出格式）
- 完结条件（胜利/失败/时间上限）
- 真实性模式说明
- 后续玩法（继承存档、引擎升级）
- 文件结构说明

此文件不参与模拟器运行，仅供用户参考。

### `references/12-save-system.md`

保存与回档系统规则。

基于 `templates/save-system.template.md` 生成。

定义：
- 存档类型（自动/手动/安全快照）
- 存档内容（哪些文件需要快照）
- 存档操作（创建/列出/回档/删除）
- 回档流程（确认/安全快照/恢复/记录归档）
- 与 state.json 单向输出原则的关系
- 与成长系统的交互

### `saves/`

存档系统目录。

- `saves/save-index.json`：存档索引（所有存档的元数据列表）
- `saves/auto/`：每回合自动存档，保留最近 10 个
- `saves/manual/`：玩家命名的手动存档，永久保留（上限 20 个）
- `saves/rollback-snapshots/`：回档前的安全快照，保留最近 3 个

每个存档子目录包含：
- `save-meta.json`：存档元数据（回合号、日期、描述）
- `state.json`：完整状态快照
- `engine-meta.json`：引擎元数据快照
- `characters/`：人物卡快照（overview.md + active/）

### `records/archived/`

回档时从 `records/ledger/` 和 `records/chronicle/` 移出的记录。

按回档事件组织：`records/archived/rollback-{timestamp}/`

### `scripts/save-manager.mjs`

存档管理脚本（可选）。

基于生成器 `scripts/save-manager.mjs` 复制到目标模拟器。

提供命令行操作：
- `--auto --turn N`：创建自动存档
- `--save --name "..."`：创建手动存档
- `--list`：列出存档
- `--rollback --turn N`：回档到指定回合
- `--rollback --name "..."`：回档到指定存档
- `--delete --name "..."`：删除手动存档
