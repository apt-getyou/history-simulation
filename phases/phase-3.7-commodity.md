# 阶段 3.7：物产时间线构建

## 触发条件

所有模拟器必须执行。

## 目标

基于历史时期和地理范围，构建作物/物产引入时间线，定义获取条件和渠道。

## 输入

- `data/generation-brief.md`（commodity_config、start_date）
- `data/distilled/geography-layer.yaml`（地理底盘，外部世界区域）
- `data/raw/` 中的物产/作物数据

## 输出

- `data/distilled/commodity-timeline.yaml`

## 进度追踪

```json
"3.7": {
  "status": "in_progress",
  "started_at": "{{ISO8601}}",
  "subtasks": {
    "crops_assessed": false,
    "total_crops": 0,
    "assessed_crops": 0,
    "timeline_generated": false,
    "acquisition_channels_defined": false
  }
}
```

## 流程

### 3.7.1 作物可用性评估

列出所有可能对该时期产生影响的作物和物产，对每种评估可用性：

1. 确认作物原产地和驯化时间
2. 确认传入中国的时间和历史路线
3. 判定在 start_date 时该作物是否已在中国境内
4. 如未在中国境内，判定是否可通过外部世界获取
5. 评估获取难度（地理距离、贸易条件、外交关系）

### 3.7.2 引入时间线生成

```yaml
already_available: []       # start_date 时已广泛存在的作物
potentially_available: []   # 通过主动探索可获取的作物
future_introduction: []     # 历史上有明确引入时间的作物
impossible: []              # 该时期不可能获得的作物
```

### 3.7.3 获取渠道定义

为每种可获取但尚未引入的作物定义：

- 获取渠道（贸易/探索/系统奖励/意外获取）
- 前置条件（需要的外部世界区域、贸易路线、外交关系）
- 引入后对世界的影响（人口承载力、饥荒风险、经济变化）

### 3.7.4 穿越者约束

定义"穿越者知识不等于获取能力"的约束规则。

参考 `templates/commodity-timeline.template.md`。

## 完成标准

- 所有相关作物的可用性已评估
- 引入时间线已生成
- 获取渠道和条件已定义
- 与外部世界定义的贸易路线已关联
- 进度文件已更新，current_phase 推进到 "4"

## 上下文管理

- 作物数量通常在 10-30 种，一般可以一次完成
- 如果特别多，分批处理
