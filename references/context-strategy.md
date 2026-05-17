# 上下文策略

## 模型上下文窗口参考表

| 模型 | 上下文窗口 | 有效输出空间* | 备注 |
|------|-----------|-------------|------|
| Claude Opus 4.6 | 200K | ~60-80K tokens | 系统提示+历史占用后剩余 |
| Claude Sonnet 4.6 | 200K | ~60-80K tokens | 同上 |
| Claude Haiku 4.5 | 200K | ~60-80K tokens | 同上 |
| 其他模型 | 视具体参数 | - | 需用户确认 |

*有效输出空间 = 上下文窗口 - 系统提示 - 对话历史 - 输入数据加载。实际值受会话长度、已加载文件、历史消息影响，上表为典型新会话的参考值。

## Token 预估公式

基于已收集参数估算各阶段工作量。

### 估算因子

| 符号 | 含义 | 来源 |
|------|------|------|
| C | 核心人物 + 重要配角数 | Phase 0 人物清单 |
| C_active | 开局时活跃人物数 | Phase 3 人物池分类 |
| C_waiting | 待出场人物数 | Phase 3 人物池分类 |
| C_archive | 已故人物数 | Phase 3 人物池分类 |
| E | 事件数量 | Phase 4 事件建模 |
| R | 区域数量 | Phase 3.6 地理层 |
| T | 时间跨度（年） | Phase 0 参数 |

### 阶段估算

| 阶段 | 估算公式 | 说明 |
|------|---------|------|
| Phase 0-1（访谈+数据收集） | ~5-8K tokens | 固定开销，与规模无关 |
| Phase 2（冲突检测） | ~3-5K tokens | 固定开销 |
| Phase 3（提炼） | 5K + C * 0.3K tokens | 每个人物提炼约 300 tokens |
| Phase 3.6-3.7（地理+物产） | 3K + R * 0.2K tokens | 每个区域约 200 tokens |
| Phase 4-5（事件+自定义） | 3K + E * 0.5K tokens | 每个事件约 500 tokens |
| Phase 6a 骨架 | ~5K tokens | 6个核心文件 |
| Phase 6b-6e 规则文件 | ~10K tokens | 10个 reference 文件 |
| Phase 6f-6g 地图+记录 | ~5K tokens | 8个文件 |
| Phase 6h 人物卡 active | C_active * 1.5K tokens | 每张完整卡约 1500 tokens |
| Phase 6h 人物卡 waiting | C_waiting * 1.0K tokens | 每张摘要卡约 1000 tokens |
| Phase 6h 人物卡 archive | C_archive * 0.5K tokens | 每张精简卡约 500 tokens |
| Phase 6h event-triggers | E * 0.3K tokens | 每个事件约 300 tokens |
| Phase 7-8（验证+交付） | ~5-8K tokens | 固定开销 |

### 汇总公式

```
research_total = 8 + 5 + (5 + C * 0.3) + (3 + R * 0.2) + (3 + E * 0.5)
generate_total = 5 + 10 + 5 + (C_active * 1.5) + (C_waiting * 1.0) + (C_archive * 0.5) + (E * 0.3)
validate_total = 8
total_output = research_total + generate_total + validate_total  (单位: K tokens)
```

## 策略选择标准

### 策略 A：直接执行

**条件**：预估总输出 < 有效输出空间 * 0.6

**执行方式**：所有阶段在主上下文顺序执行，Phase 6 按 6a→6b→...→6h 串行完成。

**适用场景**：小中型模拟器（人物 < 15，事件 < 10，单区域或少量区域）。

**优点**：一致性好，无重复 token 消耗。

**缺点**：上下文压力大时可能截断尾部任务。

### 策略 B：混合模式（subagent 分布式）

**条件**：预估总输出 >= 有效输出空间 * 0.6

**执行方式**：Phase 0-5 在主上下文执行，Phase 6 使用 subagent 并行生成，Phase 7-8 回到主上下文。

**适用场景**：中大型模拟器（人物 15-40，事件 10-20，多区域多势力）。

**优点**：主上下文压力可控，subagent 各自独立不互相挤压。

**缺点**：总 token 消耗增加（每个 agent 需独立加载规则和数据），需要协调。

### 策略 C：分段执行

**条件**：预估总输出 >> 有效输出空间，或 Phase 6 单阶段就超过有效输出空间 * 0.5

**执行方式**：Phase 0-5 完成后强制 /clear，Phase 6-8 在新会话恢复。Phase 6 内部可再选择直接执行或 subagent 分布式。

**适用场景**：超大模拟器（人物 > 40，事件 > 20，跨洲际地理范围）。

**优点**：完全避免上下文溢出。

**缺点**：需要两次会话，恢复时需要重新加载数据。

## Phase 6 subagent 分布方案

### 拆分原则

- 每个 agent 独立完成一批文件的生成
- agent 之间无依赖关系，同批可并行
- 输入通过 data/ 目录共享，输出直接写文件
- 主控通过 .generation-progress.json 跟踪完成状态

### Agent 拆分

| Agent | 子任务 | 输入 | 输出文件 | 预估 tokens |
|-------|--------|------|---------|------------|
| Agent 1 | 6a 骨架 | generation-brief, engine-meta.template, generated-skill.template, dashboard.template, state-json.template, driver-skill.template, simulator-readme.template | .engine-meta.json, SKILL.md, dashboard.html, state.json, data/driver-skill.md, README.md | ~5K |
| Agent 2 | 6b-6e 规则文件 | generation-brief, distilled/*, templates/canon-policy, cast-registry, faction-map, world-event-engine, weather-engine, state-schema, opening-state, source-ledger, knowledge-model | references/01 ~ 11 (10个文件) | ~10K |
| Agent 3 | 6f-6g 地图+记录 | geography-layer.yaml, commodity-timeline.yaml, templates/geography-layer, territory-layer, commodity-timeline, ledger, chronicle, session-record, private-ledger | references/12 ~ 15, records/*.md (8个文件) | ~5K |
| Agent 4 | 6h-active | distilled/*.yaml (active人物), templates/character-card | characters/active/*.md | C_active * 1.5K |
| Agent 5 | 6h-waiting | distilled/*.yaml (waiting人物), templates/character-card | characters/waiting/*.md | C_waiting * 1.0K |
| Agent 6 | 6h-archive+triggers | distilled/*.yaml (archive人物), raw/event/*.json | characters/archive/*.md, data/event-triggers.json | C_archive * 0.5K + E * 0.3K |

### 批次依赖

```
批次 1（并行）: Agent 1 + Agent 2 + Agent 3
    |
    v  (全部完成后)
批次 2（并行）: Agent 4 + Agent 5 + Agent 6
    |
    v  (全部完成后)
主控汇总: 生成 characters/overview.md，更新 .generation-progress.json
```

批次 2 依赖批次 1 的原因：overview.md 需要汇总所有人物卡的目录信息。

### Subagent 指令模板

每个 subagent 启动时使用以下指令结构：

```
你是历史模拟器生成器的子任务代理。

## 任务
{批次描述，如"生成 active 池人物卡"}

## 输入文件
- {列出具体文件路径，相对于模拟器目录}

## 输出要求
- 每个文件必须包含的字段：{必填字段列表}
- 格式要求：{参考模板路径}

## 约束
- 只生成指定文件，不要读取或修改其他文件
- 完成后报告生成的文件列表和每个文件的行数

## 完成标准
- 所有目标文件已生成
- 每个文件内容完整，包含所有必填字段
```

### 容错机制

1. **单 agent 失败**：不影响其他 agent 的输出，已生成的文件保留
2. **重试**：主控检查完成状态，未完成的 agent 可单独重试
3. **降级**：如果某个 agent 反复失败，可降级为在主上下文中直接生成该批次
4. **校验**：主控汇总时检查文件数量，与 generation-brief 中的人物/事件数量对比，缺漏则补充

### Token 开销对比

以刘禅·蜀汉为例（C_active=14, C_waiting=9, C_archive=2, E=7, R=17）：

| 方案 | 主上下文输出 | subagent 输出 | 总 token | 重复开销 |
|------|------------|--------------|---------|---------|
| 直接执行 | ~55K | 0 | ~55K | 无 |
| 混合模式 | ~25K | ~45K | ~70K | ~15K（指令+数据重复加载） |

混合模式总 token 增加约 27%，但主上下文峰值从 ~55K 降至 ~25K。
