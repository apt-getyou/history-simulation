# 阶段 8：交付

## 目标

向用户汇报模拟器生成结果，安装驱动器 skill，提供使用指引。

## 输入

- `{sim-slug}/` 完整包
- `{sim-slug}/data/driver-skill.md`（驱动器 skill 文件）
- `data/generation-brief.md`
- `data/validation-report.md`

## 输出

- 驱动器 skill 安装到 AI agent 的 skill 目录
- 交付汇报（直接输出给用户）

## 进度追踪

```json
"8": {
  "status": "in_progress",
  "started_at": "{{ISO8601}}",
  "subtasks": {
    "8a_driver_install": "pending",
    "8b_report": "pending",
    "8c_audit": "pending"
  }
}
```

完成后将整体进度标记为 completed：

```json
{
  "current_phase": "completed",
  "completed_at": "{{ISO8601}}",
  "phases": {
    "0": { "status": "completed" },
    "1": { "status": "completed" },
    ...
    "8": { "status": "completed" }
  }
}
```

## 子步骤 8a：驱动器 skill 安装

### 1. 读取驱动器文件

读取 `{sim-slug}/data/driver-skill.md`。

### 2. 修正路径变量

将文件中所有 `{{sim_dir}}` 替换为模拟器目录的实际路径。

**路径规则**：
- 优先使用项目相对路径：`./{sim-slug}`
- 如果模拟器不在当前项目目录下，使用绝对路径

### 3. 检测 AI agent 类型

按以下顺序检测当前环境使用的 AI agent：

| 检测条件 | Agent 类型 | 安装路径 |
|---------|-----------|---------|
| 存在 `.claude/` 目录 | Claude Code | `.claude/skills/{sim-slug}.md` |
| 存在 `.cursor/` 目录 | Cursor | `.cursor/commands/{sim-slug}.md` |
| 存在 `.windsurf/` 目录 | Windsurf | `.windsurf/rules/{sim-slug}.md` |
| 均不存在 | 未识别 | 进入手动安装流程 |

**检测方法**：在当前工作目录下检查上述目录是否存在。

### 4. 执行安装

**自动安装**（检测到 agent 时）：

1. 确认目标 skill 目录存在，不存在则创建
2. 将修正路径后的驱动器文件写入安装路径
3. 向用户确认安装结果

**输出示例**：

```
[INFO] 检测到 AI agent: Claude Code
[INFO] 驱动器 skill 已安装到: .claude/skills/{sim-slug}.md
[INFO] 现在可以通过正常对话启动模拟器。
```

**手动安装**（未识别 agent 时）：

1. 输出驱动器文件完整内容
2. 提示用户手动安装：

```
[WARNING] 未检测到已知的 AI agent skill 目录。

驱动器 skill 文件已保存在: {sim-slug}/data/driver-skill.md

请根据你使用的 AI agent 手动安装：
- Claude Code: 复制到 .claude/skills/{sim-slug}.md
- Cursor: 复制到 .cursor/commands/{sim-slug}.md
- Windsurf: 复制到 .windsurf/rules/{sim-slug}.md
```

### 5. 多 agent 支持

如果检测到多个 agent 目录同时存在（如 `.claude/` 和 `.cursor/` 都有），全部安装，向用户列出所有安装位置。

完成后更新进度：`"8a_driver_install": "completed"`

## 子步骤 8b：交付汇报

向用户输出以下信息：

### 1. 基本信息

- 目标模拟器目录名
- 模拟器名称
- 历史时期和起始时间
- 主角身份

### 2. 架构判断

- 真实性模式
- 蓝本策略和融合方式
- 追加设定如何落成规则
- 历史事件条件触发机制说明

### 3. 数据统计

- 人物数量（核心/重要/一般/背景）
- 事件数量
- 区域数量
- 物产数量
- 来源数量

### 4. 完结条件

- 胜利条件列表
- 失败条件列表
- 时间上限

### 5. 驱动器安装结果

- 检测到的 AI agent 类型
- 驱动器 skill 安装位置
- 启动方式：直接调用 `/{sim-slug}` 或自然语言触发

### 6. 使用指引

- **启动**：输入 `/{sim-slug}` 直接调用，或自然语言触发
- **恢复**：关闭后重新打开，再次输入 `/{sim-slug}` 即可从上次进度继续
- **详细玩法**：查看 `{sim-slug}/README.md` 了解完整玩法说明、故事背景和主角身份
- 记录文件位于 `{sim-slug}/records/`

### 7. 迭代建议

- 后续可如何继续迭代
- 继承模式说明：完结后如何基于此世界创建新一代模拟器
- 引擎升级说明

### 8. 文件清单

列出所有生成的文件及其用途。

完成后更新进度：`"8b_report": "completed"`

## 子步骤 8c：独立审计（Subagent）

交付汇报完成后，启动独立上下文的 subagent 对最终产物做全面审计。

### 为什么需要独立审计

Phase 7 的内嵌校验在主上下文中运行，经过 Phase 0-6 的大量文件读写后，主上下文可能已接近上限。内嵌校验容易因上下文压力而：
- 跳过部分检查项
- 标记为通过但实际未深入检查
- 遗漏文件级别的缺失（如人物卡数量不足）

独立审计使用全新上下文，不受历史对话影响，能彻底检查每个文件。

### 执行步骤

1. **启动审计 subagent**
   - 使用 Agent tool 启动 general-purpose 类型 subagent
   - 指令内容参见 `phases/phase-7-validate.md` 的 "Subagent 独立审计模式" 章节
   - 传入模拟器目录路径和关键参数

2. **接收审计报告**
   - subagent 返回审计报告
   - 将报告内容原样展示给用户

3. **用户决策**（如有缺失项）
   - 向用户展示缺失汇总和处理选项
   - 用户选择后执行对应操作
   - **不要自动修复**，等待用户明确确认

### 输出格式

如果审计通过（无缺失）：
```
[审计通过] 所有文件完整，内容一致。模拟器可以正常使用。
```

如果存在缺失：
```
[审计完成] 发现 {N} 处缺失，其中 {M} 处影响正常运行。

{审计报告内容}

请选择处理方式：
A. 启动 subagent 修复所有 P0 项（预估 ~{X}K tokens）
B. 启动 subagent 修复全部缺失项（预估 ~{Y}K tokens）
C. 在主上下文中逐一修复（上下文压力较大）
D. 暂不修复，记录为已知问题
```

### 审计结果记录

将审计结论追加到 `data/validation-report.md`：

```markdown
## 独立审计（Phase 8c）

- 审计时间：{timestamp}
- 审计结果：通过 / {N}处缺失
- 缺失详情：见上方报告
- 用户选择：{处理方式}
```

完成后更新进度：`"8c_audit": "completed"`

## 完成标准

- 驱动器 skill 已安装（或已提供手动安装指引）
- 汇报已输出
- 独立审计已完成（通过或有缺失但用户已决策）
- 用户已确认收到
- 进度文件标记为 completed
- 所有中间数据已保存在 `data/` 目录中（可选保留或清理）

## 上下文管理

本阶段只读不写（除了进度文件更新和驱动器安装），token 消耗低。

审计 subagent 使用独立上下文，不影响主上下文空间。
