# 阶段 7：一致性校验

## 目标

交付前全面检查，确保无矛盾。未通过的项必须修复后重新检查。

## 输入

- `{sim-slug}/` 完整包（所有已生成文件）

## 输出

- `{sim-slug}/data/validation-report.md`（校验报告）
- 修复后的文件（如有）

## 进度追踪

```json
"7": {
  "status": "in_progress",
  "started_at": "{{ISO8601}}",
  "subtasks": {
    "checks_total": 45,
    "checks_passed": 0,
    "checks_failed": 0,
    "fixes_applied": 0
  }
}
```

## 校验清单

### 基础一致性（必须全部通过）

| # | 检查项 | 检查内容 |
|---|--------|---------|
| 1 | 主角身份 | 与起始状态一致 |
| 2 | 角色动机 | 与史实或设定边界一致 |
| 3 | 天气影响 | 已进入状态层 |
| 4 | 输出格式 | 同时支持"玩"和"写" |
| 5 | 来源追溯 | 关键断言能在 `10-source-ledger.md` 找到出处 |
| 6 | 规则文件覆盖 | 每个规则文件被 `SKILL.md` 引用 |
| 7 | state.json | 初始数据与 `09-opening-state.md` 一致 |
| 8 | dashboard.html | 能正确读取并渲染 `state.json` |
| 9 | engine-meta.json | 存在且版本与当前引擎一致 |

### 证据链完整性（必须全部通过）

| # | 检查项 | 检查内容 |
|---|--------|---------|
| 10 | 断言证据覆盖 | 所有 strong/weak 断言至少有一条证据支撑 |
| 11 | 交叉验证条件 | strong 断言满足独立交叉验证条件（非 narrative_dependent） |
| 12 | 偏倚标注完成 | catalog.json 中所有文献的偏倚标注已确认（非空） |
| 13 | 叙事依赖标记 | 所有偏倚叠加嫌疑已确认（无 pending 状态） |
| 14 | 原文引用覆盖 | strong 断言都有 exact_quote 字段 |
| 15 | 证据链文件完整 | 每个核心实体都有对应的 evidence.json 文件 |
| 16 | 文献本地化 | 所有断言引用的文献都存在于 data/sources/ 目录 |
| 17 | 文献哈希一致 | catalog.json 中的哈希与实际文件一致 |

### 时间线与信息（必须全部通过）

| # | 检查项 | 检查内容 |
|---|--------|---------|
| 18 | 时间线一致性 | 人物知识不超过 `start_date` |
| 19 | 信息隔离 | 主角不知道人物的未来盲区信息 |
| 20 | 信息隔离 | 玩家只能看到主角当前可知信息 |
| 21 | 角色行动约束 | 受各自知晓边界约束 |

### 事件与蓝本（必须全部通过）

| # | 检查项 | 检查内容 |
|---|--------|---------|
| 22 | 事件独立性 | 历史事件有条件触发而非自动触发 |
| 23 | 蓝本一致性 | 人物行为与用户选择的蓝本一致 |
| 24 | 冲突解决覆盖 | 阶段 2 的所有冲突解决都已反映 |
| 25 | 事件不发生后果 | 有替代性演化路径 |

### 地图与物产（必须全部通过）

| # | 检查项 | 检查内容 |
|---|--------|---------|
| 26 | 领土一致性 | 势力控制区域在 `13-territory-layer.md` 和 `04-faction-map.md` 中一致 |
| 27 | 地形联动 | 天气影响、军事结算、财政产出已与地形属性关联 |
| 28 | 物产合理性 | 没有超出该时期可获取范围的作物 |
| 29 | 作物引入链路 | 每种已引入作物都有获取渠道记录 |
| 30 | 穿越者约束 | 物产知识不等于获取能力 |
| 31 | 地图扩展链路 | 外部世界区域与物产获取渠道已关联 |
| 32 | 势力领土 | 势力必须有领土，实力来源于控制区域 |

### 生态与完结（如适用）

| # | 检查项 | 检查内容 |
|---|--------|---------|
| 33 | 完结条件 | 有明确的胜利/失败/时间上限 |
| 34 | 人物池隔离 | 活跃池/等待池/归档池分离（阶段 3.4 执行时） |

### 成长模式检查（当 simulation_mode != standard 时）

| # | 检查项 | 检查内容 |
|---|--------|---------|
| 35 | 成长系统文件 | `references/growth-system.md` 存在且包含所有必填段（年龄阶段表、性格维度、教育系统、里程碑） |
| 36 | 成长事件池 | `references/growth-event-pool.md` 存在，且每个年龄阶段至少5个事件 |
| 37 | state.json growth 字段 | `protagonist.status.growth` 存在且 `stage` 与主角年龄一致 |
| 38 | 性格维度完整 | `growth.personality` 包含的维度名与成长系统定义一致 |
| 39 | 教师匹配 | `growth.education_progress` 中的教师在 `characters/active/` 中有对应卡片 |
| 40 | L0 空间定义 | `references/12-geography-layer.md` 包含 L0 个人活动空间定义 |
| 41 | 回合适配 | `references/08-session-protocol.md` 包含成长模式回合规则段落 |

### Schema 一致性检查

| # | 检查项 | 检查内容 |
|---|--------|---------|
| 42 | characters 字段完整 | `state.json` 的 `characters` 数组中每个条目包含全部8个必填字段 |
| 43 | territory 区域完整 | `state.json` 的 `territory.regions` 数量 >= `references/04-faction-map.md` 中定义的区域数量 |
| 44 | factions 关系完整 | 每个势力在 `state.json` 和 `references/04-faction-map.md` 中的关系矩阵一致 |
| 45 | SKILL.md 引用完整 | SKILL.md 中列出的所有规则文件都存在于 `references/` 目录 |

## 流程

### 7.1 逐项检查

按清单逐项检查，记录通过/失败。

### 7.2 生成报告

```markdown
# 一致性校验报告

## 通过项（23/25）

- [x] 1. 主角身份一致
- [x] 2. 角色动机一致
...

## 失败项（2/25）

- [ ] 18. 领土一致性 -- `04-faction-map.md` 中荆州标注为刘备控制，但 `13-territory-layer.md` 中荆州归属曹操
- [ ] 22. 穿越者约束 -- `08-session-protocol.md` 中穿越者可直接获取土豆，未要求打通渠道

## 修复计划

1. 修正 `04-faction-map.md` 中荆州归属
2. 在 `08-session-protocol.md` 中添加获取渠道前置条件
```

### 7.3 修复

对每个失败项执行修复，修复后重新检查该项。

### 7.4 重检

修复后重新运行失败项的检查，直到全部通过。

## 完成标准

- 所有检查项通过
- 修复后的文件已保存
- 进度文件已更新，current_phase 推进到 "8"

## 上下文管理

- 检查项逐项执行，不需要一次性加载所有文件
- 每个检查项只读 1-2 个文件
- 修复时只修改相关文件

---

## Subagent 独立审计模式

### 定位

Phase 8 交付后，使用独立上下文的 subagent 对最终产物做全面审计。

与 Phase 7 内嵌校验的区别：

| 维度 | Phase 7 内嵌校验 | Subagent 独立审计 |
|------|-----------------|-------------------|
| 运行时机 | 生成流程中，Phase 6 之后 | 全部流程走完后（Phase 8 之后） |
| 上下文 | 主上下文（可能已接近上限） | 独立上下文（全新，无历史负担） |
| 检查范围 | 一致性逻辑（34项清单） | 完整性 + 一致性 + 缺失分析 |
| 修复行为 | 自动修复后重检 | **不修复**，只输出报告 |
| 目的 | 确保生成质量 | 确保交付产物无遗漏 |

### 触发时机

Phase 8 交付汇报完成后，由主控启动。参见 `phases/phase-8-deliver.md`。

### Subagent 指令

启动 subagent 时使用以下指令：

```
你是历史模拟器生成器的独立审计代理。你的任务是检查最终产物的完整性和一致性。

## 模拟器目录
{sim-slug}/

## 审计范围

### 第一部分：文件完整性

1. 读取 `data/generation-brief.md`，获取模拟器参数（人物数、事件数、区域数等）
2. 读取 `data/distilled/character-inventory.md`，获取人物清单和分类
3. 检查以下文件是否存在：
   - `SKILL.md`
   - `state.json`
   - `.engine-meta.json`
   - `dashboard.html`
   - `README.md`
   - `characters/overview.md`
   - `references/01-simulator-brief.md` 至 `15-commodity-timeline.md`（15个文件）
   - `records/ledger-template.md`, `chronicle-template.md`, `session-record-template.md`, `private-ledger-template.md`
4. 检查人物卡数量：
   - 列出 `characters/active/` 中的 .md 文件，与 character-inventory.md 中 active 状态人物对比
   - 列出 `characters/waiting/` 中的 .md 文件（目录不存在则标记为缺失），与 waiting 人物对比
   - 列出 `characters/archive/` 中的 .md 文件（目录不存在则标记为缺失），与 archive 人物对比
   - 统计总缺失数
5. 检查 `data/event-triggers.json` 是否存在
6. 检查 `scripts/` 目录是否存在及其内容

### 第二部分：内容一致性

7. 对比 `state.json` 和 `references/09-opening-state.md` 的数值是否一致
8. 检查 `state.json` 的 16 个领域指标是否齐全
9. 检查 `characters/overview.md` 中列出的人物是否都有对应的 .md 卡片文件
10. 检查 `state.json` 中 characters 数组的人物是否在 overview.md 中列出

### 第三部分：缺失分析

11. 对每个缺失项，分析可能的原因：
    - 上下文压力导致生成截断
    - Phase 6 子任务未执行
    - 目录未创建
    - 数据源不完整
12. 对每个缺失项，给出修复建议：
    - 需要生成的文件列表
    - 建议的生成方式（手动/subagent/在主上下文补充）
    - 预估 token 消耗

## 输出格式

```markdown
# 独立审计报告

## 模拟器信息
- 名称：{sim_name}
- 路径：{sim-slug}/
- 审计时间：{timestamp}

## 文件完整性检查

### 核心文件（X/Y 存在）
| 文件 | 状态 | 备注 |
|------|------|------|
| SKILL.md | OK | - |
| ... | MISSING | {原因分析} |

### 规则文件（X/15 存在）
| 文件 | 状态 |
|------|------|
| ... | ... |

### 人物卡（X/Y 存在）
| 池 | 预期数 | 实际数 | 缺失 |
|----|--------|--------|------|
| active | 14 | 3 | 刘备, 诸葛亮, 关羽, 张飞, 孙尚香, 法正, 庞统, 马超, 黄忠, 魏延, 曹操, 孙权 |
| waiting | 9 | 0 | 目录不存在 |
| archive | 2 | 0 | 目录不存在 |

### 其他文件
| 文件 | 状态 |
|------|------|
| data/event-triggers.json | MISSING |
| scripts/ | MISSING |

## 内容一致性检查

| 检查项 | 结果 | 详情 |
|--------|------|------|
| state.json vs opening-state | OK | 数值一致 |
| 16个领域指标 | OK | 全部存在 |
| overview.md vs 实际卡片 | FAIL | overview 列出14个active人物，实际只有3个卡片 |

## 缺失分析

### 缺失项汇总
共 X 处缺失，其中 Y 处影响运行，Z 处影响体验。

### 逐项分析

1. **人物卡缺失（active 11张）**
   - 可能原因：Phase 6h 在上下文压力下截断，只完成了3张最关键的卡片
   - 修复建议：使用 subagent 批量生成，按以下方式拆分...
   - 预估消耗：~15K tokens（11张 * ~1.5K）

2. **waiting/archive 目录不存在**
   - 可能原因：Phase 6 骨架阶段未创建空目录
   - 修复建议：创建目录 + 生成对应卡片
   - 预估消耗：~10K tokens

3. **event-triggers.json 缺失**
   - ...

## 建议处理方案

| 优先级 | 缺失项 | 建议方式 | 预估 tokens |
|--------|--------|---------|------------|
| P0 | active 人物卡 | subagent 并行 | ~15K |
| P0 | waiting 目录+卡片 | subagent 并行 | ~10K |
| P1 | archive 卡片 | subagent | ~3K |
| P1 | event-triggers.json | 主上下文直接生成 | ~1K |
| P2 | scripts/ 目录 | 可选 | ~2K |

**重要：以上修复均未自动执行。请用户确认后选择处理方式。**
```

## 约束

- **只读不写**：不要创建、修改、删除任何文件
- **不要自动修复**：只输出报告，让用户决定如何处理
- 覆盖所有文件，不要跳过检查
- 如果某个文件内容异常（空文件、JSON 格式错误等），在报告中标记
```

### 主控处理

subagent 返回报告后，主控：

1. 将报告内容原样展示给用户
2. 如果存在缺失项，提示用户选择处理方式：

```
[审计完成] 发现 {N} 处缺失。

建议处理方式：
A. 启动 subagent 修复所有 P0 项（预估 ~{X}K tokens）
B. 启动 subagent 修复全部缺失项（预估 ~{Y}K tokens）
C. 在主上下文中逐一修复（上下文压力较大）
D. 暂不修复，记录为已知问题
```

3. 用户选择后执行对应操作
4. 修复完成后可再次启动审计 subagent 验证（可选）
