import { PACK_IMAGES } from "@/constants/pack-images";

export type PackTheme = "nature" | "food";
export type LevelKind = "easy" | "challenge" | "boss";

export type PackDef = {
  index: number;
  id: string;
  name: string;
  theme: PackTheme;
  emoji: string;
  accent: string;
  accentSoft: string;
  bossTitle: string;
  titles: string[];
};

export type LevelDef = {
  /** Global index across all packs, 0..TOTAL_LEVELS-1. Save data keys off this. */
  global: number;
  pack: number;
  slot: number;
  /** 1-based number shown to the player (1..25 within a pack). */
  number: number;
  grid: number;
  mode: "relaxed" | "timed";
  timeLimit: number;
  kind: LevelKind;
  title: string;
  image: string;
};

export const PACK_SIZE = 25;

// Packs alternate Nature / Food. Packs 11-12 extend the requested ten to reach
// 300 levels while keeping the alternation.
export const PACKS: PackDef[] = [
  {
    index: 0,
    id: "beaches",
    name: "Beaches & Sunsets",
    theme: "nature",
    emoji: "\u{1F3D6}\uFE0F",
    accent: "#FF7A3D",
    accentSoft: "#FFE8DC",
    bossTitle: "Sunset Master",
    titles: ["Golden Shore", "Palm Breeze", "Tide Lines", "Amber Horizon", "Island Dusk", "Warm Sands", "Coral Evening", "Last Light"]
  },
  {
    index: 1,
    id: "desserts",
    name: "Desserts",
    theme: "food",
    emoji: "\u{1F36E}",
    accent: "#FF3D7F",
    accentSoft: "#FFE0EC",
    bossTitle: "Sugar Overload",
    titles: ["Sweet Start", "Sugar Rush", "Velvet Bite", "Choco Swirl", "Honey Drip", "Berry Cream", "Caramel Cloud", "Midnight Treat"]
  },
  {
    index: 2,
    id: "forests",
    name: "Forests & Waterfalls",
    theme: "nature",
    emoji: "\u{1F332}",
    accent: "#00C2B8",
    accentSoft: "#DDF8F6",
    bossTitle: "Waterfall Guardian",
    titles: ["Green Cathedral", "Misty Falls", "Deep Woods", "Fern Hollow", "Silver Cascade", "Mossy Steps", "Hidden Stream", "Canopy Light"]
  },
  {
    index: 3,
    id: "fastfood",
    name: "Fast Food",
    theme: "food",
    emoji: "\u{1F354}",
    accent: "#F9B900",
    accentSoft: "#FFF3D1",
    bossTitle: "The Mega Combo",
    titles: ["Snack Attack", "Golden Fries", "Stacked High", "Crispy Crunch", "Saucy Slice", "Double Up", "Late Night Bite", "Combo Meal"]
  },
  {
    index: 4,
    id: "flowers",
    name: "Flowers & Gardens",
    theme: "nature",
    emoji: "\u{1F337}",
    accent: "#6757F5",
    accentSoft: "#E9E7FF",
    bossTitle: "Garden Keeper",
    titles: ["First Bloom", "Petal Path", "Tulip Rows", "Wild Meadow", "Rose Garden", "Spring Burst", "Lavender Row", "Full Bloom"]
  },
  {
    index: 5,
    id: "dishes",
    name: "World Dishes",
    theme: "food",
    emoji: "\u{1F35C}",
    accent: "#FF7A3D",
    accentSoft: "#FFE8DC",
    bossTitle: "Master Chef",
    titles: ["First Course", "Chef's Table", "Spice Route", "Noodle Art", "Fresh Plate", "Market Feast", "Slow Simmer", "Signature Dish"]
  },
  {
    index: 6,
    id: "mountains",
    name: "Mountains & Lakes",
    theme: "nature",
    emoji: "\u{1F3D4}\uFE0F",
    accent: "#00C2B8",
    accentSoft: "#DDF8F6",
    bossTitle: "Summit Boss",
    titles: ["High Trail", "Still Water", "Granite Peaks", "Alpine Glow", "Mirror Lake", "Thin Air", "Summit View", "Glacier Blue"]
  },
  {
    index: 7,
    id: "cakes",
    name: "Cakes & Sweets",
    theme: "food",
    emoji: "\u{1F382}",
    accent: "#FF3D7F",
    accentSoft: "#FFE0EC",
    bossTitle: "The Grand Cake",
    titles: ["Frosted Dream", "Layer by Layer", "Sprinkle Party", "Vanilla Cloud", "Birthday Wish", "Tiered Treasure", "Buttercream", "Sweet Crumb"]
  },
  {
    index: 8,
    id: "ocean",
    name: "Ocean & Islands",
    theme: "nature",
    emoji: "\u{1F3DD}\uFE0F",
    accent: "#6757F5",
    accentSoft: "#E9E7FF",
    bossTitle: "Deep Blue Boss",
    titles: ["Blue Lagoon", "Reef Break", "Island Hop", "Turquoise Deep", "Sandbar", "Open Water", "Paradise Cove", "Endless Blue"]
  },
  {
    index: 9,
    id: "fruit",
    name: "Fruit & Smoothies",
    theme: "food",
    emoji: "\u{1F353}",
    accent: "#F9B900",
    accentSoft: "#FFF3D1",
    bossTitle: "Ultimate Blend",
    titles: ["Fresh Squeeze", "Berry Blend", "Tropic Mix", "Morning Boost", "Citrus Pop", "Smooth Sip", "Melon Chill", "Vitamin Wave"]
  },
  {
    index: 10,
    id: "autumn",
    name: "Autumn Forests",
    theme: "nature",
    emoji: "\u{1F342}",
    accent: "#FF7A3D",
    accentSoft: "#FFE8DC",
    bossTitle: "King of Fall",
    titles: ["Amber Woods", "Falling Leaves", "Golden Path", "Harvest Light", "Crimson Trail", "October Mist", "Maple Glow", "Quiet Grove"]
  },
  {
    index: 11,
    id: "streetfood",
    name: "Street Food",
    theme: "food",
    emoji: "\u{1F32E}",
    accent: "#FF3D7F",
    accentSoft: "#FFE0EC",
    bossTitle: "Market Legend",
    titles: ["Night Market", "Food Cart", "Sizzle Stand", "Taco Stop", "Grill Smoke", "Corner Stall", "Neon Bites", "Street Sizzle"]
  }
];

export const TOTAL_LEVELS = PACKS.length * PACK_SIZE; // 300

// All level images are requested as exact 1080x1920 crops.
export const LEVEL_IMAGE_ASPECT = 9 / 16;

// Base time budgets (seconds) for timed levels, by grid size.
const BASE_TIME: Record<number, number> = { 3: 90, 4: 165, 5: 250 };

function gridForSlot(slot: number) {
  if (slot >= 17) return 5; // late levels + boss
  if (slot >= 8) return 4; // mid levels
  return 3; // early levels
}

function kindForSlot(slot: number): LevelKind {
  if (slot === PACK_SIZE - 1) return "boss";
  // two easier levels, then one challenge (slots 2, 5, 8, ...)
  return (slot + 1) % 3 === 0 ? "challenge" : "easy";
}

function timeLimitFor(grid: number, kind: LevelKind, packIndex: number) {
  if (kind === "easy") return 0;
  // packs get gradually tighter; the boss is tighter still
  const packFactor = Math.max(0.72, 1 - packIndex * 0.02);
  const bossFactor = kind === "boss" ? 0.75 : 1;
  const seconds = (BASE_TIME[grid] ?? 180) * packFactor * bossFactor;
  return Math.max(30, Math.round(seconds / 5) * 5);
}

function buildLevel(packIndex: number, slot: number): LevelDef {
  const pack = PACKS[packIndex];
  const kind = kindForSlot(slot);
  const grid = gridForSlot(slot);
  const timeLimit = timeLimitFor(grid, kind, packIndex);
  const images = PACK_IMAGES[pack.id] ?? [];
  return {
    global: packIndex * PACK_SIZE + slot,
    pack: packIndex,
    slot,
    number: slot + 1,
    grid,
    mode: timeLimit > 0 ? "timed" : "relaxed",
    timeLimit,
    kind,
    title: kind === "boss" ? pack.bossTitle : pack.titles[slot % pack.titles.length],
    image: images.length ? images[slot % images.length] : ""
  };
}

// Precomputed once at module load - 300 tiny objects, negligible cost.
export const ALL_LEVELS: LevelDef[] = PACKS.flatMap((pack) =>
  Array.from({ length: PACK_SIZE }, (_, slot) => buildLevel(pack.index, slot))
);

export function getLevel(global: number): LevelDef {
  return ALL_LEVELS[Math.max(0, Math.min(TOTAL_LEVELS - 1, global))];
}

export function getPackLevels(packIndex: number): LevelDef[] {
  return ALL_LEVELS.slice(packIndex * PACK_SIZE, (packIndex + 1) * PACK_SIZE);
}

