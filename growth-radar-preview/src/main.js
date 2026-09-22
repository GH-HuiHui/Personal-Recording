import Framework7 from 'framework7';
import 'framework7/css';
import '../styles.css';
import { decryptBackup, encryptBackup } from './data/backup.js';
import { addRecord, deleteRecord, loadSnapshot, openGrowthRadarDb, replaceDatabase, seedIfEmpty } from './data/db.js';
import { calculateDimensionStats } from './domain/analytics.js';
import { renderHistory } from './ui/history.js';
import { renderRadar } from './ui/radar.js';
import { renderSettings } from './ui/settings.js';
import { renderToday } from './ui/today.js';
import { setupManagement } from './ui/management.js';

const framework = new Framework7({
  el: '#growth-radar-app',
  theme: 'ios',
  name: '成长雷达',
  id: 'local.growthradar.pwa'
});

const elements = {
  app: document.querySelector('#app'),
  dimensionList: document.querySelector('#dimension-list'),
  historyList: document.querySelector('#history-list'),
  settingsCurrent: document.querySelector('#settings-current'),
  radar: document.querySelector('#radar-svg'),
  radarTitle: document.querySelector('#radar-title'),
  radarDescription: document.querySelector('#radar-description'),
  stageMeta: document.querySelector('#stage-meta'),
  toast: document.querySelector('#undo-toast'),
  toastMessage: document.querySelector('#toast-message')
};

let database;
let snapshot = { stages: [], dimensions: [], records: [] };
let stats = [];
let mode = 'recent';
let lastRecord = null;
let recordedId = null;
let undoTimer = null;
let backupObjectUrl = null;

function activeStage() {
  return snapshot.stages.find((stage) => stage.status === 'active');
}

function formatStageMeta(stage) {
  if (!stage) return '尚未创建阶段';
  const date = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric' }).format(new Date(stage.createdAt));
  return `${stage.name} · ${date}开始`;
}

function showToast(message, canUndo = false) {
  window.clearTimeout(undoTimer);
  elements.toastMessage.textContent = message;
  elements.toast.classList.toggle('is-info', !canUndo);
  elements.toast.classList.add('is-visible');
  undoTimer = window.setTimeout(() => elements.toast.classList.remove('is-visible'), 3000);
}

function render() {
  stats = calculateDimensionStats({ ...snapshot, dimensions: snapshot.dimensions.filter((item) => item.stageId === activeStage()?.id) });
  elements.stageMeta.textContent = formatStageMeta(activeStage());
  elements.radarTitle.textContent = mode === 'recent' ? '近 7 日持续性' : '本阶段活跃率';
  elements.radarDescription.textContent = mode === 'recent' ? '按活跃天数统计' : '活跃天数占比';
  renderRadar(elements.radar, stats, mode);
  renderToday(elements.dimensionList, stats, { recordedId, onRecord: recordAction });
  renderHistory(elements.historyList, snapshot);
  renderSettings(elements.settingsCurrent, snapshot);
  recordedId = null;
}

async function refresh() {
  snapshot = await loadSnapshot(database);
  render();
}

async function recordAction(dimensionId) {
  try {
    const record = await addRecord(database, dimensionId);
    lastRecord = record;
    recordedId = dimensionId;
    await refresh();
    const dimension = snapshot.dimensions.find((item) => item.id === dimensionId);
    showToast(`已记录 · ${dimension?.name || '成长行动'}`, true);
  } catch {
    showToast('记录失败，请检查本地存储空间');
  }
}

async function undoLastAction() {
  if (!lastRecord) return;
  try {
    await deleteRecord(database, lastRecord.id);
    lastRecord = null;
    elements.toast.classList.remove('is-visible');
    await refresh();
  } catch {
    showToast('撤销失败，请稍后再试');
  }
}

function setMode(nextMode) {
  mode = nextMode;
  document.querySelectorAll('.metric-button').forEach((button) => {
    const selected = button.dataset.mode === mode;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  render();
}

function setTab(tab) {
  document.querySelectorAll('.panel').forEach((panel) => panel.classList.toggle('is-active', panel.id === `${tab}-panel`));
  document.querySelectorAll('.tab-button').forEach((button) => {
    const selected = button.dataset.tab === tab;
    button.classList.toggle('is-selected', selected);
    if (selected) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  elements.app.scrollTo({ top: 0, behavior: 'smooth' });
}

function setBackupStatus(message, isError = false) {
  const status = document.querySelector('#backup-status');
  status.textContent = message;
  status.classList.toggle('is-error', isError);
}

function readBackupPassword() {
  const password = document.querySelector('#backup-password').value;
  if (password.length < 10) throw new Error('备份密码至少需要 10 个字符');
  return password;
}

async function exportEncryptedBackup() {
  try {
    const password = readBackupPassword();
    const encrypted = await encryptBackup(snapshot, password);
    if (backupObjectUrl) URL.revokeObjectURL(backupObjectUrl);
    backupObjectUrl = URL.createObjectURL(new Blob([encrypted], { type: 'application/json' }));
    const link = document.querySelector('#save-backup');
    link.href = backupObjectUrl;
    link.download = `成长雷达备份-${new Date().toISOString().slice(0, 10)}.growthradar`;
    link.hidden = false;
    document.querySelector('#backup-password').value = '';
    setBackupStatus('加密完成。请点击“保存备份文件”，并将文件放在安全位置。');
  } catch (error) {
    setBackupStatus(error.message || '导出失败', true);
  }
}

async function importEncryptedBackup(file) {
  if (!file) return;
  if (file.size > 5_000_000) {
    setBackupStatus('备份文件超过 5 MB，已拒绝读取。', true);
    return;
  }
  try {
    const password = readBackupPassword();
    const restored = await decryptBackup(await file.text(), password);
    const approved = window.confirm('导入会覆盖本机现有记录。确认继续吗？');
    if (!approved) {
      setBackupStatus('已取消导入，现有数据未改变。');
      return;
    }
    await replaceDatabase(database, restored);
    lastRecord = null;
    document.querySelector('#backup-password').value = '';
    await refresh();
    setBackupStatus('备份已安全恢复。');
  } catch (error) {
    setBackupStatus(error.message || '导入失败，现有数据未改变。', true);
  } finally {
    document.querySelector('#import-backup').value = '';
  }
}

async function initialize() {
  try {
    database = await openGrowthRadarDb();
    await seedIfEmpty(database);
    await refresh();
    setupManagement({ getDb: () => database, getSnapshot: () => snapshot, refresh: async () => { lastRecord = null; await refresh(); }, notify: showToast });
  } catch {
    document.querySelector('#storage-error').hidden = false;
    document.querySelector('#today-content').hidden = true;
  }
}

async function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  try {
    const url = new URL('service-worker.js', document.baseURI);
    await navigator.serviceWorker.register(url, { scope: './' });
    await navigator.serviceWorker.ready;
  } catch {
    console.warn('PWA_SW_REGISTRATION_FAILED');
  }
}

document.querySelectorAll('.metric-button').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));
document.querySelectorAll('.tab-button').forEach((button) => button.addEventListener('click', () => setTab(button.dataset.tab)));
document.querySelector('#undo-button').addEventListener('click', undoLastAction);
document.querySelector('#export-backup').addEventListener('click', exportEncryptedBackup);
document.querySelector('#import-backup').addEventListener('change', (event) => importEncryptedBackup(event.target.files?.[0]));

void initialize();
void registerServiceWorker();

export { framework };
