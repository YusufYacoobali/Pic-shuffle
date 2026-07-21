import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

import { cachePuzzleImage } from "@/services/puzzle-image-cache";

const BOARD_GAP = 6;
const BOARD_PADDING = 6;
const MAX_RENDER_EDGE = 1920;
const RENDER_SCALE = 3;
const MAX_CACHED_SETS = 3;

export type PreparedPuzzleImages = {
  fullImageUri: string;
  tileImageUris: string[];
};

type PrepareOptions = {
  sourceUri: string;
  sourceWidth: number;
  sourceHeight: number;
  grid: number;
  boardWidth: number;
  boardHeight: number;
};

const prepared = new Map<string, PreparedPuzzleImages>();
const inFlight = new Map<string, Promise<PreparedPuzzleImages>>();

function localSource(uri: string) {
  return /^https?:\/\//i.test(uri) ? cachePuzzleImage(uri) : Promise.resolve(uri);
}

function centeredCrop(width: number, height: number, targetAspect: number) {
  const sourceAspect = width / height;
  if (Math.abs(sourceAspect - targetAspect) < 0.0001) {
    return { originX: 0, originY: 0, width, height };
  }
  if (sourceAspect > targetAspect) {
    const cropWidth = Math.max(1, Math.round(height * targetAspect));
    return {
      originX: Math.floor((width - cropWidth) / 2),
      originY: 0,
      width: cropWidth,
      height
    };
  }
  const cropHeight = Math.max(1, Math.round(width / targetAspect));
  return {
    originX: 0,
    originY: Math.floor((height - cropHeight) / 2),
    width,
    height: cropHeight
  };
}

function remember(key: string, value: PreparedPuzzleImages) {
  prepared.delete(key);
  prepared.set(key, value);
  while (prepared.size > MAX_CACHED_SETS) {
    const oldest = prepared.keys().next().value as string | undefined;
    if (!oldest) break;
    prepared.delete(oldest);
  }
}

export function preparePuzzleImages({
  sourceUri,
  sourceWidth,
  sourceHeight,
  grid,
  boardWidth,
  boardHeight
}: PrepareOptions) {
  const roundedBoardWidth = Math.max(1, Math.round(boardWidth));
  const roundedBoardHeight = Math.max(1, Math.round(boardHeight));
  const key = [
    sourceUri,
    sourceWidth,
    sourceHeight,
    grid,
    roundedBoardWidth,
    roundedBoardHeight
  ].join("|");
  const existing = prepared.get(key);
  if (existing) {
    remember(key, existing);
    return Promise.resolve(existing);
  }
  const pending = inFlight.get(key);
  if (pending) return pending;

  const task = (async () => {
    const uri = await localSource(sourceUri);
    const imageWidth = roundedBoardWidth - BOARD_PADDING * 2;
    const imageHeight = roundedBoardHeight - BOARD_PADDING * 2;
    if (imageWidth <= 0 || imageHeight <= 0) {
      throw new Error("The puzzle board has no drawable area.");
    }

    const edgeScale = Math.min(
      RENDER_SCALE,
      MAX_RENDER_EDGE / Math.max(imageWidth, imageHeight)
    );
    const targetWidth = Math.max(grid, Math.round(imageWidth * edgeScale));
    const targetHeight = Math.max(grid, Math.round(imageHeight * edgeScale));
    const sourceCrop = centeredCrop(
      Math.max(1, sourceWidth),
      Math.max(1, sourceHeight),
      targetWidth / targetHeight
    );
    const normalized = await manipulateAsync(
      uri,
      [{ crop: sourceCrop }, { resize: { width: targetWidth, height: targetHeight } }],
      { compress: 0.9, format: SaveFormat.JPEG }
    );

    const tileWidth = (roundedBoardWidth - BOARD_PADDING * 2 - BOARD_GAP * (grid - 1)) / grid;
    const tileHeight = (roundedBoardHeight - BOARD_PADDING * 2 - BOARD_GAP * (grid - 1)) / grid;
    const pitchX = tileWidth + BOARD_GAP;
    const pitchY = tileHeight + BOARD_GAP;
    const scaleX = normalized.width / imageWidth;
    const scaleY = normalized.height / imageHeight;
    const tileImageUris = new Array<string>(grid * grid);
    let cursor = 0;

    async function worker() {
      while (cursor < tileImageUris.length) {
        const home = cursor;
        cursor += 1;
        const row = Math.floor(home / grid);
        const col = home % grid;
        const originX = Math.max(0, Math.round(col * pitchX * scaleX));
        const originY = Math.max(0, Math.round(row * pitchY * scaleY));
        const displayWidth = tileWidth + (col < grid - 1 ? BOARD_GAP : 0);
        const displayHeight = tileHeight + (row < grid - 1 ? BOARD_GAP : 0);
        const endX = Math.min(normalized.width, Math.round((col * pitchX + displayWidth) * scaleX));
        const endY = Math.min(normalized.height, Math.round((row * pitchY + displayHeight) * scaleY));
        const crop = {
          originX,
          originY,
          width: Math.max(1, endX - originX),
          height: Math.max(1, endY - originY)
        };
        const tile = await manipulateAsync(normalized.uri, [{ crop }], {
          compress: 0.88,
          format: SaveFormat.JPEG
        });
        tileImageUris[home] = tile.uri;
      }
    }

    // Two workers keep preparation quick without decoding several full source
    // images simultaneously on memory-constrained phones.
    await Promise.all([worker(), worker()]);
    const result = { fullImageUri: normalized.uri, tileImageUris };
    remember(key, result);
    return result;
  })().finally(() => {
    inFlight.delete(key);
  });

  inFlight.set(key, task);
  return task;
}
