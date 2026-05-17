# 阶段 5：追加设定规则化

## 目标

对每一个用户追加设定，把"创意词"翻译成"可执行规则"。交叉验证设定与已有规则的兼容性。

## 输入

- `data/generation-brief.md`（custom_injections）
- `data/distilled/`（人物、事件、地理等已处理数据）

## 输出

- `data/distilled/custom-rules.yaml`（可执行规则）

## 进度追踪

```json
"5": {
  "status": "in_progress",
  "started_at": "{{ISO8601}}",
  "subtasks": {
    "total_injections": 0,
    "completed_injections": 0,
    "cross_validation_done": false
  }
}
```

## 流程

### 5.1 逐设定规则化

对每个 `custom_injections` 条目，翻译为可执行规则：

必须回答的问题：
- 这个设定在模拟中如何表现为具体机制？
- 设定影响哪些系统？（政治/财政/军事/民情/天气）
- 设定是否有边界限制？（能力上限、作用范围、失败条件）
- 设定如何与其他角色互动？（是否可被感知、是否可被反制）

示例：

**"穿越带系统"**：
- 系统只有主角可见还是可外显？
- 系统奖励什么资源？
- 系统是否能直接改写现实？
- 系统失败或沉默时怎么办？

**"明朝 + 隐世修仙世家"**：
- 修仙势力是否公开存在？
- 其力量上限是什么？
- 如何与朝廷、地方豪强、宗教体系互动？
- 对史实事件的干预边界是什么？

### 5.2 交叉验证

对每个已规则化的设定，检查：

| 验证项 | 检查内容 |
|--------|---------|
| 事件影响 | 设定是否改变了某些事件的触发条件？ |
| 知识边界 | 设定是否赋予了人物超越时间线的知识？ |
| 概率影响 | 设定是否需要修改事件概率？ |
| 角色能力 | 设定是否改变了角色的能力上限？ |
| 系统兼容 | 设定是否与已有规则（天气/财政/军事）冲突？ |

### 5.3 不接受模糊设定

每个设定都必须有对应的可执行规则。如果用户给的设定太模糊，追问直到可以翻译为规则。

### 5.4 月度结算基线表（强制产出）

必须为 `08-session-protocol.md` 生成一张月度结算基线表，定义每个回合自动发生的系统变化。

**基线表要求**：

1. 必须覆盖所有核心领域（政治/财政/军事/民情）
2. 每个字段必须有明确的增减值和原因说明
3. 季节性修正必须明确标注触发条件
4. 基线值必须与 `09-opening-state.md` 的初始值匹配

**产出格式**：

在 `data/distilled/custom-rules.yaml` 中新增 `monthly_baseline` 节：

```yaml
monthly_baseline:
  description: "每回合自动发生的系统变化（不考虑事件和决策）"
  entries:
    - domain: "财政"
      field: "treasury_silver"
      state_path: "world.domains.finance.treasury_silver"
      delta: -3
      reason: "日常开支（俸禄、宫廷、维修）"
      seasonal_modifier: null

    - domain: "财政"
      field: "grain_reserves"
      state_path: "world.domains.finance.grain_reserves"
      delta: -2
      reason: "城市消耗"
      seasonal_modifier:
        season: "冬"
        extra_delta: -1
        reason: "冬季消耗增加"
```

### 5.5 决策影响量化表（强制产出）

必须为每个决策类型定义量化规则，使玩家的选择能精确映射到状态变更。

**量化表要求**：

1. 覆盖所有决策类型（人事/军事/财政/外交/赈灾/情报等）
2. 每种决策有明确的消耗范围、效果范围、滞后期
3. 单次决策效果上限（防止单次决策造成过大变化）
4. 失败概率和后果

**产出格式**：

在 `data/distilled/custom-rules.yaml` 中新增 `decision_quantification` 节：

```yaml
decision_quantification:
  max_single_change: 20
  max_prestige_change: 10
  max_faction_tension_change: 15

  decision_types:
    - type: "人事任免"
      cost: {}
      effects:
        prestige: "[-3, +2]"
        faction_tension: "[-15, +15]"
        court_stability: "[-5, +5]"
      lag: 0
      failure_probability: 0.05

    - type: "军事调遣"
      cost:
        military_funding: "[-15, -5]"
        supplies: "[-10, -3]"
      effects:
        troop_strength: "[-30, +15]"
        morale: "[-10, +10]"
      lag: 2
      failure_probability: 0.25
```

## 完成标准

- 每个设定都有对应的可执行规则
- **月度结算基线表已产出**（覆盖所有核心领域）
- **决策影响量化表已产出**（覆盖所有决策类型）
- 交叉验证通过
- 无模糊地带
- 进度文件已更新，current_phase 推进到 "6"

## 上下文管理

- 通常设定数量不多（1-5 个），可以一次完成
- 如果设定特别多或特别复杂，逐个处理
