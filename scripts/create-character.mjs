/**
 * 历史模拟器 -- 即时建卡 (create-character.mjs)
 *
 * 运行时动态创建人物卡，自动更新 overview.md 和 state.json。
 *
 * 三种模式:
 *   默认     即时卡 -- 新人物，创建最小可用卡到 active/
 *   --upgrade  升级  -- 将 waiting/ 中的人物移至 active/
 *   --complete 补全  -- 对已有即时卡补充核心属性和反应倾向
 *
 * 用法:
 *   node create-character.mjs --sim-dir ../chongzhen-1643 --name "秦良玉" --identity "石柱土司" --faction "忠臣派"
 *   node create-character.mjs --sim-dir ../chongzhen-1643 --name "魏藻德" --upgrade --stance "观望"
 *   node create-character.mjs --sim-dir ../chongzhen-1643 --name "秦良玉" --complete --attrs path/to/attrs.json
 *
 * 依赖: Node.js 14+，无外部依赖
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { resolve, join } from 'path';

// ============================================================
// 参数解析
// ============================================================

function parseArgs(argv) {
  const opts = {};
  const flags = new Set(['upgrade', 'complete']);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      if (flags.has(key)) {
        opts[key] = true;
      } else {
        opts[key] = argv[i + 1] || '';
        i++;
      }
    }
  }
  return opts;
}

// ============================================================
// 工具函数
// ============================================================

function loadJSON(filePath) {
  if (!filePath || !existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

function loadText(filePath) {
  if (!filePath || !existsSync(filePath)) return '';
  return readFileSync(filePath, 'utf-8');
}

// ============================================================
// 模式 1: 即时卡
// ============================================================

function createInstantCard(simDir, opts) {
  const name = opts.name;
  const identity = opts.identity || '未知';
  const faction = opts.faction || '未知';
  const location = opts.location || '未知';
  const goal = opts.goal || '未知';
  const pressure = opts.pressure || '待观察';
  const tendency = opts.tendency || '待观察';
  const boundary = opts.boundary || '待观察';
  const confidence = opts.confidence || 'medium';
  const source = opts.source || '推断';

  const activeDir = join(simDir, 'characters', 'active');
  const cardPath = join(activeDir, `${name}.md`);

  // 检查是否已存在
  if (existsSync(cardPath)) {
    console.log(`[SKIP] ${name} 已在 active/ 中，不重复创建`);
    return false;
  }

  // 检查是否在 waiting/ 中（应使用 --upgrade）
  const waitingPath = join(simDir, 'characters', 'waiting', `${name}.md`);
  if (existsSync(waitingPath)) {
    console.log(`[HINT] ${name} 存在于 waiting/ 中，建议使用 --upgrade 模式`);
    console.log(`  命令: node create-character.mjs --sim-dir ${opts['sim-dir']} --name "${name}" --upgrade`);
    return false;
  }

  // 生成卡片内容
  const content = `# ${name}

## 基本信息
- 身份：${identity}
- 阵营：${faction}
- 位置：${location}
- 状态：活跃

## 摘要卡
- 公开目标：${goal}
- 当前压力：${pressure}
- 近期行动倾向：${tendency}
- 认知边界：${boundary}

## 来源追溯
- 置信度：${confidence}
- 史实依据：${source}
`;

  // 写入文件
  writeFileSync(cardPath, content, 'utf-8');
  console.log(`[OK] 已创建 characters/active/${name}.md`);

  // 更新 overview.md 和 state.json
  updateOverview(simDir, name, '活跃', identity, faction, location, opts.attitude || '未知');
  updateStateJson(simDir, {
    name,
    identity,
    faction,
    attitude: opts.attitude || '未知',
    public_goal: goal,
    player_visible: true,
    stance: opts.stance || '未知',
    recent_action_hint: tendency,
  });

  return true;
}

// ============================================================
// 模式 3: 补全完整卡
// ============================================================

function completeCharacter(simDir, opts) {
  const name = opts.name;
  const cardPath = join(simDir, 'characters', 'active', `${name}.md`);

  if (!existsSync(cardPath)) {
    console.log(`[ERROR] characters/active/${name}.md 不存在，无法补全`);
    return false;
  }

  // 读取属性文件（JSON）
  const attrsPath = opts.attrs;
  if (!attrsPath || !existsSync(attrsPath)) {
    console.log(`[ERROR] 需要提供 --attrs 参数（JSON 文件路径）`);
    return false;
  }

  const attrs = loadJSON(attrsPath);
  if (!attrs) {
    console.log(`[ERROR] 无法解析属性文件: ${attrsPath}`);
    return false;
  }

  let content = loadText(cardPath);

  // 检查是否已有核心属性
  if (content.includes('## 核心属性')) {
    console.log(`[SKIP] ${name} 已包含核心属性，不重复补全`);
    return false;
  }

  // 在"来源追溯"之前插入
  const insertPoint = '## 来源追溯';
  const loyalty = attrs.loyalty || '中';
  const ambition = attrs.ambition || '中';
  const ability = attrs.ability || '中';
  const prestige = attrs.prestige || '中';

  const politicsReaction = attrs.politics_reaction || '待观察';
  const militaryReaction = attrs.military_reaction || '待观察';
  const famineReaction = attrs.famine_reaction || '待观察';

  const insertBlock = `## 核心属性

| 属性 | 值 | 说明 |
|------|-----|------|
| 忠诚度 | ${loyalty} | ${attrs.loyalty_note || ''} |
| 野心 | ${ambition} | ${attrs.ambition_note || ''} |
| 能力 | ${ability} | ${attrs.ability_note || ''} |
| 威望 | ${prestige} | ${attrs.prestige_note || ''} |

## 反应倾向

- 政治变动：${politicsReaction}
- 军事危机：${militaryReaction}
- 财政危机：${famineReaction}

`;

  if (content.includes(insertPoint)) {
    content = content.replace(insertPoint, insertBlock + insertPoint);
  } else {
    content += '\n' + insertBlock;
  }

  writeFileSync(cardPath, content, 'utf-8');
  console.log(`[OK] ${name} 人物卡已补全核心属性和反应倾向`);
  return true;
}

// ============================================================
// 辅助: overview.md 更新
// ============================================================

function updateOverview(simDir, name, status, identity, faction, location, relation) {
  const overviewPath = join(simDir, 'characters', 'overview.md');
  if (!existsSync(overviewPath)) {
    console.log(`[WARNING] overview.md 不存在，跳过更新`);
    return;
  }

  let content = loadText(overviewPath);

  // 检查是否已存在
  if (content.includes(`| ${name} |`)) {
    console.log(`[SKIP] overview.md 已包含 ${name}`);
    return;
  }

  // 在 active 表的最后一个数据行之后插入
  // 找到 active 表的结束位置（下一个空行或 ## 标题）
  const activeTableHeader = '| 姓名 | 状态 | 身份 | 阵营 | 位置 | 与主角关系 |';
  const activeTableSep = '|------|------|------|------|------|-----------|';

  const headerIdx = content.indexOf(activeTableHeader);
  if (headerIdx === -1) {
    console.log(`[WARNING] overview.md 未找到 active 表头，跳过更新`);
    return;
  }

  const sepIdx = content.indexOf(activeTableSep, headerIdx);
  if (sepIdx === -1) {
    console.log(`[WARNING] overview.md 未找到 active 表分隔行，跳过更新`);
    return;
  }

  // 找到表中的最后一行数据
  const afterSep = sepIdx + activeTableSep.length;
  const nextSection = content.indexOf('\n\n', afterSep);
  const tableEnd = nextSection === -1 ? content.length : nextSection;

  // 构造新行
  const newRow = `\n| ${name} | ${status} | ${identity} | ${faction} | ${location} | ${relation} |`;

  // 在表末尾插入
  content = content.slice(0, tableEnd) + newRow + content.slice(tableEnd);

  writeFileSync(overviewPath, content, 'utf-8');
  console.log(`[OK] overview.md 已添加 ${name}`);
}

function removeFromWaitingTable(simDir, name) {
  const overviewPath = join(simDir, 'characters', 'overview.md');
  if (!existsSync(overviewPath)) return;

  let content = loadText(overviewPath);

  // 删除 waiting 表中匹配的行
  const lines = content.split('\n');
  const filtered = lines.filter(line => {
    const trimmed = line.trim();
    return !(trimmed.startsWith(`| ${name} |`) && trimmed.includes('待出场') === false)
      ? true
      : !trimmed.startsWith(`| ${name} |`);
  });

  // 更简单的方式：删除以该姓名开头的表格行
  const newContent = content.split('\n').filter(line => {
    return !line.trim().startsWith(`| ${name} |`);
  }).join('\n');

  if (newContent !== content) {
    writeFileSync(overviewPath, newContent, 'utf-8');
    console.log(`[OK] overview.md 已从 waiting 表移除 ${name}`);
  }
}

// ============================================================
// 辅助: state.json 更新
// ============================================================

function updateStateJson(simDir, characterEntry) {
  const statePath = join(simDir, 'state.json');
  if (!existsSync(statePath)) {
    console.log(`[WARNING] state.json 不存在，跳过更新`);
    return;
  }

  let state;
  try {
    state = loadJSON(statePath);
  } catch (e) {
    console.log(`[WARNING] state.json 解析失败，跳过更新: ${e.message}`);
    return;
  }

  if (!state) {
    console.log(`[WARNING] state.json 为空，跳过更新`);
    return;
  }

  if (!state.characters) {
    state.characters = [];
  }

  // 检查是否已存在
  const exists = state.characters.some(c => c.name === characterEntry.name);
  if (exists) {
    console.log(`[SKIP] state.json 已包含 ${characterEntry.name}`);
    return;
  }

  state.characters.push(characterEntry);
  writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
  console.log(`[OK] state.json 已添加 ${characterEntry.name} 到 characters 数组`);
}

// ============================================================
// 辅助: 从卡片文本中提取字段值
// ============================================================

function extractField(content, fieldName) {
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith(`- ${fieldName}：`) || trimmed.startsWith(`- ${fieldName}:`)) {
      const sep = trimmed.includes('：') ? '：' : ':';
      return trimmed.split(sep)[1]?.trim() || '';
    }
  }
  return '';
}

// ============================================================
// 主流程
// ============================================================

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  const simDir = opts['sim-dir'];
  if (!simDir) {
    console.error('[ERROR] 必须指定 --sim-dir');
    process.exit(1);
  }

  const absSimDir = resolve(simDir);
  if (!existsSync(absSimDir)) {
    console.error(`[ERROR] 目录不存在: ${absSimDir}`);
    process.exit(1);
  }

  // 动态导入 fs 以便在 upgrade 模式中使用 unlinkSync
  // （已通过顶层 import 解决）

  if (!opts.name) {
    console.error('[ERROR] 必须指定 --name');
    process.exit(1);
  }

  // 确定模式
  if (opts.complete) {
    // 模式 3: 补全
    completeCharacter(absSimDir, opts);
  } else if (opts.upgrade) {
    // 模式 2: 升级
    // upgrade 需要 await，因为使用了动态 import
    const fs = await import('fs');
    await upgradeWithFs(absSimDir, opts, fs);
  } else {
    // 模式 1: 即时卡
    if (!opts.identity && !opts.upgrade) {
      console.error('[ERROR] 即时卡模式必须指定 --identity');
      process.exit(1);
    }
    createInstantCard(absSimDir, opts);
  }
}

// 修正 upgrade 函数，使用传入的 fs 模块
async function upgradeWithFs(simDir, opts, fs) {
  const name = opts.name;
  const waitingPath = join(simDir, 'characters', 'waiting', `${name}.md`);
  const activePath = join(simDir, 'characters', 'active', `${name}.md`);

  if (!existsSync(waitingPath)) {
    if (!existsSync(activePath)) {
      console.log(`[INFO] ${name} 不在 waiting/ 中，作为新人物创建即时卡`);
      createInstantCard(simDir, opts);
      return;
    }
    console.log(`[SKIP] ${name} 已在 active/ 中`);
    return;
  }

  let content = loadText(waitingPath);

  const stance = opts.stance || '活跃';
  const attitude = opts.attitude || '未知';
  const tendency = opts.tendency || '待观察';

  const runtimeBlock = `

## 运行时状态
- 当前立场：${stance}
- 对主角态度：${attitude}
- 近期行动倾向：${tendency}
- 活跃度：high
`;

  content += runtimeBlock;

  writeFileSync(activePath, content, 'utf-8');
  fs.unlinkSync(waitingPath);

  console.log(`[OK] ${name} 已从 waiting/ 升级到 active/`);

  const identity = extractField(content, '身份') || opts.identity || '未知';
  const faction = extractField(content, '阵营') || opts.faction || '未知';
  const location = extractField(content, '位置') || opts.location || '未知';

  updateOverview(simDir, name, stance, identity, faction, location, attitude);
  removeFromWaitingTable(simDir, name);
  updateStateJson(simDir, {
    name,
    identity,
    faction,
    attitude,
    public_goal: extractField(content, '公开目标') || opts.goal || '未知',
    player_visible: true,
    stance,
    recent_action_hint: tendency,
  });
}

main().catch(err => {
  console.error(`[ERROR] ${err.message}`);
  process.exit(1);
});
