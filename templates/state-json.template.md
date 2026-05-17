# state.json Schema 模板

本文档定义历史模拟器运行时的 `state.json` 数据结构。

生成具体模拟器时，需要根据 `07-state-schema.md` 中定义的字段填充 `value`、`max`、`label` 等属性。

## 数据结构

```json
{
  "meta": {
    "sim_name": "{{sim_name}}",
    "current_date": "{{current_date}}",
    "season": "{{season}}",
    "current_turn": 0,
    "last_updated": "",
    "turn_status": "active",
    "status_message": ""
  },

  "protagonist": {
    "name": "{{protagonist_name}}",
    "identity": "{{protagonist_identity}}",
    "location": "",
    "status": {
      "prestige": { "value": 0, "max": 100, "label": "威望" },
      "health": { "value": 0, "max": 100, "label": "健康" },
      "available_resources": [
        {
          "type": "silver",
          "label": "库银(私)",
          "amount": 0,
          "unit": "两",
          "renewable": false,
          "note": "主角个人可支配银两"
        },
        {
          "type": "grain",
          "label": "粮食(私)",
          "amount": 0,
          "unit": "石",
          "renewable": false,
          "note": "主角个人储备粮食"
        },
        {
          "type": "troop",
          "label": "亲兵",
          "amount": 0,
          "unit": "人",
          "renewable": true,
          "note": "主角直接指挥的兵力"
        },
        {
          "type": "intelligence",
          "label": "密探",
          "amount": 0,
          "unit": "人",
          "renewable": true,
          "note": "主角直属情报人员"
        }
      ],
      "growth": {
        "age": 0,
        "birth_year": "{{protagonist_birth_year}}",
        "stage": "infancy|childhood|adolescence|youth|adult",
        "decision_capacity": "none|minimal|limited|most|full",
        "personality": {
          "courage": 50,
          "caution": 50,
          "benevolence": 50,
          "decisiveness": 50,
          "trust": 50,
          "wisdom": 50,
          "resilience": 50
        },
        "education_progress": [
          {
            "educator": "",
            "subject": "",
            "quarters_studied": 0,
            "effects_accumulated": {}
          }
        ],
        "milestones_reached": [
          {
            "id": "",
            "name": "",
            "date": "",
            "type": "",
            "effects": {}
          }
        ]
      }
    },
    "knowledge": {
      "known": [],
      "suspected": [],
      "unverified_rumors": [],
      "unknowns": []
    }
  },

  "world": {
    "weather": {
      "current": "",
      "anomaly": "",
      "climate_pressure": { "value": 0, "max": 100, "label": "气候压力" }
    },
    "domains": {
      "politics": {
        "court_stability": { "value": 0, "max": 100, "label": "朝局稳定度" },
        "faction_tension": { "value": 0, "max": 100, "label": "派系张力" },
        "local_compliance": { "value": 0, "max": 100, "label": "地方服从度" }
      },
      "finance": {
        "treasury_silver": { "value": 0, "max": 100, "label": "库银" },
        "grain_reserves": { "value": 0, "max": 100, "label": "粮储" },
        "tax_pressure": { "value": 0, "max": 100, "label": "税赋压力" },
        "military_funding_gap": { "value": 0, "max": 100, "label": "军费缺口" }
      },
      "military": {
        "troop_strength": { "value": 0, "max": 100, "label": "兵力" },
        "supplies": { "value": 0, "max": 100, "label": "补给" },
        "mobility": { "value": 0, "max": 100, "label": "机动" },
        "morale": { "value": 0, "max": 100, "label": "士气" }
      },
      "public": {
        "public_order": { "value": 0, "max": 100, "label": "治安" },
        "famine_level": { "value": 0, "max": 100, "label": "饥荒" },
        "refugees": { "value": 0, "max": 100, "label": "流民" },
        "public_opinion": { "value": 0, "max": 100, "label": "舆情" }
      }
    },
    "active_events": [
      {
        "name": "",
        "status": "",
        "next_trigger": ""
      }
    ]
  },

  "characters": [
    {
      "name": "",
      "identity": "",
      "faction": "",
      "attitude": "",
      "public_goal": "",
      "player_visible": true,
      "stance": "",
      "recent_action_hint": ""
    }
  ],

  "factions": [
    {
      "name": "",
      "type": "",
      "representative": "",
      "core_resources": "",
      "attitude_to_protagonist": "",
      "current_goal": "",
      "controlled_regions": [],
      "relationships": [
        {
          "with": "",
          "type": "",
          "tension_source": "",
          "near_term_risk": "",
          "disputed_regions": []
        }
      ]
    }
  ],

  "territory": {
    "regions": [
      {
        "region_id": "",
        "name": "",
        "controller": "",
        "control_strength": 0,
        "garrison": 0,
        "local_loyalty": 0,
        "visibility": "full/partial/fuzzy/unknown"
      }
    ],
    "border_conflict_heat": { "value": 0, "max": 100, "label": "边境冲突热度" },
    "supply_line_status": { "value": 0, "max": 100, "label": "补给线状态" }
  },

  "world_crops": {
    "available_crops": [],
    "crop_introduction_log": [
      {
        "crop": "",
        "introduced_date": "",
        "source": "",
        "acquisition_channel": "",
        "spread_status": "",
        "yield_modifier": 0
      }
    ],
    "outer_world_contacts": [
      {
        "zone_id": "",
        "zone_name": "",
        "contact_status": "unknown/heard/contacting/established",
        "access_via": "",
        "available_resources": [],
        "available_crops": [],
        "trade_difficulty": 0
      }
    ]
  },

  "known_world": {
    "scope_level": "regional/national/continental/expanding",
    "explored_regions": [],
    "unexplored_adjacent": [],
    "expansion_progress": { "value": 0, "max": 100, "label": "地图扩展进度" }
  },

  "turn_log": [
    {
      "turn": 0,
      "date": "",
      "location": "",
      "weather": "",
      "protagonist_action": "",
      "decision_type": "",
      "decision_quantified": {
        "consumed": {},
        "direct_effects": {},
        "delayed_effects": [],
        "risk_roll": ""
      },
      "result_summary": "",
      "state_changes": {},
      "new_knowledge": [
        {
          "content": "",
          "source": "",
          "tier": "",
          "reliability": "confirmed/suspected/rumor"
        }
      ],
      "characters_involved": [],
      "events_triggered": []
    }
  ],

  "gm_only": {
    "private_ledgers": [
      {
        "holder": "",
        "holder_type": "",
        "date": "",
        "covert_actions": [
          {
            "action": "",
            "target": "",
            "actual_result": ""
          }
        ],
        "known_intel": {
          "confirmed": [],
          "inferred": [],
          "wrong_judgments": []
        },
        "cover": {
          "method": "",
          "already_told": [],
          "not_yet_told": []
        },
        "exposure_conditions": [
          {
            "condition": "",
            "expose_to": ""
          }
        ]
      }
    ],
    "hidden_actions": [
      {
        "actor": "",
        "action": "",
        "target": "",
        "status": "",
        "consequence_if_exposed": ""
      }
    ],
    "global_truth_events": [
      {
        "event": "",
        "date": "",
        "visible_to": [],
        "not_yet_visible_to": []
      }
    ],
    "exposure_tracking": [
      {
        "secret": "",
        "holders": [],
        "exposure_conditions_met": false,
        "partial_leaks_to": []
      }
    ]
  }
}
```

## 字段与 state-schema 的对应关系

| state.json 路径 | 对应 state-schema 领域 | 对应字段 |
|---|---|---|
| `protagonist.status.prestige` | 主角 | 威望 |
| `protagonist.status.health` | 主角 | 健康 |
| `protagonist.status.growth` | 主角成长 | 成长系统（仅 growth 模式） |
| `protagonist.status.available_resources` | 主角 | 可用资源 |
| `protagonist.knowledge.known` | 情报 | 主角已知 |
| `protagonist.knowledge.suspected` | 情报 | 未证实传闻 |
| `protagonist.knowledge.unverified_rumors` | 情报 | 未证实传闻 |
| `world.weather.*` | 天气 | 当前天气 / 异常天气 / 气候压力 |
| `world.domains.politics.*` | 政治 | 朝局稳定度 / 派系张力 / 地方服从度 |
| `world.domains.finance.*` | 财政 | 库银 / 粮储 / 税赋压力 / 军费缺口 |
| `world.domains.military.*` | 军事 | 兵力 / 补给 / 机动 / 士气 |
| `world.domains.public.*` | 平民 | 治安 / 饥荒 / 流民 / 舆情 |
| `characters[]` | 人物名册 | 完整角色卡 |
| `factions[]` | 势力地图 | 完整势力卡 + 关系矩阵 + 领土 |
| `territory.regions[]` | 领土 | 区域控制状态 |
| `territory.border_conflict_heat` | 领土 | 边境冲突热度 |
| `territory.supply_line_status` | 领土 | 补给线状态 |
| `world_crops.available_crops` | 物产 | 当前可用作物 |
| `world_crops.crop_introduction_log` | 物产 | 作物引入记录 |
| `world_crops.outer_world_contacts` | 物产 | 外部世界接触 |
| `known_world.scope_level` | 已知世界 | 世界范围等级 |
| `known_world.explored_regions` | 已知世界 | 已探明区域 |
| `known_world.expansion_progress` | 已知世界 | 地图扩展进度 |
| `gm_only.private_ledgers[]` | 私密账本 | 完整私密账本 |
| `gm_only.hidden_actions[]` | 私密账本 | 幕后动作 |
| `gm_only.global_truth_events[]` | 知晓模型 | global_truth 层 |
| `gm_only.exposure_tracking[]` | 知晓模型 | 曝光条件追踪 |

## 数据隔离规则

### 主角视角可见

以下数据在主角视角（player view）中渲染：

- `meta`（全部）
- `protagonist`（全部）
- `world.weather`（主角可感知的天气部分）
- `world.domains`（仅主角当前可感知的部分，根据知晓模型过滤）
- `world.active_events`（仅主角已知的事件）
- `characters`（仅 `player_visible: true` 的角色，且只显示主角已知信息）
- `factions`（仅主角已知的势力关系）
- `territory`（仅主角可见区域的信息，`visibility` 非 `unknown` 的区域）
- `world_crops.available_crops`（主角已知的作物）
- `world_crops.outer_world_contacts`（仅主角已知的外部接触信息）
- `known_world.explored_regions`（仅主角已探明的区域）
- `turn_log`（仅主角视角的回合记录）

### GM 视角可见

GM 视角包含主角视角的全部数据，额外加上：

- `gm_only.private_ledgers`（所有角色的私密账本）
- `gm_only.hidden_actions`（所有隐藏动作）
- `gm_only.global_truth_events`（全局真相事件）
- `gm_only.exposure_tracking`（曝光条件追踪状态）
- `characters` 中所有角色的完整信息（不受 `player_visible` 限制）
- `factions` 中完整的势力关系矩阵
- `territory` 全部区域信息（包含未知区域的完整控制数据）
- `world_crops` 全部作物和外部世界数据
- `known_world` 全部已知世界和未探明区域数据

### 过滤原则

1. `player_visible: false` 的角色在主角视角中完全不显示
2. `world.domains` 中的数值在主角视角中仅显示主角应知部分（例如主角可能不知道真实军费缺口，只能看到上报的数字）
3. `turn_log` 中 `new_knowledge` 的 `tier` 字段标记信息层级，主角视角只显示 `player_known` 和 `public_known` 层级
4. `gm_only` 节点整体在主角视角中不渲染
5. `territory` 中 `visibility` 为 `unknown` 的区域在主角视角中不显示
6. `world_crops.crop_introduction_log` 中未引入的作物在主角视角中不显示（除非穿越者知识设定）
7. `world_crops.outer_world_contacts` 中 `contact_status` 为 `unknown` 的条目在主角视角中不显示

## 更新规则

### 单向输出原则

`state.json` 是**单向输出文件**，仅作为仪表盘（`dashboard.html`）的数据源。

- 世界主持器**只写不读**：每回合结束后将当前状态写入 `state.json`
- 状态维护完全依赖 `references/` 中的规则文件和 `records/` 中的 Markdown 记录
- 世界主持器**不得**在回合结算时读取 `state.json` 来恢复或推断状态
- 如果 `state.json` 的内容与 Markdown 记录不一致，以 Markdown 记录为准

### 大小控制

`state.json` 必须保持紧凑。

- `turn_log` 最多保留最近 **5 回合**。更早的记录只写入 `records/` 中的 Markdown 文件
- `protagonist.knowledge` 各数组的单项内容不超过 200 字
- `gm_only.private_ledgers` 每个账本的 `covert_actions` 最多保留最近 3 条
- `gm_only.hidden_actions` 最多保留 10 条活跃隐藏行动
- `gm_only.global_truth_events` 最多保留 10 条未揭露事件
- `territory.regions` 最多保留主角可见的 **20 个区域**，其余只在 GM 视角中显示
- `world_crops.crop_introduction_log` 最多保留 **10 条**记录
- `world_crops.outer_world_contacts` 最多保留 **5 个**外部区域
- 整个 `state.json` 文件大小应控制在 **15KB 以内**

如果超出限制，优先删除最旧的数据，保留最新的。

### `turn_status` 状态值

`meta.turn_status` 标识当前回合所处的阶段，供仪表盘和 AI 判断流程位置：

| 值 | 含义 | 说明 |
|----|------|------|
| `active` | 正常进行 | 等待玩家输入或 AI 结算 |
| `settlement` | 结算中 | turn-engine.mjs 正在运行 |
| `waiting_input` | 等待玩家 | AI 已输出局势，等待玩家决策 |
| `completed` | 已完结 | 模拟器结束 |
| `paused` | 暂停 | 用户主动暂停 |

### 更新时机

每回合结束后（回合流程第 10 步），世界主持器必须更新 `state.json`。

### 更新步骤

1. 更新 `meta`：推进日期、回合号、更新时间戳
2. 更新 `world.weather`：结算新天气
3. 更新 `world.domains`：根据回合结算结果更新各领域数值
4. 更新 `world.active_events`：更新事件状态
5. 更新 `characters`：更新角色态度、立场、可见性（详见下方 `characters` 维护规则）
6. 更新 `factions`：更新势力关系和领土
7. 更新 `territory`：更新区域控制状态、可见性、边境冲突、补给线
8. 更新 `world_crops`：更新作物引入状态和外部世界接触
9. 更新 `known_world`：更新已探明区域和扩展进度
10. 更新 `protagonist.status`：更新主角状态
11. 更新 `protagonist.knowledge`：根据知晓模型更新主角已知信息
12. 追加 `turn_log`：写入本回合记录
13. 更新 `gm_only`：更新所有私密账本、隐藏动作、曝光追踪

### `characters` 数组维护规则

`state.json` 中的 `characters` 数组仅保存 **运行时摘要**，完整人物卡保存在 `characters/active/*.md`。

**维护原则**：

1. `characters` 数组每个条目**必须**包含以下字段：name, identity, faction, attitude, public_goal, player_visible, stance, recent_action_hint。缺一不可。
2. 每回合结算后，只更新本回合经历了重大事件的人物的 `stance`、`attitude`、`recent_action_hint`
3. 新人物出场时：同步在 `characters/active/` 创建完整人物卡，并在 `characters` 数组中添加摘要条目
4. 人物死亡时：从 `characters` 数组移除，人物卡移入 `characters/archive/`
5. `characters` 数组最多保留 30 个活跃条目（超出时移除最低活跃度的角色）

**与 turn-engine.mjs 的协作**：

- `turn-settlement.json` 的 `characters_involved` 列出本回合涉及人物
- AI agent 根据该列表决定需要读取哪些 `characters/active/*.md` 完整卡
- 回合结束后，变更的人物通过 `characters-changes.json` 传给 `record-writer.mjs` 更新

### 必须保持的一致性

- `state.json` 的数值必须与结构化账本（`records/` 中的记录）保持一致
- `protagonist.knowledge` 的内容必须严格遵循知晓模型，不能超出主角应知范围
- `gm_only` 的内容不能泄漏到主角视角的任何字段中
- `characters` 中 `player_visible` 的判定必须基于知晓模型的信息层级
- `characters` 数组中每个条目必须包含全部8个必填字段（name, identity, faction, attitude, public_goal, player_visible, stance, recent_action_hint）
- `territory` 中各区域的 `visibility` 必须与知晓模型一致
- `territory.regions` 的数量必须与 `references/04-faction-map.md` 和 `references/13-geography-layer.md` 中定义的区域数量一致
- `world_crops` 中未引入的作物不能出现在 `available_crops` 中
- `known_world` 的范围必须与地图扩展进度一致
- **成长模式**：当 `protagonist.status.growth` 存在时，`stage` 必须与主角当前年龄对应，`personality` 维度数必须与成长系统定义的维度数一致

## 使用说明

### 生成具体模拟器时

1. 根据 `07-state-schema.md` 中定义的字段，替换 `world.domains` 中的 `value`、`max`、`label`
2. 根据 `09-opening-state.md` 填充初始值
3. 根据 `03-cast-registry.md` 初始化 `characters` 数组
4. 根据 `04-faction-map.md` 初始化 `factions` 数组（含领土信息）
5. 根据 `13-geography-layer.md` 和 `14-territory-layer.md` 初始化 `territory` 数组
6. 根据 `16-commodity-timeline.md` 初始化 `world_crops` 和 `known_world`
7. 删除本说明文件，保留生成的 `state.json` 作为运行时数据

### 运行时

- 仪表盘（`dashboard.html`）每 3 秒从 `state.json` 读取数据刷新显示
- 世界主持器每回合结束后覆写 `state.json` 的全部内容（不要增量更新）
- 世界主持器不读取 `state.json`，状态来源始终是 Markdown 规则文件和记录文件
- `gm_only` 节点始终保留，即使当前没有隐藏内容（保持结构稳定）
