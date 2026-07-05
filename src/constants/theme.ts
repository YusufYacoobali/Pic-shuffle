export const COLORS = {
  bgTop: "#FFF3F9",
  bgMid: "#FFEFE9",
  bgBottom: "#FFEBD9",
  ink: "#2A2140",
  muted: "#9A8FB0",
  surface: "#FFFFFF",
  pink: "#FF4D97",
  pinkDark: "#D62E7E",
  pinkSoft: "#FFE3F0",
  yellow: "#FFC131",
  yellowDark: "#E8A400",
  teal: "#2ED3BF",
  tealDark: "#17A895",
  tealSoft: "#DFF9F5",
  purple: "#7B5CFF",
  purpleDark: "#5B3FD6",
  purpleSoft: "#EFEAFF",
  orange: "#FF8A5C",
  gold: "#FFB400"
} as const;

export const GRADIENTS = {
  screen: ["#FFF3F9", "#FFEFE9", "#FFE9D6"] as const,
  pink: ["#FF74B4", "#FF3D8E"] as const,
  teal: ["#43E4CF", "#1FBBA6"] as const,
  purple: ["#957DFF", "#6A48F5"] as const,
  gold: ["#FFD34D", "#FFAD05"] as const,
  card: ["#FFFFFF", "#FFF7FB"] as const
};

export const FONT = {
  medium: "Baloo2_500Medium",
  semi: "Baloo2_600SemiBold",
  bold: "Baloo2_700Bold",
  black: "Baloo2_800ExtraBold"
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
