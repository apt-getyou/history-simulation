# .engine-meta.json 模板

生成时替换所有 `{{placeholder}}` 为实际值。

## 模式 A（全新创建）

```json
{
  "engine_version": "{{engine_version}}",
  "generated_at": "{{generated_at}}",
  "sim_name": "{{sim_name}}",
  "sim_slug": "{{sim_slug}}",
  "creation_mode": "new",
  "turn_count": 0,
  "inherited_from": null,
  "upgraded_from_version": null,
  "upgrades_applied": []
}
```

## 模式 B（继承存档）

```json
{
  "engine_version": "{{engine_version}}",
  "generated_at": "{{generated_at}}",
  "sim_name": "{{sim_name}}",
  "sim_slug": "{{sim_slug}}",
  "creation_mode": "inherited",
  "turn_count": 0,
  "inherited_from": "{{parent_sim_slug}}",
  "upgraded_from_version": null,
  "upgrades_applied": []
}
```

## 模式 C（引擎升级）

```json
{
  "engine_version": "{{engine_version}}",
  "generated_at": "{{generated_at}}",
  "sim_name": "{{sim_name}}",
  "sim_slug": "{{sim_slug}}",
  "creation_mode": "upgraded",
  "turn_count": {{current_turn_count}},
  "inherited_from": null,
  "upgraded_from_version": "{{old_engine_version}}",
  "upgrades_applied": ["{{upgrade_path}}"]
}
```

## 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `engine_version` | YES | 当前引擎版本号，从 `references/engine-version.md` 读取 |
| `generated_at` | YES | ISO 8601 格式的生成时间 |
| `sim_name` | YES | 模拟器显示名称 |
| `sim_slug` | YES | 目录名 |
| `creation_mode` | YES | `new` / `inherited` / `upgraded` |
| `turn_count` | YES | 已游玩回合数，全新/继承时为 0，升级时保留当前值 |
| `inherited_from` | NO | 继承来源的 sim_slug，仅模式 B |
| `upgraded_from_version` | NO | 升级前的引擎版本号，仅模式 C |
| `upgrades_applied` | YES | 已应用的升级路径列表，如 `["v1.0-to-v1.1"]` |

## 运行时维护

以下字段在模拟器运行时由世界主持器更新：

- `turn_count`：每回合结束后 +1

其他字段在生成后不再变更，除非通过模式 C 升级。
