# 回合 {{turn_no}} -- 结构化账本

## 基本信息

- **日期**: {{date}}
- **地点**: {{location}}
- **天气**: {{weather}} | 异常: {{anomaly}}
- **气候压力**: {{climate_pressure}}/100

## 参与角色

{{characters_involved}}

## 触发事件

{{triggered_events}}

## 主角决策

- **决策类型**: {{decision_type}}
- **决策内容**: {{decision_content}}
- **决策消耗**: {{decision_cost}}
- **决策量化**:
  ```
  消耗: {{consumed}}
  直接效果: {{direct_effects}}
  延迟效果: {{delayed_effects}}
  风险投骰: {{risk_roll}}
  ```

## 状态变更

| 领域 | 指标 | 变更前 | 变更后 | 原因 |
|------|------|--------|--------|------|
| {{domain}} | {{field}} | {{from}} | {{to}} | {{reason}} |

## 指标快照

{{metrics_snapshot}}

## 情报变化

### 新增知晓

{{new_knowledge}}

### 仍未查明

{{unknowns}}

## 史实与推演标记

- 史实锚点: {{historical_anchor}}
- 合理推演: {{reasonable_inference}}
- 用户设定影响: {{custom_injection_effect}}
- 本回合新增演化结果: {{new_evolution}}
