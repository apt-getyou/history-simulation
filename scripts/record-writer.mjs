/**
 * 历史模拟器 -- 记录写入器 (record-writer.mjs)
 *
 * 覆盖回合流程步骤: 11(记录写入) / 12(人物卡变更写回)
 *
 * 用法:
 *   node record-writer.mjs \
 *     --state path/to/state.json \
 *     --settlement path/to/turn-settlement.json \
 *     --chronicle path/to/chronicle-text.txt \
 *     --character-changes path/to/characters-changes.json \
 *     --records-dir path/to/records \
 *     --characters-dir path/to/characters/active
 *
 * 输入:
 *   state.json              当前世界状态
 *   turn-settlement.json     S1 输出的结算摘要
 *   chronicle-text.txt       AI 写的小说化正文
 *   characters-changes.json  AI 输出的人物变化
 *
 * 输出:
 *   records/ledger/turn-NNN.md      结构化账本
 *   records/chronicle/turn-NNN.md   小说化叙事
 *   characters/active/*.md          更新后的活跃人物卡
 *
 * 依赖: Node.js 14+，无外部依赖
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname, join, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================================
// CLI 参数解析
// ============================================================

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      opts[key] = args[i + 1] || '';
      i++;
    }
  }

  if (!opts.state) {
    console.error('[ERROR] 必须指定 --state 参数');
    process.exit(1);
  }
  if (!opts.settlement) {
    console.error('[ERROR] 必须指定 --settlement 参数');
    process.exit(1);
  }

  return opts;
}

// ============================================================
// 数据加载
// ============================================================

function loadJSON(filePath) {
  if (!filePath) return null;
  const abs = resolve(filePath);
  if (!existsSync(abs)) return null;
  return JSON.parse(readFileSync(abs, 'utf-8'));
}

function loadText(filePath) {
  if (!filePath) return '';
  const abs = resolve(filePath);
  if (!existsSync(abs)) return '';
  return readFileSync(abs, 'utf-8');
}

function ensureDir(dirPath) {
  const abs = resolve(dirPath);
  if (!existsSync(abs)) {
    mkdirSync(abs, { recursive: true });
  }
}

// ============================================================
// Ledger 模板生成（结构化账本）
// ============================================================

function generateLedger(state, settlement, chronicleText) {
  const turn = settlement.turn;
  const date = settlement.date;
  const weather = settlement.weather;
  const turnNum = String(turn).padStart(3, '0');

  // 从 state 提取领域状态
  const domains = state.world?.domains || {};
  const politics = domains.politics || {};
  const finance = domains.finance || {};
  const military = domains.military || {};
  const public_ = domains.public || {};

  const triggeredEvents = (settlement.triggered_events || [])
    .map(e => `- ${e.name}: ${e.reason}`)
    .join('\n');

  const characters = (settlement.characters_involved || [])
    .map(c => `- ${c.name}: ${c.reason}`)
    .join('\n');

  const changes = formatDomainChanges(settlement.domain_changes || {});

  const chronicleSection = chronicleText
    ? chronicleText.trim()
    : '[待 AI 生成]';

  // 生成 Markdown
  const lines = [
    `# 回合 ${turn}`,
    '',
    `## 结构化账本`,
    '',
    `- **日期**: ${date}`,
    `- **天气**: ${weather.current}${weather.anomaly ? ' | 异常: ' + weather.anomaly : ''}`,
    `- **气候压力**: ${weather.climate_pressure}/100`,
    `- **参与角色**:`,
    characters || '  （本回合无关键角色）',
    '',
    `### 触发事件`,
    '',
    triggeredEvents || '（本回合无新触发事件）',
    '',
    `### 状态变更`,
    '',
    `| 领域 | 指标 | 变更前 | 变更后 | 原因 |`,
    `|------|------|--------|--------|------|`,
    ...changes,
    '',
    `### 指标快照`,
    '',
    formatSnapshot(politics, finance, military, public_),
    '',
    `## 小说化正文`,
    '',
    chronicleSection,
    '',
    `### 仍未查明`,
    '',
    `[待 AI 填充]`,
    '',
    `### 史实与推演标记`,
    '',
    `- 史实锚点: [待标注]`,
    `- 合理推演: [待标注]`,
    `- 用户设定影响: [待标注]`,
    `- 本回合新增演化结果: [待标注]`,
    '',
  ];

  return lines.join('\n');
}

function formatDomainChanges(domainChanges) {
  const rows = [];

  for (const [path, change] of Object.entries(domainChanges)) {
    if (change.from !== undefined && change.to !== undefined) {
      // 提取领域和指标名
      const parts = path.split('.');
      const domain = parts[2] || '';
      const field = parts[3] || '';
      const domainLabel = {
        politics: '政治', finance: '财政', military: '军事', public: '民情',
      }[domain] || domain;
      const delta = change.to - change.from;
      const sign = delta > 0 ? '+' : '';
      rows.push(`| ${domainLabel} | ${field} | ${change.from} | ${change.to} (${sign}${delta}) | ${change.reason || ''} |`);
    } else if (change.event) {
      // 事件效果提示
      rows.push(`| 事件 | ${change.event} | - | - | ${change.outcome} |`);
    }
  }

  return rows;
}

function formatSnapshot(politics, finance, military, public_) {
  const lines = [];

  const formatSection = (label, fields) => {
    const entries = Object.entries(fields)
      .filter(([_, v]) => typeof v === 'object' && v.value !== undefined)
      .map(([key, v]) => `  - ${v.label || key}: ${v.value}/${v.max || 100}`)
      .join('\n');
    if (entries) lines.push(`**${label}**:\n${entries}`);
  };

  formatSection('政治', politics);
  formatSection('财政', finance);
  formatSection('军事', military);
  formatSection('民情', public_);

  return lines.join('\n\n');
}

// ============================================================
// Chronicle 模板生成（小说化叙事）
// ============================================================

function generateChronicle(state, settlement, chronicleText) {
  const turn = settlement.turn;
  const date = settlement.date;

  const lines = [
    `# 第 ${turn} 回合 -- ${date}`,
    '',
    chronicleText || '[待 AI 生成小说化正文]',
    '',
    `---`,
    '',
    `*本回合天气: ${settlement.weather.current}${settlement.weather.anomaly ? '（' + settlement.weather.anomaly + '）' : ''}*`,
    `*气候压力: ${settlement.weather.climate_pressure}/100*`,
    '',
  ];

  return lines.join('\n');
}

// ============================================================
// 人物卡更新
// ============================================================

function updateCharacterCards(charactersDir, characterChanges) {
  if (!characterChanges || !Array.isArray(characterChanges)) {
    console.log('[INFO] 无人物卡变更');
    return;
  }

  if (!charactersDir || !existsSync(resolve(charactersDir))) {
    console.log('[INFO] 人物卡目录不存在，跳过更新');
    return;
  }

  let updated = 0;

  for (const change of characterChanges) {
    const name = change.name;
    if (!name) continue;

    // 查找对应的人物卡文件
    const fileName = name.replace(/\s+/g, '-') + '.md';
    const filePath = resolve(join(charactersDir, fileName));

    if (!existsSync(filePath)) {
      console.log(`[INFO] 人物卡不存在，跳过: ${name} (${fileName})`);
      continue;
    }

    let content = readFileSync(filePath, 'utf-8');

    // 更新 stance
    if (change.stance) {
      content = updateField(content, '当前立场', change.stance);
    }

    // 更新 attitude
    if (change.attitude) {
      content = updateField(content, '对主角态度', change.attitude);
    }

    // 更新 recent_action_hint
    if (change.recent_action_hint) {
      content = updateField(content, '近期可能动作', change.recent_action_hint);
    }

    // 追加事件记录
    if (change.event_note) {
      content = appendEventNote(content, change.event_note);
    }

    writeFileSync(filePath, content, 'utf-8');
    updated++;
    console.log(`  [更新] ${name}: ${Object.keys(change).filter(k => k !== 'name').join(', ')}`);
  }

  console.log(`[INFO] 更新了 ${updated} 个人物卡`);
}

function updateField(content, fieldLabel, newValue) {
  // 查找并更新 Markdown 中的字段
  // 匹配模式: "- **字段标签**: 旧值" 或 "| 字段 | 旧值 |"
  const dashPattern = new RegExp(`(- \\*\\*${escapeRegex(fieldLabel)}\\*\\*: )(.+)`, 'g');
  if (dashPattern.test(content)) {
    return content.replace(dashPattern, `$1${newValue}`);
  }

  const pipePattern = new RegExp(`(\\| ${escapeRegex(fieldLabel)} \\| )(.+?)( \\|)`, 'g');
  if (pipePattern.test(content)) {
    return content.replace(pipePattern, `$1${newValue}$3`);
  }

  return content;
}

function appendEventNote(content, note) {
  // 在文件末尾追加事件记录
  const timestamp = new Date().toISOString().split('T')[0];
  const noteBlock = `\n### 回合事件记录 (${timestamp})\n\n${note}\n`;
  return content + noteBlock;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================
// 主流程
// ============================================================

function main() {
  const opts = parseArgs();

  console.log('[INFO] 记录写入器启动');

  // 加载数据
  const state = loadJSON(opts.state);
  const settlement = loadJSON(opts.settlement);
  const chronicleText = loadText(opts.chronicle);
  const characterChanges = loadJSON(opts.characterChanges);

  if (!state) {
    console.error('[ERROR] 无法加载 state.json');
    process.exit(1);
  }
  if (!settlement) {
    console.error('[ERROR] 无法加载 turn-settlement.json');
    process.exit(1);
  }

  const stateDir = dirname(resolve(opts.state));
  const recordsDir = opts.recordsDir || join(stateDir, 'records');
  const charactersDir = opts.charactersDir || join(stateDir, 'characters', 'active');

  const turnNum = String(settlement.turn).padStart(3, '0');

  // 确保目录存在
  const ledgerDir = join(recordsDir, 'ledger');
  const chronicleDir = join(recordsDir, 'chronicle');
  ensureDir(ledgerDir);
  ensureDir(chronicleDir);

  // 步骤 11: 生成并写入记录
  console.log('[INFO] 步骤 11: 记录写入');

  // 11a: 写入 ledger
  const ledgerContent = generateLedger(state, settlement, chronicleText);
  const ledgerPath = join(ledgerDir, `turn-${turnNum}.md`);
  writeFileSync(resolve(ledgerPath), ledgerContent, 'utf-8');
  console.log(`  [Ledger] ${resolve(ledgerPath)}`);

  // 11b: 写入 chronicle
  const chronicleContent = generateChronicle(state, settlement, chronicleText);
  const chroniclePath = join(chronicleDir, `turn-${turnNum}.md`);
  writeFileSync(resolve(chroniclePath), chronicleContent, 'utf-8');
  console.log(`  [Chronicle] ${resolve(chroniclePath)}`);

  // 步骤 12: 人物卡变更写回
  console.log('[INFO] 步骤 12: 人物卡变更写回');
  if (characterChanges && Array.isArray(characterChanges)) {
    updateCharacterCards(charactersDir, characterChanges);
  } else {
    console.log('  无人物卡变更');
  }

  console.log('\n========== 记录写入完成 ==========');
  console.log(`回合: ${settlement.turn}`);
  console.log(`日期: ${settlement.date}`);
  console.log(`Ledger: ${resolve(ledgerPath)}`);
  console.log(`Chronicle: ${resolve(chroniclePath)}`);
  console.log('==================================\n');
}

main();
