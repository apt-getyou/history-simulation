# Dashboard 自定义指南

本文档面向已生成实际模拟器的用户，说明 Dashboard 的完整功能点、数据绑定、展示方式和自定义方法。

---

## 1. 文件结构

Dashboard 是**零依赖的单文件 HTML**（`dashboard.html`），包含三部分：

```
dashboard.html
  <style>    -- 全部 CSS（约 680 行）
  <body>     -- HTML 骨架（约 100 行）
  <script>   -- 全部 JS 逻辑（约 700 行，IIFE 闭包）
```

数据来源：同目录下的 `state.json`，每 **3 秒** 自动轮询刷新。

---

## 2. 全局布局

### 2.1 CSS Grid 结构

```
.dashboard          grid-template-rows: auto 1fr auto     (header / main / footer)
                      height: 100vh

.main-content       grid-template-columns: 220px 1fr 240px
                    grid-template-rows: 1fr 1fr 1fr       (3行)

  220px     |  1fr (flexible)    |  240px
  --------  |  ----------------- | --------
  Protag    |  Domain Panel      | Event
  Panel     |  (row 1)           | Log
  (row 1-3) |  Territory Panel   | (row 1-3)
            |  (row 2)           |
            |  Characters+Faction|
            |  (row 3)           |
```

### 2.2 面板定位

| 面板 | CSS 定位 | 内容 |
|------|----------|------|
| `protagonist-panel` | `grid-row: 1 / 4` (左列全高) | 主角状态 |
| `domain-panel` | `grid-column: 2; grid-row: 1` | 四域指标 + 事件 |
| `territory-panel` | `grid-column: 2; grid-row: 2` | 领土/地图/作物 |
| `relations-panel` | `grid-column: 2; grid-row: 3` | 人物 + 势力 |
| `event-panel` | `grid-column: 3; grid-row: 1 / 4` (右列全高) | 回合记录 |
| `gm-panel` | `grid-column: 1 / 4; grid-row: 1 / 4` (全覆盖) | GM 全局视角 |

### 2.3 响应式

`@media (max-width: 900px)` 时切换为单列堆叠布局。

---

## 3. CSS 变量与主题

所有颜色通过 CSS 变量控制，修改 `:root` 即可全局换肤：

```css
:root {
  --bg-primary: #1a1a2e;       /* 页面背景 */
  --bg-secondary: #16213e;     /* 面板背景 */
  --bg-card: #0f3460;          /* 卡片背景 */
  --bg-card-alt: #1a1a3e;      /* 卡片背景(备用) */
  --border-color: #2a4a7f;     /* 面板边框 */
  --border-glow: #4a8af5;      /* hover 高亮边框 */
  --text-primary: #e0e0e0;     /* 主文字 */
  --text-secondary: #a0a0b0;   /* 次要文字 */
  --text-dim: #6a6a7a;         /* 暗淡文字 */
  --accent-gold: #d4a853;      /* 标题/主角 */
  --accent-red: #e74c3c;       /* 危险/敌对 */
  --accent-green: #2ecc71;     /* 安全/友好 */
  --accent-blue: #3498db;      /* 中立/信息 */
  --accent-purple: #9b59b6;    /* GM/秘密 */
  --accent-orange: #e67e22;    /* 警告/提示 */
  --accent-teal: #1abc9c;      /* 物产/外部 */
  --bar-bg: #2a2a4a;           /* 进度条底色 */
  --danger: #e74c3c;           /* 危险 */
  --warning: #f39c12;          /* 警告 */
  --safe: #2ecc71;             /* 安全 */
  --gm-bg: #2d1b2e;            /* GM 面板背景 */
  --gm-border: #8e44ad;        /* GM 面板边框 */
}
```

---

## 4. 功能点与数据绑定

### 4.1 Header（顶部栏）

**数据来源：** `state.json` → `meta` + `world.weather`

| 元素 | JS 更新目标 | 数据路径 | 说明 |
|------|-------------|----------|------|
| 模拟器标题 | `#simTitle` | `meta.sim_name` | 同步更新 `document.title` |
| 日期/季节 | `#dateDisplay` | `meta.current_date` + `meta.season` | 格式："日期 \| 季节" |
| 天气 | `#weatherBadge` | `world.weather.current` + `.anomaly` | 含异常天气提示 |
| 气候压力 | `#weatherBadge` 内 | `world.weather.climate_pressure` | 内联进度条 + 数值 |
| 回合计数 | `#turnCounter` | `meta.current_turn` | 格式："回合 N" |
| 视角切换 | `.view-btn` | 无（UI 状态） | Player 按钮=单击切换；GM 按钮=长按3秒 |
| 刷新指示 | `#refreshDot` | 无（始终显示） | 绿色脉冲动画 |

**气候压力颜色规则：**
- `> 60%` → 红色 (`fill-red`)
- `30% ~ 60%` → 黄色 (`fill-yellow`)
- `< 30%` → 绿色 (`fill-green`)

### 4.2 Protagonist Panel（主角面板）

**数据来源：** `state.json` → `protagonist`

| 元素 | CSS 类 | 数据路径 | 说明 |
|------|--------|----------|------|
| 姓名 | `.protag-name` | `protagonist.name` | 金色高亮 |
| 身份 | `.protag-identity` | `protagonist.identity` | 灰色小字 |
| 所在地 | `.protag-location` | `protagonist.location` | 暗淡小字 |
| 可用资源 | `.protag-resources` | `protagonist.status.available_resources` | 卡片背景 |
| 威望条 | `statusBar()` | `protagonist.status.prestige` | `{value, max, label}` |
| 健康条 | `statusBar()` | `protagonist.status.health` | `{value, max, label}` |
| 已知情报 | `.cat-known` | `protagonist.knowledge.known[]` | 绿色标签 |
| 怀疑 | `.cat-suspected` | `protagonist.knowledge.suspected[]` | 橙色标签 |
| 流言 | `.cat-rumor` | `protagonist.knowledge.unverified_rumors[]` | 紫色标签 |
| 未知(GM) | `.cat-unknown` | `protagonist.knowledge.unknowns[]` | 红色标签，仅GM可见 |

**状态条颜色规则（通用）：**
- `> 60%` → 绿色 (`fill-green`)
- `30% ~ 60%` → 黄色 (`fill-yellow`)
- `< 30%` → 红色 (`fill-red`)

### 4.3 Domain Panel（天下大势面板）

**数据来源：** `state.json` → `world.domains`

2x2 网格布局，每个领域一张卡片：

| 卡片 | 数据路径 | 填充色 | 包含字段 |
|------|----------|--------|----------|
| 朝局 | `world.domains.politics` | `fill-blue` | `court_stability`, `faction_tension`, `local_compliance` |
| 财政 | `world.domains.finance` | `fill-teal` | `treasury_silver`, `grain_reserves`, `tax_pressure`, `military_funding_gap` |
| 军事 | `world.domains.military` | `fill-red` | `troop_strength`, `supplies`, `mobility`, `morale` |
| 民情 | `world.domains.public` | `fill-yellow` | `public_order`, `famine_level`, `refugees`, `public_opinion` |

每个字段格式：`{ value: N, max: 100, label: "中文名" }`

**已激活事件** 嵌入 Domain Panel 底部：

| 元素 | 数据路径 | 说明 |
|------|----------|------|
| 事件名称 | `world.active_events[].name` | 粗体 |
| 事件状态 | `world.active_events[].status` | 如"已完成"、"酝酿中" |
| 触发条件 | `world.active_events[].next_trigger` | **仅GM视角可见**，紫色标注 |

### 4.4 Territory Panel（领土与地图面板）

**数据来源：** `state.json` → `territory` + `known_world` + `world_crops`

面板内按顺序渲染5个区块：

#### 区块1：全局领土指标

| 元素 | 数据路径 | 说明 |
|------|----------|------|
| 边境冲突热度 | `territory.border_conflict_heat` | `{value, max, label}` 标准状态条 |
| 补给线状态 | `territory.supply_line_status` | `{value, max, label}` 标准状态条 |

#### 区块2：已知世界

| 元素 | 数据路径 | 说明 |
|------|----------|------|
| 范围等级 | `known_world.scope_level` | 徽标显示：regional=区域, national=全国, continental=大陆, expanding=扩张中 |
| 扩展进度 | `known_world.expansion_progress` | 进度条 + 数值 |
| 未探明区域 | `known_world.unexplored_adjacent[]` | **仅GM视角可见**，红色标注 |

#### 区块3：外部接触

| 元素 | 数据路径 | Player 过滤 | 说明 |
|------|----------|-------------|------|
| 接触卡片 | `world_crops.outer_world_contacts[]` | 隐藏 `contact_status="unknown"` | 显示区域名、状态徽标、路径、可获作物、贸易难度条 |

接触状态颜色：
- `established` → 绿色
- `contacting` → 橙色
- `heard` → 蓝色
- `unknown` → 灰色

#### 区块4：可用作物

| 元素 | 数据路径 | 说明 |
|------|----------|------|
| 作物标签 | `world_crops.available_crops[]` | 青色标签列表 |

#### 区块5：区域控制卡片

| 元素 | 数据路径 | Player 过滤 | 说明 |
|------|----------|-------------|------|
| 区域卡片 | `territory.regions[]` | 隐藏 `visibility="unknown"`，最多20个 | 显示控制者、控制强度条、驻军、民心 |

**控制强度等级与颜色：**

| 值范围 | 等级 | CSS 类 | 左边框色 |
|--------|------|--------|----------|
| 0.8 - 1.0 | firm | `.firm` | 绿色 |
| 0.5 - 0.8 | stable | `.stable` | 蓝色 |
| 0.3 - 0.5 | loose | `.loose` | 黄色 |
| 0.1 - 0.3 | nominal | `.nominal` | 橙色 |
| 0 - 0.1 | lost | `.lost` | 红色 |

**可见性标签（仅GM视角显示）：**
- `full` → 绿色
- `partial` → 蓝色
- `fuzzy` → 橙色
- `unknown` → 灰色

### 4.5 Relations Panel（人物与势力面板）

**数据来源：** `state.json` → `characters` + `factions`

#### 人物卡片

| 元素 | 数据路径 | Player 过滤 | 说明 |
|------|----------|-------------|------|
| 人物卡片 | `characters[]` | 隐藏 `player_visible=false` | 显示姓名、身份、阵营、立场、近期动作 |

态度色彩（左边框）：
- 含"友"/"friendly" → 绿色 (`friendly`)
- 含"敌"/"hostile" → 红色 (`hostile`)
- 其他 → 蓝色 (`neutral`)

#### 势力详情卡片

| 元素 | 数据路径 | 说明 |
|------|----------|------|
| 势力名 | `factions[].name` | 含类型标签如 `[军阀]` |
| 代表人物 | `factions[].representative` | 与核心资源合并一行 |
| 核心资源 | `factions[].core_resources` | 灰色小字 |
| 当前目标 | `factions[].current_goal` | "目标: xxx" |
| 控制区域 | `factions[].controlled_regions[]` | 逗号分隔 |
| 关系标签 | `factions[].relationships[]` | 每条显示为色彩标签 |

关系标签颜色：
- `ally`/含"盟" → 绿色 (`rel-ally`)
- `hostile`/含"敌" → 红色 (`rel-hostile`)
- `rival`/含"竞争" → 橙色 (`rel-rival`)
- 其他 → 灰色 (`rel-neutral`)

### 4.6 Event Log（回合记录面板）

**数据来源：** `state.json` → `turn_log[]`（按回合倒序排列）

| 元素 | 数据路径 | 说明 |
|------|----------|------|
| 回合号 | `turn_log[].turn` | 蓝色粗体 |
| 日期/地点/天气 | `turn_log[].date` + `.location` + `.weather` | 暗淡小字 |
| 行动摘要 | `turn_log[].result_summary` | 主要文字 |
| 获得情报 | `turn_log[].new_knowledge[]` | 彩色标签 |

情报来源颜色：
- 含"亲"/"witness" → 蓝色 (`intel-witness`)
- 含"密"/"spy"/"secret" → 紫色 (`intel-spy`)
- 含"流"/"rumor" → 橙色 (`intel-rumor`)
- 其他 → 绿色 (`intel-report`)

### 4.7 Footer（底部状态变化条）

**数据来源：** `state.json` → `turn_log[最新].state_changes`

| 元素 | 说明 |
|------|------|
| 变化项 | 显示最近回合的状态变化，格式：`+N field_name` |
| 正值 | 绿色 (`change-up`) |
| 负值 | 红色 (`change-down`) |
| 零值 | 灰色 (`change-neutral`) |
| 更新时间 | 最后加载时间戳 |

---

## 5. GM 视角

### 5.1 进入机制

GM 按钮采用**长按3秒确认**机制：

- `mousedown`/`touchstart` → 开始3秒倒计时，显示紫色进度条 + 红色警告文字
- 3秒到期 → 切换到 GM 视角
- `mouseup`/`mouseleave`/`touchend`/`touchcancel` → 取消倒计时，重置进度条
- "主角视角"按钮始终单击即切换

### 5.2 视角切换行为

切换到 GM 视角时：
- 隐藏所有 Player 面板（`display: none`）
- 显示 GM 面板（`display: flex`）
- 重新渲染数据（GM 视角不过滤）

切换回 Player 视角时：
- 隐藏 GM 面板
- 恢复所有 Player 面板（`display: ""`）
- 重新渲染数据（Player 视角应用过滤）

### 5.3 GM 面板内容

GM 面板使用 2 列网格（`.gm-grid`），包含以下可折叠卡片：

| 卡片 | 数据路径 | 说明 |
|------|----------|------|
| 私密账本 | `gm_only.private_ledgers[]` | 每个持有者一张卡片：秘密行动、确认/推测/误判情报、掩盖方式、曝光条件 |
| 隐藏行动 | `gm_only.hidden_actions[]` | 所有进行中的幕后动作 |
| 全局真相事件 | `gm_only.global_truth_events[]` | 未揭露事件，显示可见/不可见人员 |
| 曝光条件追踪 | `gm_only.exposure_tracking[]` | 秘密泄露状态追踪 |
| 事件引擎 | `world.active_events[]` | 含 `next_trigger` 触发条件（紫色） |
| 完整人物信息 | `characters[]` | 全部角色（含 `player_visible=false`），标注可见/隐藏状态 |
| 完整领土信息 | `territory.regions[]` | 全部区域，含控制强度等级名称、完整数值 |
| 完整势力关系矩阵 | `factions[]` + `relationships[]` | 含张力来源、近期风险、争议区域 |
| 完整物产与外部世界 | `world_crops` | 含引入记录、全部外部区域（含 unknown） |

---

## 6. Player 视角过滤规则

以下过滤在 JS 渲染函数中执行，确保主角看不到不应知道的信息：

| 过滤规则 | 作用位置 | 具体逻辑 |
|----------|----------|----------|
| 隐藏角色 | `renderCharacters()` | 过滤 `player_visible === false` 的角色 |
| 隐藏未知区域 | `renderTerritory()` | 过滤 `visibility === "unknown"` 的区域 |
| 区域数量上限 | `renderTerritory()` | Player 最多显示 20 个区域 |
| 隐藏未知接触 | `renderTerritory()` | 过滤 `contact_status === "unknown"` 的外部接触 |
| 隐藏触发条件 | `renderActiveEvents()` | `next_trigger` 仅 GM 视角显示 |
| 隐藏未知情报 | `renderProtagonist()` | `protagonist.knowledge.unknowns[]` 仅 GM 视角显示 |
| 隐藏未探明区域 | `renderTerritory()` | `known_world.unexplored_adjacent[]` 仅 GM 视角显示 |
| GM 面板整体隐藏 | `applyView()` | `gm_only` 数据仅在 GM 面板中渲染 |

---

## 7. JS 架构

### 7.1 全局状态

```javascript
var POLL_INTERVAL = 3000;        // 轮询间隔（毫秒）
var stateFile = "state.json";    // 数据文件路径
var currentView = "player";      // 当前视角："player" | "gm"
var prevState = null;            // 最近一次加载的数据
```

### 7.2 渲染函数列表

| 函数名 | 职责 | 参数 |
|--------|------|------|
| `render(data)` | 总入口，调用所有子渲染函数 | 完整 state.json 数据 |
| `renderHeader(meta, world)` | 顶部栏 | `meta` + `world` |
| `renderProtagonist(p)` | 主角面板 | `protagonist` |
| `renderDomains(domains)` | 四域指标 | `world.domains` |
| `renderActiveEvents(events)` | 已激活事件 | `world.active_events` |
| `renderTerritory(data)` | 领土/地图/作物（完整 data） | 完整 state.json 数据 |
| `renderCharacters(chars, factions)` | 人物卡片 | `characters` + `factions` |
| `renderFactionDetail(factions)` | 势力详情卡片 | `factions` |
| `renderEventLog(log)` | 回合记录 | `turn_log` |
| `renderFooter(log)` | 底部状态变化 | `turn_log` |
| `renderGM(data)` | GM 全部内容 | 完整 state.json 数据 |
| `statusBar(label, obj)` | 通用状态条生成器 | 标签名 + `{value, max, label}` |
| `domainBar(obj, fillClass)` | 领域指标条生成器 | `{value, max, label}` + CSS 类 |
| `knowledgeBlock(title, items, cls)` | 情报分类块生成器 | 标题 + 数组 + CSS 类 |
| `intelClass(source)` | 情报来源→CSS类映射 | source 字符串 |
| `esc(s)` | HTML 转义 | 任意字符串 |

### 7.3 视角控制函数

| 函数名 | 职责 |
|--------|------|
| `applyView(view)` | 切换视角：更新按钮状态、显示/隐藏面板、重新渲染 |
| `switchView(view)` | 暴露到 `window` 的接口，调用 `applyView` |
| `toggleGmCard(el)` | 暴露到 `window`，GM 卡片折叠/展开 |

### 7.4 GM 长按机制

通过 IIFE 闭包在初始化时绑定事件：

```javascript
gmBtn.addEventListener("mousedown", startHold);    // 开始3秒倒计时
gmBtn.addEventListener("touchstart", startHold);    // 触屏支持
gmBtn.addEventListener("mouseup", cancelHold);      // 取消
gmBtn.addEventListener("mouseleave", cancelHold);   // 鼠标移出取消
gmBtn.addEventListener("touchend", cancelHold);     // 触屏结束取消
gmBtn.addEventListener("touchcancel", cancelHold);  // 触屏中断取消
```

---

## 8. HTML 骨架与 JS 绑定关系

```
<body>
  <div class="dashboard">
    <div class="header">
      <span id="simTitle">            ← renderHeader() 更新
      <span id="dateDisplay">         ← renderHeader() 更新
      <span id="weatherBadge">        ← renderHeader() 更新
      <span id="turnCounter">         ← renderHeader() 更新
      <button id="gmSwitchBtn">       ← 长按3秒触发 applyView("gm")
    </div>

    <div class="main-content">
      <div id="protagonistPanel">     ← applyView() 控制 display
        <div id="protagonistBody">    ← renderProtagonist() 更新

      <div id="domainPanel">          ← applyView() 控制 display
        <div id="domainGrid">         ← renderDomains() 更新
        <div id="activeEvents">       ← renderActiveEvents() 更新

      <div id="territoryPanel">       ← applyView() 控制 display
        <div id="territoryStats">     ← renderTerritory() 更新
        <div id="knownWorld">         ← renderTerritory() 更新
        <div id="outerContacts">      ← renderTerritory() 更新
        <div id="cropsSection">       ← renderTerritory() 更新
        <div id="territoryGrid">      ← renderTerritory() 更新

      <div id="relationsPanel">       ← applyView() 控制 display
        <div id="charGrid">           ← renderCharacters() 更新
        <div id="factionSection">     ← renderFactionDetail() 更新

      <div id="eventPanel">           ← applyView() 控制 display
        <div id="eventLogBody">       ← renderEventLog() 更新

      <div id="gmPanel">             ← applyView() 控制 visible
        <div id="gmGrid">            ← renderGM() 更新
    </div>

    <div class="footer">
      <div id="stateChanges">         ← renderFooter() 更新
      <div id="lastUpdate">           ← loadState() 更新
    </div>
  </div>
</body>
```

---

## 9. 自定义方法

### 9.1 换肤

修改 `:root` 中的 CSS 变量即可。例如切换到浅色主题：

```css
:root {
  --bg-primary: #f5f5f5;
  --bg-secondary: #ffffff;
  --bg-card: #e8e8e8;
  --text-primary: #1a1a1a;
  --text-secondary: #555555;
  /* ... */
}
```

### 9.2 调整布局

- **列宽比例：** 修改 `.main-content` 的 `grid-template-columns`
- **行高比例：** 修改 `grid-template-rows`
- **响应式断点：** 修改 `@media (max-width: 900px)` 中的阈值
- **隐藏面板：** 对不需要的面板设 `display: none`

### 9.3 新增面板

1. 在 CSS 中定义面板定位
2. 在 HTML 中添加 `<div class="panel" id="newPanel">` 及内部容器
3. 在 JS 中编写 `renderNewPanel(data)` 函数
4. 在 `render()` 中调用新函数
5. 如需 Player/GM 过滤，在 `applyView()` 的 `playerPanels` 数组中添加面板 ID

### 9.4 修改数据字段映射

每个渲染函数直接读取 `state.json` 的字段路径。如需改变映射：

- 修改对应渲染函数中的数据访问路径
- 确保 `state.json` 中存在对应字段
- 不需要修改 HTML 骨架

### 9.5 修改轮询间隔

```javascript
var POLL_INTERVAL = 3000;  // 改为需要的毫秒数
```

### 9.6 修改数据文件路径

```javascript
var stateFile = "state.json";  // 改为相对或绝对路径
```

### 9.7 修改 GM 长按时间

找到 `setTimeout(function() { ... }, 3000)` 中的 `3000`，改为需要的毫秒数。同时需修改 CSS：

```css
.view-btn.gm-btn.holding .gm-progress {
  transition: width Xs linear;  /* X 替换为秒数 */
  width: 100%;
}
```

### 9.8 新增状态条颜色规则

在 `statusBar()` 或 `domainBar()` 函数中修改百分比阈值和对应 CSS 类。

当前通用规则（`statusBar`）：
```
> 60% → fill-green
30% ~ 60% → fill-yellow
< 30% → fill-red
```

某些场景有反向规则（值越高越危险），需在对应函数中反转 CSS 类。

### 9.9 新增控制强度等级

在 `renderTerritory()` 和 `renderGM()` 中修改等级判定逻辑：

```javascript
// 当前规则
var level = cs >= 0.8 ? "firm" : cs >= 0.5 ? "stable" : cs >= 0.3 ? "loose" : cs >= 0.1 ? "nominal" : "lost";
```

同时添加对应 CSS 类 `.region-card.新等级名 { border-left: 3px solid 颜色; }`。

---

## 10. 注意事项

1. **零依赖：** 不引入任何外部 CSS/JS 库，纯浏览器原生运行
2. **单文件：** 所有代码在一个 HTML 文件中，部署时只需复制这一个文件
3. **XSS 防护：** 所有动态内容通过 `esc()` 函数进行 HTML 转义
4. **单向数据流：** Dashboard 只读 `state.json`，不写入任何数据
5. **IIFE 闭包：** JS 在 `(function() { ... })()` 中执行，不污染全局作用域（仅 `switchView` 和 `toggleGmCard` 暴露到 `window`）
6. **state.json 不一致：** 若 `state.json` 与 Markdown 记录不一致，以 Markdown 记录为准。Dashboard 仅是展示层
7. **文件大小：** `state.json` 应控制在 15KB 以内，详见 `state-json.template.md`
