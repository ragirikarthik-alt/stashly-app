/**
 * User-controlled local backup: a single JSON file (images embedded as base64)
 * saved wherever the user chooses via the system file dialog. Nothing is uploaded.
 */
import { Dirs, FileSystem } from 'react-native-file-access';
import { pick, types, keepLocalCopy, saveDocuments, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import { exportAll } from '../database/repositories';
import { writeImageFromBase64, readImageBase64 } from './images';
import { isDateKey, todayKey } from '../utils/dates';
import { MAX_MINOR, CURRENCIES } from '../utils/money';

export const BACKUP_FORMAT = 'stashly-backup';
export const BACKUP_VERSION = 1;

const stripScheme = uri => (uri?.startsWith('file://') ? uri.slice(7) : uri);
const isCancel = e => isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED;

/** Returns { saved: boolean, name? } — saved is only true once the OS confirms the write. */
export async function exportBackup(preferences) {
  const data = await exportAll();
  const images = {};
  for (const g of data.goals) {
    if (g.imageUri) {
      try {
        const base64 = await readImageBase64(g.imageUri);
        if (base64) {
          images[g.id] = { ext: g.imageUri.endsWith('.png') ? 'png' : 'jpg', data: base64 };
        }
      } catch {
        // image unreadable — goal falls back to its category illustration on restore
      }
    }
  }
  const payload = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    preferences,
    goals: data.goals.map(g => ({ ...g, imageUri: null })),
    transactions: data.transactions,
    milestones: data.milestones,
    images,
  };
  const fileName = `stashly-backup-${todayKey()}.json`;
  const tmp = `${Dirs.CacheDir}/${fileName}`;
  await FileSystem.writeFile(tmp, JSON.stringify(payload), 'utf8');
  try {
    const [res] = await saveDocuments({
      sourceUris: [`file://${tmp}`],
      mimeType: 'application/json',
      fileName,
      copy: true,
    });
    if (res?.error) {
      throw new Error(res.error);
    }
    return { saved: true, name: res?.name || fileName, counts: { goals: data.goals.length, transactions: data.transactions.length } };
  } catch (e) {
    if (isCancel(e)) {
      return { saved: false };
    }
    throw e;
  } finally {
    FileSystem.unlink(tmp).catch(() => {});
  }
}

/** Opens a file picker and returns a validated backup object, or null if cancelled. */
export async function pickBackup() {
  let file;
  try {
    [file] = await pick({ type: [types.json, types.plainText, types.allFiles], allowMultiSelection: false });
  } catch (e) {
    if (isCancel(e)) {
      return null;
    }
    throw e;
  }
  const [copy] = await keepLocalCopy({
    files: [{ uri: file.uri, fileName: file.name ?? 'backup.json' }],
    destination: 'cachesDirectory',
  });
  if (copy.status !== 'success') {
    throw new Error(copy.copyError || 'Could not read that file');
  }
  const path = stripScheme(decodeURI(copy.localUri));
  const text = await FileSystem.readFile(path, 'utf8');
  FileSystem.unlink(path).catch(() => {});
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('This file is not a Stashly backup');
  }
  return validateBackup(json);
}

export function validateBackup(json) {
  if (!json || json.format !== BACKUP_FORMAT) {
    throw new Error('This file is not a Stashly backup');
  }
  if (json.version > BACKUP_VERSION) {
    throw new Error('This backup was made by a newer version of Stashly');
  }
  const goals = Array.isArray(json.goals) ? json.goals : [];
  const transactions = Array.isArray(json.transactions) ? json.transactions : [];
  const goalIds = new Set();
  for (const g of goals) {
    if (
      typeof g.id !== 'string' ||
      typeof g.name !== 'string' ||
      !Number.isSafeInteger(g.targetAmount) ||
      g.targetAmount <= 0 ||
      g.targetAmount > MAX_MINOR ||
      !['ACTIVE', 'COMPLETED', 'ARCHIVED'].includes(g.status)
    ) {
      throw new Error('The backup contains an invalid goal');
    }
    if (!CURRENCIES[g.currencyCode]) {
      throw new Error('The backup contains an unsupported currency');
    }
    goalIds.add(g.id);
  }
  for (const t of transactions) {
    if (
      typeof t.id !== 'string' ||
      !goalIds.has(t.goalId) ||
      !['CONTRIBUTION', 'WITHDRAWAL'].includes(t.type) ||
      !Number.isSafeInteger(t.amount) ||
      t.amount <= 0 ||
      t.amount > MAX_MINOR ||
      !isDateKey(t.date)
    ) {
      throw new Error('The backup contains an invalid transaction');
    }
  }
  return {
    exportedAt: json.exportedAt,
    preferences: json.preferences || {},
    goals,
    transactions,
    milestones: Array.isArray(json.milestones) ? json.milestones.filter(m => typeof m.key === 'string') : [],
    images: json.images && typeof json.images === 'object' ? json.images : {},
  };
}

/** Writes embedded images back to disk and returns goals with imageUri restored. */
export async function materializeImages(backup) {
  const goals = [];
  for (const g of backup.goals) {
    const img = backup.images[g.id];
    let imageUri = null;
    if (img?.data) {
      try {
        imageUri = await writeImageFromBase64(img.data, img.ext === 'png' ? 'png' : 'jpg');
      } catch {
        imageUri = null;
      }
    }
    goals.push({ ...g, imageUri });
  }
  return goals;
}
