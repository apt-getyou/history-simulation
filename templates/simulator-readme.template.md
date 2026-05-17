# {{sim_name}}

> {{tagline}}

## 故事背景

{{story_background}}

---

## 主角身份

- **姓名**：{{protagonist_name}}
- **身份**：{{protagonist_title}}
- **年龄**：{{protagonist_age}}（{{start_date}} 时）
- **起始位置**：{{protagonist_location}}
- **核心困境**：{{protagonist_dilemma}}

---

## 玩法说明

### 启动方式

在 AI agent 中输入以下任一方式启动模拟器：

- 直接调用：`/{{sim_slug}}`
- 自然语言：提到与 {{sim_name}} 相关的内容（如"继续模拟"、"推进下一回合"）

首次启动时，模拟器会展示开场场景并等待你的第一个决策。

关闭后重新打开，输入 `/{{sim_slug}}` 即可从上次进度继续。

### 回合制

模拟器采用回合制，每个回合代表 {{turn_granularity}}。

每个回合你会经历：

1. **日期推进** -- 时间向前流动
2. **天气结算** -- 季节、气候、异常天气影响全局
3. **事件触发** -- 历史事件和随机事件根据条件发生
4. **人物行动** -- 其他角色按自身动机行动（你无法完全掌控）
5. **你的决策** -- 做出选择，影响局势走向
6. **状态更新** -- 政治、财政、军事、民情等指标变化

### 信息不对称

你只能看到**主角当前已知**的信息。其他角色的秘密行动、幕后密谋、远方局势需要通过特定渠道获知。

### 输出格式

每个回合结束后，模拟器会输出：

- **世界简报** -- 当前日期、天气、已知事件
- **互动正文** -- 小说化的叙事段落
- **情报变化** -- 新获得的信息及其来源
- **状态变更** -- 各项指标的变化

### 仪表盘

在浏览器中打开 `dashboard.html` 可查看可视化状态面板，每 3 秒自动刷新。

---

## 完结条件

### 胜利条件

{{victory_conditions}}

### 失败条件

{{defeat_conditions}}

### 时间上限

{{time_limit}}

---

## 真实性模式

{{fidelity_mode_description}}

---

## 后续玩法

### 继承存档

模拟器完结后，可回到历史模拟器生成器，选择"继承存档"模式，基于当前世界开启新一代模拟器。支持：

- 血脉继承（旧主角的继承人）
- 旁系继承（同世界其他人物）
- 时间跳跃（跳到 N 年后）
- 敌对阵营（换到对立面）

### 引擎升级

如生成器发布了新引擎版本，可将本模拟器升级到最新版本，同时保留所有运行时数据。

---

## 文件结构

```
{{sim-slug}}/
├── SKILL.md              # 模拟器完整运行规则
├── state.json            # 当前状态快照（每回合更新）
├── dashboard.html        # 可视化仪表盘
├── .engine-meta.json     # 引擎版本信息
├── README.md             # 本文件
├── references/           # 规则文件
│   ├── 01-simulator-brief.md    # 总简报
│   ├── 02-canon-policy.md       # 正典策略
│   ├── 03-cast-registry.md      # 人物名册
│   ├── 04-faction-map.md        # 势力关系
│   ├── 05-world-event-engine.md # 事件引擎
│   ├── 06-weather-engine.md     # 天气引擎
│   ├── 07-state-schema.md       # 状态定义
│   ├── 08-session-protocol.md   # 回合协议
│   ├── 09-opening-state.md      # 开场状态
│   ├── 10-source-ledger.md      # 来源账本
│   ├── 11-knowledge-model.md    # 知晓模型
│   ├── 12-geography-layer.md    # 地理底盘
│   ├── 13-territory-layer.md    # 领土控制
│   ├── 14-map-expansion.md      # 地图扩展
│   └── 15-commodity-timeline.md # 物产时间线
├── characters/           # 人物卡
│   ├── overview.md       # 人物总览表（常驻上下文）
│   ├── active/           # 活跃人物完整卡
│   ├── waiting/          # 待出场人物
│   └── archive/          # 已故人物（冻结）
├── records/              # 游玩记录
│   ├── ledger/           # 结构化账本（每回合一个文件）
│   ├── chronicle/        # 小说化叙事（每回合一个文件）
│   ├── session-record-template.md
│   └── private-ledger-template.md
├── scripts/              # 运行时脚本（可选）
│   ├── turn-engine.mjs   # 回合结算引擎
│   ├── record-writer.mjs # 记录写入器
│   └── event-triggers.json # 事件触发条件
└── data/
    └── driver-skill.md   # 驱动器配置
```
