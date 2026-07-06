import * as FileSystem from "expo-file-system/legacy";

import { getPackLevels, PACKS } from "@/constants/packs";

const CACHE_DIR = `${FileSystem.documentDirectory ?? ""}puzzle-images/`;
const MAX_PARALLEL_DOWNLOADS = 2;

type CacheProgress = (remoteUri: string, localUri: string) => void;

const inFlight = new Map<string, Promise<string>>();

function hashUri(uri: string) {
  let hash = 2166136261;
  for (let index = 0; index < uri.length; index += 1) {
    hash ^= uri.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function localUriForRemote(remoteUri: string) {
  return `${CACHE_DIR}${hashUri(remoteUri)}.jpg`;
}

async function ensureCacheDir() {
  if (!FileSystem.documentDirectory) return false;
  await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true }).catch(() => {});
  return true;
}

export function getPuzzleImageCacheUri(remoteUri: string) {
  if (!FileSystem.documentDirectory) return remoteUri;
  return localUriForRemote(remoteUri);
}

export async function resolveCachedPuzzleImage(remoteUri: string) {
  if (!remoteUri || !(await ensureCacheDir())) return remoteUri;
  const localUri = localUriForRemote(remoteUri);
  const info = await FileSystem.getInfoAsync(localUri);
  return info.exists && !info.isDirectory ? localUri : remoteUri;
}

export async function cachePuzzleImage(remoteUri: string) {
  if (!remoteUri || !(await ensureCacheDir())) return remoteUri;

  const existing = inFlight.get(remoteUri);
  if (existing) return existing;

  const task = (async () => {
    const localUri = localUriForRemote(remoteUri);
    const info = await FileSystem.getInfoAsync(localUri);
    if (info.exists && !info.isDirectory) return localUri;

    const result = await FileSystem.downloadAsync(remoteUri, localUri);
    if (result.status >= 200 && result.status < 300) return result.uri;

    await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
    throw new Error(`Puzzle image download failed with status ${result.status}`);
  })().finally(() => {
    inFlight.delete(remoteUri);
  });

  inFlight.set(remoteUri, task);
  return task;
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export function packImageUris(packIndex: number) {
  return unique(getPackLevels(packIndex).map((level) => level.image));
}

export function allPackImageUris() {
  return unique(PACKS.flatMap((pack) => packImageUris(pack.index)));
}

async function cacheQueue(remoteUris: string[], onProgress?: CacheProgress) {
  const queue = unique(remoteUris);
  let cursor = 0;

  async function worker() {
    while (cursor < queue.length) {
      const remoteUri = queue[cursor];
      cursor += 1;
      try {
        const localUri = await cachePuzzleImage(remoteUri);
        onProgress?.(remoteUri, localUri);
      } catch {
        // Non-fatal: image components still fall back to the remote URL.
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(MAX_PARALLEL_DOWNLOADS, queue.length) }, () => worker())
  );
}

export async function warmPuzzleImageLibrary(currentPackIndex: number, onProgress?: CacheProgress) {
  const clampedPack = Math.max(0, Math.min(PACKS.length - 1, currentPackIndex));
  const nextPack = Math.min(PACKS.length - 1, clampedPack + 1);
  const priority = unique([...packImageUris(clampedPack), ...packImageUris(nextPack)]);
  const remaining = allPackImageUris().filter((uri) => !priority.includes(uri));

  await cacheQueue(priority, onProgress);
  await cacheQueue(remaining, onProgress);
}
