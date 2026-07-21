export function sizeName(grid: number) {
  if (grid <= 4) return "Easy";
  if (grid === 5) return "Normal";
  if (grid === 6) return "Hard";
  return "Extra hard";
}

export function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}
