# 地理底盘

## 概述

地理底盘是地图系统的 L1 层，定义模拟世界的静态地理信息。生成时确定，运行时只读。

## L0：个人活动空间（成长模式专用）

> 当 `simulation_mode` 不为 `standard` 时，L0 层定义主角在当前年龄阶段可活动的微观空间。随年龄增长自动扩展。

L0 层是地理底盘的最细粒度，描述主角日常生活的空间范围：

```yaml
personal_space:
  protagonist_location: "{{主角当前所在地}}"

  # 按年龄阶段定义活动范围
  scopes:
    infancy:                    # 0-6岁
      range: "院落"
      areas: ["居室", "花园", "后院", "厨房"]
      visible_elements: ["花草树木", "仆人", "守卫", "天气"]
      interactable_people: "仅身边人（教师、护卫、侍从）"
      narrative_focus: "感官体验、安全感、好奇心"

    childhood:                  # 7-12岁
      range: "府邸"
      areas: ["居室", "书房", "练武场", "花园", "前厅", "库房"]
      visible_elements: ["书籍", "武器", "来往官员", "书信", "地图"]
      interactable_people: "府中所有人 + 来访客人"
      narrative_focus: "学习、社交、独立探索"

    adolescence:                # 13-16岁
      range: "城中"
      areas: ["府邸", "城门", "市集", "军营", "学堂", "官署"]
      visible_elements: ["百姓", "军队调动", "商业活动", "城市全貌"]
      interactable_people: "城中所有人"
      narrative_focus: "社会观察、身份认同、独立行动"

    youth_and_above:            # 17+岁
      range: "全势力范围"
      areas: "所有可达区域"
      visible_elements: "全部"
      interactable_people: "全部"
      narrative_focus: "决策、责任、代价"
```

**L0 层使用规则**：

1. GM 根据主角当前年龄阶段选择对应的 scope
2. 叙事描写应限制在 scope.areas 范围内
3. scope.visible_elements 限定主角可感知的事物
4. scope.interactable_people 限定主角可互动的人物
5. 阶段转换时自动扩展范围
6. 如果主角因特殊事件（如搬迁、逃亡）离开原定位置，L0 层需重新定义

**L0 与 L1-L3 的关系**：

| 层级 | 名称 | 粒度 | 用途 |
|------|------|------|------|
| L0 | 个人空间 | 房间/建筑/城区 | 幼年主角叙事范围 |
| L1 | 静态地理 | 州/郡 | 地形、资源、关隘 |
| L2 | 动态领土 | 州/郡 | 势力控制状态 |
| L3 | 可见性 | 区域 | 主角已知/未知区域 |

L0 层只在成长模式下激活。成年主角（age >= 17）跳过 L0，直接使用 L1-L3。

## 区域定义

每个区域至少包含以下属性：

```yaml
region:
  id: "{{REGION_ID}}"              # 唯一标识，如 R-JIANGDONG
  name: "{{区域名称}}"              # 如"江东"
  aliases: ["{{别名1}}", "{{别名2}}"]  # 历史别名
  terrain: "{{地形类型}}"            # 平原/山地/水网/沙漠/盆地/高原
  climate_zone: "{{气候带}}"        # 温带季风/亚热带湿润/热带/干旱/高寒
  super_region: "{{上级区域}}"      # 如"扬州"属于"江东"

  # 资源产出
  resources:
    staple_crops: ["{{主粮}}"]      # 该区域主要种植的粮食作物
    cash_crops: ["{{经济作物}}"]     # 茶、丝、棉等
    minerals: ["{{矿产}}"]          # 铁、铜、盐等
    specialties: ["{{特产}}"]       # 该区域独有的特产

  # 人口与经济
  population_base: 0               # 基础人口（万）
  fertility: 0                     # 土地肥力 0-100，影响粮产
  development_level: 0             # 开发程度 0-100

  # 地理关系
  adjacent_regions: ["{{相邻区域ID}}"]
  strategic_passes:                 # 关键关隘/渡口/通道
    - name: "{{关隘名}}"
      type: "pass/ferry/gorge/bridge"
      connects_to: "{{REGION_ID}}"
      control_bonus: 0              # 控制此关隘获得的防御加成 0-100
  rivers: ["{{河流名}}"]
  mountains: ["{{山脉名}}"]

  # 军事地理
  march_difficulty: 0              # 行军难度 0-100（山地/水网高）
  defense_bonus: 0                 # 防御加成 0-100
  supply_difficulty: 0             # 补给难度 0-100（距离后方越远越高）

  # 外部世界连通（可选）
  connects_to_outer_world: ["{{外部区域ID}}"]
```

## 地形类型与系统影响

| 地形 | 行军难度 | 防御加成 | 补给难度 | 粮产修正 | 特殊效果 |
|------|----------|----------|----------|----------|----------|
| 平原 | 低 | 低 | 低 | +20% | 骑兵加成 |
| 山地 | 高 | 高 | 高 | -30% | 伏击有利，大军团展开困难 |
| 水网 | 中 | 中 | 中 | +10% | 水军必需，旱军受限 |
| 盆地 | 中 | 中 | 中 | +15% | 易守难攻 |
| 沙漠 | 极高 | 低 | 极高 | -80% | 非游牧势力行军损耗极大 |
| 高原 | 高 | 中 | 高 | -20% | 平原军队高原反应 |
| 森林 | 中 | 中 | 中 | -10% | 伏击有利，视野受限 |

## 区域关系图

以文本形式表示区域邻接关系，用于回合结算时判断行军路线和补给线。

```
{{REGION_A}} ── [{{关隘}}] ── {{REGION_B}}
     │                          │
     └── [{{渡口}}] ── {{REGION_C}}
```

## 使用要求

- 地理底盘是静态数据，运行时不应被修改
- 行军、补给、战斗结算必须引用地形属性
- 天气引擎的影响必须结合地形（同样是暴雨，水网地区和沙漠地区的后果不同）
- 资源产出影响财政和民情，需与 `07-state-schema.md` 的财政字段联动
- 所有地理断言必须有史料或学术来源支持
