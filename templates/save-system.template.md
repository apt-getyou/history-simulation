# 保存与回档系统

## 概述

本模拟器支持完整的存档/读档/回档功能。玩家可以在任意时刻保存当前进度，也可以回退到之前的某个存档点重新开始。

## 目录结构

```
saves/
├── save-index.json              ← 存档索引（所有存档的元数据）
├── auto/                        ← 自动存档
│   ├── turn-001/
│   │   ├── save-meta.json
│   │   ├── state.json
│   │   ├── engine-meta.json
│   │   └── characters/
│   │       ├── overview.md
│   │       └── active/          ← 所有活跃人物卡快照
│   ├── turn-002/
│   └── ...
├── manual/                      ← 手动存档
│   ├── {save-name}/
│   │   ├── save-meta.json
│   │   ├── state.json
│   │   ├── engine-meta.json
│   │   └── characters/
│   └── ...
└── rollback-snapshots/          ← 回档前安全快照
    ├── before-rollback-{timestamp}/
    │   ├── state.json
    │   ├── engine-meta.json
    │   └── characters/
    └── ...
```

## 存档类型

### 自动存档（Auto Save）

- **触发时机**：每回合结束后（回合流程步骤 10 之后）自动创建
- **命名规则**：`turn-{NNN}`，NNN 为三位数回合编号
- **保留策略**：保留最近 **10 个**自动存档，超出后最旧的自动删除
- **不可手动删除**：自动存档由系统管理

### 手动存档（Manual Save）

- **触发方式**：玩家主动要求存档
- **命名规则**：由玩家指定名称（如"御驾亲征前"、"入主中原"），或默认 `save-{NNN}`
- **保留策略**：永久保留，不自动删除
- **上限**：最多 **20 个**手动存档，超出时提示玩家删除旧存档

### 回档安全快照（Rollback Snapshot）

- **触发时机**：每次执行回档前，自动将当前状态保存为安全快照
- **命名规则**：`before-rollback-{timestamp}`
- **保留策略**：保留最近 **3 个**安全快照
- **用途**：如果回档后后悔，可以从安全快照恢复

## save-meta.json 格式

```json
{
  "save_id": "auto-turn-001",
  "type": "auto",
  "name": "第1回合自动存档",
  "turn": 1,
  "date": "{{current_date}}",
  "sim_date": "{{sim_display_date}}",
  "created_at": "{{iso8601_timestamp}}",
  "description": "自动存档",
  "protagonist_location": "{{location}}",
  "key_event": "{{本回合关键事件摘要，50字以内}}"
}
```

手动存档额外包含：

```json
{
  "type": "manual",
  "name": "{{玩家指定的存档名}}",
  "description": "{{玩家指定的描述，或自动生成}}",
  "is_pinned": false
}
```

## save-index.json 格式

```json
{
  "version": 1,
  "sim_slug": "{{sim_slug}}",
  "last_updated": "{{iso8601_timestamp}}",
  "saves": [
    {
      "save_id": "auto-turn-001",
      "type": "auto",
      "name": "第1回合自动存档",
      "turn": 1,
      "sim_date": "{{sim_display_date}}",
      "path": "auto/turn-001",
      "created_at": "{{iso8601_timestamp}}"
    }
  ],
  "current_turn": 0
}
```

## 存档内容

每个存档捕获以下可变状态的完整快照：

| 文件 | 说明 | 必须 |
|------|------|------|
| `save-meta.json` | 存档元数据 | 是 |
| `state.json` | 完整状态快照 | 是 |
| `engine-meta.json` | 引擎元数据（含 turn_count） | 是 |
| `characters/overview.md` | 人物总览表快照 | 是 |
| `characters/active/*.md` | 所有活跃人物卡快照 | 是 |
| `characters/waiting/*.md` | 待出场人物卡快照 | 否 |

以下文件**不需要保存**（不可变或可重建）：

- `references/` 下所有规则文件（不可变）
- `scripts/` 下所有脚本（不可变）
- `SKILL.md`、`dashboard.html`、`README.md`（不可变）
- `records/` 下的记录文件（回档时按回合号截断处理）

## 存档操作

### 创建存档

**触发命令**：

| 命令 | 说明 |
|------|------|
| `存档` | 创建手动存档，自动命名 `save-{NNN}` |
| `存档 {name}` | 创建手动存档，使用指定名称 |
| `保存` / `保存进度` | 同 `存档` |

**自动存档流程**（每回合结束后执行）：

```
1. 确定存档路径: saves/auto/turn-{NNN}/
2. 创建目录
3. 复制 state.json → 存档目录
4. 复制 .engine-meta.json → 存档目录
5. 复制 characters/overview.md → 存档目录
6. 复制 characters/active/ → 存档目录
7. 复制 characters/waiting/ → 存档目录（如存在）
8. 生成 save-meta.json 写入存档目录
9. 更新 save-index.json
10. 检查自动存档数量，超过10个时删除最旧的
```

**手动存档流程**：

```
1. 检查手动存档数量，超过20个时提示用户删除
2. 确定存档名称（用户提供或自动生成）
3. 检查名称是否重复，重复则追加序号
4. 执行与自动存档相同的文件复制流程
5. 保存到 saves/manual/{name}/
6. 更新 save-index.json
7. 告知玩家存档成功
```

**脚本支持**：如果 `scripts/save-manager.mjs` 存在，优先使用脚本执行文件操作：

```bash
# 自动存档
node scripts/save-manager.mjs --sim-dir . --auto --turn {N}

# 手动存档
node scripts/save-manager.mjs --sim-dir . --save --name "{name}"
```

### 列出存档

**触发命令**：

| 命令 | 说明 |
|------|------|
| `存档列表` / `查看存档` | 列出所有存档 |
| `列出存档` | 同上 |

**输出格式**：

```
=== 存档列表 ===

[自动存档]
  #1  第1回合  崇祯十六年正月  入宫即位
  #2  第2回合  崇祯十六年二月  首次朝会
  ...

[手动存档]
  御驾亲征前  第15回合  崇祯十七年三月  "准备率军亲征"
  入主中原    第28回合  崇祯十八年八月  "收复洛阳后的状态"
```

### 回档（Rollback）

**触发命令**：

| 命令 | 说明 |
|------|------|
| `回档` | 显示存档列表供选择 |
| `回档到第N回合` | 回到指定回合的自动存档 |
| `回档到{name}` | 回到指定名称的手动存档 |
| `回退N回合` | 从当前回合往回退N回合 |

**回档流程**：

```
1. 确定目标存档
   ├─ 指定回合号 → 查找 saves/auto/turn-{N}/
   ├─ 指定名称   → 查找 saves/manual/{name}/
   └─ 未指定     → 列出存档供玩家选择

2. 确认回档
   显示确认信息：
   "确认回档到 [存档名]（第N回合，{sim_date}）？
    当前进度到第M回合。
    回档后，第{N+1}到{M}回合的记录将被移至 records/archived/。
    回档前会自动保存当前状态为安全快照。"

3. 执行回档
   a. 创建安全快照 → saves/rollback-snapshots/before-rollback-{timestamp}/
   b. 从存档恢复 state.json → 覆盖当前 state.json
   c. 从存档恢复 .engine-meta.json → 覆盖当前 .engine-meta.json
   d. 从存档恢复 characters/ → 清空当前 characters/active/ 后恢复
   e. 从存档恢复 characters/overview.md → 覆盖
   f. 移动超出的记录文件 → records/archived/rollback-{timestamp}/
      - 移动 records/ledger/turn-{N+1}*.md 到 turn-{M}*.md
      - 移动 records/chronicle/turn-{N+1}*.md 到 turn-{M}*.md
   g. 更新 save-index.json

4. 告知玩家回档完成
   "已回档到第N回合（{sim_date}）。
    下一回合将从该存档点继续。
    安全快照保存在 saves/rollback-snapshots/ 中。"
```

**脚本支持**：

```bash
# 列出存档
node scripts/save-manager.mjs --sim-dir . --list

# 回档到指定回合
node scripts/save-manager.mjs --sim-dir . --rollback --turn {N}

# 回档到指定存档
node scripts/save-manager.mjs --sim-dir . --rollback --name "{name}"
```

### 删除存档

**触发命令**：

| 命令 | 说明 |
|------|------|
| `删除存档 {name}` | 删除指定手动存档 |

**规则**：
- 只能删除手动存档，不能删除自动存档
- 删除前确认
- 回档安全快照不手动删除，由系统自动管理

### 恢复回档安全快照

如果玩家回档后后悔，可以从安全快照恢复：

**触发命令**：

| 命令 | 说明 |
|------|------|
| `撤销回档` | 从最近的安全快照恢复 |
| `恢复快照` | 同上 |

**流程**：与回档流程相同，只是源存档变为 rollback-snapshots 中的快照。

## 与 state.json 单向输出原则的关系

`state.json` 在正常流程中是单向输出（只写不读），但**回档是唯一例外**：

- 回档时，**必须从存档恢复 state.json**
- 恢复后的 state.json 作为该回合结束后的状态快照
- 下一回合的结算不依赖 state.json（仍然依赖 Markdown 记录和规则文件）
- 回档后恢复的 state.json 主要用于仪表盘展示

**回档后的状态来源优先级**：
1. 存档中的 state.json（恢复后的基准）
2. 存档中的 characters/ 快照（人物状态）
3. 存档中的 engine-meta.json（回合计数）

## 与成长系统的交互

当存在成长系统（`references/growth-system.md`）时：

- 存档包含 `protagonist.status.growth` 的完整状态
- 回档会恢复成长阶段、性格维度、教育进度
- 回档不会恢复成长里程碑的体验记忆（玩家自己的记忆保留）
- 阶段转换后回档到转换前，需要重新触发转换

## 初始化

模拟器首次运行（第0回合之前）时：

1. 创建 `saves/` 目录
2. 创建 `saves/save-index.json`（空索引）
3. 创建初始存档 `saves/auto/turn-000/`（开局状态快照）
4. 确保初始存档包含所有开局人物卡和 state.json
