# 历史模拟器生成器

本仓库是一个 Claude Code Skill，用于生成"某个具体历史模拟器"的完整 skill 包。

生成器不直接扮演历史人物，而是系统化产出模拟器运行所需的全部规则文件、人物卡、事件引擎、状态系统和记录模板。产出物是一个可独立运行的模拟器目录。

## 目录结构

```
history-simulation/
├── SKILL.md                          # 生成器主入口（skill 指令文件）
├── README.md                         # 本文件
├── phases/                           # 阶段指令文件（每个阶段一个 .md）
├── references/                       # 设计原则、规范文档
├── templates/                        # 生成物模板文件
├── scripts/                          # 辅助脚本（数据收集、回合引擎等）
├── evals/                            # 生成器测试用例
├── external_refs/                    # 外部参考项目索引
├── data/                             # 生成器自身测试数据
└── chongzhen-1643/                   # 示例：崇祯十七年模拟器（已生成）
```

## 三种创建模式

| 模式 | 说明 | 适用场景 |
|------|------|---------|
| **A. 全新创建** | 基于某个历史时期，从零开始 | 新建任意模拟器 |
| **B. 继承存档** | 基于已完结的模拟器存档，创建新一代 | 多代人连续游玩 |
| **C. 引擎升级** | 将已有模拟器升级到当前引擎版本 | 引擎发版后升级 |

## 生成流程总览

### 模式 A：全新创建（阶段 0 - 8）

```
阶段 0  访谈确认参数
  │
阶段 1  多源数据收集
  │
阶段 2  冲突检测与解决
  │
阶段 3  时间线感知人物提炼
  │
阶段 3.2  世界审核与补充设定
  │
阶段 3.4  人物生态层（条件触发）
  │
阶段 3.6  地理基础层
  │
阶段 3.7  物产时间线
  │
阶段 4  历史事件建模
  │
阶段 5  自定义规则形式化
  │
阶段 6  生成完整包
  │
阶段 7  一致性验证
  │
阶段 8  交付
```

### 模式 B：继承存档（阶段 B-0 - B-6）

读取上一代存档 -> 确定继承模式 -> 简化访谈 -> 数据变换 -> 生成新包 -> 验证 -> 交付

### 模式 C：引擎升级（阶段 C-0 - C-6）

读取引擎版本 -> 确定升级路径 -> 备份 -> 执行升级 -> 更新版本标记 -> 验证 -> 交付

---

## 阶段详细说明

以下以模式 A（全新创建）为主线，逐阶段说明执行内容、产物和持久化要求。

> **核心原则：每个阶段的产物必须在该阶段内写入本地磁盘。** 中间数据存放在 `{sim-slug}/data/` 下，防止上下文溢出或会话中断导致数据丢失。

---

### 阶段 0：访谈确认参数

**指令文件：** `phases/phase-0-interview.md`

**做什么：**
与用户交互确认模拟器的全部核心参数。按访谈清单逐项确认约 20 个必填字段，包括模拟器名称、历史锚点（朝代/年份/地理范围）、主角身份、真实性模式、回合粒度、状态维度、天气权重、叙事风格、信息可见度、完成条件等。

**输入：**
- 用户的原始需求描述
- `references/interview-checklist.md`（14 项访谈清单）

**产物：**

| 文件路径 | 内容说明 |
|---------|---------|
| `{sim-slug}/data/generation-brief.md` | **生成简报**。包含所有已确认参数的结构化文档，是后续所有阶段的输入依据。字段包括：sim_name、sim_slug、historical_anchor、start_date、protagonist、fidelity_mode、custom_injections、turn_granularity、core_systems、recording_mode、source_strictness、dashboard_style、map_config、commodity_config、victory/defeat 条件、time_limit 等 |
| `{sim-slug}/data/.generation-progress.json` | **进度追踪文件**。记录 sim_slug、当前阶段、各阶段状态（pending/in_progress/completed）、子任务列表。后续每次阶段切换都要更新此文件 |
| `{sim-slug}/data/sources/catalog.json` | **文档目录**。记录用户提供的本地史料清单（文件名、层级 A/B/C、类型 primary/fiction/academic/popular） |
| `{sim-slug}/data/sources/primary/` | 一级史料存放目录 |
| `{sim-slug}/data/sources/secondary/` | 二级研究资料存放目录 |
| `{sim-slug}/data/sources/evidence/` | 证据链文件目录（Phase 1 起写入） |
| `{sim-slug}/data/raw/` | 原始数据目录（Phase 1 起写入） |
| `{sim-slug}/data/resolved/` | 冲突解决结果目录（Phase 2 起写入） |
| `{sim-slug}/data/distilled/` | 提炼数据目录（Phase 3 起写入） |

**持久化要求：** 简报和进度文件确认后立即写入磁盘。工作目录结构在此时创建。

---

### 阶段 1：多源数据收集

**指令文件：** `phases/phase-1-collect.md`

**做什么：**
根据生成简报中的实体列表，从本地文档和网络搜索中收集结构化历史数据。本地文档由 AI 直接读取提取；网络搜索仅用于发现 A/B 级史料线索，不直接采信搜索结果。

**输入：**
- `data/generation-brief.md`
- `data/sources/catalog.json`
- 用户提供的本地史料文件

**产物：**

| 文件路径 | 内容说明 |
|---------|---------|
| `data/raw/entity-inventory.json` | **实体清单**。列出所有待收集实体（人物/势力/事件/制度/地理），按类型、名称、搜索优先级(P0/P1/P2)、状态(incomplete/collected)排列 |
| `data/raw/{entity_type}/{entity_name}.json` | **按实体类型分目录的原始数据**。每个实体一个 JSON，包含从史料中提取的结构化数据、source_locations（来源定位）和 exact_quotes（原文引用）。entity_type 包括 person/、faction/、event/、institution/ 等 |
| `data/sources/catalog.json`（更新） | **文档目录**。新增偏倚标注（bias annotation）：political_stance、known_gaps、known_embellishments、reliability_assessment、narrative_dependencies |
| `data/sources/evidence/{entity}-evidence.json` | **初始证据链**。每个实体一条，包含断言 ID、断言强度(strong/weak/disputed/fiction/inferred)、证据来源、交叉验证类型、置信度 |

**持久化要求：** 按优先级分批处理（每批 10-15 个实体），每批完成后立即写入磁盘。原始数据在结构化提取完成后持久化，原始文本可丢弃以节省上下文。

**上下文管理：** 这是 token 消耗最高的阶段。支持 `/clear` 恢复——进度文件记录已完成的实体批次。

---

### 阶段 2：冲突检测与解决

**指令文件：** `phases/phase-2-resolve.md`

**做什么：**
AI 直接阅读原始史料进行语义级冲突检测。识别不同来源间的史实分歧、人物描写偏差、时间线矛盾、叙述偏倚叠加。引导用户选择全局蓝图策略并逐个解决高严重度冲突。

**输入：**
- `data/raw/`（原始数据）
- `data/sources/catalog.json`（含偏倚标注）
- `data/sources/evidence/`（初始证据链）
- `data/generation-brief.md` 中的 source_preference

**产物：**

| 文件路径 | 内容说明 |
|---------|---------|
| `data/resolved/{entity_name}-resolution.json` | **每个实体的冲突解决结果**。包含全局蓝图策略(history_first/fiction_first/custom_per_entity/fusion)、各字段的采用版本、未解决项列表 |
| `data/conflicts/conflict-report.md` | **冲突报告**。包含统计（高/中/低严重度数量）、偏倚叠加检测结果、按严重度分组的冲突清单、用户决策记录、未解决项 |
| `data/sources/evidence/{entity}-evidence.json`（更新） | **证据链更新**。断言强度、交叉验证类型、置信度根据解决结果修正 |

**持久化要求：** 每个实体的解决结果完成后立即写入。冲突报告在全量检测完成后写入。

---

### 阶段 3：时间线感知人物提炼

**指令文件：** `phases/phase-3-distill.md`

**做什么：**
基于七层模型对人物进行提炼。严格将人物知识层限制在 start_date 之前，行为模式层按可塑性等级（固定/半形成/未形成）处理。每个提炼结果必须关联证据链中的断言 ID。

**输入：**
- `data/resolved/`（冲突解决数据）
- `data/raw/entity-inventory.json`
- `data/generation-brief.md`
- `references/character-distillation.md`（七层模型）

**产物：**

| 文件路径 | 内容说明 |
|---------|---------|
| `data/distilled/character-inventory.md` | **人物清单表**。列出所有人物的类型(core/important supporting/minor/background)、时代、数据丰富度、与主角关系、可塑性估计 |
| `data/distilled/{character_name}.yaml` | **每个人物的七层提炼档案**。包含：硬锚层（生卒年、官职、籍贯）、制度位置层、动机层（公利目标/隐秘利益/红线）、关系层、决策启发层、压力反应层、诚实边界层。每个关键字段标注断言 ID `[A001]`（证据支持）或 `[I001]`（推断） |
| `data/sources/evidence/{name}-evidence.json`（更新） | **证据链补充推断断言** |

**七层模型：**
1. **硬锚层** -- 不可辩驳的史实（生卒年、官职、事件参与）
2. **制度位置层** -- 所处制度体系、对谁负责、可调动资源、约束规则
3. **动机层** -- 公开目标、隐秘利益、不可触碰红线、最怕失去什么
4. **关系层** -- 盟友/对手/上下级/派系/家族/地缘
5. **决策启发层** -- 反复观察到的判断模式（需通过三重验证）
6. **压力反应层** -- 在财政危机/军事失败/天灾/上级压力下的反应倾向
7. **诚实边界层** -- 哪些内容缺乏直接一手史料、哪些仅为学界推断、争议在哪里

**人物可塑性分级：**
- **fixed**（已形成）：start_date 前经历已完全定型，硬约束
- **semi-formed**（半形成）：部分行为可被新经历改写
- **unformed**（未形成）：关键塑造事件尚未发生，仅保留先天特质

**持久化要求：** 按批次处理（核心人物可能独占一批 8-10 人，背景人物可 15-20 人一批），每批完成后立即写入。

---

### 阶段 3.2：世界审核与补充设定

**指令文件：** `phases/phase-3.2-world-review.md`

**触发条件：** 阶段 3 完成后**必须执行**。

**做什么：**
阶段 0 的访谈是粗粒度的——用户在看到完整世界之前，很难给出精确的补充设定。本阶段在人物提炼完成后执行，此时世界已具雏形、人物卡已生成。向用户展示已构建的世界和人物，通过分层交互收集细粒度的补充设定。

**交互模式：** 分层交互。
1. 先展示世界总览 + 人物总览表，确认名单完整性
2. 逐个展示核心人物和重要配角的提炼摘要，让用户补充设定
3. 开放式问答收集世界观补充（制度/势力/事件/氛围）
4. 支持新增人物（历史人物或虚构人物）

**输入：**
- `data/distilled/character-inventory.md`（人物清单）
- `data/distilled/*.yaml`（人物提炼档案）
- `data/generation-brief.md`（现有 custom_injections）

**产物：**

| 文件路径 | 内容说明 |
|---------|---------|
| `data/distilled/user-supplements.yaml` | **用户补充设定汇总**。包含三类：`world_supplements`（世界观补充）、`character_supplements`（人物额外设定，含设定类型/描述/可见性）、`new_characters`（新增人物清单）。每条设定标注来源和 `phase: 3.2`，留待阶段 5 做规则化 |
| `data/distilled/{new_character}.yaml` | **新增人物提炼档案**。按阶段 3 的七层模型生成，标注 `source: user_added`。历史人物走提炼流程，虚构人物的动机层和关系层必须用户确认，其余层可合理推断 |
| `data/distilled/character-inventory.md`（更新） | **人物清单更新**。新增人物加入清单并标记 `added_in_phase: 3.2`，移除的人物标记 `excluded: true` |
| `data/generation-brief.md`（更新） | **生成简报更新**。`custom_injections` 扩展，追加本阶段收集的全部补充设定，标注 `phase: 3.2` 以区分来源 |

**与阶段 5 的关系：** 本阶段**不做规则化**，只收集用户原始描述。全部补充设定与阶段 0 的 custom_injections 合并后，统一在阶段 5 做机制具象化、边界约束和交叉验证。保持单一规则化出口。

**新增人物对后续阶段的影响：** 新增人物纳入阶段 3.4 的出生条件/血统/死亡系统；参与的事件纳入阶段 4 的事件卡；全部补充设定进入阶段 5 规则化；阶段 6 生成完整人物卡；阶段 7 纳入一致性验证。

**持久化要求：** 每轮交互确认后立即将补充内容写入 `user-supplements.yaml`。新增/修改的人物档案在生成后立即写入。

---

### 阶段 3.4：人物生态层

**指令文件：** `phases/phase-3.4-ecology.md`

**触发条件：** 时间跨度超过一代人（约 30 年）或设定包含修仙/长生元素时**必须执行**，否则可跳过。

**做什么：**
建模人物的完整生命周期：出生条件系统、死亡系统、遗产系统、涌现人物生成、历史分歧追踪。

**输入：**
- `data/distilled/`（人物提炼档案）
- `data/generation-brief.md`

**产物：**

| 文件路径 | 内容说明 |
|---------|---------|
| `data/distilled/ecology-rules.yaml` | **生命周期状态机**。定义状态：notexistent -> conceable -> in_pregnancy -> born -> growth -> active -> decline -> dead -> deceased。含进入/退出条件 |
| `data/distilled/bloodline-registry.yaml` | **家族谱系**。简化家族关系图，用于每回合出生条件检查 |
| `data/distilled/birth-conditions.yaml` | **出生条件卡**。每个未出生历史人物的硬条件（父母存活、血统完整）、软条件（地区稳定度、经济状况）、出生时间窗口（允许 +/- 1-2 年偏差）、级联效应 |
| `data/distilled/death-system.yaml` | **死亡概率规则**。基于年龄/健康/环境的概率计算，非脚本化死亡 |
| `data/distilled/legacy-system.yaml` | **遗产系统**。三池隔离（active/waiting/archive）+ 五类遗产及衰减率：制度性（慢）、精神性（极慢，跨代际）、关系网（中）、未竟计划（快）、隐秘/隐患（不衰减） |
| `data/distilled/emergent-character-rules.yaml` | **涌现人物规则**。历史人物耗尽后生成新人物的规则：历史型（有史料）、血脉延续型（遗传特质+经历塑造）、涌现型（随机特质+完全由经历塑造） |
| `data/distilled/divergence-tracker.yaml` | **分歧追踪**。四个维度（人事/事件/地理/制度）的历史分歧度追踪。分歧越大，历史事件触发越少，涌现人物越多 |

**持久化要求：** 7 个子系统逐个完成后立即写入。

---

### 阶段 3.6：地理基础层

**指令文件：** `phases/phase-3.6-geography.md`

**触发条件：** 所有模拟器**必须执行**。

**做什么：**
构建地图系统的 L1 静态地理基础：按历史时期的行政区划划分区域，填充地形、气候、资源、人口等静态属性，建立邻接关系和战略通道。

**输入：**
- `data/generation-brief.md`（map_config、historical_anchor）
- `data/raw/` 中的地理/区域数据

**产物：**

| 文件路径 | 内容说明 |
|---------|---------|
| `data/distilled/geography-layer.yaml` | **地理基础层**。包含：(1) 区域划分：每个区域有唯一 ID、名称、别名、地形类型、气候带、上级区划、资源（粮食作物/经济作物/矿藏/特产）、人口经济（人口基数/肥力/开发度）、地理关系（邻接区域/关隘/河流/山脉）、军事地理（行军难度/防御加成/补给难度）；(2) 外部世界定义（开启时定义边境区域、各方向外部区域、贸易路线）；(3) 地形系统影响表：7 种地形类型对行军/补给/防御/产粮/民心的数值修正 |

**持久化要求：** 全部区域划分完成并验证邻接关系后写入。

---

### 阶段 3.7：物产时间线

**指令文件：** `phases/phase-3.7-commodity.md`

**触发条件：** 所有模拟器**必须执行**。

**做什么：**
基于历史时期和地理范围，构建作物/物产引入时间线。定义每种作物的可用性、获取条件和获取渠道。防止时代错误的作物出现。

**输入：**
- `data/generation-brief.md`（commodity_config、start_date）
- `data/distilled/geography-layer.yaml`

**产物：**

| 文件路径 | 内容说明 |
|---------|---------|
| `data/distilled/commodity-timeline.yaml` | **物产时间线**。包含：(1) 作物可用性评估：每种相关作物的起源/驯化日期、引入中国日期、start_date 时是否可用、外部世界获取条件；(2) 引入时间线分类：already_available（已广泛存在）、potentially_available（可通过探索获取）、future_introduction（有已知历史引入日期）、impossible（本时期不可获取）；(3) 获取渠道定义：历史引入/主动探索/系统奖励（仅限系统设定）/偶然获取（每回合 <1%）；(4) 穿越者约束：知识不等于获取能力 |

**持久化要求：** 所有相关作物评估完成、时间线和渠道定义后写入。

---

### 阶段 4：历史事件建模

**指令文件：** `phases/phase-4-events.md`

**做什么：**
将所有历史事件建模为"条件触发"而非"时间到达"。玩家行动可以阻止历史事件发生；被阻止的事件需推算替代演化路径。

**输入：**
- `data/distilled/`（人物档案、势力数据）
- `data/generation-brief.md`
- `data/raw/event/`

**产物：**

| 文件路径 | 内容说明 |
|---------|---------|
| `data/distilled/event-cards/{EVT-ID}.yaml` | **每张事件卡**。包含：event_id、historical_date（历史日期）、event_type（hard_anchor/trend/accidental/character_driven/climate）、probability_base、trigger_conditions（all_of/any_of 条件组）、state_conditions（映射到 state.json 路径的比较运算）、block_conditions（阻止条件）、modify_conditions、outcomes（概率分支结果）、state_effects（触发/阻止时的 delta 值映射）、cascade_events（级联事件）、character_refs |
| `data/distilled/event-cards/_index.yaml` | **事件索引**。所有事件的目录 + 级联关系图 |

**事件分类：**
- **hard_anchor** -- start_date 之前已发生，不可改变
- **trend** -- 高概率趋势事件，可阻止
- **accidental** -- 偶然事件，可阻止
- **character_driven** -- 由特定人物触发的可变事件
- **climate** -- 独立概率灾害，除非有超自然设定否则不可阻止

**持久化要求：** 按批次生成事件卡（每批 8-10 张），每批完成后写入。级联索引在全量事件卡生成后写入。

---

### 阶段 5：自定义规则形式化

**指令文件：** `phases/phase-5-custom-rules.md`

**做什么：**
将用户添加的每个架空设定翻译为可执行规则。与已有规则交叉验证兼容性。无论是否有自定义设定，都必须生成月度结算基线表和决策影响量化表。

**输入：**
- `data/generation-brief.md`（custom_injections）
- `data/distilled/`（已处理的人物、事件、地理数据）

**产物：**

| 文件路径 | 内容说明 |
|---------|---------|
| `data/distilled/custom-rules.yaml` | **可执行规则文件**。包含两大必须部分 + 可选部分：(1) `monthly_baseline` **月度结算基线表** -- 每回合所有核心领域（政治/财政/军事/民情）的自动变化值和原因，含季节修正因子和触发条件。基线值必须与 09-opening-state.md 初始值对齐。(2) `decision_quantification` **决策影响量化表** -- 每类决策（人事/军事/财政/外交/赈灾/情报）的量化规则：消耗范围、效果范围、滞后周期、单次决策效果上限、失败概率及后果。(3) 自定义设定规则 -- 每个用户架空设定的可执行规则：影响哪些系统、限制（力量上限/范围/失败条件）、与其他人物的交互方式、资源消耗 |

**持久化要求：** 规则文件在交叉验证通过后立即写入。

---

### 阶段 6：生成完整包

**指令文件：** `phases/phase-6-generate.md`

**做什么：**
将前 5 个阶段的所有结构化数据填入模板，生成完整的模拟器 skill 包。由于文件数量多（25+ 个文件），分 8 个子批次生成以控制上下文消耗。此阶段只做"读结构化数据 + 填模板"，不做分析工作。

**输入：**
- `data/generation-brief.md`
- `data/distilled/`（所有提炼数据）
- `data/resolved/`（冲突解决结果）
- `references/generated-package-spec.md`
- `templates/` 目录下所有模板

**产物：**

生成 `{sim-slug}/` 目录下的完整模拟器包。按子批次分列：

#### 6a - 基础骨架

| 文件路径 | 内容说明 |
|---------|---------|
| `.engine-meta.json` | 引擎版本标记。记录 engine_version、generated_at、sim_name、sim_slug、creation_mode(A/B/C)、turn_count=0 |
| `SKILL.md` | **模拟器核心指令**。世界主持器的完整规则：核心设定、运行原则、人物信息分层加载（三层：总览表/摘要卡/完整卡）、人物卡管理（active/waiting/archive 三池）、回合流程（14 步）、完成系统（硬/软触发 + 六级结局）、继承系统、引擎升级路径、输出格式 |
| `dashboard.html` | **可视化面板**。零依赖单文件 HTML，3 秒自动轮询 state.json。含玩家视图（领域指标/人物关系/领土/事件日志）和 GM 视图（长按 3 秒激活，显示私密账本/隐藏行动/全局真相）。支持 CSS 变量主题定制 |
| `state.json` | **运行时状态文件**。完整 JSON 结构：meta、protagonist（状态/知识/可用资源）、world（天气/各领域状态/活跃事件）、characters[]、factions[]（含关系和领土）、territory（区域控制强度/驻军/民心/可见度）、world_crops（可用作物/引入日志/外部世界联系）、known_world（探索区域/扩张进度）、turn_log[]、gm_only（私密账本/隐藏行动/全局真相/暴露追踪）。上限 15KB |
| `data/driver-skill.md` | **驱动器 skill**。薄代理入口，含启动/恢复逻辑。安装到 AI agent 的 skill 目录 |
| `README.md` | **模拟器说明文档**。故事背景、主角身份、玩法说明、完成条件、真实性模式、存档继承方式、完整文件结构 |

#### 6b - 规则文件 A（设定与政策）

| 文件路径 | 内容说明 |
|---------|---------|
| `references/01-simulator-brief.md` | **模拟器简报**。从 generation-brief.md 转化，作为运行时的设定参考 |
| `references/02-canon-policy.md` | **正典政策**。三级边界定义：不可变史实/合理推断区/可改写区 + 用户自定义设定优先级 + 冲突解决优先序（用户设定 > 不可变史实 > 已确立演化 > 新回合推断） |
| `references/03-cast-registry.md` | **人物总表**。核心人物表（姓名/身份/派系/历史锚点/公开目标/隐秘压力/行动偏向/认知边界/情报渠道/来源/置信度）+ 人物卡必备字段（8 个）+ 扩展人物触发条件 + 每月行动模板 + 生命周期管理规则 + 三池隔离规则 + 断言溯源示例 |

#### 6c - 规则文件 B（势力与引擎）

| 文件路径 | 内容说明 |
|---------|---------|
| `references/04-faction-map.md` | **势力版图**。势力必须有领土。含势力核心表、领土控制、势力间关系矩阵（盟友/对手/敌对/中立 + 张力来源 + 近期风险 + 争议区域）、制度约束、地理约束 |
| `references/05-world-event-engine.md` | **世界事件引擎**。三类事件定义：固定历史锚点事件、条件触发事件、架空设定事件。含 state.json 条件映射格式供 `scripts/turn-engine.mjs` 自动化评估 |
| `references/06-weather-engine.md` | **天气气候引擎**。三层：长期气候基准 + 季节天气表 + 异常天气灾害。影响必须覆盖至少 3/7 个系统（粮食/税收/运输/行军/瘟疫/民心/治安） |

#### 6d - 规则文件 C（状态与回合）

| 文件路径 | 内容说明 |
|---------|---------|
| `references/07-state-schema.md` | **状态字段定义**。每个字段的域、类型(score/text/list)、初始值、更新规则。10 个建议最小域：政治(稳定度/派系张力/地方服从度)、财政(国库/粮储/税压/军费缺口)、军事(兵力/补给/机动/士气)、民情(治安/饥荒/流民/舆论)、主角(声望/健康/资源/敌意标记)、天气、情报、领土、物产、已知世界 |
| `references/08-session-protocol.md` | **回合协议**。11 步回合流程 + 月度结算基线表 + 决策影响量化表（6 类决策的消耗/效果/滞后/上限/失败率）+ 被动回合规则（最多连续 3 回合）+ 赈灾流程（5 步）+ 输出格式 |
| `references/09-opening-state.md` | **开局状态**。数值平衡要求（16 项指标总和不超过 1200、单项 10-95 之间、至少 2 个领域在危机中(<30)）、开局日期/天气、主角初始状态和知识、世界初始局势、已激活事件、开场人物动态 |

#### 6e - 规则文件 D（溯源与认知）

| 文件路径 | 内容说明 |
|---------|---------|
| `references/10-source-ledger.md` | **来源账本**。每个断言的溯源表：断言 ID(`A{NNN}` 证据支持 / `I{NNN}` 推断)、来源层级(A/B)、具体引用、原文、用途、置信度、偏倚注记、叙述依赖标记、争议注记 |
| `references/11-knowledge-model.md` | **知晓模型**。五级信息分层(global_truth/private_known/faction_known/public_known/player_known)、八个主角信息渠道（亲眼见/奏报/密报/巡查/审计/审讯/传闻/事件暴露）、信息到达延迟规则、可靠性衰减（延迟 2+ 回合时准确率递减） |

#### 6f - 地图与物产文件

| 文件路径 | 内容说明 |
|---------|---------|
| `references/12-geography-layer.md` | **地理层（L1 静态）**。从 data/distilled/geography-layer.yaml 转化。区域定义 YAML + 7 种地形系统影响表 + 区域关系邻接图。运行时只读 |
| `references/13-territory-layer.md` | **领土层（L2 动态 + L3 可见度）**。L2 每回合更新的领土控制（控制强度 0-1、五档分级、驻军/民心/税率、攻防结算流程）；L3 认知边界（四级可见度：完整/部分/模糊/未知 + 五种提升渠道 + 主角位置自动完整可见） |
| `references/14-map-expansion.md` | **地图扩张规则**。三步流程：发现（听说外部区域）-> 接触（派遣使节/商队）-> 整合（持续交流纳入已知世界）。地图扩张是获取外部物产的前提 |
| `references/15-commodity-timeline.md` | **物产时间线**。从 data/distilled/commodity-timeline.yaml 转化。作物时间线 + 获取渠道机制 + 时期-作物可行性矩阵 + 世界影响量化（高产作物 +30-50% 人口承载力） |

#### 6g - 记录模板

| 文件路径 | 内容说明 |
|---------|---------|
| `records/ledger-template.md` | **结构化账本模板**。每回合产出的结构化记录：日期/地点/天气/触发事件/参与人物/主角决策（含消耗/直接效果/延迟效果/风险掷骰）/状态变化表/指标快照/情报变化/史实与推断标记 |
| `records/chronicle-template.md` | **编年史模板**。每回合产出的小说化叙事。回合号 + 日期 + 叙事正文 + 天气元数据 |
| `records/session-record-template.md` | **会话记录模板**（兼容旧版）。结构化 + 叙事合一格式 |
| `records/private-ledger-template.md` | **私密账本模板**。记录单个人物或势力的秘密行动、已知情报、误判、掩护方式、暴露条件。玩家不可见 |

#### 6h - 人物卡与事件触发器

| 文件路径 | 内容说明 |
|---------|---------|
| `characters/active/{name}.md` | **活跃人物卡**（最多 20 张）。每人一个文件，含：基础信息（身份/派系/位置/与主角关系/生命周期状态）+ 核心属性（公开目标/隐秘压力/可用资源/最大恐惧）+ 反应倾向表（军事/政治/饥荒/天灾/人身威胁）+ 认知边界（信息渠道/已知/未知）+ 运行时状态（立场/态度/近期行动提示/玩家可见度/活跃度）+ 摘要卡（一段话）+ 断言溯源表。所有关键字段标注断言 ID |
| `characters/waiting/{name}.md` | **等待池人物卡**。出生条件未满足的历史人物，含出生前置条件卡 |
| `characters/archive/{name}.md` | **归档池人物卡**。仅保留有影响力的已故人物 |
| `characters/overview.md` | **人物总览表**。三层加载的第一层，~20 tokens/人，包含姓名/状态/身份/派系/位置/与主角关系/当回合标记 |
| `data/event-triggers.json` | **事件触发器编译文件**。从所有事件卡 YAML 编译为 JSON，供 `scripts/turn-engine.mjs` 自动化评估 |
| `scripts/create-character.mjs` | **运行时人物创建脚本**。用于游戏中动态生成新人物卡 |

**持久化要求：** 每个子批次完成后立即写入所有文件。这是最终产物的组装阶段，所有内容必须落盘。

---

### 阶段 7：一致性验证

**指令文件：** `phases/phase-7-validate.md`

**做什么：**
交付前的全面一致性检查。34 项检查分为 6 大类，全部通过才能交付。不通过的项必须修复并重新检查。

**输入：**
- `{sim-slug}/` 完整包

**产物：**

| 文件路径 | 内容说明 |
|---------|---------|
| `data/validation-report.md` | **验证报告**。34 项检查的通过/失败结果，含修复记录 |

**6 大类 34 项检查：**

1. **基础一致性（9 项）**：主角身份、人物动机、天气效果映射到状态层、输出格式、来源可溯源、规则文件覆盖、state.json 与开局状态一致、dashboard.html 渲染、engine-meta.json 存在且版本正确
2. **证据链完整性（8 项）**：断言覆盖率、强断言交叉验证、偏倚标注完整、叙述依赖标记、原文引用覆盖、证据链文件完整、文档本地化、文档哈希一致
3. **时间线与信息（4 项）**：无未来知识泄露、信息隔离、玩家可见度限于主角认知、人物行动受知识边界约束
4. **事件与蓝图（4 项）**：事件独立（条件触发非自动）、蓝图策略与用户选择一致、冲突解决覆盖、被阻止事件的替代路径
5. **地图与物产（7 项）**：势力版图与领土层一致、地形关联天气/军事/财政、无时代错误作物、作物引入链完整、穿越者约束、外部世界关联获取渠道、势力必须有领土
6. **生态与结局（2 项）**：胜败/时限条件定义、人物池隔离（当执行了阶段 3.4 时）

**持久化要求：** 验证报告和修复后的文件在每轮修复后写入。

---

### 阶段 8：交付

**指令文件：** `phases/phase-8-deliver.md`

**做什么：**
向用户汇报生成结果，安装驱动器 skill，提供使用指引。

**输入：**
- `{sim-slug}/` 完整包
- `data/validation-report.md`

**产物：**

| 文件路径 | 内容说明 |
|---------|---------|
| `data/driver-skill.md`（读取并安装） | **驱动器 skill 安装**。将 driver-skill.md 中的 `{{sim_dir}}` 替换为实际路径，安装到 `.claude/skills/`、`.cursor/commands/` 或 `.windsurf/rules/` |
| 终端输出 | **交付报告**。包含：基本信息（名称/时代/主角）、架构决策（真实性模式/蓝图策略/自定义规则/条件事件机制）、数据统计（人物/事件/区域/物产/来源数量）、结局条件、安装结果、使用指引、迭代建议（继承模式/引擎升级）、完整文件清单 |

**交付报告内容：**
- 模拟器名称与目录
- 关键架构判断（单入口 + 概念 agent 人物卡）
- 真实性模式及影响
- 蓝图策略说明
- 自定义设定如何落地为规则
- 条件触发事件机制说明
- 后续迭代路径（继承存档 / 引擎升级）
- 完整文件清单

**持久化要求：** 驱动器安装完成后，进度文件标记为 `completed`。

---

## 数据流转总图

```
用户需求
  │
  v
[阶段 0] generation-brief.md + .generation-progress.json + sources/catalog.json
  │
  v
[阶段 1] raw/entity-inventory.json + raw/{type}/*.json + sources/evidence/*.json
  │
  v
[阶段 2] resolved/*.json + conflicts/conflict-report.md + evidence/*.json(更新)
  │
  v
[阶段 3] distilled/character-inventory.md + distilled/*.yaml + evidence/*.json(更新)
  │
  v
[阶段 3.2] distilled/user-supplements.yaml + {new_character}.yaml + character-inventory.md(更新) + generation-brief.md(更新)
  │
  v
[阶段 3.4] distilled/ecology-rules.yaml + bloodline-registry.yaml + birth-conditions.yaml
            + death-system.yaml + legacy-system.yaml + emergent-character-rules.yaml
            + divergence-tracker.yaml
  │
  v
[阶段 3.6] distilled/geography-layer.yaml
  │
  v
[阶段 3.7] distilled/commodity-timeline.yaml
  │
  v
[阶段 4] distilled/event-cards/*.yaml + event-cards/_index.yaml
  │
  v
[阶段 5] distilled/custom-rules.yaml
  │
  v
[阶段 6] {sim-slug}/ 完整目录（25+ 文件）
  │
  v
[阶段 7] data/validation-report.md
  │
  v
[阶段 8] 驱动器安装 + 交付报告
```

## 中间数据目录结构

```
{sim-slug}/data/
├── .generation-progress.json       # 进度追踪（贯穿全程）
├── generation-brief.md             # 生成简报（阶段 0 产出）
├── validation-report.md            # 验证报告（阶段 7 产出）
├── driver-skill.md                 # 驱动器（阶段 6 产出，阶段 8 安装）
├── sources/
│   ├── catalog.json                # 文档目录 + 偏倚标注
│   ├── primary/                    # 一级史料
│   ├── secondary/                  # 二级研究
│   └── evidence/                   # 证据链（{entity}-evidence.json）
├── raw/
│   ├── entity-inventory.json       # 实体清单
│   ├── person/                     # 人物原始数据
│   ├── faction/                    # 势力原始数据
│   ├── event/                      # 事件原始数据
│   └── institution/                # 制度原始数据
├── resolved/                       # 冲突解决结果
├── conflicts/
│   └── conflict-report.md          # 冲突报告
└── distilled/
    ├── character-inventory.md      # 人物清单（阶段 3 产出，阶段 3.2 可能更新）
    ├── *.yaml                      # 人物提炼档案（阶段 3 产出，阶段 3.2 可能新增）
    ├── user-supplements.yaml       # 用户补充设定（阶段 3.2 产出）
    ├── ecology-rules.yaml          # 生态规则（条件触发）
    ├── bloodline-registry.yaml     # 家族谱系
    ├── birth-conditions.yaml       # 出生条件
    ├── death-system.yaml           # 死亡系统
    ├── legacy-system.yaml          # 遗产系统
    ├── emergent-character-rules.yaml
    ├── divergence-tracker.yaml     # 分歧追踪
    ├── geography-layer.yaml        # 地理基础层
    ├── commodity-timeline.yaml     # 物产时间线
    ├── custom-rules.yaml           # 自定义规则
    └── event-cards/                # 事件卡目录
        ├── _index.yaml             # 事件索引
        └── EVT-*.yaml              # 各事件卡
```

## 最终产物目录结构

```
{sim-slug}/
├── .engine-meta.json               # 引擎版本标记
├── SKILL.md                        # 模拟器核心指令
├── README.md                       # 模拟器说明
├── dashboard.html                  # 可视化面板
├── state.json                      # 运行时状态
├── data/
│   └── driver-skill.md             # 驱动器 skill
├── characters/
│   ├── overview.md                 # 人物总览（三层加载 L1）
│   ├── active/                     # 活跃人物卡（最多 20 张）
│   ├── waiting/                    # 等待池人物卡
│   └── archive/                    # 归档池人物卡
├── references/
│   ├── 01-simulator-brief.md       # 模拟器简报
│   ├── 02-canon-policy.md          # 正典政策
│   ├── 03-cast-registry.md         # 人物总表
│   ├── 04-faction-map.md           # 势力版图
│   ├── 05-world-event-engine.md    # 世界事件引擎
│   ├── 06-weather-engine.md        # 天气气候引擎
│   ├── 07-state-schema.md          # 状态字段定义
│   ├── 08-session-protocol.md      # 回合协议
│   ├── 09-opening-state.md         # 开局状态
│   ├── 10-source-ledger.md         # 来源账本
│   ├── 11-knowledge-model.md       # 知晓模型
│   ├── 12-geography-layer.md       # 地理层
│   ├── 13-territory-layer.md       # 领土层
│   ├── 14-map-expansion.md         # 地图扩张
│   └── 15-commodity-timeline.md    # 物产时间线
├── records/
│   ├── ledger-template.md          # 账本模板
│   ├── chronicle-template.md       # 编年史模板
│   ├── session-record-template.md  # 会话记录模板
│   └── private-ledger-template.md  # 私密账本模板
└── scripts/
    ├── create-character.mjs        # 运行时人物创建
    ├── turn-engine.mjs             # 回合引擎
    ├── record-writer.mjs           # 记录写入
    └── info-delay.mjs              # 信息延迟计算
```

## 设计原则

| 原则 | 说明 |
|------|------|
| **先定界再生成** | 确认时代、主角、真实性模式、回合粒度、输出风格后再动手 |
| **分层不混淆** | 严格区分：历史锚点 / 合理推断 / 用户自定义 / 涌化结果 |
| **天气不是装饰** | 天气气候必须机械地影响粮食、军事、疫病、治安 |
| **记录可保存** | 每回合产出双重记录（结构化账本 + 小说化叙事），通关后可编撰成文 |
| **来源可溯源** | 每条史实断言可追溯到可靠来源，禁止 AI 摘要作为史料 |
| **信息不对称** | 无上帝视角。世界主持维护全局真相，各人物/势力仅知自身范围，主角仅知亲历/奏报/巡查/公开暴露 |

## 硬约束摘要

- 历史人物不能用模糊性格词，必须明确动机、约束、认知边界、利益、行动偏好
- 人物知识不能超过 start_date，行为模式按可塑性分级
- 历史事件不自动发生，必须条件触发，玩家可阻止
- 阻止历史事件后必须推算替代演化路径
- 势力必须有领土，地形必须影响玩法
- 作物不能凭空出现，穿越者知识不等于获取能力
- 必须有明确的胜负条件和分级结局
- 小说化叙事不能覆盖结构化状态记录，二者必须共存

## 参考文件索引

| 文件 | 说明 |
|------|------|
| `references/core-principles.md` | 6 条工作原则 |
| `references/hard-constraints.md` | 硬约束清单 |
| `references/enhanced-generation-flow.md` | 增强版生成流程完整设计 |
| `references/engine-version.md` | 引擎版本号与变更历史 |
| `references/architecture.md` | 架构决策（单入口 + 概念 agent） |
| `references/character-distillation.md` | 人物提炼七层模型 |
| `references/knowledge-model.md` | 信息不对称机制 |
| `references/runtime-rules.md` | 运行时规则 |
| `references/runtime-scheduling.md` | 运行时调度（三层加载） |
| `references/source-policy.md` | 来源规范（A/B/C 三级） |
| `references/source-integrity.md` | 史料溯源与偏倚控制 |
| `references/interview-checklist.md` | 访谈清单（14 项） |
| `references/generated-package-spec.md` | 生成包规范 |

## 辅助脚本

| 脚本 | 用途 |
|------|------|
| `scripts/collect.py` | 多源数据收集（Phase 1） |
| `scripts/package-builder.py` | 包构建辅助（Phase 6） |
| `scripts/turn-engine.mjs` | 回合引擎（运行时） |
| `scripts/record-writer.mjs` | 记录写入（运行时） |
| `scripts/create-character.mjs` | 人物创建（运行时） |
| `scripts/info-delay.mjs` | 信息延迟计算（运行时） |
| `scripts/validator.py` | 一致性验证（Phase 7） |
| `scripts/event-validator.py` | 事件验证（Phase 7） |
| `scripts/timeline-check.py` | 时间线检查（Phase 7） |
| `scripts/installer.py` | 驱动器安装（Phase 8） |

## 参考项目

| 项目 | 地址 | 借鉴点 |
|------|------|--------|
| story-skills | https://github.com/danjdewhurst/story-skills | 窄 skill 组合流程、目录化管理 |
| inkle/ink | https://github.com/inkle/ink | 互动叙事 knots/stitches 结构 |
| concordia | https://github.com/google-deepmind/concordia | Game Master 世界主持、回合引擎 |
| nuwa-skill | https://github.com/alchaincyf/nuwa-skill | 多 Agent 蒸馏流程、Skill 模板 |
