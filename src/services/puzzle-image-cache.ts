import * as FileSystem from "expo-file-system/legacy";

import { getPackLevels } from "@/constants/packs";

const CACHE_DIR = `${FileSystem.cacheDirectory ?? ""}puzzle-images/`;
const LEGACY_CACHE_DIR = `${FileSystem.documentDirectory ?? ""}puzzle-images/`;
const MAX_PARALLEL_DOWNLOADS = 2;

const inFlight = new Map<string, Promise<string>>();
let legacyCleanup: Promise<void> | undefined;

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
  if (!FileSystem.cacheDirectory) return false;
  if (!legacyCleanup) {
    legacyCleanup = FileSystem.documentDirectory
      ? FileSystem.deleteAsync(LEGACY_CACHE_DIR, { idempotent: true }).catch(() => {})
      : Promise.resolve();
  }
  await legacyCleanup;
  await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true }).catch(() => {});
  return true;
}

export function getPuzzleImageCacheUri(remoteUri: string) {
  if (!FileSystem.cacheDirectory) return remoteUri;
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

export async function cachePuzzleImagePack(packIndex: number) {
  const remoteUris = [
    ...new Set(getPackLevels(packIndex).map((level) => level.image).filter(Boolean))
  ];
  const cached: Record<string, string> = {};
  let cursor = 0;

  async function worker() {
    while (cursor < remoteUris.length) {
      const remoteUri = remoteUris[cursor];
      cursor += 1;
      try {
        cached[remoteUri] = await cachePuzzleImage(remoteUri);
      } catch {
        // Non-fatal: image components still fall back to the remote URL.
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(MAX_PARALLEL_DOWNLOADS, remoteUris.length) }, () => worker())
  );
  return cached;
}
