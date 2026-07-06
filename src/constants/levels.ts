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
