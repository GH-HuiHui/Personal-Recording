import Framework7 from 'framework7';
import Sheet from 'framework7/components/sheet';
import Toast from 'framework7/components/toast';
import Actions from 'framework7/components/actions';
import 'framework7/css';
import 'framework7/components/sheet/css';
import 'framework7/components/toast/css';
import 'framework7/components/actions/css';
import '../styles.css';
import './ui/health-theme.css';
import { decryptBackup, encryptBackup } from './data/backup.js';
import { addRecord, deleteRecord, loadSnapshot, openGrowthRadarDb, replaceDatabase, seedIfEmpty } from './data/db.js';
import { calculateDimensionStats } from './domain/analytics.js';
import { renderHistory } from './ui/history.js';
import { renderGrowthChart } from './ui/chart.js';
import { saveFile } from './data/save-file.js';
import { renderSettings } from './ui/settings.js';
import { renderToday, todaySummary } from './ui/today.js';
import { setupTrendControls } from './ui/trends.js';
import { setupManagement } from './ui/management.js';
import { createFeedback, confirmRestore } from './ui/feedback.js';

Framework7.use([Sheet, Toast, Actions]);
const framework = new Framework7({
  el: '#growth-radar-app',
  theme: 'ios',
  name: '成长雷达',
  id: 'local.growthradar.pwa'
});
const feedback = createFeedback(framework);

const elements = {
  app: document.querySelector('#app'),
  dimensionList: document.querySelector('#dimension-list'),
  historyList: document.querySelector('#history-list'),
  trendContent: document.querySelector('#trend-content'),
  settingsCurrent: document.querySelector('#settings-current'),
  radar: document.querySelector('#radar-svg'),
  radarTitle: document.querySelector('#radar-title'),
  radarDescription: document.querySelector('#radar-description'),
  stageMeta: document.querySelector('#stage-meta')
};

let database;
let snapshot = { stages: [], dimensions: [], records: [] };
let stats = [];
let mode = 'recent';
let lastRecord = null;
let recordedId = null;
let backupFile = null;
let trendControls = null;

function activeStage() {
  return snapshot.stages.find((stage) => stage.status === 'active');
}

function formatStageMeta(stage) {
  if (!stage) return '尚未创建阶段';
  const date = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric' }).format(new Date(stage.createdAt));
  return `${stage.name} · ${date}开始`;
}

function showToast(message, canUndo = false) {
  feedback.show(message, canUndo ? undoLastAction : undefined);
}

function render() {
  stats = calculateDimensionStats({ ...snapshot, dimensions: snapshot.dimensions.filter((item) => item.stageId === activeStage()?.id) });
  elements.stageMeta.textContent = formatStageMeta(activeStage());
  document.querySelector('#today-summary').textContent = todaySummary(stats);
  elements.radarTitle.textContent = mode === 'recent' ? '活跃天数 · 0–7 天' : '阶段活跃率 · 0–100%';
  elements.radarDescription.textContent = stats.some((item) => item.stageCount > 0) ? '每一次投入，都有迹可循' : '从今天的一次记录开始';
  renderGrowthChart(elements.radar, document.querySelector('#chart-bars'), stats, mode, activeStage()?.chartPreferences);
  renderToday(elements.dimensionList, stats, { recordedId, onRecord: recordAction });
  renderHistory(elements.historyList, snapshot);
  trendControls?.render();
  renderSettings(elements.settingsCurrent, snapshot);
  recordedId = null;
}

async function refresh() {
  if (backupFile) {
    backupFile = null;
    document.querySelector('#save-backup').hidden = true;
    document.querySelector('#download-backup').hidden = true;
    setBackupStatus('数据已更新，请重新导出最新备份。');
  }
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
    feedback.dismiss();
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
  const button = document.querySelector('#export-backup');
  if (button.disabled) return;
  button.disabled = true;
  backupFile = null;
  document.querySelector('#save-backup').hidden = true;
  document.querySelector('#download-backup').hidden = true;
  try {
    const password = readBackupPassword();
    setBackupStatus('正在加密备份…');
    const encrypted = await encryptBackup(await loadSnapshot(database), password);
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    backupFile = new File([encrypted], `成长雷达备份-${date}.growthradar`, { type: 'application/octet-stream' });
    document.querySelector('#save-backup').hidden = false;
    document.querySelector('#download-backup').hidden = false;
    document.querySelector('#backup-password').value = '';
    setBackupStatus('加密完成。点击“保存 / 分享备份文件”；iPhone 请在分享面板选择“存储到文件”。也可使用“直接下载备份”。');
  } catch (error) {
    setBackupStatus(error.message || '导出失败', true);
  } finally { button.disabled = false; }
}

async function savePreparedBackup(event) {
  if (!backupFile) return;
  const button = event.currentTarget;
  if (button.disabled) return;
  button.disabled = true;
  try {
    const result = await saveFile(backupFile, { directDownload: button.id === 'download-backup' });
    setBackupStatus(result === 'saved' ? '备份文件已保存。' : result === 'shared' ? '分享操作已结束，请确认文件已存储。可再次点击保存。' : '已请求下载，请查看浏览器下载列表；iPhone 也可使用“保存 / 分享备份文件”。');
  } catch (error) {
    setBackupStatus(error.name === 'AbortError' ? '已取消保存，可再次点击保存。' : '保存失败，请使用“直接下载备份”重试。', error.name !== 'AbortError');
  } finally { button.disabled = false; }
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
    const approved = await confirmRestore(framework);
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
    trendControls = setupTrendControls({ container: elements.trendContent, getSnapshot: () => snapshot, notify: showToast });
    trendControls.render();
    setupManagement({ framework, getDb: () => database, getSnapshot: () => snapshot, refresh: async () => { lastRecord = null; await refresh(); }, notify: showToast, dismissFeedback: feedback.dismiss });
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
document.querySelector('#save-backup').addEventListener('click', savePreparedBackup);
document.querySelector('#download-backup').addEventListener('click', savePreparedBackup);
document.querySelector('#export-backup').addEventListener('click', exportEncryptedBackup);
document.querySelector('#import-backup').addEventListener('change', (event) => importEncryptedBackup(event.target.files?.[0]));

void initialize();
void registerServiceWorker();

export { framework };
