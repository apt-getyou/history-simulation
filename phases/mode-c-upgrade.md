# 模式 C：引擎升级

## 触发条件

用户有一个由旧版本引擎生成的模拟器，要升级到当前引擎版本。

触发词：升级、更新、引擎升级、升级模拟器

## 前提检查

1. 用户提供目标模拟器的目录路径
2. 该目录包含 `.engine-meta.json`（标记了当前引擎版本）
3. 目标模拟器的引擎版本低于当前引擎版本

如果不满足前提：
- 无 `.engine-meta.json` → 提示用户该模拟器可能由极早期引擎生成，需要手动确认
- 版本一致 → 提示用户无需升级

## 进度追踪

```json
{
  "sim_slug": "{existing-sim-slug}",
  "mode": "C",
  "current_phase": "C-0",
  "old_version": "1.0.0",
  "new_version": "1.1.0",
  "phases": {
    "C-0": { "status": "in_progress" },
    "C-1": { "status": "pending" },
    "C-2": { "status": "pending" },
    "C-3": { "status": "pending" },
    "C-4": { "status": "pending" },
    "C-5": { "status": "pending" },
    "C-6": { "status": "pending" }
  }
}
```

## 流程

### C-0：读取目标信息

1. 确认用户提供的模拟器目录路径
2. 读取 `.engine-meta.json`，获取当前引擎版本和模拟器状态
3. 读取 `references/engine-version.md`，获取当前引擎版本
4. 比较版本号

### C-1：版本比较与升级路径

1. 比较两个版本号
2. 如果版本一致，提示用户无需升级，终止
3. 确定升级路径（可能需要经过多个中间版本）
4. 根据变更历史判断升级类型：
   - **仅 PATCH 差异**：无需用户操作，可直接静默升级
   - **包含 MINOR 差异**：向用户展示新增能力，询问是否启用
   - **包含 MAJOR 差异**：必须用户确认，展示破坏性变更说明

### C-2：备份

在目标模拟器同目录下创建完整备份：

```
{sim-slug}.backup-v{old_version}/
```

备份包含所有文件。如果备份已存在，提示用户选择覆盖或跳过备份。

### C-3：执行升级

按版本顺序依次应用变更。每个版本升级执行以下步骤：

**逻辑层更新**（总是执行）：
- 从最新模板重新生成 `SKILL.md`，保留用户的 `sim_name`、`sim_slug`、核心设定等数据
- 从最新模板重新生成 `references/08-session-protocol.md`，保留回合粒度等用户设定

**展示层更新**（总是执行）：
- 从最新模板重新生成 `dashboard.html`，保留配色方案和模拟器名称
- 更新 `references/07-state-schema.md` 为最新结构

**数据层迁移**（按需执行）：
- `state.json`：新增字段填入默认值，已有字段保持不变。不删除任何现有字段
- `references/03-cast-registry.md`、`references/04-faction-map.md`：保持不变，除非 schema 有破坏性变更
- `records/`、`characters/`：永远不修改

**迁移脚本**（如果存在）：

读取 `migrations/v{old}-to-v{new}.md` 中的迁移指令并执行。迁移脚本可能包含：
- 需要用户确认的破坏性变更
- 需要手动合并的文件
- 需要为新系统补充的数据

### C-4：更新版本标记

更新 `.engine-meta.json`：

```json
{
  "engine_version": "{{new_engine_version}}",
  "creation_mode": "upgraded",
  "upgraded_from_version": "{{old_engine_version}}",
  "upgrades_applied": ["v1.0-to-v1.1", "v1.1-to-v1.2"]
}
```

保留 `turn_count` 和 `sim_name` 等原有字段不变。

### C-5：一致性校验

复用模式 A 的阶段 7 检查清单（读取 `phases/phase-7-validate.md`），额外检查：

- 所有已有运行时数据（state.json、records/、characters/）未被破坏
- 新增的 schema 字段都有合理的默认值
- 已有的人物卡、事件引擎与更新后的逻辑兼容

### C-6：升级汇报

向用户汇报：

- 旧引擎版本 -> 新引擎版本
- 已变更的文件清单
- 新增能力说明
- 已自动迁移的内容
- 需要用户手动确认的内容（如有）
- 备份目录位置

## 完成标准

- 升级已完成
- 一致性校验通过
- 备份已创建
- 版本标记已更新
- 交付汇报已输出

## 核心原则

**数据不可丢，逻辑可更新。**

## 上下文管理

- 升级通常比全新创建轻量得多
- 主要操作是模板替换和数据迁移
- 如果升级跨多个版本，每个版本升级后检查上下文
