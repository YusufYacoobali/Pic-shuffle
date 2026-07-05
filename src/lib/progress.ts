export type StarMap = Record<number, number>;

export type ProgressSummary = {
  totalStars: number;
  clearedLevels: number;
  perfectLevels: number;
};

export type SavedGame = {
  unlocked: number;
  completed?: number[];
  stars?: Record<string, number>;
  coins?: number;
  sound: boolean;
  music: boolean;
  notifications: boolean;
};

// Coins awarded for clearing a level, by star rating (index = stars earned).
// Reserved as the game's soft currency (peeks, hints, etc. later).
const COIN_REWARD_BY_STARS = [0, 20, 35, 60] as const;

export function coinsForStars(stars: number): number {
  const clamped = Math.max(0, Math.min(3, Math.round(stars)));
  return COIN_REWARD_BY_STARS[clamped];
}

export function summarizeProgress(stars: StarMap): ProgressSummary {
  return Object.values(stars).reduce(
    (summary, value) => ({
      totalStars: summary.totalStars + value,
      clearedLevels: summary.clearedLevels + (value > 0 ? 1 : 0),
      perfectLevels: summary.perfectLevels + (value >= 3 ? 1 : 0)
    }),
    { totalStars: 0, clearedLevels: 0, perfectLevels: 0 }
  );
}

export function findCurrentPlayable(stars: StarMap, effectiveUnlocked: number, levelCount: number) {
  for (let i = 0; i < effectiveUnlocked; i += 1) {
    if (!(stars[i] > 0)) return i;
  }
  return Math.min(effectiveUnlocked - 1, levelCount - 1);
}
