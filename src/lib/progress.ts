import { PACK_SIZE, PACKS, TOTAL_LEVELS } from "@/constants/packs";

export type StarMap = Record<number, number>;

export type ProgressSummary = {
  totalStars: number;
  clearedLevels: number;
  perfectLevels: number;
  clearedPacks: number;
};

export type SavedGame = {
  version?: number;
  /** stars keyed by global level index (0..TOTAL_LEVELS-1) */
  stars?: Record<string, number>;
  coins?: number;
  sound: boolean;
  music: boolean;
  notifications: boolean;
  /** v1 leftovers, read only for migration */
  unlocked?: number;
  completed?: number[];
};

// Coins awarded for clearing a level, by star rating (index = stars earned).
// Reserved as the game's soft currency (peeks, hints, etc. later).
const COIN_REWARD_BY_STARS = [0, 20, 35, 60] as const;

export function coinsForStars(stars: number): number {
  const clamped = Math.max(0, Math.min(3, Math.round(stars)));
  return COIN_REWARD_BY_STARS[clamped];
}

export function summarizeProgress(stars: StarMap): ProgressSummary {
  const base = Object.values(stars).reduce(
    (summary, value) => ({
      totalStars: summary.totalStars + value,
      clearedLevels: summary.clearedLevels + (value > 0 ? 1 : 0),
      perfectLevels: summary.perfectLevels + (value >= 3 ? 1 : 0)
    }),
    { totalStars: 0, clearedLevels: 0, perfectLevels: 0 }
  );
  const clearedPacks = PACKS.reduce(
    (count, pack) => count + (isPackCleared(stars, pack.index) ? 1 : 0),
    0
  );
  return { ...base, clearedPacks };
}

export function packStars(stars: StarMap, packIndex: number) {
  let total = 0;
  for (let slot = 0; slot < PACK_SIZE; slot += 1) {
    total += stars[packIndex * PACK_SIZE + slot] ?? 0;
  }
  return total;
}

export function packClearedCount(stars: StarMap, packIndex: number) {
  let cleared = 0;
  for (let slot = 0; slot < PACK_SIZE; slot += 1) {
    if ((stars[packIndex * PACK_SIZE + slot] ?? 0) > 0) cleared += 1;
  }
  return cleared;
}

export function isPackCleared(stars: StarMap, packIndex: number) {
  return packClearedCount(stars, packIndex) === PACK_SIZE;
}

export function isPackUnlocked(stars: StarMap, packIndex: number, unlockAll = false) {
  if (unlockAll) return true;
  if (packIndex <= 0) return true;
  return isPackCleared(stars, packIndex - 1);
}

// Within an unlocked pack, levels open one at a time: a level is playable when
// the previous level in the pack has been cleared.
export function isLevelUnlocked(stars: StarMap, global: number, unlockAll = false) {
  if (unlockAll) return true;
  if (global < 0 || global >= TOTAL_LEVELS) return false;
  const packIndex = Math.floor(global / PACK_SIZE);
  if (!isPackUnlocked(stars, packIndex)) return false;
  const slot = global % PACK_SIZE;
  if (slot === 0) return true;
  return (stars[global - 1] ?? 0) > 0;
}

// First unlocked level without stars; falls back to the last level.
export function findCurrentLevel(stars: StarMap, unlockAll = false) {
  for (let global = 0; global < TOTAL_LEVELS; global += 1) {
    if (!isLevelUnlocked(stars, global, unlockAll)) continue;
    if (!((stars[global] ?? 0) > 0)) return global;
  }
  return TOTAL_LEVELS - 1;
}
