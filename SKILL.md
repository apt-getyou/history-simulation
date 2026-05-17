---
name: history-simulator-generator
description: 根据指定历史时期、真实人物、主角身份、史实约束和可注入架空设定，生成一个可运行的"历史模拟器" skill。用户只要提到历史模拟器、皇帝模拟器、穿越到某朝、要把真实历史人物做成互动世界、要让天气或世界事件影响剧情、要把游玩过程自动记录成小说，或要为某段历史搭建文字模拟游戏，都应该使用此 skill。它会先确认历史锚点、设定边界、状态变量和记录方式，再产出完整的模拟器 skill 目录与规则文件，而不是只写一段散乱 prompt。
---

# 历史模拟器生成器

## 核心定位

你生成的是"某个具体历史模拟器的 skill 包"，不是直接开始扮演那个世界。

目标产物必须至少包含：

- 一个可运行的目标模拟器 `SKILL.md`
- 历史锚点与设定边界文件
- 人物与势力规则文件
- 世界事件与天气气候规则文件
- 状态账本与游玩记录规范

## 默认架构判断

默认不要把每个历史人物做成一个独立安装 skill。

优先使用以下结构：

1. 一个"世界主持器"式的目标模拟器 skill 作为唯一入口
2. 多个"概念 agent"人物卡，保存在规则文件中
3. 势力、制度、财政、军事、民情、天气作为并行状态层
4. 世界事件引擎和天气气候引擎驱动长期变化
5. 每回合同步输出"结构化状态变化"和"小说化演绎正文"

只有当用户明确要求"多 skill 协作"并且能说明安装、调用、上下文维护方式时，才考虑拆成多 skill。

原因见 `references/architecture.md`。

## 入口：检测进度

**这是本 skill 执行的第一步。在任何其他操作之前，检测是否有未完成的生成任务。**

### 检测流程

1. 扫描当前工作目录下是否存在 `{sim-slug}/data/.generation-progress.json`
   - 如果用户指定了 sim-slug，直接检查该路径
   - 如果用户未指定，扫描所有子目录下的 `.generation-progress.json`
2. 如果找到进度文件：
   - 读取进度
   - 确认 sim_slug 和当前阶段
   - 跳转到"恢复模式"
3. 如果未找到进度文件：
   - 进入"新建模式"

### 恢复模式

```
读取 .generation-progress.json
    │
    ├── current_phase = "completed"
    │     └── 告知用户"模拟器已生成完毕"。如需重新生成或继承，请选择对应模式。
    │
    ├── current_phase = "N" (数字), status = "in_progress"
    │     1. 读取对应阶段文件（phases/phase-{N}-*.md 或 phases/mode-{X}-*.md）
    │     2. 检查 subtasks 状态
    │     3. 从中断点继续执行
    │     4. 告知用户："检测到未完成的生成任务：{sim-slug}，当前阶段 {N}。将从上次中断处继续。"
    │
    └── current_phase = "N", status = "pending"
          └── 从该阶段开始执行
```

**恢复时的数据清理**：
- 优先读取结构化摘要文件（`data/distilled/`、`data/resolved/`）
- 不要重新读取原始数据（`data/raw/`）
- 通过进度文件的 subtasks 定位精确的恢复点

## 入口：确定创建模式（仅限无进度时执行）

向用户确认：

> 你要基于什么创建模拟器？
>
> **A. 全新创建** -- 基于某个历史时期、人物、设定，从零开始
> **B. 继承存档** -- 基于一个已完结的模拟器存档，创建新一代模拟器
> **C. 引擎升级** -- 将已有模拟器升级到当前引擎版本

```
[入口] 确定创建模式
   │
   ├── 模式 A：全新创建
   │     └── 创建进度文件 → 读取 phases/phase-0-interview.md → 开始阶段 0
   │
   ├── 模式 B：继承存档
   │     └── 创建进度文件 → 读取 phases/mode-b-inherit.md → 开始 B-0
   │
   └── 模式 C：引擎升级
         └── 创建进度文件 → 读取 phases/mode-c-upgrade.md → 开始 C-0
```

## 阶段执行循环

每个阶段的执行流程：

```
1. 读取阶段指令文件
   - 模式 A：phases/phase-{N}-{name}.md
   - 模式 B：phases/mode-b-inherit.md（含 B-0 到 B-6）
   - 模式 C：phases/mode-c-upgrade.md（含 C-0 到 C-6）
   只读当前阶段的文件，不要预读后续阶段。

2. 检查执行策略
   - 读取 generation-brief.md 中的 execution_strategy
   - 如果 mode = "direct"：所有阶段在主上下文顺序执行
   - 如果 mode = "hybrid"：
     - Phase 0-5：主上下文顺序执行
     - Phase 6：读取 phase-6-generate.md 的 subagent 分布式方案执行
     - Phase 7-8：主上下文执行
   - 如果 mode = "segmented"：
     - Phase 0-5 完成后强制 /clear
     - Phase 6-8 在新会话恢复（恢复时重新评估 Phase 6 策略）
   - execution_strategy 未设置时默认为 "direct"

3. 执行阶段任务
   - 读取必要的输入文件
   - 执行处理
   - 写入输出文件
   - 更新 .generation-progress.json

4. 检查上下文空间
   - 不足 → 写入进度 → 提示用户 /clear → 终止
   - 充足 → 检查是否有下一阶段
     - 有 → 回到步骤 1
     - 无 → 交付
```

上下文策略详见 `references/context-strategy.md`。

### 上下文不足时的提示格式

```
[WARNING] 上下文空间即将用尽。

当前进度：阶段 {N} - {名称} 已完成。
下一阶段：阶段 {N+1} - {名称}

请执行 /clear 后重新运行 /history-simulation，系统将从阶段 {N+1} 继续。
所有中间数据已保存在 {sim-slug}/data/ 目录中。
```

### 阶段文件列表

**模式 A（全新创建）**：

| 阶段 | 指令文件 |
|------|---------|
| 0 | `phases/phase-0-interview.md` |
| 1 | `phases/phase-1-collect.md` |
| 2 | `phases/phase-2-resolve.md` |
| 3 | `phases/phase-3-distill.md` |
| 3.2 | `phases/phase-3.2-world-review.md` |
| 3.4 | `phases/phase-3.4-ecology.md` |
| 3.6 | `phases/phase-3.6-geography.md` |
| 3.7 | `phases/phase-3.7-commodity.md` |
| 4 | `phases/phase-4-events.md` |
| 5 | `phases/phase-5-custom-rules.md` |
| 6 | `phases/phase-6-generate.md` |
| 7 | `phases/phase-7-validate.md` |
| 8 | `phases/phase-8-deliver.md`（含 8c 独立审计，审计指令见 Phase 7 的 Subagent 章节） |

**模式 B（继承存档）**：

| 阶段 | 指令文件 |
|------|---------|
| B-0 到 B-6 | `phases/mode-b-inherit.md` |

**模式 C（引擎升级）**：

| 阶段 | 指令文件 |
|------|---------|
| C-0 到 C-6 | `phases/mode-c-upgrade.md` |

## 工作原则与硬约束

生成前必须阅读以下文件：

- `references/core-principles.md` -- 6 条工作原则
- `references/hard-constraints.md` -- 硬约束清单

## 输出要求

当你完成生成时，向用户汇报：

- 目标模拟器目录名
- 关键架构判断
- 真实性模式
- 追加设定如何落成规则
- 目标模拟器后续可如何继续迭代

不要只贴大段 prompt。要生成文件。

## 参考文件

### 设计文档
- `references/core-principles.md` -- 工作原则
- `references/hard-constraints.md` -- 硬约束清单
- `references/enhanced-generation-flow.md` -- 增强版生成流程完整设计
- `references/engine-version.md` -- 引擎版本号与变更历史
- `references/architecture.md` -- 架构决策
- `references/character-distillation.md` -- 人物提炼七层模型
- `references/interview-checklist.md` -- 访谈清单
- `references/generated-package-spec.md` -- 生成包规范
- `references/knowledge-model.md` -- 知晓模型
- `references/runtime-rules.md` -- 运行时规则
- `references/runtime-scheduling.md` -- 运行时调度
- `references/source-policy.md` -- 来源规范
- `references/source-integrity.md` -- 史料溯源与偏倚控制方案
- `references/context-strategy.md` -- 上下文策略与 subagent 分布方案

### 脚本
- `scripts/collect.py` -- 多源数据收集
- `scripts/save-manager.mjs` -- 存档管理（自动/手动存档、回档、撤销回档）

### 模板
- `templates/generated-skill.template.md`
- `templates/driver-skill.template.md`
- `templates/simulator-readme.template.md`
- `templates/knowledge-model.template.md`
- `templates/canon-policy.template.md`
- `templates/cast-registry.template.md`
- `templates/faction-map.template.md`
- `templates/source-ledger.template.md`
- `templates/world-event-engine.template.md`
- `templates/weather-engine.template.md`
- `templates/state-schema.template.md`
- `templates/session-record.template.md`
- `templates/private-ledger.template.md`
- `templates/save-system.template.md`
- `templates/dashboard.template.html`
- `templates/state-json.template.md`
- `templates/engine-meta.template.md`
- `templates/geography-layer.template.md`
- `templates/territory-layer.template.md`
- `templates/commodity-timeline.template.md`
- `templates/opening-state.template.md`

### 迁移
- `migrations/` -- 版本迁移脚本目录（首个破坏性变更时创建）
