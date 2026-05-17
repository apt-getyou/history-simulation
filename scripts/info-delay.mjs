/**
 * 历史模拟器 -- 信息延迟计算 (info-delay.mjs)
 *
 * 覆盖回合流程步骤 7: 信息传播延迟计算
 *
 * 用法:
 *   node info-delay.mjs --settlement path/to/turn-settlement.json --state path/to/state.json
 *
 * 输入:
 *   turn-settlement.json  本回合触发的事件
 *   state.json            当前世界状态
 *
 * 输出:
 *   info-pipeline.json    信息传播管道状态
 *
 * 依赖: Node.js 14+，无外部依赖
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';

// ============================================================
// 常量: 基础延迟表
// ============================================================

const CHANNEL_DELAY = {
  '亲见': { turns: 0, reliability: 'confirmed' },
  '面奏': { turns: 0, reliability: 'confirmed' },
  '密报': { turns: 1, reliability: 'confirmed' },
  '军报': { turns: 1, reliability: 'confirmed' },
  '巡查': { turns: 1, reliability: 'high' },
  '查账': { turns: 1, reliability: 'high' },
  '审讯': { turns: 1, reliability: 'high' },
  '官员奏报': { turns: 1, reliability: 'high' },
  '商人情报': { turns: 2, reliability: 'medium' },
  '间谍回报': { turns: 2, reliability: 'high' },
  '流言': { turns: 3, reliability: 'low' },
  '事件爆发': { turns: 0, reliability: 'confirmed' },
};

const DEFAULT_CHANNEL = { turns: 2, reliability: 'medium' };

// 修正因子
const DISTANCE_THRESHOLD = 500; // 里
const MODIFIERS = {
  distance_far: 1,      // 距离 > 500 里
  war_zone: 2,          // 战乱区域
  high_prestige: -1,    // 主角威望高（最低延迟 0）
  faction_conceal: 3,   // 势力有意隐瞒
  winter: 1,            // 冬季
};

// ============================================================
// 主流程
// ============================================================

function loadJSON(filePath) {
  if (!filePath) return null;
  const abs = resolve(filePath);
  if (!existsSync(abs)) return null;
  return JSON.parse(readFileSync(abs, 'utf-8'));
}

function main() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      opts[args[i].slice(2)] = args[i + 1] || '';
      i++;
    }
  }

  const settlement = loadJSON(opts.settlement);
  const state = loadJSON(opts.state);

  if (!settlement) {
    console.error('[ERROR] 无法加载 turn-settlement.json');
    process.exit(1);
  }

  const currentTurn = settlement.turn || 0;
  const protagonistPrestige = state?.protagonist?.status?.prestige?.value || 50;
  const currentSeason = state?.meta?.season || '';

  // 计算每个事件的信息到达
  const arrivingThisTurn = [];
  const inTransit = [];

  const events = settlement.triggered_events || [];

  for (const evt of events) {
    // 确定传播渠道
    const channel = determineChannel(evt);
    const channelInfo = CHANNEL_DELAY[channel] || DEFAULT_CHANNEL;

    let delay = channelInfo.turns;

    // 应用修正因子
    if (protagonistPrestige >= 70) {
      delay = Math.max(0, delay + MODIFIERS.high_prestige);
    }
    if (currentSeason === '冬') {
      delay += MODIFIERS.winter;
    }

    const reliability = calculateReliability(channelInfo.reliability, delay);

    if (delay === 0) {
      arrivingThisTurn.push({
        event: evt.name,
        event_id: evt.id,
        source: channel,
        reliability: reliability,
        detail: evt.reason,
      });
    } else {
      inTransit.push({
        event: evt.name,
        event_id: evt.id,
        source: channel,
        eta_turn: currentTurn + delay,
        reliability: reliability,
      });
    }
  }

  // 读取之前在途的信息，检查是否有本回合到达的
  const pipelinePath = opts.pipeline
    ? resolve(opts.pipeline)
    : resolve(join(dirname(opts.state || '.'), 'info-pipeline.json'));

  const prevPipeline = loadJSON(pipelinePath);
  if (prevPipeline?.in_transit) {
    for (const item of prevPipeline.in_transit) {
      if (item.eta_turn <= currentTurn) {
        arrivingThisTurn.push({
          event: item.event,
          event_id: item.event_id,
          source: item.source,
          reliability: item.reliability,
          detail: '延迟到达',
        });
      } else {
        inTransit.push(item);
      }
    }
  }

  const nextTurnHint = inTransit.length > 0
    ? `下回合预计有 ${inTransit.filter(i => i.eta_turn === currentTurn + 1).length} 条情报到达`
    : '无待到达情报';

  const result = {
    turn: currentTurn,
    arriving_this_turn: arrivingThisTurn,
    in_transit: inTransit,
    next_turn_hint: nextTurnHint,
    calculated_at: new Date().toISOString(),
  };

  // 输出
  const outPath = resolve(join(dirname(opts.state || '.'), 'info-pipeline.json'));
  writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf-8');

  console.log(`[INFO] 信息传播延迟计算完成`);
  console.log(`  本回合到达: ${arrivingThisTurn.length} 条`);
  console.log(`  在途: ${inTransit.length} 条`);
  console.log(`  提示: ${nextTurnHint}`);
  console.log(`  输出: ${outPath}`);
}

function determineChannel(evt) {
  // 根据事件类型推断传播渠道
  const name = evt.name || '';
  const type = evt.type || '';

  if (name.includes('城破') || name.includes('自缢')) return '事件爆发';
  if (name.includes('攻占') || name.includes('之战')) return '军报';
  if (name.includes('赐死') || name.includes('罢免')) return '面奏';
  if (name.includes('旱') || name.includes('蝗') || name.includes('疫')) return '官员奏报';
  if (name.includes('撤军') || name.includes('入塞')) return '军报';
  if (name.includes('建政') || name.includes('建国')) return '流言';

  return '流言';
}

function calculateReliability(baseReliability, delay) {
  if (delay <= 1) return baseReliability;
  if (delay === 2) return baseReliability === 'confirmed' ? 'high' : baseReliability;
  if (delay === 3) return baseReliability === 'confirmed' ? 'medium' : 'low';
  return 'low';
}

main();
