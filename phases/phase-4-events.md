# 阶段 4：历史事件建模

## 目标

将所有历史事件建模为"条件触发"，而非"时间到达即触发"。历史事件在模拟中不必然发生。

## 输入

- `data/distilled/`（人物档案、势力数据）
- `data/generation-brief.md`（start_date、event_certainty）
- `data/raw/event/`（原始事件数据）

## 输出

- `data/distilled/event-cards/`（条件触发事件卡片，每个事件一个 YAML 文件）
- `data/distilled/event-cards/_index.yaml`（事件索引和级联关系）

## 进度追踪

```json
"4": {
  "status": "in_progress",
  "started_at": "{{ISO8601}}",
  "subtasks": {
    "events_inventory_done": false,
    "total_events": 0,
    "completed_events": 0,
    "current_batch": 0,
    "batch_size": 10,
    "next_event_index": 0,
    "cascade_chains_done": false
  }
}
```

## 流程

### 4.0 事件盘点

从收集的数据中列出所有历史事件清单：

| # | 事件名 | 历史时间 | 类型 | 涉及人物 | 处理状态 |
|---|--------|---------|------|---------|---------|
| 1 | 赤壁之战 | 208冬 | trend | 曹操/孙权/刘备/诸葛亮 | pending |
| 2 | 三顾茅庐 | 207 | character_driven | 刘备/诸葛亮 | pending |
| ... | ... | ... | ... | ... | ... |

向用户确认事件清单无遗漏。

### 4.1 事件分类

| 类型 | 说明 | 可阻止 |
|------|------|--------|
| 硬锚点 | `start_date` 前已发生 | 不可 |
| 趋势事件 | 大概率发生 | 可 |
| 偶然事件 | 有偶然性 | 可 |
| 人物驱动 | 特定人物引发 | 改变条件即可改变 |
| 气候/天灾 | 独立概率 | 不可（除非超自然设定） |
| 成长事件 | 主角个人成长经历 | 视情况 |
| 旁观事件 | 主角感知的间接事件 | 不可（但主角可能不知情） |
| 关系事件 | 人际关系变化 | 可（通过互动改变） |

### 4.1.1 事件数量要求

**最低事件数量**：`min_events = max(20, time_span_years * 2)`

示例：
- 3年跨度的崇祯模拟器：max(20, 6) = 20 个事件
- 60年跨度的刘禅模拟器：max(20, 120) = 120 个事件

**当事件数量超过50时**，分优先级生成：

| 优先级 | 事件类型 | 占比 |
|--------|---------|------|
| P0 | 硬锚点 + 趋势 + 人物驱动 | 40% |
| P1 | 偶然 + 气候/天灾 | 30% |
| P2 | 成长 + 旁观 + 关系 | 30% |

**成长模式额外要求**：当 `simulation_mode` 不为 `standard` 时，除历史事件外，**必须**额外生成成长事件池。成长事件按年龄阶段分类，参考 `references/growth-principles.md` 和 `templates/growth-event-pool.template.md`。

### 4.2 分批生成事件卡片

每批 8-10 个事件，对每个事件生成条件卡片：

```yaml
event_id: "EVT-SG-001"
event_name: "赤壁之战"
historical_date: "208冬"
event_type: "trend"
probability_base: 0.9

trigger_conditions:
  all_of:
    - "曹操已率军南下"
    - "孙刘联盟已形成或即将形成"
    - "曹军已抵达长江北岸"
  any_of: []

# state.json 条件映射 — 供 turn-engine.mjs 自动评估
state_conditions:
  - path: "territory.regions[?(@.region_id=='jingzhou')].controller"
    operator: "=="
    value: "曹操"
    description: "曹操已控制荆州"
  - path: "factions[?(@.name=='孙吴')].relationships[?(@.with=='刘备')].type"
    operator: "=="
    value: "ally"
    description: "孙刘联盟已形成"

block_conditions:
  - "曹操放弃南下"
  - "孙刘未能结盟"

modify_conditions:
  - condition: "诸葛亮成功说服孙权"
    modifier: "+0.1 概率"

outcome_if_triggered:
  - outcome: "曹军大败，退回北方"
    probability: 0.7

outcome_if_blocked:
  - "曹操稳固荆州，从侧翼压制江东"

# 事件效果 — 映射到 state.json 字段
state_effects:
  triggered:
    - path: "world.domains.military.troop_strength"
      delta: -20
      scope: "曹操势力"
    - path: "world.domains.military.morale"
      delta: -15
      scope: "曹操势力"
  blocked:
    - path: "world.domains.military.troop_strength"
      delta: -5
      scope: "曹操势力"

cascade_events:
  triggered: ["刘备占据荆州南部", "三国鼎立格局加速"]
  blocked: ["曹操可能提前统一南方"]

character_refs:
  - name: "曹操"
    role: "发动方"
  - name: "孙权"
    role: "防守方"
  - name: "刘备"
    role: "联盟方"
  - name: "诸葛亮"
    role: "关键推动者"
```

### 4.3 级联事件链梳理

所有事件卡片完成后，梳理级联关系，写入 `_index.yaml`。

## 完成标准

- 所有历史事件已建模为条件卡片
- 级联事件链已梳理
- 进度文件已更新，current_phase 推进到 "5"

## 上下文管理

- 事件卡片分批生成，每批 8-10 个
- 每批完成后写入文件，清理上下文
- 级联梳理在所有卡片完成后一次性做
