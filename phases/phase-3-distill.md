# 阶段 3：时间线感知人物提炼（含断言溯源）

## 目标

基于已解决数据，按 `references/character-distillation.md` 的七层模型提炼人物。严格限制人物的知识不超过 `start_date`。行为模式按可塑性分级处理。**每条提炼结果必须关联证据链中的断言ID。**

## 溯源规则

参考 `references/source-integrity.md`：

- 每条关键人物信息必须关联 `data/sources/evidence/{name}-evidence.json` 中的断言 ID
- 无证据支撑的信息必须标注为 `inferred` 并写明推断逻辑
- 偏倚相关的信息（如人物评价类）必须附带 `bias_note`

## 输入

- `data/resolved/`（已解决的冲突数据）
- `data/raw/entity-inventory.json`（实体清单）
- `data/generation-brief.md`（start_date、source_preference 等）
- `references/character-distillation.md`（七层模型参考）

## 输出

- `data/distilled/`（提炼后的人物档案）
- `data/distilled/character-inventory.md`（人物盘点表）
- `data/sources/evidence/{name}-evidence.json`（更新后的证据链，补充推断类断言）

## 进度追踪

```json
"3": {
  "status": "in_progress",
  "started_at": "{{ISO8601}}",
  "subtasks": {
    "inventory_done": false,
    "total_characters": 0,
    "completed_characters": 0,
    "current_batch": 0,
    "batch_size": 10,
    "next_character_index": 0,
    "character_list": []
  }
}
```

## 流程

### 3.0 人物盘点（必须先完成）

从 `data/raw/` 和 `data/resolved/` 中列出所有人物清单，生成盘点表：

| # | 姓名 | 类型 | 时期 | 资料丰富度 | 与主角关系 | 可塑性预估 | 处理状态 |
|---|------|------|------|-----------|-----------|-----------|---------|
| 1 | 诸葛亮 | 核心人物 | 181-234 | high | 阵营内 | 半成型 | pending |
| 2 | 曹操 | 核心人物 | 155-220 | high | 敌对 | 定型 | pending |
| 3 | 张三 | 配角 | ?-? | low | 待定 | 未成型 | pending |
| ... | ... | ... | ... | ... | ... | ... | ... |

**盘点步骤**：

1. 扫描 `data/raw/person/` 目录，提取所有人物名
2. 扫描 `data/resolved/` 目录，确认解决状态
3. 按 `start_date` 预评估每个人物的可塑性等级
4. 向用户展示完整盘点表
5. 用户可以：
   - 补充遗漏人物
   - 删除不需要的人物
   - 调整人物类型/优先级
6. 将最终清单写入 `data/distilled/character-inventory.md`
7. 更新进度：`inventory_done: true`，`total_characters: N`

**人物类型分类**：

| 类型 | 说明 | 提炼深度 |
|------|------|---------|
| 核心人物 | 主角阵营/直接对手/关键盟友 | 完整七层 + 可塑性详细评估 |
| 重要配角 | 势力首领、重要谋士、名将 | 完整七层 |
| 一般人物 | 地方官员、次要将领、名士 | 简化七层（重点：动机、关系、行动偏好） |
| 背景人物 | 史料极少或仅有名字 | 最简档案（身份、位置、阵营） |

### 3.1 分批提炼

按盘点表的顺序分批处理。每批 8-10 个人物。

**每批处理流程**：

1. 读取本批人物的 `data/raw/person/{name}.json` 和 `data/resolved/{name}-resolution.json`
2. 对每个人物执行：
   a. 评估性格可塑性等级（定型/半成型/未成型）
   b. 识别关键塑造事件，按 start_date 切割
   c. 分离知识层（受时间线约束）和行为模式层（按可塑性分级）
   d. 提炼七层档案，**每条关键信息标注断言ID**
   e. 写入 `data/distilled/{name}.yaml`
   f. 更新 `data/sources/evidence/{name}-evidence.json`（如有推断类断言需要补充）

#### 断言关联规则

提炼过程中的信息分为三类：

| 信息类型 | 处理方式 | 标注 |
|----------|---------|------|
| 有证据链支撑 | 直接引用 evidence.json 中的断言ID | `[A001]` |
| 从史料推断 | 新建 inferred 类型断言，写入 evidence.json | `[I001]`，附推断逻辑 |
| 无任何依据 | 严格禁止出现 | 不允许 |

**推断类断言的写入格式**：

```json
{
  "id": "I001",
  "claim": "诸葛亮性格谨慎，倾向先确保万全再行动",
  "category": "behavioral_pattern",
  "assertion_strength": "inferred",
  "evidence": [
    {
      "source_id": "sgz",
      "source_tier": "A",
      "location": "蜀书·诸葛亮传",
      "exact_quote": null,
      "bias_note": null,
      "inference_logic": "从诸葛亮北伐时拒绝魏延子午谷奇谋、坚持稳扎稳打的行为模式推断"
    }
  ],
  "corroboration_type": "behavioral_inference",
  "corroboration_detail": "从多条史料记载的决策行为推断其性格倾向",
  "confidence": "medium",
  "dispute": "推断存在主观性，不同分析者可能得出不同结论"
}
```

3. 每批完成后：
   - 更新进度文件（`completed_characters`, `current_batch`, `next_character_index`）
   - 检查上下文空间
   - 不足时提示 `/clear`

### 3.2 知识层与行为模式层分离

**知识层**（人物知道了什么事实）-- 严格受时间线约束：

| 层级 | 内容 | 可见性 |
|------|------|--------|
| 历史锚点 | `start_date` 之前的确切史实 | 人物可知 |
| 趋势推演 | `start_date` 之前的经验总结 | 人物可知 |
| 未来盲区 | `start_date` 之后发生的一切 | 仅 GM 可知 |

**行为模式层**（人物会怎么做事）-- 可塑性分级：

| 等级 | 判定条件 | 行为模式约束 |
|------|----------|-------------|
| **定型** | start_date 在成熟期后，关键经历已发生 | 历史行为模式作为硬约束 |
| **半成型** | start_date 在青年期，部分经历已发生 | 已发生的保留，未发生的标为"可变" |
| **未成型** | start_date 在幼年/少年期，核心经历均未发生 | 仅保留天性基底，其余全部可变 |

### 3.3 性格三分类

对每个人物的性格分为三类：

- **天性基底**（locked）：天赋倾向，不受经历改变
- **已成型特质**（formed）：start_date 前的经历已塑造，作为默认行为，可被新经历改写
- **未成型特质**（unformed）：start_date 后的塑造事件尚未发生，不预设为必然形成

### 3.4 提炼产出格式

每个人物产出 YAML 文件，结构参考 `references/enhanced-generation-flow.md` 的 3.2 节。

**每个字段必须标注断言ID**，格式示例：

```yaml
name: 诸葛亮
basic_identity:
  courtesy_name: 孔明 [A001]
  birth_place: 琅琊阳都 [A001]
  birth_year: 181 [A002]
  # ...

behavioral_patterns:
  decision_style: 谨慎稳健，倾向先确保万全 [I001]
  military_approach: 正兵为主，奇谋为短 [A006] (bias_note: 陈寿西晋立场可能影响评价)
  # ...
```

### 3.5 未来事件处理

start_date 之后的历史事件转入 GM 事件池（阶段 4 处理），不写入人物知识层。

## 完成标准

- 人物盘点表已生成并经用户确认
- 所有人物七层档案已提炼
- 知识层和行为模式层已正确标记
- 可塑性等级已评估
- 每条关键信息已关联断言ID（有证据支撑）或标注为 inferred（有推断逻辑）
- 证据链文件已更新（推断类断言已写入）
- 进度文件已更新，current_phase 推进到 "3.4"

## 上下文管理

本阶段是 token 消耗最大的阶段之一。

**分批策略**：
- 每批 8-10 个人物
- 核心人物可以独占一个批次（提炼更详细）
- 背景人物可以一批 15-20 个（提炼简化）

**清理策略**：
- 已提炼的人物写入 YAML 后，原始 JSON 数据可从上下文丢弃
- 每批之间清理上一批的中间数据

**中断恢复**：
- 恢复时读取 `data/distilled/character-inventory.md` 和进度文件
- 跳过已完成的角色（检查 `data/distilled/{name}.yaml` 是否存在）
- 从 `next_character_index` 继续

**上下文不足提示**：
```
[WARNING] 上下文空间即将用尽。

当前进度：阶段 3 -- 人物提炼
已完成：30/85 个人物（批次 3/9）
下一个待处理：第 4 批（人物 31-40）

请执行 /clear 后重新运行 /history-simulation，系统将从第 4 批继续。
已提炼的人物档案已保存在 data/distilled/ 目录中。
```
