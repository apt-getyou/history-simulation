# 世界事件引擎

## 固定史实锚点

| 时间 | 事件 | 硬度 | 默认影响 | 初始可见性 | 来源 | 备注 |
|------|------|------|----------|------------|------|------|
| {{date}} | {{event}} | hard/soft | {{impact}} | public/player/faction/private | {{source}} | {{note}} |

## 条件触发事件

| 触发条件 | 事件 | 持续时间 | 影响系统 | 初始可见性 | 暴露条件 | 来源 | 连锁反应 | state.json 条件映射 |
|----------|------|----------|----------|------------|----------|------|----------|---------------------|
| {{condition}} | {{event}} | {{duration}} | {{systems}} | {{visibility}} | {{exposure}} | {{source}} | {{chain}} | {{state_condition_path}} |

## 架空设定事件

| 设定来源 | 触发条件 | 事件 | 风险 | 初始可见性 | 暴露条件 | 世界影响 |
|----------|----------|------|------|------------|----------|----------|
| {{source}} | {{condition}} | {{event}} | {{risk}} | {{visibility}} | {{exposure}} | {{impact}} |

## 使用要求

- 区分”到了就发生”和”满足条件才发生”
- 每个事件都要影响至少一个状态层
- 可以让事件改变人物关系、资源、天气或时间节奏
- 事件要说明一开始是谁知道，以及何时会传到主角面前

### state.json 条件映射

每个条件触发事件必须标注 `state.json 条件映射` 列，说明触发条件如何映射到 state.json 的具体字段路径。

**映射格式**：
```
state.json路径 比较运算符 阈值; state.json路径 比较运算符 阈值
```

**示例**：
```
world.domains.finance.tax_pressure >= 90; world.domains.public.famine_level >= 60
```

条件映射供 `scripts/turn-engine.mjs` 在步骤 3（事件扫描）中自动评估事件是否触发。
