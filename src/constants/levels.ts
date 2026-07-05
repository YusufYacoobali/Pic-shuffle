export type GameMode = "relaxed" | "timed";

export type Level = {
  id: number;
  grid: number;
  mode: GameMode;
  title: string;
};

export const LEVELS: Level[] = [
  { id: 1, grid: 2, mode: "relaxed", title: "Warm Up" },
  { id: 2, grid: 2, mode: "relaxed", title: "Tiny Twist" },
  { id: 3, grid: 3, mode: "relaxed", title: "Nine Lives" },
  { id: 4, grid: 3, mode: "relaxed", title: "Cozy Corners" },
  { id: 5, grid: 3, mode: "timed", title: "Quick Paws" },
  { id: 6, grid: 4, mode: "relaxed", title: "Picture Maker" },
  { id: 7, grid: 4, mode: "timed", title: "Rush Hour" },
  { id: 8, grid: 4, mode: "relaxed", title: "Fine Fit" },
  { id: 9, grid: 5, mode: "relaxed", title: "Puzzle Pop" },
  { id: 10, grid: 5, mode: "timed", title: "Color Sprint" }
];

export const TIMED_SECONDS: Record<number, number> = {
  2: 40,
  3: 75,
  4: 150,
  5: 260
};

export function sizeName(grid: number) {
  if (grid <= 3) return "Easy";
  if (grid === 4) return "Normal";
  return "Hard";
}

export function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}
