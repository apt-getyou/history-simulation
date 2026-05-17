# 阶段 3.6：地理底盘构建

## 触发条件

所有模拟器必须执行。

## 目标

基于历史时期的行政区划和地理信息，构建地图系统的 L1 静态地理底盘。

## 输入

- `data/generation-brief.md`（map_config、historical_anchor）
- `data/raw/` 中的地理/区域数据

## 输出

- `data/distilled/geography-layer.yaml`

## 进度追踪

```json
"3.6": {
  "status": "in_progress",
  "started_at": "{{ISO8601}}",
  "subtasks": {
    "regions_defined": false,
    "adjacency_built": false,
    "terrain_mapped": false,
    "outer_world_defined": false,
    "total_regions": 0,
    "completed_regions": 0
  }
}
```

## 流程

### 3.6.1 区域划分

根据 `map_config.region_granularity` 和 `geography_scope` 确定区域划分粒度。

1. 确定目标时期的行政区划体系
2. 按粒度划分区域，为每个区域分配唯一 ID
3. 填写静态属性：地形、气候、资源、人口
4. 建立区域邻接关系和关隘/渡口/通道信息
5. 标注战略要地和交通枢纽

### 3.6.2 外部世界定义

当 `map_config.outer_world_enabled` 为 true 时：

1. 确定已知世界的边界区域
2. 为每个边界方向定义外部区域（西域、南洋、北方草原、东北等）
3. 定义每个外部区域的接入条件、贸易难度、可用资源
4. 标注该时期的历史贸易路线

### 3.6.3 地形与系统影响映射

为每种地形类型定义对军事、财政、民情的系统影响数值：

| 地形 | 行军速度修正 | 补给消耗 | 防御加成 | 粮产系数 | 民情影响 |
|------|-------------|---------|---------|---------|---------|
| 平原 | 1.0 | 1.0 | 0.5 | 1.0 | 正常 |
| 山地 | 0.5 | 1.5 | 1.5 | 0.3 | 封闭 |
| ... | ... | ... | ... | ... | ... |

参考 `templates/geography-layer.template.md`。

## 完成标准

- 所有区域已划分并填写属性
- 邻接关系已建立
- 外部世界区域已定义（如启用）
- 地形系统影响数值已映射
- 进度文件已更新，current_phase 推进到 "3.7"

## 上下文管理

- 区域数据较多时（50+ 区域），分批处理
- 每批 15-20 个区域
- 模板文件只读一次
