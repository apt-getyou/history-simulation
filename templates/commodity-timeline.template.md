# 物产引入时间线

## 概述

本文件定义模拟器中作物、物产、技术的引入时间线和获取渠道。核心原则：**任何作物或物产都不能无中生有，必须有合理的历史来源或获取渠道。**

## 作物时间线

### 粮食作物

```yaml
crops:
  - id: "CROP-RICE"
    name: "水稻"
    origin: "中国长江流域"
    intro_to_china: "远古(前7000年)"
    constraint: "任何历史时期均可用，无需引入"
    climate_suitability: ["亚热带湿润", "温带季风"]
    yield_base: 1.0        # 基准亩产倍率
    terrain_suitability: ["平原", "水网", "盆地"]

  - id: "CROP-WHEAT"
    name: "小麦"
    origin: "西亚"
    intro_to_china: "前3000年"
    constraint: "任何历史时期均可用"
    climate_suitability: ["温带季风", "温带大陆"]
    yield_base: 0.9
    terrain_suitability: ["平原", "高原"]

  - id: "CROP-MILLET"
    name: "粟(小米)"
    origin: "中国黄河流域"
    intro_to_china: "远古(前6000年)"
    constraint: "任何历史时期均可用，北方主粮"
    climate_suitability: ["温带季风", "温带大陆"]
    yield_base: 0.7
    terrain_suitability: ["平原", "高原"]

  - id: "CROP-SORGHUM"
    name: "高粱"
    origin: "非洲"
    intro_to_china: "约前3000-前2000年"
    constraint: "秦汉时期已广泛种植"
    climate_suitability: ["温带季风", "温带大陆"]
    yield_base: 0.8
    terrain_suitability: ["平原", "盆地"]

  - id: "CROP-CHAMPA-RICE"
    name: "占城稻"
    origin: "越南占城"
    intro_to_china: "北宋大中祥符年间(约1012年)"
    intro_route: "福建商人从占城引入，宋真宗推广"
    prerequisite:
      - "与交州/东南亚有贸易接触"
      - "朝廷有推广意愿和组织能力"
    constraint: "三国时期理论可获（交州在版图内），但需主动派人寻种"
    climate_suitability: ["亚热带湿润", "热带"]
    yield_base: 1.3
    special: "耐旱、早熟、可双季"
    terrain_suitability: ["平原", "水网", "丘陵"]

  - id: "CROP-POTATO"
    name: "土豆(马铃薯)"
    origin: "南美洲安第斯山脉"
    intro_to_china: "明万历年间(约1570-1600年)"
    intro_route: "西班牙殖民地 -> 菲律宾 -> 中国沿海 / 荷兰 -> 台湾 -> 福建"
    prerequisite:
      - "大航海时代已开启(15世纪末以后)"
      - "与东南亚/欧洲殖民者有贸易接触"
      - "有人在沿海获得种薯并成功试种"
    spread_speed: "极慢(约50年才从沿海传到内陆)"
    constraint: "三国时期(220年)绝不可能出现。除非穿越者打通了到美洲的航线"
    climate_suitability: ["温带", "亚热带", "高寒"]
    yield_base: 2.5
    special: "耐寒、耐旱、亩产极高、山地可种"
    terrain_suitability: ["山地", "高原", "平原"]

  - id: "CROP-SWEET-POTATO"
    name: "番薯(红薯)"
    origin: "中美洲"
    intro_to_china: "明万历年间(约1594年)"
    intro_route: "吕宋(菲律宾) -> 福建（陈振龙引入）"
    prerequisite:
      - "与东南亚有贸易接触"
      - "有人在吕宋获得藤蔓"
    constraint: "明朝中后期才有可能，三国时期绝不可能"
    climate_suitability: ["亚热带", "热带"]
    yield_base: 2.0
    special: "耐旱、耐瘠、山地可种"
    terrain_suitability: ["山地", "丘陵", "平原"]

  - id: "CROP-CORN"
    name: "玉米"
    origin: "中美洲"
    intro_to_china: "明嘉靖年间(约1531年)"
    intro_route: "多条路线：陆路经中亚、海路经东南亚"
    prerequisite:
      - "大航海时代已开启"
      - "与外部世界有贸易接触"
    constraint: "明朝中后期才有可能"
    climate_suitability: ["温带", "亚热带"]
    yield_base: 1.8
    special: "耐旱、山地可种、适应性广"
    terrain_suitability: ["山地", "丘陵", "平原"]

  - id: "CROP-SOYBEAN"
    name: "大豆"
    origin: "中国"
    intro_to_china: "远古(前3000年)"
    constraint: "任何历史时期均可用"
    climate_suitability: ["温带季风"]
    yield_base: 0.6
    special: "固氮养地、可制酱、可榨油"
    terrain_suitability: ["平原"]
```

### 蔬菜与调味品

```yaml
vegetables_spices:
  - id: "VEG-CHILI"
    name: "辣椒"
    origin: "中美洲"
    intro_to_china: "明末(约1590年代)"
    intro_route: "葡萄牙 -> 印度 -> 马六甲 -> 中国南方"
    prerequisite:
      - "与葡萄牙/东南亚商人有贸易接触"
    constraint: "三国/唐宋/元/明初都不可能出现。明末才有可能"
    note: "此前中国用花椒、姜、茱萸提供辣味"

  - id: "VEG-GARLIC"
    name: "大蒜"
    origin: "中亚"
    intro_to_china: "西汉张骞(前126年)"
    constraint: "三国时期已广泛使用"

  - id: "VEG-TOMATO"
    name: "番茄"
    origin: "南美洲"
    intro_to_china: "明万历年间(约1621年)"
    constraint: "明朝末年才有可能，初期只作观赏"

  - id: "VEG-CABBAGE"
    name: "白菜"
    origin: "中国"
    intro_to_china: "远古"
    constraint: "任何历史时期均可用"
```

### 经济作物与特产

```yaml
cash_crops:
  - id: "EC-TEA"
    name: "茶"
    origin: "中国西南"
    intro_to_china: "远古"
    constraint: "任何历史时期均可用"
    trade_value: "高（西域/游牧民族需求大）"

  - id: "EC-SILK"
    name: "丝绸"
    origin: "中国"
    intro_to_china: "远古"
    constraint: "任何历史时期均可用"
    trade_value: "极高（西域/罗马/波斯需求极大）"

  - id: "EC-COTTON"
    name: "棉花"
    origin: "印度"
    intro_to_china: "汉代经西域传入，宋元大规模推广"
    constraint: "三国时期仅边疆有少量，中原几乎不用"

  - id: "EC-SUGAR"
    name: "蔗糖"
    origin: "印度/东南亚"
    intro_to_china: "唐代(约647年，唐太宗遣使学熬糖法)"
    constraint: "三国时期有甘蔗但无制糖技术，仅能嚼食或熬粗浆"
```

## 获取渠道机制

### 渠道定义

```yaml
acquisition_channels:
  # 渠道 1：历史性引入（符合史实的自然传播）
  historical_introduction:
    description: "按历史时间线自然发生，无需玩家主动干预"
    trigger: "到达该作物历史引入时间点"
    probability: "高(自然发生)"
    conditions:
      - "相关贸易路线畅通"
      - "有中间商/使节/移民自然带入"
    process:
      - "GM 判定贸易路线状态"
      - "引入发生，记录来源为'历史自然传播'"
      - "作物开始缓慢扩散（沿海/边境 -> 内陆）"

  # 渠道 2：主动探索获取（玩家主动寻找）
  active_exploration:
    description: "玩家通过地图扩展接触外部世界后主动获取"
    trigger: "玩家表达获取意向并付诸行动"
    probability: "取决于外交、贸易、物流难度"
    conditions:
      - "已与外部区域建立联系（地图扩展机制）"
      - "对方愿意交易/赠送种子或种苗"
      - "运输过程中种子/种苗存活"
      - "本地气候适合种植"
    process:
      - "玩家提出获取意向"
      - "GM 判定可行性（该时期是否有可能接触到原产地）"
      - "若可行，执行获取行动（贸易/外交/探险）"
      - "获取成功后进入'试种'阶段"
      - "试种成功后逐步推广"
    special_case: |
      穿越者知道某作物存在，不等于能获得。
      知识和获取渠道是两回事。
      三国穿越者知道美洲有土豆，但必须解决"怎么到达美洲"的问题。
      占城稻在三国时期理论上可通过交州获取，但需要主动派人寻找。

  # 渠道 3：系统奖励（仅限有"系统"设定的模拟器）
  system_reward:
    description: "通过系统任务获得，仅当用户追加了系统/穿越系统设定时可用"
    trigger: "完成系统任务或触发系统奖励"
    constraint: "仅当 generation-brief 中 custom_injections 包含'系统'类设定"
    process:
      - "系统任务完成"
      - "系统给出作物种子或种苗"
      - "标注来源为'系统奖励(非史实)'"
    note: "系统给出的作物必须标注为'非史实来源'，引入时间线记录中标记"

  # 渠道 4：意外获取（随机事件）
  accidental_acquisition:
    description: "通过沉船、流民携带、商人偶然带入等随机事件获取"
    trigger: "低概率随机事件"
    probability: "极低(每回合 < 1%)"
    conditions:
      - "该作物在世界上已存在（不能早于原产地驯化时间）"
      - "有传播路径（贸易路线、移民路线、战争路线）"
    note: "模拟历史上作物偶尔通过非正规渠道传播的真实性"
    example: "沉船漂来未知种子、外国商人随手赠送的果实里包含种子"
```

### 获取可行性判定矩阵

| 时期 | 占城稻 | 土豆 | 番薯 | 辣椒 | 玉米 | 蔗糖 | 棉花 |
|------|--------|------|------|------|------|------|------|
| 先秦 | 不可 | 不可 | 不可 | 不可 | 不可 | 不可 | 不可 |
| 秦汉 | 不可 | 不可 | 不可 | 不可 | 不可 | 不可 | 西域极少 |
| 三国 | 理论可获(交州) | 不可 | 不可 | 不可 | 不可 | 不可 | 西域极少 |
| 隋唐 | 不可 | 不可 | 不可 | 不可 | 不可 | 可获(学制糖法) | 渐多 |
| 宋元 | 可获(已引入) | 不可 | 不可 | 不可 | 不可 | 已有 | 已有 |
| 明前期 | 已有 | 不可 | 不可 | 不可 | 不可 | 已有 | 已有 |
| 明中后期 | 已有 | 可获 | 可获 | 可获 | 可获 | 已有 | 已有 |
| 清 | 已有 | 已有 | 已有 | 已有 | 已有 | 已有 | 已有 |

**"不可"** = 该时期此作物在地球上尚未到达中国可触达的范围，除非有系统/超自然设定。
**"理论可获"** = 存在但需要主动行动获取，不会自动出现。
**"可获"** = 通过正常贸易/外交可获取。
**"已有"** = 已在中国境内广泛存在。

## 作物引入对世界的影响

```yaml
crop_impact:
  high_yield_crops:               # 高产作物（土豆、番薯、玉米）
    population_capacity: "+30%~50%"
    famine_risk: "-40%"
    mountain_utilization: "+50%"
    social_effect:
      - "人口快速增长"
      - "山地/丘陵地区开发"
      - "粮食价格下降"
      - "可能触发人口红利或马尔萨斯陷阱"

  cash_crops:                      # 经济作物（棉、糖、茶）
    trade_balance: "显著改善"
    fiscal_revenue: "+10%~20%"
    social_effect:
      - "商品经济发展"
      - "区域性专业化种植"
      - "可能出现'与粮争地'问题"

  new_spices:                      # 新调味品（辣椒等）
    quality_of_life: "提升"
    trade_value: "中"
    social_effect:
      - "饮食文化变革"
      - "区域饮食习惯分化"
```

## state.json 联动

作物引入状态写入 `state.json` 的 `world.crops` 字段：

```json
{
  "available_crops": ["水稻", "小麦", "粟", "大豆"],
  "crop_introduction_log": [
    {
      "crop": "占城稻",
      "introduced_date": "",
      "source": "未引入",
      "acquisition_channel": "",
      "spread_status": "",
      "yield_modifier": 0
    }
  ],
  "outer_world_contacts": [
    {
      "zone_id": "",
      "zone_name": "",
      "contact_status": "unknown/contacting/established",
      "available_crops": [],
      "trade_difficulty": 0
    }
  ]
}
```

## 使用要求

- 作物不能无中生有。引入必须通过上述四个渠道之一
- 每个渠道的获取都有前置条件和失败概率
- 作物引入后不是立即全国推广，需要"试种 -> 本地化 -> 推广"的过程
- 推广速度取决于朝廷意愿、交通条件、地方配合度
- 穿越者的知识只降低"寻找"的难度，不降低"获取"的难度
- 所有作物引入事件必须记录在 `turn_log` 中，标注获取渠道和来源
