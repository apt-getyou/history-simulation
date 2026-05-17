/**
 * 历史模拟器 -- 回合结算引擎 (turn-engine.mjs)
 *
 * 覆盖回合流程步骤: 1(日期推进) / 2(天气结算) / 3(事件扫描) / 4(人物清单)
 *                  9(状态更新) / 13(覆写state) / 14(完结条件)
 *
 * 用法:
 *   node turn-engine.mjs --state path/to/state.json --events path/to/event-triggers.json --protocol path/to/08-session-protocol.md
 *   node turn-engine.mjs --state path/to/state.json --events path/to/event-triggers.json
 *
 * 输入:
 *   state.json         当前世界状态
 *   event-triggers.json 事件触发条件（JSON，由生成器从 YAML 转换）
 *   08-session-protocol.md (可选) 月度基线表（解析 Markdown 表格）
 *
 * 输出:
 *   state.json            更新后的世界状态（覆写）
 *   turn-settlement.json   本回合结算摘要（供 AI 消费）
 *
 * 依赖: Node.js 14+，无外部依赖
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

// ============================================================
// 常量
// ============================================================

const __dirname = dirname(fileURLToPath(import.meta.url));

const SEASONS = {
  // 月份数字 (1-12) → 季节
  1: '冬', 2: '冬',
  3: '春', 4: '春', 5: '春',
  6: '夏', 7: '夏', 8: '夏',
  9: '秋', 10: '秋', 11: '秋',
  12: '冬',
};

// 季节天气表 — 基础天气与异常概率
const SEASON_WEATHER = {
  '冬': {
    base: ['严寒', '大雪', '寒风'],
    anomaly_types: ['极端严寒', '暴风雪'],
    anomaly_base_prob: 0.25,
  },
  '春': {
    base: ['春旱', '风沙', '微雨'],
    anomaly_types: ['春旱', '沙尘暴', '倒春寒'],
    anomaly_base_prob: 0.20,
  },
  '夏': {
    base: ['干旱', '暴雨', '闷热'],
    anomaly_types: ['大旱', '洪涝', '蝗灾'],
    anomaly_base_prob: 0.30,
  },
  '秋': {
    base: ['秋旱', '秋霖', '凉爽'],
    anomaly_types: ['秋蝗', '早寒', '连阴雨'],
    anomaly_base_prob: 0.20,
  },
};

// ============================================================
// CLI 参数解析
// ============================================================

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      opts[key] = args[i + 1] || '';
      i++;
    }
  }

  if (!opts.state) {
    console.error('[ERROR] 必须指定 --state 参数（state.json 路径）');
    process.exit(1);
  }
  if (!opts.events) {
    console.error('[ERROR] 必须指定 --events 参数（event-triggers.json 路径）');
    process.exit(1);
  }

  return opts;
}

// ============================================================
// 数据加载
// ============================================================

function loadJSON(filePath) {
  const abs = resolve(filePath);
  if (!existsSync(abs)) {
    console.error(`[ERROR] 文件不存在: ${abs}`);
    process.exit(1);
  }
  try {
    return JSON.parse(readFileSync(abs, 'utf-8'));
  } catch (e) {
    console.error(`[ERROR] JSON 解析失败: ${abs}`);
    console.error(e.message);
    process.exit(1);
  }
}

function saveJSON(filePath, data) {
  writeFileSync(resolve(filePath), JSON.stringify(data, null, 2), 'utf-8');
}

// ============================================================
// 步骤 1: 日期推进
// ============================================================

function advanceDate(state) {
  const meta = state.meta;
  const dateStr = meta.current_date;

  // 解析中文日期: "崇祯十六年正月" 或 "崇祯十六年一月"
  const dateMatch = dateStr.match(/^(.+?)([十百零\d一二三四五六七八九]+)年(.+月)$/);
  if (!dateMatch) {
    console.error(`[WARNING] 无法解析日期格式: ${dateStr}, 尝试数字格式`);
    return advanceDateNumeric(state);
  }

  const [, eraPrefix, yearStr, monthStr] = dateMatch;
  const year = chineseToNumber(yearStr);
  const month = chineseMonthToNumber(monthStr);

  if (year === null || month === null) {
    console.error(`[ERROR] 日期解析失败: ${dateStr}`);
    return { year, month: month || 1, advanced: false };
  }

  let newMonth = month + 1;
  let newYear = year;
  let newEraPrefix = eraPrefix;

  if (newMonth > 12) {
    newMonth = 1;
    newYear = year + 1;
  }

  const season = SEASONS[newMonth];
  meta.current_date = `${newEraPrefix}${numberToChinese(newYear)}年${numberToChineseMonth(newMonth)}`;
  meta.season = season;
  meta.current_turn = (meta.current_turn || 0) + 1;
  meta.last_updated = new Date().toISOString();

  return { year: newYear, month: newMonth, season, advanced: true };
}

function advanceDateNumeric(state) {
  // 备用: 纯数字格式 "1643-05"
  const parts = state.meta.current_date.split('-');
  let year = parseInt(parts[0]);
  let month = parseInt(parts[1]) || 1;

  month++;
  if (month > 12) {
    month = 1;
    year++;
  }

  state.meta.current_date = `${year}-${String(month).padStart(2, '0')}`;
  state.meta.season = SEASONS[month];
  state.meta.current_turn = (state.meta.current_turn || 0) + 1;
  state.meta.last_updated = new Date().toISOString();

  return { year, month, season: SEASONS[month], advanced: true };
}

// 中文数字转换
function chineseToNumber(str) {
  const map = { '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
                '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
                '百': 100, '千': 1000 };

  // 纯数字
  if (/^\d+$/.test(str)) return parseInt(str);

  // 简单处理: 十X, X十X, X百X十X
  let result = 0;
  let current = 0;

  for (const ch of str) {
    if (map[ch] === undefined) return null;
    const val = map[ch];

    if (val >= 10) {
      if (current === 0) current = 1;
      result += current * val;
      current = 0;
    } else {
      current = val;
    }
  }
  result += current;
  return result;
}

function numberToChinese(n) {
  const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  if (n <= 0) return '零';
  if (n < 10) return digits[n];
  if (n === 10) return '十';
  if (n < 20) return '十' + digits[n - 10];
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return digits[tens] + '十' + (ones ? digits[ones] : '');
  }
  if (n < 1000) {
    const hundreds = Math.floor(n / 100);
    const rest = n % 100;
    let result = digits[hundreds] + '百';
    if (rest === 0) return result;
    if (rest < 10) return result + '零' + digits[rest];
    return result + numberToChinese(rest);
  }
  return String(n); // 超大数字直接用阿拉伯数字
}

function chineseMonthToNumber(monthStr) {
  const monthMap = {
    '正月': 1, '一月': 1, '一月': 1,
    '二月': 2, '三月': 3, '四月': 4,
    '五月': 5, '六月': 6, '七月': 7,
    '八月': 8, '九月': 9, '十月': 10,
    '十一月': 11, '冬月': 11,
    '十二月': 12, '腊月': 12,
  };
  // 先精确匹配
  if (monthMap[monthStr]) return monthMap[monthStr];
  // 尝试提取中文数字
  const m = monthStr.match(/([十百零\d一二三四五六七八九]+)月/);
  if (m) return chineseToNumber(m[1]);
  return null;
}

function numberToChineseMonth(n) {
  const names = ['', '正月', '二月', '三月', '四月', '五月', '六月',
                 '七月', '八月', '九月', '十月', '十一月', '十二月'];
  return names[n] || `${n}月`;
}

// ============================================================
// 步骤 2: 天气结算
// ============================================================

function settleWeather(state, monthInfo) {
  const season = monthInfo.season;
  const weatherTable = SEASON_WEATHER[season];
  if (!weatherTable) {
    console.error(`[WARNING] 未知季节: ${season}`);
    return;
  }

  // 气候压力修正
  const climatePressure = state.world?.weather?.climate_pressure?.value || 50;

  // 基础天气: 从季节表中随机选取
  const baseIdx = Math.floor(Math.random() * weatherTable.base.length);
  const baseWeather = weatherTable.base[baseIdx];

  // 异常天气判定
  const anomalyProb = weatherTable.anomaly_base_prob + (climatePressure / 100) * 0.3;
  const roll = Math.random();
  let anomaly = '无';

  if (roll < anomalyProb && weatherTable.anomaly_types.length > 0) {
    const anomIdx = Math.floor(Math.random() * weatherTable.anomaly_types.length);
    anomaly = weatherTable.anomaly_types[anomIdx];
  }

  // 写回 state
  state.world.weather.current = anomaly !== '无' ? anomaly : baseWeather;
  state.world.weather.anomaly = anomaly !== '无' ? anomaly : '';

  // 气候压力自然波动
  const pressureDelta = Math.floor(Math.random() * 10) - 4; // -4 to +5
  const oldPressure = state.world.weather.climate_pressure.value;
  state.world.weather.climate_pressure.value = Math.max(0, Math.min(100, oldPressure + pressureDelta));

  return {
    current: state.world.weather.current,
    anomaly: state.world.weather.anomaly,
    climate_pressure: state.world.weather.climate_pressure.value,
    roll_value: roll.toFixed(3),
    anomaly_threshold: anomalyProb.toFixed(3),
  };
}

// ============================================================
// 步骤 3: 事件扫描
// ============================================================

function scanEvents(state, eventTriggers) {
  const triggered = [];
  const currentDate = state.meta.current_date;
  const turn = state.meta.current_turn;

  // 已触发事件 ID 集合（从 state 中提取）
  const alreadyTriggered = new Set(
    (state.world?.active_events || []).map(e => e.id || e.name)
  );

  const events = eventTriggers.events || eventTriggers;

  for (const evt of events) {
    // 跳过已触发的
    if (alreadyTriggered.has(evt.event_id)) continue;

    // 检查触发条件
    const result = evaluateEventConditions(evt, state, currentDate);

    if (result.triggered) {
      triggered.push({
        id: evt.event_id,
        name: evt.event_name || evt.name,
        reason: result.reason,
        type: evt.event_type,
        cascade: evt.cascade_events?.triggered || [],
        outcome: evt.outcome_if_triggered || [],
        character_refs: evt.character_refs || evt.key_characters || [],
      });
    }
  }

  return triggered;
}

function evaluateEventConditions(evt, state, currentDate) {
  const conditions = evt.trigger_conditions;
  if (!conditions) {
    // 无条件事件 — 可能是固定时间事件
    return { triggered: false, reason: '无触发条件' };
  }

  // 处理 all_of 条件（全部满足）
  if (conditions.all_of && Array.isArray(conditions.all_of)) {
    const results = conditions.all_of.map(cond => evaluateSingleCondition(cond, state, currentDate));
    const allPass = results.every(r => r.pass);

    if (allPass) {
      // 检查 any_of（如果有，只需满足一个）
      if (conditions.any_of && Array.isArray(conditions.any_of)) {
        const anyResults = conditions.any_of.map(cond => evaluateSingleCondition(cond, state, currentDate));
        const anyPass = anyResults.some(r => r.pass);
        if (!anyPass) {
          return {
            triggered: false,
            reason: `all_of 全部满足但 any_of 均不满足`,
          };
        }
      }
      return {
        triggered: true,
        reason: results.map(r => r.detail).join('; '),
      };
    }
    return {
      triggered: false,
      reason: results.filter(r => !r.pass).map(r => r.detail).join('; '),
    };
  }

  // 简单条件列表（数组）
  if (Array.isArray(conditions)) {
    const results = conditions.map(cond => evaluateSingleCondition(cond, state, currentDate));
    const allPass = results.every(r => r.pass);
    return {
      triggered: allPass,
      reason: allPass
        ? results.map(r => r.detail).join('; ')
        : results.filter(r => !r.pass).map(r => r.detail).join('; '),
    };
  }

  return { triggered: false, reason: '条件格式不识别' };
}

function evaluateSingleCondition(condStr, state, currentDate) {
  // 解析条件字符串，支持以下格式:
  // "current_date >= 1643-05-01"
  // "event_type == hard_anchor"
  // "EVT-CZ-004 == triggered"
  // "tax_pressure > 90"
  // "climate_pressure >= 80"

  const str = String(condStr).trim();

  // 日期比较
  const dateMatch = str.match(/^current_date\s*(>=|<=|>|<|==)\s*"?(\d{4}-\d{2}(?:-\d{2})?)"?$/);
  if (dateMatch) {
    const op = dateMatch[1];
    const target = dateMatch[2].substring(0, 7); // 确保 YYYY-MM 格式
    const current = normalizeDate(currentDate);
    const pass = compareDates(current, op, target);
    return { pass, detail: `日期条件: ${current} ${op} ${target} -> ${pass ? '通过' : '不通过'}` };
  }

  // 事件状态检查
  const eventMatch = str.match(/^(EVT-[A-Z]+-\d+)\s*==\s*(\w+)$/);
  if (eventMatch) {
    const evtId = eventMatch[1];
    const expected = eventMatch[2];
    const activeEvents = state.world?.active_events || [];
    const found = activeEvents.find(e => e.id === evtId);
    const pass = found ? (found.status === expected) : (expected === 'not_triggered');
    return { pass, detail: `事件状态: ${evtId} ${pass ? '满足' : '不满足'}` };
  }

  // state.json 字段路径比较
  const stateMatch = str.match(/^([\w.]+)\s*(>=|<=|>|<|==|!=)\s*(\d+|"[^"]*"|'[^']*')$/);
  if (stateMatch) {
    const path = stateMatch[1];
    const op = stateMatch[2];
    const targetVal = stateMatch[3].replace(/^["']|["']$/g, '');
    const actualVal = getNestedValue(state, path);
    return {
      pass: compareValues(actualVal, op, targetVal),
      detail: `状态条件: ${path}=${actualVal} ${op} ${targetVal}`,
    };
  }

  // 事件类型检查
  if (str.includes('event_type')) {
    return { pass: true, detail: `类型条件自动通过: ${str}` };
  }

  // 布尔标志检查
  const boolMatch = str.match(/^([\w_]+)\s*==\s*(true|false)$/);
  if (boolMatch) {
    const path = boolMatch[1];
    const expected = boolMatch[2] === 'true';
    const actual = getNestedValue(state, path);
    return { pass: actual === expected, detail: `布尔条件: ${path}=${actual}` };
  }

  // 无法解析的条件 — 默认不满足
  return { pass: false, detail: `无法解析条件: ${str}` };
}

function normalizeDate(dateStr) {
  // 将各种日期格式转为可比较的 "YYYY-MM" 格式
  if (!dateStr) return '0000-00';

  // 纯数字格式: "1643-05" 或 "1643-05-01"
  const numMatch = dateStr.match(/^(\d{4})-(\d{2})/);
  if (numMatch) return `${numMatch[1]}-${numMatch[2]}`;

  // 中文朝代日期: "崇祯十六年五月" / "崇祯十六年正月"
  const cnMatch = dateStr.match(/^(.+?)([十百零\d一二三四五六七八九]+)年(.+月)$/);
  if (cnMatch) {
    const year = chineseToNumber(cnMatch[2]);
    const month = chineseMonthToNumber(cnMatch[3]);
    if (year !== null && month !== null) {
      // 需要映射朝代年到公历年
      // 使用 meta 中的起始信息或尝试推算
      // 简化处理: 从 state.meta 中获取朝代年号偏移
      return yearToGregorian(cnMatch[1], year, month);
    }
  }

  // 退回原始字符串
  return dateStr;
}

// 朝代年号到公历年映射表
// baseYear = 该年号元年对应的公历年
const ERA_MAP = {
  '崇祯': 1628,  // 崇祯元年 = 1628
  '万历': 1573,
  '天启': 1621,
  '弘光': 1645,
  '隆武': 1645,
  '永历': 1647,
  '顺治': 1644,
  '康熙': 1662,
};

function yearToGregorian(eraPrefix, eraYear, month) {
  // 从年号前缀中提取年号
  for (const [era, baseYear] of Object.entries(ERA_MAP)) {
    if (eraPrefix.includes(era)) {
      const gregYear = baseYear + eraYear - 1;
      return `${gregYear}-${String(month).padStart(2, '0')}`;
    }
  }
  // 无匹配年号，返回纯年月
  return `${eraYear}-${String(month).padStart(2, '0')}`;
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((o, key) => {
    if (o === null || o === undefined) return undefined;
    // 支持数组索引
    if (/\[\d+\]/.test(key)) {
      const parts = key.split(/[\[\]]/).filter(Boolean);
      return parts.reduce((inner, k) => inner?.[isNaN(k) ? k : parseInt(k)], o);
    }
    return o[key];
  }, obj);
}

function compareValues(actual, op, expected) {
  const a = isNaN(actual) ? String(actual) : Number(actual);
  const e = isNaN(expected) ? String(expected) : Number(expected);

  switch (op) {
    case '>=': return a >= e;
    case '<=': return a <= e;
    case '>':  return a > e;
    case '<':  return a < e;
    case '==': return a == e;
    case '!=': return a != e;
    default: return false;
  }
}

/**
 * 比较两个 "YYYY-MM" 格式的日期
 */
function compareDates(current, op, target) {
  // 解析 YYYY-MM
  const parseDate = (s) => {
    const m = s.match(/^(\d{4})-(\d{2})$/);
    if (!m) return null;
    return parseInt(m[1]) * 12 + parseInt(m[2]);
  };

  const a = parseDate(current);
  const b = parseDate(target);

  if (a === null || b === null) {
    // 无法解析时做字符串比较
    return compareValues(current, op, target);
  }

  return compareValues(a, op, b);
}

// ============================================================
// 步骤 4: 人物清单
// ============================================================

function extractCharacters(triggeredEvents) {
  const characters = [];

  for (const evt of triggeredEvents) {
    const refs = evt.character_refs || [];
    for (const ref of refs) {
      if (!characters.find(c => c.name === (ref.name || ref))) {
        characters.push({
          name: ref.name || ref,
          reason: `${evt.name}事件`,
        });
      }
    }
  }

  return characters;
}

// ============================================================
// 步骤 9: 状态更新（月度基线 + 事件效果）
// ============================================================

function applyStateChanges(state, weatherResult, triggeredEvents, monthBaseline) {
  const changes = {};

  // 1. 月度基线消耗（从 session-protocol 解析或使用默认值）
  const baseline = monthBaseline || getDefaultBaseline();

  for (const [path, delta] of Object.entries(baseline)) {
    const oldValue = getNestedValue(state, path);
    if (typeof oldValue === 'object' && oldValue.value !== undefined) {
      const prev = oldValue.value;
      const newVal = Math.max(0, Math.min(oldValue.max || 100, prev + delta));
      oldValue.value = newVal;
      if (prev !== newVal) {
        changes[path] = { from: prev, to: newVal, reason: `月度基线${delta > 0 ? '+' : ''}${delta}` };
      }
    } else if (typeof oldValue === 'number') {
      const newVal = oldValue + delta;
      setNestedValue(state, path, newVal);
      changes[path] = { from: oldValue, to: newVal, reason: `月度基线${delta > 0 ? '+' : ''}${delta}` };
    }
  }

  // 2. 天气影响
  if (weatherResult.anomaly && weatherResult.anomaly !== '无') {
    const weatherEffects = getWeatherEffects(weatherResult.current);
    for (const [path, delta] of Object.entries(weatherEffects)) {
      const oldValue = getNestedValue(state, path);
      if (typeof oldValue === 'object' && oldValue.value !== undefined) {
        const prev = oldValue.value;
        const newVal = Math.max(0, Math.min(oldValue.max || 100, prev + delta));
        oldValue.value = newVal;
        changes[path] = changes[path] || {};
        if (!changes[path].weather) {
          changes[path] = { ...changes[path], from: changes[path].from || prev, to: newVal, reason: `天气(${weatherResult.current})${delta > 0 ? '+' : ''}${delta}` };
        }
      }
    }
  }

  // 3. 事件效果
  for (const evt of triggeredEvents) {
    if (evt.outcome && evt.outcome.length > 0) {
      // 事件效果由 AI 消费 turn-settlement.json 后精确应用
      // 这里只记录建议的状态变更方向
      for (const outcome of evt.outcome) {
        // 标记为事件效果提示，供 AI 决策
        if (!changes[`event:${evt.id}`]) {
          changes[`event:${evt.id}`] = {
            outcome: outcome,
            event: evt.name,
          };
        }
      }
    }
  }

  return changes;
}

function getDefaultBaseline() {
  // 默认月度基线消耗（典型王朝末期）
  return {
    'world.domains.finance.treasury_silver': -3,
    'world.domains.military.supplies': -2,
    'world.domains.public.refugees': 1,
  };
}

function getWeatherEffects(weather) {
  const effects = {};
  if (weather.includes('旱') || weather.includes('drought')) {
    effects['world.domains.finance.grain_reserves'] = -5;
    effects['world.domains.public.famine_level'] = 5;
  }
  if (weather.includes('蝗') || weather.includes('locust')) {
    effects['world.domains.finance.grain_reserves'] = -8;
    effects['world.domains.public.famine_level'] = 8;
  }
  if (weather.includes('严寒') || weather.includes('寒')) {
    effects['world.domains.military.supplies'] = -3;
    effects['world.domains.public.public_order'] = -2;
  }
  if (weather.includes('洪') || weather.includes('涝')) {
    effects['world.domains.finance.grain_reserves'] = -6;
    effects['world.domains.public.refugees'] = 3;
  }
  if (weather.includes('疫') || weather.includes('plague')) {
    effects['world.domains.military.troop_strength'] = -5;
    effects['world.domains.public.public_order'] = -3;
  }
  return effects;
}

function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (current[keys[i]] === undefined) current[keys[i]] = {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

// ============================================================
// 月度基线表解析（从 session-protocol.md）
// ============================================================

function parseMonthBaseline(protocolPath) {
  if (!protocolPath || !existsSync(resolve(protocolPath))) {
    return null;
  }

  try {
    const content = readFileSync(resolve(protocolPath), 'utf-8');
    const baseline = {};

    // 查找月度基线表
    // 格式: | 字段 | 月度变化 | ... |
    const tableRegex = /\|\s*([^|]+)\s*\|\s*([-+]?\d+)\s*\|/g;
    let match;

    while ((match = tableRegex.exec(content)) !== null) {
      const field = match[1].trim();
      const delta = parseInt(match[2].trim());
      if (field && !isNaN(delta) && field !== '字段' && field !== '---') {
        // 将字段名映射到 state.json 路径
        const statePath = mapFieldNameToPath(field);
        if (statePath) {
          baseline[statePath] = delta;
        }
      }
    }

    return Object.keys(baseline).length > 0 ? baseline : null;
  } catch (e) {
    console.error(`[WARNING] 解析月度基线表失败: ${e.message}`);
    return null;
  }
}

function mapFieldNameToPath(field) {
  const fieldMap = {
    '库银': 'world.domains.finance.treasury_silver',
    '粮储': 'world.domains.finance.grain_reserves',
    '税赋压力': 'world.domains.finance.tax_pressure',
    '军费': 'world.domains.finance.military_funding_gap',
    '兵力': 'world.domains.military.troop_strength',
    '补给': 'world.domains.military.supplies',
    '士气': 'world.domains.military.morale',
    '治安': 'world.domains.public.public_order',
    '饥荒': 'world.domains.public.famine_level',
    '流民': 'world.domains.public.refugees',
    '舆情': 'world.domains.public.public_opinion',
    '朝局稳定度': 'world.domains.politics.court_stability',
    '派系张力': 'world.domains.politics.faction_tension',
    '地方服从度': 'world.domains.politics.local_compliance',
    '威望': 'protagonist.status.prestige',
    '健康': 'protagonist.status.health',
  };

  return fieldMap[field] || null;
}

// ============================================================
// 步骤 14: 完结条件检查
// ============================================================

function checkCompletion(state) {
  const warnings = [];

  // 检查完结条件 — 从 state 中提取或使用默认逻辑
  // 默认完结条件基于常见模式

  // 检查主角是否死亡
  const health = state.protagonist?.status?.health?.value;
  if (health !== undefined && health <= 0) {
    return {
      any_triggered: true,
      type: 'protagonist_death',
      message: '主角健康值归零',
      warnings: [],
    };
  }

  // 检查崩溃阈值指标
  const domains = state.world?.domains;
  if (domains) {
    checkThreshold(domains.finance?.treasury_silver, '库银', 5, true, warnings);
    checkThreshold(domains.public?.famine_level, '饥荒', 90, false, warnings);
    checkThreshold(domains.public?.public_order, '治安', 5, true, warnings);
    checkThreshold(domains.military?.troop_strength, '兵力', 10, true, warnings);
    checkThreshold(domains.politics?.court_stability, '朝局稳定度', 10, true, warnings);
  }

  // 检查是否有完结标记
  const activeEvents = state.world?.active_events || [];
  const terminalEvents = activeEvents.filter(e =>
    e.name?.includes('城破') || e.name?.includes('自缢') || e.name?.includes('亡')
  );

  if (terminalEvents.length > 0) {
    return {
      any_triggered: true,
      type: 'terminal_event',
      message: terminalEvents.map(e => e.name).join(', '),
      warnings,
    };
  }

  return {
    any_triggered: false,
    type: null,
    message: null,
    warnings,
  };
}

function checkThreshold(field, label, threshold, isLower, warnings) {
  if (field?.value === undefined) return;
  const val = field.value;
  const max = field.max || 100;
  const pct = Math.round((val / max) * 100);

  if (isLower && pct <= threshold) {
    warnings.push(`${label} ${val}/${max} (${pct}%) 接近崩溃阈值`);
  } else if (!isLower && pct >= threshold) {
    warnings.push(`${label} ${val}/${max} (${pct}%) 接近危险阈值`);
  }
}

// ============================================================
// turn-log 追加
// ============================================================

function appendTurnLog(state, settlement) {
  if (!state.turn_log) state.turn_log = [];

  state.turn_log.push({
    turn: settlement.turn,
    date: settlement.date,
    location: state.protagonist?.location || '',
    weather: `${settlement.weather.current}${settlement.weather.anomaly ? '（异常:' + settlement.weather.anomaly + '）' : ''}`,
    protagonist_action: '', // 由 AI 填充
    result_summary: '',     // 由 AI 填充
    state_changes: settlement.domain_changes || {},
    new_knowledge: [],      // 由 AI 填充
  });

  // 保留最近 5 回合
  if (state.turn_log.length > 5) {
    state.turn_log = state.turn_log.slice(-5);
  }
}

// ============================================================
// 主流程
// ============================================================

function main() {
  const opts = parseArgs();

  console.log('[INFO] 回合结算引擎启动');

  // 加载数据
  const state = loadJSON(opts.state);
  const eventTriggers = loadJSON(opts.events);
  const monthBaseline = parseMonthBaseline(opts.protocol);

  if (monthBaseline) {
    console.log(`[INFO] 月度基线表已加载: ${Object.keys(monthBaseline).length} 个字段`);
  }

  // 步骤 1: 日期推进
  console.log('[INFO] 步骤 1: 日期推进');
  const monthInfo = advanceDate(state);
  if (!monthInfo.advanced) {
    console.error('[ERROR] 日期推进失败');
    process.exit(1);
  }
  console.log(`  日期: ${state.meta.current_date} | 季节: ${monthInfo.season} | 回合: ${state.meta.current_turn}`);

  // 步骤 2: 天气结算
  console.log('[INFO] 步骤 2: 天气结算');
  const weatherResult = settleWeather(state, monthInfo);
  console.log(`  天气: ${weatherResult.current} | 异常: ${weatherResult.anomaly} | 气候压力: ${weatherResult.climate_pressure}`);

  // 步骤 3: 事件扫描
  console.log('[INFO] 步骤 3: 事件扫描');
  const triggeredEvents = scanEvents(state, eventTriggers);
  console.log(`  触发事件: ${triggeredEvents.length} 个`);
  for (const evt of triggeredEvents) {
    console.log(`    - [${evt.id}] ${evt.name}: ${evt.reason}`);
  }

  // 步骤 4: 人物清单
  console.log('[INFO] 步骤 4: 人物清单');
  const charactersInvolved = extractCharacters(triggeredEvents);
  console.log(`  涉及人物: ${charactersInvolved.length} 个`);
  for (const ch of charactersInvolved) {
    console.log(`    - ${ch.name}: ${ch.reason}`);
  }

  // 步骤 9: 状态更新
  console.log('[INFO] 步骤 9: 状态更新');
  const domainChanges = applyStateChanges(state, weatherResult, triggeredEvents, monthBaseline);
  const significantChanges = Object.entries(domainChanges).filter(([k, v]) => v.from !== undefined && v.to !== undefined);
  console.log(`  状态变更: ${significantChanges.length} 项`);
  for (const [path, change] of significantChanges) {
    console.log(`    - ${path}: ${change.from} -> ${change.to} (${change.reason})`);
  }

  // 步骤 14: 完结条件检查
  console.log('[INFO] 步骤 14: 完结条件检查');
  const completionCheck = checkCompletion(state);
  if (completionCheck.any_triggered) {
    console.log(`  [WARNING] 完结条件触发: ${completionCheck.message}`);
  } else {
    console.log(`  无完结条件触发`);
  }
  for (const w of completionCheck.warnings) {
    console.log(`  [WARNING] ${w}`);
  }

  // 更新 active_events（将新触发事件加入）
  if (!state.world.active_events) state.world.active_events = [];
  for (const evt of triggeredEvents) {
    state.world.active_events.push({
      id: evt.id,
      name: evt.name,
      status: 'triggered',
      next_trigger: '',
    });
  }

  // 追加 turn_log
  const settlement = {
    turn: state.meta.current_turn,
    date: state.meta.current_date,
    season: monthInfo.season,
    weather: weatherResult,
    triggered_events: triggeredEvents.map(e => ({
      id: e.id,
      name: e.name,
      reason: e.reason,
    })),
    characters_involved: charactersInvolved,
    domain_changes: domainChanges,
    completion_check: completionCheck,
  };

  appendTurnLog(state, settlement);

  // 步骤 13: 覆写 state.json
  console.log('[INFO] 步骤 13: 覆写 state.json');
  saveJSON(opts.state, state);
  console.log(`  已更新: ${resolve(opts.state)}`);

  // 输出 turn-settlement.json
  const settlementPath = resolve(join(dirname(opts.state), 'turn-settlement.json'));
  saveJSON(settlementPath, settlement);
  console.log(`[INFO] 结算摘要: ${settlementPath}`);

  // 输出摘要
  console.log('\n========== 回合结算完成 ==========');
  console.log(`回合: ${settlement.turn}`);
  console.log(`日期: ${settlement.date}`);
  console.log(`天气: ${settlement.weather.current}${settlement.weather.anomaly ? ' (异常:' + settlement.weather.anomaly + ')' : ''}`);
  console.log(`触发事件: ${settlement.triggered_events.length}`);
  console.log(`涉及人物: ${settlement.characters_involved.length}`);
  console.log(`状态变更: ${significantChanges.length}`);
  console.log(`完结警告: ${completionCheck.warnings.length}`);
  console.log('==================================\n');

  console.log('[INFO] AI agent 接下来应执行步骤 5-8/10-12（人物加载/势力行动/幕后动作/主角行动/输出/记录写入）');
}

main();
