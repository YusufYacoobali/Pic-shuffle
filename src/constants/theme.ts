export const COLORS = {
  bgTop: "#FFF8EA",
  bgMid: "#F4FBFF",
  bgBottom: "#FFF0F6",
  ink: "#201A30",
  muted: "#716985",
  surface: "#FFFFFF",
  pink: "#FF3D7F",
  pinkDark: "#C92363",
  pinkSoft: "#FFE0EC",
  yellow: "#FFD43B",
  yellowDark: "#DCA300",
  teal: "#00C2B8",
  tealDark: "#00958D",
  tealSoft: "#DDF8F6",
  purple: "#6757F5",
  purpleDark: "#4636C8",
  purpleSoft: "#E9E7FF",
  orange: "#FF7A3D",
  gold: "#F9B900",
  lime: "#A8E84B",
  stroke: "#201A30"
} as const;

export const GRADIENTS = {
  screen: ["#FFF8EA", "#F4FBFF", "#FFF0F6"] as const,
  pink: ["#FF5A94", "#FF2D75"] as const,
  teal: ["#16D8CC", "#00AFA6"] as const,
  purple: ["#7A6BFF", "#5748DE"] as const,
  gold: ["#FFE06A", "#F8AF00"] as const,
  card: ["#FFFFFF", "#FFFDF8"] as const
};

// Fredoka only ships up to 700 (Bold), so `black` reuses Bold — still nicely
// chunky for headings without a heavier weight.
export const FONT = {
  medium: "Fredoka_500Medium",
  semi: "Fredoka_600SemiBold",
  bold: "Fredoka_700Bold",
  black: "Fredoka_700Bold"
} as const;

// 1-3 stars based on how efficiently the level was cleared.
export function starsForResult(
  grid: number,
  mode: "relaxed" | "timed",
  moves: number,
  secondsLeft: number,
  timeLimit: number
) {
  if (mode === "timed") {
    const fraction = timeLimit > 0 ? secondsLeft / timeLimit : 0;
    if (fraction >= 0.45) return 3;
    if (fraction >= 0.2) return 2;
    return 1;
  }
  const par = grid * grid;
  if (moves <= par) return 3;
  if (moves <= par * 2) return 2;
  return 1;
}
