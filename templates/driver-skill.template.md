---
name: {{sim_slug}}
description: 围绕 {{sim_name}} 运行的历史模拟器。适用于用户要进入 {{era_label}} 背景，扮演 {{protagonist_name}}，与真实历史人物和势力互动，并让天气、世界事件与个人选择共同改写历史走向的场景。只要用户提到继续这场模拟、推进下一回合、结算朝局、处理天气事件、与人物互动、查看状态变化，或要把本次游玩记录整理成小说片段，都应使用此 skill。
---

# {{sim_name}}

## 调用方式

用户可通过以下方式启动本模拟器：

- **直接调用**：`/{{sim_slug}}`
- **自然语言触发**：对话中提到与 {{sim_name}} 相关的内容（继续模拟、推进回合、与人物互动等）

## 模拟器路径

模拟器核心文件位于：

```
{{sim_dir}}/SKILL.md
```

**如果上述路径无法读取**，请向用户确认模拟器目录的实际位置，并更新本文件中的路径。

## 启动流程

**每次被触发时，严格按照以下顺序执行：**

### 步骤 1：加载核心规则

读取 `{{sim_dir}}/SKILL.md`，获取完整运行原则、回合流程、输出格式。

### 步骤 2：检查进度

读取 `{{sim_dir}}/state.json`，根据 `turn_count` 和 `status` 判断当前进度：

```
读取 state.json
    |
    +-- status = "completed"
    |     +-- 展示结局摘要（从 state.json 的 completion 字段读取）
    |     +-- 提示用户：可选择继承存档开启新一代模拟器
    |     +-- 停止，不再推进回合
    |
    +-- status = "active", turn_count = 0
    |     +-- 进入「首次启动」分支
    |
    +-- status = "active", turn_count > 0
          +-- 进入「恢复游戏」分支
```

### 步骤 3A：首次启动

模拟器从未运行过：

1. 读取 `{{sim_dir}}/references/09-opening-state.md` 获取开场状态
2. 向用户展示开场场景（小说化叙事 + 状态概览）
3. 提示用户查看 `{{sim_dir}}/README.md` 了解完整玩法说明
4. 等待用户做出第一个决策
5. 进入正常回合流程

### 步骤 3B：恢复游戏

模拟器有历史进度，接着上次的进度继续：

1. 从 `state.json` 中提取当前回合数、日期、关键指标
2. 读取 `{{sim_dir}}/records/` 中最近的记录，回顾上一回合的关键事件
3. 向用户输出简要回顾：

```
[进度恢复]
模拟器：{{sim_name}}
当前日期：{state.json 中的日期}
当前回合：第 {turn_count} 回合
上次关键事件：{从最近记录提取}
当前关键指标：政治 {X} / 财政 {X} / 军事 {X} / 民情 {X}
```

4. 继续正常回合流程

### 步骤 4：正常回合流程

所有运行逻辑遵循模拟器 SKILL.md 中定义的回合流程（共 14 个子步骤）。驱动器不重复定义，以 SKILL.md 为准。

### 步骤 5：状态写回

每回合结束后：

1. 更新 `{{sim_dir}}/state.json`（覆写全部内容）
2. 更新 `{{sim_dir}}/.engine-meta.json` 中的 `turn_count`
3. 检查完结条件

## 路径约定

所有模拟器内部文件的路径均相对于模拟器目录 `{{sim_dir}}/`：

| 文件 | 用途 |
|------|------|
| `SKILL.md` | 完整运行规则 |
| `state.json` | 当前状态快照 |
| `.engine-meta.json` | 引擎元数据 |
| `references/` | 规则文件目录 |
| `records/` | 记录文件目录（含 `ledger/` 和 `chronicle/` 子目录） |
| `characters/` | 人物卡目录（含 `overview.md`、`active/`、`waiting/`、`archive/`） |
| `scripts/` | 运行时脚本目录（含 `turn-engine.mjs`、`record-writer.mjs`、`event-triggers.json`） |
| `dashboard.html` | 可视化仪表盘 |
