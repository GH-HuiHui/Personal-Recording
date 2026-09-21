const FORMAT = 'growth-radar-backup';
const VERSION = 1;
const ITERATIONS = 600_000;
const MAX_STAGES = 100;
const MAX_DIMENSIONS = 800;
const MAX_RECORDS = 500_000;
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

function bytesToBase64(bytes) {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  if (typeof value !== 'string' || value.length > 20_000_000) throw new Error('备份编码无效');
  try {
    const binary = atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    throw new Error('备份编码无效');
  }
}

function requireString(value, label, maxLength = 100) {
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) throw new Error(`${label}无效`);
  return value;
}

function requireIsoDate(value, label, nullable = false) {
  if (nullable && value === null) return null;
  requireString(value, label, 40);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value) || Number.isNaN(Date.parse(value))) throw new Error(`${label}无效`);
  return value;
}

export function normalizeSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) throw new Error('备份数据结构无效');
  const { stages, dimensions, records } = snapshot;
  if (!Array.isArray(stages) || !Array.isArray(dimensions) || !Array.isArray(records)) throw new Error('备份数据结构无效');
  if (stages.length < 1 || stages.length > MAX_STAGES || dimensions.length > MAX_DIMENSIONS || records.length > MAX_RECORDS) {
    throw new Error('备份数据数量异常');
  }

  const normalizedStages = stages.map((stage) => ({
    id: requireString(stage?.id, '阶段 ID'),
    name: requireString(stage?.name, '阶段名称'),
    createdAt: requireIsoDate(stage?.createdAt, '阶段开始日期'),
    endedAt: requireIsoDate(stage?.endedAt, '阶段结束日期', true),
    status: stage?.status === 'active' || stage?.status === 'archived' ? stage.status : (() => { throw new Error('阶段状态无效'); })()
  }));
  const stageIds = new Set(normalizedStages.map((stage) => stage.id));
  if (stageIds.size !== normalizedStages.length) throw new Error('阶段 ID 重复');

  const normalizedDimensions = dimensions.map((dimension) => ({
    id: requireString(dimension?.id, '方向 ID'),
    stageId: requireString(dimension?.stageId, '方向阶段 ID'),
    name: requireString(dimension?.name, '方向名称'),
    icon: requireString(dimension?.icon, '方向图标', 50),
    sortOrder: Number.isInteger(dimension?.sortOrder) && dimension.sortOrder >= 0 ? dimension.sortOrder : (() => { throw new Error('方向顺序无效'); })(),
    isEnabled: Boolean(dimension?.isEnabled)
  }));
  const dimensionIds = new Set(normalizedDimensions.map((dimension) => dimension.id));
  if (dimensionIds.size !== normalizedDimensions.length) throw new Error('方向 ID 重复');
  if (normalizedDimensions.some((dimension) => !stageIds.has(dimension.stageId))) throw new Error('方向关联了不存在的阶段');

  const normalizedRecords = records.map((record) => ({
    id: requireString(record?.id, '记录 ID'),
    stageId: requireString(record?.stageId, '记录阶段 ID'),
    dimensionId: requireString(record?.dimensionId, '记录方向 ID'),
    createdAt: requireIsoDate(record?.createdAt, '记录日期')
  }));
  const recordIds = new Set(normalizedRecords.map((record) => record.id));
  if (recordIds.size !== normalizedRecords.length) throw new Error('记录 ID 重复');
  if (normalizedRecords.some((record) => !stageIds.has(record.stageId) || !dimensionIds.has(record.dimensionId))) {
    throw new Error('记录关联了不存在的阶段或方向');
  }

  return { stages: normalizedStages, dimensions: normalizedDimensions, records: normalizedRecords };
}

async function deriveKey(password, salt, iterations, usages) {
  if (typeof password !== 'string' || password.length < 10) throw new Error('备份密码至少需要 10 个字符');
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    usages
  );
}

export async function encryptBackup(snapshot, password) {
  const normalized = normalizeSnapshot(snapshot);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, ITERATIONS, ['encrypt']);
  const plaintext = encoder.encode(JSON.stringify(normalized));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);

  return JSON.stringify({
    format: FORMAT,
    version: VERSION,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS, salt: bytesToBase64(salt) },
    cipher: { name: 'AES-GCM', iv: bytesToBase64(iv) },
    data: bytesToBase64(new Uint8Array(encrypted))
  });
}

export async function decryptBackup(serialized, password) {
  let envelope;
  try {
    envelope = typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
  } catch {
    throw new Error('备份文件不是有效的 JSON');
  }
  if (!envelope || envelope.format !== FORMAT || envelope.version !== VERSION) throw new Error('备份格式或版本不受支持');
  if (envelope.kdf?.name !== 'PBKDF2' || envelope.kdf?.hash !== 'SHA-256' || envelope.kdf?.iterations !== ITERATIONS) {
    throw new Error('备份密钥参数不安全或不受支持');
  }
  if (envelope.cipher?.name !== 'AES-GCM') throw new Error('备份加密算法不受支持');
  const salt = base64ToBytes(envelope.kdf.salt);
  const iv = base64ToBytes(envelope.cipher.iv);
  if (salt.length !== 16 || iv.length !== 12) throw new Error('备份加密参数无效');

  try {
    const key = await deriveKey(password, salt, ITERATIONS, ['decrypt']);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, base64ToBytes(envelope.data));
    return normalizeSnapshot(JSON.parse(decoder.decode(decrypted)));
  } catch (error) {
    if (error?.message?.startsWith('备份')) throw error;
    throw new Error('密码错误或备份文件已损坏');
  }
}
