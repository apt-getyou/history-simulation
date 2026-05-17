# 阶段 1：数据收集（本地文献优先 + Web 线索补充）

## 目标

收集结构化史料数据。本地文献由 AI agent 直接阅读原文提取，Web 搜索仅用于发现 A/B 级来源的线索。

**核心原则**：所有断言的依据必须来自本地文献（A/B 级）。Web 搜索不直接产生断言。

## 核心原则

参考 `references/source-integrity.md` 的数据源分层：

- **第一层（primary/）**：原始文献，断言的直接依据
- **第二层（secondary/）**：学术著作，断言的补充依据
- **第三层**：Web 搜索结果，仅用于发现线索，必须追溯到一/二层文献验证

## 输入

- `data/generation-brief.md`
- `data/sources/catalog.json`（阶段 0 收集的文献清单）
- `local_sources` 中的本地文件（如有）

## 输出

- `data/raw/` -- 原始收集数据
- `data/sources/catalog.json` -- 补充偏倚标注
- `data/sources/evidence/` -- 初始证据链文件

## 进度追踪

```json
"1": {
  "status": "in_progress",
  "started_at": "{{ISO8601}}",
  "subtasks": {
    "inventory_done": false,
    "entities_total": 0,
    "entities_collected": 0,
    "local_sources_processed": 0,
    "local_sources_total": 0,
    "bias_annotations_done": 0,
    "bias_annotations_total": 0,
    "web_searches_done": 0,
    "current_entity_index": 0
  }
}
```

## 流程

### 1.0 实体盘点

从 `generation-brief.md` 提取实体清单。列出一张总表：

| 实体类型 | 实体名 | 搜索优先级 | 搜索状态 |
|----------|--------|-----------|---------|
| person | 诸葛亮 | P0 | pending |
| person | 刘备 | P0 | pending |
| faction | 蜀汉 | P1 | pending |
| event | 赤壁之战 | P1 | pending |
| ... | ... | ... | ... |

向用户展示总表，确认无遗漏后开始收集。

将实体清单写入 `data/raw/entity-inventory.json`。

### 1.1 本地文献入库与偏倚标注

**优先级最高。** 所有本地文献在提取数据前必须完成入库和偏倚标注。

#### 1.1.1 文献入库

对 `data/sources/catalog.json` 中的每份文献：

1. 确认文件存在于 `data/sources/primary/` 或 `data/sources/secondary/`
2. 计算文件 SHA-256 哈希，写入 catalog.json 的 `file_hash` 字段
3. 记录文件大小，确定 `reading_strategy`（full/chapter/segments/linear）

如果用户提供了新的本地文件（未在 catalog.json 中），执行入库流程：
- 复制到对应目录（primary/ 或 secondary/）
- 生成 catalog.json 条目（id、filename、tier、source_type）
- 计算哈希

#### 1.1.2 偏倚标注（AI 辅助 + 用户确认）

对每份文献，AI agent 执行：

1. 读取文献元数据（作者、时代、身份）
2. 读取序言/凡例/跋等部分（如有）
3. 生成偏倚标注初稿，填入 catalog.json 的 `bias_annotation` 字段：
   - `political_stance`：作者的政治立场/正统观
   - `known_gaps`：已知的内容空白区
   - `known_embellishments`：已知的夸大或虚构
   - `reliability_assessment`：整体可靠性（high/medium/low）
   - `assessment_detail`：评估理由

4. 将初稿展示给用户，逐文献确认或修改
5. 用户确认后锁定

向用户展示格式：

```
文献：《三国志》
作者：陈寿（蜀汉旧臣，入晋后任著作郎）

AI 偏倚分析：
- 政治立场：西晋正统视角，以魏为正朔
- 已知空白：蜀汉早期记载简略
- 已知夸大：无明显文学虚构
- 可靠性：high
- 理由：最接近三国时期的正史记载，但受政治立场影响

请确认或修改：
[确认] / [修改某项] / [补充信息]
```

**每完成一份文献的偏倚标注**，更新进度：
```json
"bias_annotations_done": 1,
"bias_annotations_total": 5
```

### 1.2 本地文献提取

对 `catalog.json` 中的每份文献，AI agent 根据 `reading_strategy` 处理：

| 策略 | 触发条件 | 行为 |
|------|----------|------|
| `full` | < 200K 字符 | 全文阅读，按实体提取 |
| `chapter` | >= 200K 字符，有章节标记 | 读取章节目录，选择相关章节阅读 |
| `segments` | >= 200K 字符，无章节但有空行段落群 | 按段落群分段阅读 |
| `linear` | >= 200K 字符，无自然分段 | 按 offset 分批阅读，每批 10% 重叠 |

**提取规则**：

对每个识别到的实体（人物/势力/事件/制度等），提取信息时**同步记录来源位置**：

```json
{
  "entity_name": "诸葛亮",
  "entity_type": "person",
  "sources": [
    {
      "source_id": "sgz",
      "extraction_date": "2025-01-15",
      "structured_data": {
        "name": "诸葛亮",
        "courtesy_name": "孔明",
        "birth_place": "琅琊阳都",
        "...": "..."
      },
      "source_locations": [
        {
          "field": "basic_identity",
          "location": "蜀书·诸葛亮传，第一段",
          "exact_quote": "诸葛亮字孔明，琅琊阳都人也"
        }
      ]
    }
  ]
}
```

写入 `data/raw/{entity_type}/{entity_name}.json`。

**每处理完一份本地文献**，更新进度：
```json
"local_sources_processed": 1,
"local_sources_total": 5
```

### 1.3 Web 搜索补充（线索模式）

对每个本地文献未覆盖的实体，执行 WebSearch。

**搜索定位改变**：Web 搜索的目标不是直接采信搜索结果，而是：

1. 发现该实体在哪些 A/B 级文献中有记载
2. 找到可免费获取的原始文献在线版本（如国学导航、维基文库文言原文）
3. 找到学术论文/专著的引用信息（用于后续获取）
4. 发现需要进一步验证的线索

**搜索顺序**：
1. 正史/一手史料的在线版本
2. 文学作品的在线版本（如演义）
3. 学术研究的公开摘要
4. 线索发现（百科等 C 级来源，仅用于定位原始出处）

**搜索结果处理**：

对于找到的在线原始文献（A/B 级）：
1. 下载到 `data/sources/primary/` 或 `data/sources/secondary/`
2. 入库到 catalog.json（计算哈希、确定阅读策略）
3. 执行偏倚标注（AI 辅助 + 用户确认）
4. 按本地文献提取流程处理

对于搜索结果中的 C 级内容：
1. 记录线索到 `data/raw/{entity_type}/{entity_name}.json`，标记 `discovery_source: "web_search"`
2. 标注线索指向的原始文献（如"百度百科引用了《三国志·武帝纪》"）
3. **不直接作为断言依据**
4. 后续由 AI agent 追溯到原始文献验证

**每完成一批实体（约 10 个）**，更新进度并检查上下文：

```json
"entities_collected": 20,
"current_entity_index": 20,
"web_searches_done": 15
```

如果上下文空间不足，写入进度并提示用户 `/clear`。

### 1.4 初始证据链生成

对每个已收集的实体，基于提取数据生成初始证据链文件：

`data/sources/evidence/{entity}-evidence.json`

生成规则参考 `references/source-integrity.md` 第四节。

每个断言必须包含：
- `id`：断言唯一标识
- `claim`：断言内容
- `assertion_strength`：strong/weak/disputed/fiction/inferred
- `evidence`：来源列表（source_id、location、exact_quote、bias_note）
- `corroboration_type`：交叉验证类型
- `confidence`：high/medium/low

**注意**：此阶段生成的证据链为初始版本。后续阶段（Phase 2 冲突检测）会补充和修正。

### 1.5 结构化存储

搜索结果按实体类型存入 `data/raw/`。

文件格式：`data/raw/{entity_type}/{entity_name}.json`

## 完成标准

- 所有本地文献已入库、偏倚标注已确认
- 所有本地文献已提取并写入 `data/raw/`
- 所有实体至少有 1 个来源版本的结构化数据
- Web 搜索发现的 A/B 级文献已下载入库
- 初始证据链文件已生成
- 进度文件已更新，current_phase 推进到 "2"

## 上下文管理

本阶段是 token 消耗最大的阶段之一（与阶段 3 并列）。

**分批策略**：
- 实体按优先级分批：P0（核心人物/事件）→ P1（势力/制度）→ P2（气候/地理）
- 每批 10-15 个实体
- 每批完成后检查上下文，不足则提示 `/clear`

**清理策略**：
- 原始搜索结果写入文件后，不需要保留在上下文中
- 每完成一个实体，其原文即可丢弃，只保留结构化摘要
- 偏倚标注确认后写入 catalog.json，不保留在上下文中

**中断恢复**：
- 恢复时读取 `data/raw/entity-inventory.json`、`data/sources/catalog.json` 和进度文件
- 跳过已收集的实体和已标注的文献
- 从 `current_entity_index` 继续
