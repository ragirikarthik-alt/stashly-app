/**
 * Product images live in the app's private document directory so they persist
 * offline and are removed when local data is cleared.
 */
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { Dirs, FileSystem } from 'react-native-file-access';
import { uuid } from '../utils/id';

export const IMAGE_DIR = `${Dirs.DocumentDir}/goal-images`;
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

const PICK_OPTIONS = {
  mediaType: 'photo',
  maxWidth: 1080,
  maxHeight: 1080,
  quality: 0.82,
  selectionLimit: 1,
  includeBase64: false,
};

async function ensureDir() {
  if (!(await FileSystem.exists(IMAGE_DIR))) {
    await FileSystem.mkdir(IMAGE_DIR);
  }
}

const stripScheme = uri => (uri?.startsWith('file://') ? uri.slice(7) : uri);

/** Opens gallery (or camera) and returns a persisted file:// uri, or null if cancelled. */
export async function pickGoalImage({ source = 'library' } = {}) {
  const fn = source === 'camera' ? launchCamera : launchImageLibrary;
  const res = await fn(PICK_OPTIONS);
  if (res.didCancel) {
    return null;
  }
  if (res.errorCode) {
    throw new Error(res.errorMessage || 'Could not open the photo picker');
  }
  const asset = res.assets?.[0];
  if (!asset?.uri) {
    return null;
  }
  if (asset.type && !ALLOWED.includes(asset.type.toLowerCase())) {
    throw new Error('Please choose a JPG, PNG or WebP image');
  }
  if (asset.fileSize && asset.fileSize > MAX_BYTES) {
    throw new Error('That image is too large (max 8 MB)');
  }
  await ensureDir();
  const ext = (asset.type || '').includes('png') ? 'png' : 'jpg';
  const dest = `${IMAGE_DIR}/${uuid()}.${ext}`;
  await FileSystem.cp(stripScheme(asset.uri), dest);
  return `file://${dest}`;
}

export async function deleteGoalImage(uri) {
  if (!uri || !uri.includes('/goal-images/')) {
    return;
  }
  try {
    const path = stripScheme(uri);
    if (await FileSystem.exists(path)) {
      await FileSystem.unlink(path);
    }
  } catch {
    // non-fatal
  }
}

export async function deleteAllImages() {
  try {
    if (await FileSystem.exists(IMAGE_DIR)) {
      for (const name of await FileSystem.ls(IMAGE_DIR)) {
        await FileSystem.unlink(`${IMAGE_DIR}/${name}`);
      }
      await FileSystem.unlink(IMAGE_DIR);
    }
  } catch {
    // non-fatal
  }
}

/** Remove image files that no goal references anymore. */
export async function pruneOrphanImages(referencedUris) {
  try {
    if (!(await FileSystem.exists(IMAGE_DIR))) {
      return;
    }
    const keep = new Set(referencedUris.filter(Boolean).map(stripScheme));
    for (const name of await FileSystem.ls(IMAGE_DIR)) {
      const path = `${IMAGE_DIR}/${name}`;
      if (!keep.has(path)) {
        await FileSystem.unlink(path);
      }
    }
  } catch {
    // non-fatal
  }
}

export async function readImageBase64(uri) {
  const path = stripScheme(uri);
  if (!(await FileSystem.exists(path))) {
    return null;
  }
  return FileSystem.readFile(path, 'base64');
}

export async function writeImageFromBase64(base64, ext = 'jpg') {
  await ensureDir();
  const dest = `${IMAGE_DIR}/${uuid()}.${ext}`;
  await FileSystem.writeFile(dest, base64, 'base64');
  return `file://${dest}`;
}
