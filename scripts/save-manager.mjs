/**
 * 历史模拟器 -- 存档管理器 (save-manager.mjs)
 *
 * 提供存档/读档/回档的文件操作。
 *
 * 用法:
 *   node save-manager.mjs --sim-dir . --auto --turn 5
 *   node save-manager.mjs --sim-dir . --save --name "御驾亲征前"
 *   node save-manager.mjs --sim-dir . --list
 *   node save-manager.mjs --sim-dir . --rollback --turn 3
 *   node save-manager.mjs --sim-dir . --rollback --name "御驾亲征前"
 *   node save-manager.mjs --sim-dir . --delete --name "旧存档"
 *   node save-manager.mjs --sim-dir . --undo-rollback
 *
 * 依赖: Node.js 14+，无外部依赖
 */

import {
  readFileSync, writeFileSync, existsSync, mkdirSync,
  readdirSync, copyFileSync, rmSync, statSync, renameSync
} from 'fs';
import { resolve, dirname, join, basename, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================================
// 常量
// ============================================================

const MAX_AUTO_SAVES = 10;
const MAX_MANUAL_SAVES = 20;
const MAX_ROLLBACK_SNAPSHOTS = 3;

// ============================================================
// CLI 参数解析
// ============================================================

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      if (args[i + 1] && !args[i + 1].startsWith('--')) {
        opts[key] = args[i + 1];
        i++;
      } else {
        opts[key] = true;
      }
    }
  }

  if (!opts.simDir) {
    console.error('[ERROR] 必须指定 --sim-dir 参数');
    process.exit(1);
  }

  return opts;
}

// ============================================================
// 工具函数
// ============================================================

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function readJson(filePath) {
  const abs = resolve(filePath);
  if (!existsSync(abs)) return null;
  return JSON.parse(readFileSync(abs, 'utf-8'));
}

function writeJson(filePath, data) {
  writeFileSync(resolve(filePath), JSON.stringify(data, null, 2), 'utf-8');
}

function copyDirRecursive(src, dest) {
  ensureDir(dest);
  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

function removeDir(dir) {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

function padTurn(n) {
  return String(n).padStart(3, '0');
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

// ============================================================
// 存档索引管理
// ============================================================

function getSaveIndexPath(simDir) {
  return resolve(simDir, 'saves', 'save-index.json');
}

function loadSaveIndex(simDir) {
  const idx = readJson(getSaveIndexPath(simDir));
  if (!idx) {
    return {
      version: 1,
      sim_slug: basename(resolve(simDir)),
      last_updated: new Date().toISOString(),
      saves: [],
      current_turn: 0
    };
  }
  return idx;
}

function saveSaveIndex(simDir, index) {
  index.last_updated = new Date().toISOString();
  writeJson(getSaveIndexPath(simDir), index);
}

function getSavesDir(simDir) {
  return resolve(simDir, 'saves');
}

// ============================================================
// 自动存档
// ============================================================

function autoSave(simDir, turn) {
  const savesDir = getSavesDir(simDir);
  const saveName = `turn-${padTurn(turn)}`;
  const saveDir = join(savesDir, 'auto', saveName);

  if (existsSync(saveDir)) {
    console.log(`[INFO] 自动存档 ${saveName} 已存在，跳过`);
    return;
  }

  ensureDir(saveDir);

  // 复制核心文件
  const stateFile = resolve(simDir, 'state.json');
  const metaFile = resolve(simDir, '.engine-meta.json');

  if (existsSync(stateFile)) copyFileSync(stateFile, join(saveDir, 'state.json'));
  if (existsSync(metaFile)) copyFileSync(metaFile, join(saveDir, 'engine-meta.json'));

  // 复制人物卡
  const charsDir = resolve(simDir, 'characters');
  if (existsSync(charsDir)) {
    copyDirRecursive(charsDir, join(saveDir, 'characters'));
  }

  // 生成 save-meta.json
  const state = readJson(stateFile);
  const meta = readJson(metaFile);
  const saveMeta = {
    save_id: `auto-${saveName}`,
    type: 'auto',
    name: `第${turn}回合自动存档`,
    turn: turn,
    date: state?.meta?.current_date || '',
    sim_date: state?.meta?.current_date || '',
    created_at: new Date().toISOString(),
    description: '自动存档',
    protagonist_location: state?.protagonist?.location || '',
    key_event: ''
  };
  writeJson(join(saveDir, 'save-meta.json'), saveMeta);

  // 更新索引
  const index = loadSaveIndex(simDir);
  index.saves.push({
    save_id: saveMeta.save_id,
    type: 'auto',
    name: saveMeta.name,
    turn: turn,
    sim_date: saveMeta.sim_date,
    path: `auto/${saveName}`,
    created_at: saveMeta.created_at
  });
  index.current_turn = turn;
  saveSaveIndex(simDir, index);

  // 清理旧自动存档
  purgeOldAutoSaves(simDir, index);

  console.log(`[INFO] 自动存档完成: ${saveName}`);
}

function purgeOldAutoSaves(simDir, index) {
  const autoSaves = index.saves
    .filter(s => s.type === 'auto')
    .sort((a, b) => a.turn - b.turn);

  if (autoSaves.length <= MAX_AUTO_SAVES) return;

  const toRemove = autoSaves.slice(0, autoSaves.length - MAX_AUTO_SAVES);
  for (const save of toRemove) {
    const saveDir = join(getSavesDir(simDir), save.path);
    removeDir(saveDir);
    index.saves = index.saves.filter(s => s.save_id !== save.save_id);
    console.log(`[INFO] 清理旧自动存档: ${save.save_id}`);
  }
  saveSaveIndex(simDir, index);
}

// ============================================================
// 手动存档
// ============================================================

function manualSave(simDir, name) {
  const savesDir = getSavesDir(simDir);
  const index = loadSaveIndex(simDir);
  const manualSaves = index.saves.filter(s => s.type === 'manual');

  if (manualSaves.length >= MAX_MANUAL_SAVES) {
    console.error(`[ERROR] 手动存档已达上限 ${MAX_MANUAL_SAVES}，请先删除旧存档`);
    process.exit(1);
  }

  // 处理名称冲突
  let saveName = name || `save-${padTurn(index.current_turn + 1)}`;
  saveName = sanitizeFileName(saveName);
  if (manualSaves.some(s => s.path === `manual/${saveName}`)) {
    saveName = `${saveName}-${Date.now()}`;
  }

  const saveDir = join(savesDir, 'manual', saveName);
  ensureDir(saveDir);

  // 复制核心文件
  const stateFile = resolve(simDir, 'state.json');
  const metaFile = resolve(simDir, '.engine-meta.json');

  if (existsSync(stateFile)) copyFileSync(stateFile, join(saveDir, 'state.json'));
  if (existsSync(metaFile)) copyFileSync(metaFile, join(saveDir, 'engine-meta.json'));

  // 复制人物卡
  const charsDir = resolve(simDir, 'characters');
  if (existsSync(charsDir)) {
    copyDirRecursive(charsDir, join(saveDir, 'characters'));
  }

  // 生成 save-meta.json
  const state = readJson(stateFile);
  const turn = index.current_turn;
  const saveMeta = {
    save_id: `manual-${saveName}`,
    type: 'manual',
    name: saveName,
    turn: turn,
    date: state?.meta?.current_date || '',
    sim_date: state?.meta?.current_date || '',
    created_at: new Date().toISOString(),
    description: name || `第${turn}回合手动存档`,
    protagonist_location: state?.protagonist?.location || '',
    key_event: '',
    is_pinned: false
  };
  writeJson(join(saveDir, 'save-meta.json'), saveMeta);

  // 更新索引
  index.saves.push({
    save_id: saveMeta.save_id,
    type: 'manual',
    name: saveMeta.name,
    turn: turn,
    sim_date: saveMeta.sim_date,
    path: `manual/${saveName}`,
    created_at: saveMeta.created_at
  });
  saveSaveIndex(simDir, index);

  console.log(`[INFO] 手动存档完成: ${saveName}`);
}

function sanitizeFileName(name) {
  return name
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 64);
}

// ============================================================
// 列出存档
// ============================================================

function listSaves(simDir) {
  const index = loadSaveIndex(simDir);
  const autoSaves = index.saves.filter(s => s.type === 'auto').sort((a, b) => a.turn - b.turn);
  const manualSaves = index.saves.filter(s => s.type === 'manual').sort((a, b) =>
    new Date(a.created_at) - new Date(b.created_at)
  );
  const snapshots = index.saves.filter(s => s.type === 'snapshot').sort((a, b) =>
    new Date(b.created_at) - new Date(a.created_at)
  );

  console.log('=== 存档列表 ===\n');

  if (autoSaves.length > 0) {
    console.log('[自动存档]');
    for (const s of autoSaves) {
      console.log(`  #${s.turn}  ${s.name}  ${s.sim_date}  ${s.path}`);
    }
    console.log('');
  }

  if (manualSaves.length > 0) {
    console.log('[手动存档]');
    for (const s of manualSaves) {
      console.log(`  "${s.name}"  第${s.turn}回合  ${s.sim_date}  ${s.path}`);
    }
    console.log('');
  }

  if (snapshots.length > 0) {
    console.log('[回档安全快照]');
    for (const s of snapshots) {
      console.log(`  ${s.name}  第${s.turn}回合  ${s.created_at}`);
    }
    console.log('');
  }

  console.log(`当前回合: ${index.current_turn}`);
}

// ============================================================
// 回档
// ============================================================

function rollback(simDir, targetTurn, targetName) {
  const index = loadSaveIndex(simDir);

  // 查找目标存档
  let target;
  if (targetTurn !== undefined) {
    target = index.saves.find(s => s.turn === parseInt(targetTurn));
  } else if (targetName) {
    target = index.saves.find(s => s.name === targetName || s.path.includes(targetName));
  }

  if (!target) {
    console.error(`[ERROR] 未找到目标存档: ${targetTurn ?? targetName}`);
    process.exit(1);
  }

  const currentTurn = index.current_turn;
  if (target.turn >= currentTurn) {
    console.error(`[ERROR] 目标回合 ${target.turn} 不早于当前回合 ${currentTurn}`);
    process.exit(1);
  }

  // 1. 创建安全快照
  createRollbackSnapshot(simDir, index);

  // 2. 从存档恢复
  const saveDir = join(getSavesDir(simDir), target.path);
  if (!existsSync(saveDir)) {
    console.error(`[ERROR] 存档目录不存在: ${saveDir}`);
    process.exit(1);
  }

  // 恢复 state.json
  const savedState = join(saveDir, 'state.json');
  if (existsSync(savedState)) {
    copyFileSync(savedState, resolve(simDir, 'state.json'));
  }

  // 恢复 .engine-meta.json
  const savedMeta = join(saveDir, 'engine-meta.json');
  if (existsSync(savedMeta)) {
    copyFileSync(savedMeta, resolve(simDir, '.engine-meta.json'));
  }

  // 恢复 characters/
  const savedChars = join(saveDir, 'characters');
  const currentChars = resolve(simDir, 'characters');
  if (existsSync(savedChars)) {
    // 保留 archive/（已故人物不需要回退）
    const archiveDir = join(currentChars, 'archive');
    const archiveBackup = join(simDir, '.archive-backup-temp');
    if (existsSync(archiveDir)) {
      copyDirRecursive(archiveDir, archiveBackup);
    }
    removeDir(currentChars);
    copyDirRecursive(savedChars, currentChars);
    // 恢复 archive/
    if (existsSync(archiveBackup)) {
      removeDir(archiveDir);
      copyDirRecursive(archiveBackup, archiveDir);
      removeDir(archiveBackup);
    }
  }

  // 3. 归档超出回合的记录
  archiveRecordsAfter(simDir, target.turn);

  // 4. 更新索引
  index.current_turn = target.turn;
  saveSaveIndex(simDir, index);

  console.log(`[INFO] 回档完成: 第${target.turn}回合 (${target.sim_date})`);
  console.log(`[INFO] 已将第${target.turn + 1}到${currentTurn}回合的记录移至 records/archived/`);
  console.log(`[INFO] 安全快照已保存`);
}

function createRollbackSnapshot(simDir, index) {
  const savesDir = getSavesDir(simDir);
  const snapName = `before-rollback-${timestamp()}`;
  const snapDir = join(savesDir, 'rollback-snapshots', snapName);
  ensureDir(snapDir);

  const stateFile = resolve(simDir, 'state.json');
  const metaFile = resolve(simDir, '.engine-meta.json');

  if (existsSync(stateFile)) copyFileSync(stateFile, join(snapDir, 'state.json'));
  if (existsSync(metaFile)) copyFileSync(metaFile, join(snapDir, 'engine-meta.json'));

  const charsDir = resolve(simDir, 'characters');
  if (existsSync(charsDir)) {
    copyDirRecursive(charsDir, join(snapDir, 'characters'));
  }

  const saveMeta = {
    save_id: `snapshot-${snapName}`,
    type: 'snapshot',
    name: snapName,
    turn: index.current_turn,
    date: '',
    sim_date: '',
    created_at: new Date().toISOString(),
    description: `回档前安全快照（第${index.current_turn}回合）`
  };
  writeJson(join(snapDir, 'save-meta.json'), saveMeta);

  index.saves.push({
    save_id: saveMeta.save_id,
    type: 'snapshot',
    name: snapName,
    turn: index.current_turn,
    sim_date: '',
    path: `rollback-snapshots/${snapName}`,
    created_at: saveMeta.created_at
  });

  // 清理旧快照
  const snapshots = index.saves
    .filter(s => s.type === 'snapshot')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (snapshots.length > MAX_ROLLBACK_SNAPSHOTS) {
    const toRemove = snapshots.slice(MAX_ROLLBACK_SNAPSHOTS);
    for (const s of toRemove) {
      removeDir(join(savesDir, s.path));
      index.saves = index.saves.filter(x => x.save_id !== s.save_id);
    }
  }
}

function archiveRecordsAfter(simDir, targetTurn) {
  const recordsDir = resolve(simDir, 'records');
  const archivedDir = join(recordsDir, 'archived', `rollback-${timestamp()}`);
  const dirs = ['ledger', 'chronicle'];

  for (const subDir of dirs) {
    const fullDir = join(recordsDir, subDir);
    if (!existsSync(fullDir)) continue;

    const files = readdirSync(fullDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const match = file.match(/turn-(\d+)/);
      if (match && parseInt(match[1]) > targetTurn) {
        const destDir = join(archivedDir, subDir);
        ensureDir(destDir);
        renameSync(join(fullDir, file), join(destDir, file));
      }
    }
  }

  // 处理根目录的 turn-NNN.md（旧格式兼容）
  if (existsSync(recordsDir)) {
    const rootFiles = readdirSync(recordsDir).filter(f => f.match(/^turn-\d+\.md$/));
    for (const file of rootFiles) {
      const match = file.match(/turn-(\d+)/);
      if (match && parseInt(match[1]) > targetTurn) {
        ensureDir(archivedDir);
        renameSync(join(recordsDir, file), join(archivedDir, file));
      }
    }
  }
}

// ============================================================
// 撤销回档
// ============================================================

function undoRollback(simDir) {
  const index = loadSaveIndex(simDir);
  const snapshots = index.saves
    .filter(s => s.type === 'snapshot')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (snapshots.length === 0) {
    console.error('[ERROR] 没有可恢复的安全快照');
    process.exit(1);
  }

  const latest = snapshots[0];
  const snapDir = join(getSavesDir(simDir), latest.path);
  if (!existsSync(snapDir)) {
    console.error(`[ERROR] 快照目录不存在: ${snapDir}`);
    process.exit(1);
  }

  // 恢复文件
  const savedState = join(snapDir, 'state.json');
  if (existsSync(savedState)) {
    copyFileSync(savedState, resolve(simDir, 'state.json'));
  }

  const savedMeta = join(snapDir, 'engine-meta.json');
  if (existsSync(savedMeta)) {
    copyFileSync(savedMeta, resolve(simDir, '.engine-meta.json'));
  }

  const savedChars = join(snapDir, 'characters');
  if (existsSync(savedChars)) {
    removeDir(resolve(simDir, 'characters'));
    copyDirRecursive(savedChars, resolve(simDir, 'characters'));
  }

  index.current_turn = latest.turn;
  saveSaveIndex(simDir, index);

  console.log(`[INFO] 已从安全快照恢复到第${latest.turn}回合`);
}

// ============================================================
// 删除存档
// ============================================================

function deleteSave(simDir, name) {
  const index = loadSaveIndex(simDir);
  const target = index.saves.find(s => s.type === 'manual' && (s.name === name || s.path.includes(name)));

  if (!target) {
    console.error(`[ERROR] 未找到手动存档: ${name}`);
    process.exit(1);
  }

  const saveDir = join(getSavesDir(simDir), target.path);
  removeDir(saveDir);

  index.saves = index.saves.filter(s => s.save_id !== target.save_id);
  saveSaveIndex(simDir, index);

  console.log(`[INFO] 已删除存档: ${target.name}`);
}

// ============================================================
// 初始化存档系统
// ============================================================

function initSaves(simDir) {
  const savesDir = getSavesDir(simDir);
  ensureDir(join(savesDir, 'auto'));
  ensureDir(join(savesDir, 'manual'));
  ensureDir(join(savesDir, 'rollback-snapshots'));

  const indexPath = getSaveIndexPath(simDir);
  if (!existsSync(indexPath)) {
    const index = {
      version: 1,
      sim_slug: basename(resolve(simDir)),
      last_updated: new Date().toISOString(),
      saves: [],
      current_turn: 0
    };
    writeJson(indexPath, index);
    console.log('[INFO] 存档系统已初始化');
  } else {
    console.log('[INFO] 存档系统已存在');
  }

  // 创建第0回合初始存档
  autoSave(simDir, 0);
}

// ============================================================
// 主入口
// ============================================================

function main() {
  const opts = parseArgs();
  const simDir = resolve(opts.simDir);

  if (!existsSync(simDir)) {
    console.error(`[ERROR] 模拟器目录不存在: ${simDir}`);
    process.exit(1);
  }

  // 确保存档目录存在
  const savesDir = getSavesDir(simDir);
  ensureDir(savesDir);

  if (opts.auto) {
    const turn = parseInt(opts.turn);
    if (isNaN(turn)) {
      console.error('[ERROR] --auto 需要配合 --turn N');
      process.exit(1);
    }
    autoSave(simDir, turn);
  } else if (opts.save) {
    manualSave(simDir, opts.name);
  } else if (opts.list) {
    listSaves(simDir);
  } else if (opts.rollback) {
    rollback(simDir, opts.turn, opts.name);
  } else if (opts.undoRollback) {
    undoRollback(simDir);
  } else if (opts.delete) {
    deleteSave(simDir, opts.name);
  } else if (opts.init) {
    initSaves(simDir);
  } else {
    console.log('用法: node save-manager.mjs --sim-dir <path> <command> [options]');
    console.log('');
    console.log('命令:');
    console.log('  --init                       初始化存档系统');
    console.log('  --auto --turn N               创建自动存档');
    console.log('  --save [--name "名称"]        创建手动存档');
    console.log('  --list                        列出所有存档');
    console.log('  --rollback --turn N           回档到指定回合');
    console.log('  --rollback --name "名称"      回档到指定存档');
    console.log('  --undo-rollback               从安全快照恢复');
    console.log('  --delete --name "名称"        删除手动存档');
  }
}

main();
