# 阶段 3.4：人物生态层

## 触发条件

当时间跨度超过一代人（约30年）或用户设定包含修仙/长生等延长寿命的元素时，本阶段强制执行。否则可跳过，直接进入阶段 3.6。

**判断方法**：读取 `generation-brief.md` 中的 `start_date` 和 `time_limit`，如果跨度 > 30 年或 `custom_injections` 包含寿命延长设定，则执行。

## 目标

长时间跨度下，人物有全生命周期。历史人物不是从天而降的，他们的出生依赖于家族存续、社会条件、地理环境。

## 输入

- `data/distilled/`（提炼后的人物档案）
- `data/generation-brief.md`（时间跨度、设定）

## 输出

- `data/distilled/ecology-rules.yaml`（生态层规则）
- `data/distilled/bloodline-registry.yaml`（血脉追踪图）
- `data/distilled/birth-conditions.yaml`（出生条件卡片）
- `data/distilled/death-system.yaml`（死亡系统规则）
- `data/distilled/legacy-system.yaml`（遗产系统规则）
- `data/distilled/emergent-character-rules.yaml`（涌现人物规则）
- `data/distilled/divergence-tracker.yaml`（偏离度追踪规则）

## 进度追踪

```json
"3.4": {
  "status": "in_progress",
  "started_at": "{{ISO8601}}",
  "subtasks": {
    "lifecycle_defined": false,
    "birth_conditions_done": false,
    "birth_conditions_total": 0,
    "birth_conditions_completed": 0,
    "bloodline_built": false,
    "death_system_done": false,
    "legacy_system_done": false,
    "emergent_rules_done": false,
    "divergence_tracker_done": false
  }
}
```

## 流程

### 3.4.1 人物生命周期定义

定义状态机：不存在 → 可孕育 → 在孕 → 已出生 → 成长期 → 活跃期 → 衰退期 → 死亡 → 已故。

每个状态定义进入条件和退出条件。写入 `ecology-rules.yaml`。

### 3.4.2 出生条件系统

对每个尚未出生的历史人物定义出生前置条件：

- 硬性条件：父母存活、家族未被灭族、血脉存续
- 软性条件：地区稳定、经济条件、社会秩序
- 出生时间窗口（允许历史记录 ±1-2 年波动）
- 条件被破坏的后果（级联影响）

**分批处理**：出生条件卡片可能很多（几十个），每批 15-20 个。

每完成一批更新进度：`birth_conditions_completed: N`

### 3.4.3 血脉追踪

维护简化的家族关系图，用于每回合检查出生条件。

写入 `bloodline-registry.yaml`。

### 3.4.4 死亡系统

基于年龄、健康、环境风险综合判定死亡概率。不是脚本杀。

写入 `death-system.yaml`。

### 3.4.5 退场与遗产系统

人物死后，卡归档，影响力留下。

- 三池隔离：活跃池 | 等待池 | 归档池
- 退场结算流程
- 遗产类型：制度（慢衰退）、精神（极慢，可跨代际）、人脉（中衰退）、未完成计划（快衰退）、秘密/隐患（不衰退）

写入 `legacy-system.yaml`。

详细设计见 `references/enhanced-generation-flow.md` 的 3.4 节。

### 3.4.6 新人物涌现

历史人物用完后，生成非历史人物填充世界：

| 类型 | 行为模式来源 |
|------|-------------|
| 历史人物 | 史料提炼 |
| 血脉延续人物 | 从父母推演天性基底 + 经历塑造 |
| 涌现人物 | 随机天性基底 + 完全由经历塑造 |

写入 `emergent-character-rules.yaml`。

### 3.4.7 历史偏离度追踪

追踪人事、事件、地理、制度四个维度的偏离度。偏离度越高，历史事件越少触发，涌现人物越多。

写入 `divergence-tracker.yaml`。

## 完成标准

- 生命周期规则已写入
- 出生条件已为所有未出生人物定义
- 血脉关系图已建立
- 死亡系统已定义
- 退场与遗产系统已定义
- 涌现人物规则已定义
- 偏离度追踪已定义
- 进度文件已更新，current_phase 推进到 "3.6"

## 上下文管理

- 出生条件卡片可以分批生成，每批 15-20 个
- 已完成的子规则写入文件后可从上下文丢弃
- 详细设计内容已在 `references/enhanced-generation-flow.md` 中，本阶段文件只引用不重复
