import { COLORS } from "@/constants/theme";

function shuffle(values: number[]) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function makeTiles(grid: number) {
  const total = grid * grid;
  let tiles = shuffle(Array.from({ length: total }, (_, index) => index));
  if (tiles.every((tile, index) => tile === index)) {
    tiles = [...tiles];
    [tiles[0], tiles[1]] = [tiles[1], tiles[0]];
  }
  return tiles;
}

export function levelChipColor(grid: number) {
  if (grid <= 3) return COLORS.teal;
  if (grid === 4) return COLORS.yellow;
  return COLORS.pink;
}
