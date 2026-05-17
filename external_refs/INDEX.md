# 外部参考索引

本目录仅保留链接索引，不下载任何外部文件。需要查看时访问对应项目地址。

## 叙事型 skill 结构

**项目地址：** https://github.com/danjdewhurst/story-skills

可借鉴点：

- 用多个窄 skill 组成一个大流程
- 目录化管理角色、世界、情节、章节
- 使用 `_index.md` 作为域内总注册表
- 先建项目骨架（story-init），再填内容
- 角色卡不只写人设，还写关系、动机、弧线；角色关系要双向更新
- 地点与系统分开建模，世界元素和角色、情节互相引用
- 单独维护时间线与伏笔，把"情节推进"从正文中抽离成结构化对象
- 先 outline 再写正文，写完后回填索引与时间线

## 互动叙事与状态组织

**项目地址：** https://github.com/inkle/ink

可借鉴点（`Documentation/WritingWithInk.md`）：

- 场景可以视为 knots
- 场景内事件可以视为 stitches
- 选择、跳转、变量天然适合模拟器回合流

## 世界主持器与多角色模拟

**项目地址：** https://github.com/google-deepmind/concordia

可借鉴点：

- 使用 Game Master 统一裁决世界
- 把角色行为和环境结算拆开
- 用 Engine 维护回合循环，而不是让多个角色自由漂移

## 人物思维蒸馏 skill

**项目地址：** https://github.com/alchaincyf/nuwa-skill

可借鉴点（`references/` 目录）：

- 多 Agent 并行采集 + 三重验证提炼的结构化流程
- extraction-framework.md 中的心智模型验证方法论
- skill-template.md 中的 Skill 骨架模板
