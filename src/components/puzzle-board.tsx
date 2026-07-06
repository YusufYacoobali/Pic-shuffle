import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useRef, useState } from "react";
import { Image, View, type ImageSourcePropType } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue
} from "react-native-reanimated";

const SURFACE = "#FFFFFF";
const VALID_TINT = "#FFC83D";
const INVALID_TINT = "#FF5C6C";

const MOVE_SPRING = { damping: 26, stiffness: 360, mass: 1 };
const SNAP_SPRING = { damping: 28, stiffness: 430, mass: 1 };
const LIFT_SPRING = { damping: 20, stiffness: 400, mass: 0.8 };
const GHOST_SPRING = { damping: 26, stiffness: 380, mass: 0.9 };
const MORPH_MS = 220;
const RADIUS_MS = 160;

function rowOf(cell: number, grid: number) {
  "worklet";
  return Math.floor(cell / grid);
}

function colOf(cell: number, grid: number) {
  "worklet";
  return cell % grid;
}

function clampValue(value: number, min: number, max: number) {
  "worklet";
  return Math.min(max, Math.max(min, value));
}

// Any in-bounds translation is a legal drop. The dragged piece moves by the
// offset and whatever it lands on wraps around to fill the cells it vacated
// (see commitDrop) — displaced pieces, single or merged, slide out to the
// opposite side and keep their shape. The gesture clamps the anchor so the
// group always stays fully on the board, so the only illegal "drop" is a
// no-op back onto the piece's own starting position.
function canDropAt(
  _cells: number[],
  rowDelta: number,
  colDelta: number,
  _grid: number,
  _groups: number[][],
  _groupByCell: number[]
) {
  "worklet";
  return rowDelta !== 0 || colDelta !== 0;
}

function areCorrectNeighbors(fromCell: number, toCell: number, tiles: number[], grid: number) {
  const from = tiles[fromCell];
  const to = tiles[toCell];
  const cellRowDelta = rowOf(toCell, grid) - rowOf(fromCell, grid);
  const cellColDelta = colOf(toCell, grid) - colOf(fromCell, grid);
  const homeRowDelta = rowOf(to, grid) - rowOf(from, grid);
  const homeColDelta = colOf(to, grid) - colOf(from, grid);
  return cellRowDelta === homeRowDelta && cellColDelta === homeColDelta;
}

export function buildConnectedGroups(tiles: number[], grid: number) {
  const parent = tiles.map((_, index) => index);

  function find(cell: number): number {
    if (parent[cell] !== cell) parent[cell] = find(parent[cell]);
    return parent[cell];
  }

  function unite(a: number, b: number) {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent[rootB] = rootA;
  }

  for (let cell = 0; cell < tiles.length; cell += 1) {
    const col = colOf(cell, grid);
    const row = rowOf(cell, grid);
    if (col < grid - 1 && areCorrectNeighbors(cell, cell + 1, tiles, grid)) {
      unite(cell, cell + 1);
    }
    if (row < grid - 1 && areCorrectNeighbors(cell, cell + grid, tiles, grid)) {
      unite(cell, cell + grid);
    }
  }

  const groups: number[][] = [];
  const groupByRoot = new Map<number, number>();
  const groupByCell = tiles.map((_, cell) => {
    const root = find(cell);
    let groupIndex = groupByRoot.get(root);
    if (groupIndex === undefined) {
      groupIndex = groups.length;
      groupByRoot.set(root, groupIndex);
      groups.push([]);
    }
    groups[groupIndex].push(cell);
    return groupIndex;
  });

  return { groups, groupByCell };
}

type DragSessionSV = {
  cells: number[];
  anchorRow: number;
  anchorCol: number;
  spanRows: number;
  spanCols: number;
  originX: number;
  originY: number;
};

type DragState = { cells: number[] } | null;

type TileLink = { left: boolean; right: boolean; up: boolean; down: boolean };

// Pixel geometry of the board. X (columns) and Y (rows) are independent so the
// board can be any aspect ratio — square, portrait, or landscape.
type Geometry = {
  gap: number;
  padding: number;
  tileW: number;
  tileH: number;
  pitchX: number;
  pitchY: number;
  imageW: number;
  imageH: number;
};

type PuzzleBoardProps = {
  grid: number;
  tiles: number[];
  boardWidth: number;
  boardHeight: number;
  image: ImageSourcePropType;
  solved: boolean;
  disabled: boolean;
  onMove: (nextTiles: number[]) => void;
};

export function PuzzleBoard({
  grid,
  tiles,
  boardWidth,
  boardHeight,
  image,
  solved,
  disabled,
  onMove
}: PuzzleBoardProps) {
  const total = grid * grid;
  const ready = tiles.length === total;
  const gap = 6;
  const padding = 6;
  const tileW = (boardWidth - padding * 2 - gap * (grid - 1)) / grid;
  const tileH = (boardHeight - padding * 2 - gap * (grid - 1)) / grid;
  const pitchX = tileW + gap;
  const pitchY = tileH + gap;
  const imageW = tileW * grid + gap * (grid - 1);
  const imageH = tileH * grid + gap * (grid - 1);
  const geo: Geometry = { gap, padding, tileW, tileH, pitchX, pitchY, imageW, imageH };

  const connected = useMemo(() => buildConnectedGroups(tiles, grid), [tiles, grid]);
  const { groups, groupByCell } = connected;

  const [drag, setDrag] = useState<DragState>(null);
  const [merge, setMerge] = useState<{ key: number; homes: number[] }>({ key: 0, homes: [] });

  const session = useSharedValue<DragSessionSV | null>(null);
  const accepted = useSharedValue(false);
  const handoffRef = useRef({ dx: 0, dy: 0 });
  const overlayX = useSharedValue(0);
  const overlayY = useSharedValue(0);
  const liftScale = useSharedValue(1);
  const ghostX = useSharedValue(0);
  const ghostY = useSharedValue(0);
  const ghostOn = useSharedValue(0);
  const ghostValidP = useSharedValue(1);
  const hoverKey = useSharedValue(-1);

  function beginDrag(cells: number[]) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setDrag({ cells });
  }

  function hoverTick() {
    Haptics.selectionAsync().catch(() => {});
  }

  // Runs the moment the finger lifts: the dropped piece and every displaced
  // tile animate at the same time, springing from wherever the drag left off.
  function resolveDrop(
    cells: number[],
    moved: boolean,
    rowDelta: number,
    colDelta: number,
    dx: number,
    dy: number
  ) {
    handoffRef.current = { dx, dy };
    if (!moved) {
      setDrag(null);
      return;
    }
    commitDrop(cells, rowDelta, colDelta);
  }

  function commitDrop(cells: number[], rowDelta: number, colDelta: number) {
    const offset = rowDelta * grid + colDelta;
    const srcSet = new Set(cells);
    const destCells = cells.map((cell) => cell + offset);
    const destSet = new Set(destCells);
    const next = [...tiles];

    cells.forEach((cell) => {
      next[cell + offset] = tiles[cell];
    });

    // Displaced tiles slide by the inverse offset; the ones that can't fill
    // the remaining vacated cells in reading order.
    const vacated = cells.filter((cell) => !destSet.has(cell));
    const used = new Set<number>();
    const deferred: number[] = [];
    destCells.forEach((dest) => {
      if (srcSet.has(dest)) return;
      const back = dest - offset;
      if (!destSet.has(back)) {
        next[back] = tiles[dest];
        used.add(back);
      } else {
        deferred.push(dest);
      }
    });
    const free = vacated.filter((cell) => !used.has(cell)).sort((a, b) => a - b);
    deferred
      .sort((a, b) => a - b)
      .forEach((dest, index) => {
        next[free[index]] = tiles[dest];
      });

    const nextConnected = buildConnectedGroups(next, grid);
    const landedGroup = nextConnected.groups[nextConnected.groupByCell[cells[0] + offset]];
    if (landedGroup.length > cells.length) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      setMerge((current) => ({
        key: current.key + 1,
        homes: landedGroup.map((cell) => next[cell])
      }));
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    setDrag(null);
    onMove(next);
  }

  const pan = Gesture.Pan()
    .enabled(!disabled && !solved && ready)
    .maxPointers(1)
    .minDistance(0)
    .shouldCancelWhenOutside(false)
    .onBegin((event) => {
      if (session.value) {
        accepted.value = false;
        return;
      }
      const inX = event.x - padding;
      const inY = event.y - padding;
      if (
        inX < 0 ||
        inY < 0 ||
        inX > boardWidth - padding * 2 ||
        inY > boardHeight - padding * 2
      ) {
        accepted.value = false;
        return;
      }
      const col = clampValue(Math.floor((inX + gap / 2) / pitchX), 0, grid - 1);
      const row = clampValue(Math.floor((inY + gap / 2) / pitchY), 0, grid - 1);
      const cells = groups[groupByCell[row * grid + col]];
      let minRow = grid;
      let minCol = grid;
      let maxRow = 0;
      let maxCol = 0;
      for (let i = 0; i < cells.length; i += 1) {
        const cellRow = rowOf(cells[i], grid);
        const cellCol = colOf(cells[i], grid);
        if (cellRow < minRow) minRow = cellRow;
        if (cellRow > maxRow) maxRow = cellRow;
        if (cellCol < minCol) minCol = cellCol;
        if (cellCol > maxCol) maxCol = cellCol;
      }
      const originX = padding + minCol * pitchX;
      const originY = padding + minRow * pitchY;

      accepted.value = true;
      session.value = {
        cells,
        anchorRow: minRow,
        anchorCol: minCol,
        spanRows: maxRow - minRow,
        spanCols: maxCol - minCol,
        originX,
        originY
      };
      overlayX.value = originX;
      overlayY.value = originY;
      liftScale.value = withSpring(1.045, LIFT_SPRING);
      ghostX.value = originX;
      ghostY.value = originY;
      ghostValidP.value = 1;
      ghostOn.value = withTiming(1, { duration: 140 });
      hoverKey.value = minRow * grid + minCol;
      runOnJS(beginDrag)([...cells]);
    })
    .onUpdate((event) => {
      const active = session.value;
      if (!active || !accepted.value) return;
      overlayX.value = active.originX + event.translationX;
      overlayY.value = active.originY + event.translationY;

      const col = clampValue(
        Math.round((overlayX.value - padding) / pitchX),
        0,
        grid - 1 - active.spanCols
      );
      const row = clampValue(
        Math.round((overlayY.value - padding) / pitchY),
        0,
        grid - 1 - active.spanRows
      );
      const key = row * grid + col;
      if (key === hoverKey.value) return;
      hoverKey.value = key;
      ghostX.value = withSpring(padding + col * pitchX, GHOST_SPRING);
      ghostY.value = withSpring(padding + row * pitchY, GHOST_SPRING);
      const atSource = row === active.anchorRow && col === active.anchorCol;
      const valid =
        atSource ||
        canDropAt(
          active.cells,
          row - active.anchorRow,
          col - active.anchorCol,
          grid,
          groups,
          groupByCell
        );
      ghostValidP.value = withTiming(valid ? 1 : 0, { duration: 120 });
      runOnJS(hoverTick)();
    })
    .onFinalize(() => {
      const active = session.value;
      if (!active || !accepted.value) return;
      accepted.value = false;

      const col = clampValue(
        Math.round((overlayX.value - padding) / pitchX),
        0,
        grid - 1 - active.spanCols
      );
      const row = clampValue(
        Math.round((overlayY.value - padding) / pitchY),
        0,
        grid - 1 - active.spanRows
      );
      const rowDelta = row - active.anchorRow;
      const colDelta = col - active.anchorCol;
      const moved = canDropAt(active.cells, rowDelta, colDelta, grid, groups, groupByCell);
      const finalX = moved ? padding + col * pitchX : active.originX;
      const finalY = moved ? padding + row * pitchY : active.originY;
      const cells = active.cells;
      const dx = overlayX.value - finalX;
      const dy = overlayY.value - finalY;

      ghostOn.value = 0;
      liftScale.value = 1;
      session.value = null;
      runOnJS(resolveDrop)(cells, moved, rowDelta, colDelta, dx, dy);
    });

  const overlayStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: overlayX.value },
      { translateY: overlayY.value },
      { scale: liftScale.value }
    ]
  }));

  const dragInfo = useMemo(() => {
    if (!drag) return null;
    const rows = drag.cells.map((cell) => rowOf(cell, grid));
    const cols = drag.cells.map((cell) => colOf(cell, grid));
    return {
      minRow: Math.min(...rows),
      minCol: Math.min(...cols),
      spanRows: Math.max(...rows) - Math.min(...rows),
      spanCols: Math.max(...cols) - Math.min(...cols),
      cellSet: new Set(drag.cells)
    };
  }, [drag, grid]);

  const hiddenHomes = useMemo(
    () => new Set((drag?.cells ?? []).map((cell) => tiles[cell])),
    [drag, tiles]
  );

  return (
    <GestureDetector gesture={pan}>
      <View
        collapsable={false}
        style={{
          width: boardWidth,
          height: boardHeight,
          position: "relative",
          borderRadius: 22,
          backgroundColor: SURFACE,
          boxShadow: "0 12px 26px rgba(123,92,255,0.16), inset 0 0 0 1px rgba(0,0,0,0.04)"
        }}
      >
        {ready &&
          tiles.map((home, cell) => {
            const groupIndex = groupByCell[cell];
            const link: TileLink = {
              left: colOf(cell, grid) > 0 && groupByCell[cell - 1] === groupIndex,
              right: colOf(cell, grid) < grid - 1 && groupByCell[cell + 1] === groupIndex,
              up: rowOf(cell, grid) > 0 && groupByCell[cell - grid] === groupIndex,
              down: rowOf(cell, grid) < grid - 1 && groupByCell[cell + grid] === groupIndex
            };
            return (
              <TileView
                key={home}
                home={home}
                cell={cell}
                grid={grid}
                geo={geo}
                image={image}
                solved={solved}
                hidden={hiddenHomes.has(home)}
                inGroup={groups[groupIndex].length > 1}
                link={link}
                mergeKey={merge.homes.includes(home) ? merge.key : 0}
                handoff={handoffRef}
              />
            );
          })}

        {solved && <CompletedImageReveal image={image} boardWidth={boardWidth} boardHeight={boardHeight} />}

        {drag &&
          dragInfo &&
          drag.cells.map((cell) => {
            const col = colOf(cell, grid);
            const row = rowOf(cell, grid);
            const bridgeRight = col < grid - 1 && dragInfo.cellSet.has(cell + 1);
            const bridgeDown = row < grid - 1 && dragInfo.cellSet.has(cell + grid);
            return (
              <GhostCell
                key={cell}
                relX={(col - dragInfo.minCol) * pitchX}
                relY={(row - dragInfo.minRow) * pitchY}
                width={tileW + (bridgeRight ? gap : 0)}
                height={tileH + (bridgeDown ? gap : 0)}
                ghostX={ghostX}
                ghostY={ghostY}
                ghostOn={ghostOn}
                validP={ghostValidP}
              />
            );
          })}

        {drag && dragInfo && (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: "absolute",
                left: 0,
                top: 0,
                zIndex: 10,
                width: (dragInfo.spanCols + 1) * tileW + dragInfo.spanCols * gap,
                height: (dragInfo.spanRows + 1) * tileH + dragInfo.spanRows * gap,
                boxShadow: "0 16px 30px rgba(42,33,64,0.34)",
                borderRadius: 12
              },
              overlayStyle
            ]}
          >
            {drag.cells.map((cell) => {
              const home = tiles[cell];
              const col = colOf(cell, grid);
              const row = rowOf(cell, grid);
              const bridgeLeft = col > 0 && dragInfo.cellSet.has(cell - 1);
              const bridgeRight = col < grid - 1 && dragInfo.cellSet.has(cell + 1);
              const bridgeUp = row > 0 && dragInfo.cellSet.has(cell - grid);
              const bridgeDown = row < grid - 1 && dragInfo.cellSet.has(cell + grid);
              return (
                <View
                  key={home}
                  style={{
                    position: "absolute",
                    left: (col - dragInfo.minCol) * pitchX,
                    top: (row - dragInfo.minRow) * pitchY,
                    width: tileW + (bridgeRight ? gap : 0),
                    height: tileH + (bridgeDown ? gap : 0),
                    borderTopLeftRadius: bridgeLeft || bridgeUp ? 0 : 12,
                    borderTopRightRadius: bridgeRight || bridgeUp ? 0 : 12,
                    borderBottomLeftRadius: bridgeLeft || bridgeDown ? 0 : 12,
                    borderBottomRightRadius: bridgeRight || bridgeDown ? 0 : 12,
                    overflow: "hidden",
                    backgroundColor: SURFACE,
                    borderWidth: drag.cells.length > 1 ? 0 : 3,
                    borderColor: "rgba(255,255,255,0.55)"
                  }}
                >
                  <Image
                    source={image}
                    resizeMode="cover"
                    style={{
                      position: "absolute",
                      width: imageW,
                      height: imageH,
                      left: -colOf(home, grid) * pitchX,
                      top: -rowOf(home, grid) * pitchY
                    }}
                  />
                </View>
              );
            })}
          </Animated.View>
        )}
      </View>
    </GestureDetector>
  );
}

function CompletedImageReveal({
  image,
  boardWidth,
  boardHeight
}: {
  image: ImageSourcePropType;
  boardWidth: number;
  boardHeight: number;
}) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.985);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 260 });
    scale.value = withSpring(1, { damping: 18, stiffness: 180, mass: 0.9 });
  }, [opacity, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }]
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: 0,
          top: 0,
          width: boardWidth,
          height: boardHeight,
          borderRadius: 22,
          overflow: "hidden",
          zIndex: 8
        },
        style
      ]}
    >
      <Image source={image} resizeMode="cover" style={{ width: "100%", height: "100%" }} />
    </Animated.View>
  );
}

function GhostCell({
  relX,
  relY,
  width,
  height,
  ghostX,
  ghostY,
  ghostOn,
  validP
}: {
  relX: number;
  relY: number;
  width: number;
  height: number;
  ghostX: SharedValue<number>;
  ghostY: SharedValue<number>;
  ghostOn: SharedValue<number>;
  validP: SharedValue<number>;
}) {
  const ghostStyle = useAnimatedStyle(() => ({
    opacity: ghostOn.value,
    transform: [
      { translateX: ghostX.value + relX },
      { translateY: ghostY.value + relY }
    ],
    borderColor: interpolateColor(validP.value, [0, 1], [INVALID_TINT, VALID_TINT]),
    backgroundColor: interpolateColor(
      validP.value,
      [0, 1],
      ["rgba(255,92,108,0.16)", "rgba(255,200,61,0.18)"]
    )
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: 0,
          top: 0,
          width,
          height,
          borderRadius: 12,
          borderWidth: 2.5,
          zIndex: 4
        },
        ghostStyle
      ]}
    />
  );
}

type TileViewProps = {
  home: number;
  cell: number;
  grid: number;
  geo: Geometry;
  image: ImageSourcePropType;
  solved: boolean;
  hidden: boolean;
  inGroup: boolean;
  link: TileLink;
  mergeKey: number;
  handoff: { current: { dx: number; dy: number } };
};

function TileView({
  home,
  cell,
  grid,
  geo,
  image,
  solved,
  hidden,
  inGroup,
  link,
  mergeKey,
  handoff
}: TileViewProps) {
  const { gap, padding, tileW, tileH, pitchX, pitchY, imageW, imageH } = geo;
  const targetX = padding + colOf(cell, grid) * pitchX;
  const targetY = padding + rowOf(cell, grid) * pitchY;
  const x = useSharedValue(targetX);
  const y = useSharedValue(targetY);
  const flash = useSharedValue(0);
  const wasHidden = useRef(hidden);

  useEffect(() => {
    if (wasHidden.current && !hidden) {
      // This tile was riding along in the drag overlay: start from where the
      // finger released it and spring into the slot.
      x.value = targetX + handoff.current.dx;
      y.value = targetY + handoff.current.dy;
      x.value = withSpring(targetX, SNAP_SPRING);
      y.value = withSpring(targetY, SNAP_SPRING);
    } else {
      x.value = withSpring(targetX, MOVE_SPRING);
      y.value = withSpring(targetY, MOVE_SPRING);
    }
    wasHidden.current = hidden;
  }, [targetX, targetY, hidden, x, y, handoff]);

  useEffect(() => {
    if (mergeKey > 0) {
      flash.value = withSequence(
        withTiming(0.34, { duration: 90 }),
        withTiming(0, { duration: 340 })
      );
    }
  }, [mergeKey, flash]);

  const width = tileW + (link.right ? gap : 0);
  const height = tileH + (link.down ? gap : 0);
  const topLeft = solved || link.left || link.up ? 0 : 12;
  const topRight = solved || link.right || link.up ? 0 : 12;
  const bottomLeft = solved || link.left || link.down ? 0 : 12;
  const bottomRight = solved || link.right || link.down ? 0 : 12;
  const imageCol = colOf(home, grid);
  const imageRow = rowOf(home, grid);

  const positionStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }]
  }));

  const morphStyle = useAnimatedStyle(
    () => ({
      width: withTiming(width, { duration: MORPH_MS }),
      height: withTiming(height, { duration: MORPH_MS }),
      borderTopLeftRadius: withTiming(topLeft, { duration: RADIUS_MS }),
      borderTopRightRadius: withTiming(topRight, { duration: RADIUS_MS }),
      borderBottomLeftRadius: withTiming(bottomLeft, { duration: RADIUS_MS }),
      borderBottomRightRadius: withTiming(bottomRight, { duration: RADIUS_MS })
    }),
    [width, height, topLeft, topRight, bottomLeft, bottomRight]
  );

  const imageStyle = useAnimatedStyle(
    () => ({
      width: withTiming(imageW, { duration: MORPH_MS }),
      height: withTiming(imageH, { duration: MORPH_MS }),
      transform: [
        { translateX: withTiming(-imageCol * pitchX, { duration: MORPH_MS }) },
        { translateY: withTiming(-imageRow * pitchY, { duration: MORPH_MS }) }
      ]
    }),
    [imageW, imageH, imageCol, imageRow, pitchX, pitchY]
  );

  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: 0,
          top: 0,
          width,
          height,
          overflow: "hidden",
          backgroundColor: SURFACE,
          borderWidth: solved || inGroup ? 0 : 3,
          borderColor: "rgba(255,255,255,0.42)",
          zIndex: inGroup ? 2 : 1,
          opacity: hidden ? 0 : 1,
          boxShadow: solved || inGroup ? "none" : "inset 0 0 0 1px rgba(255,255,255,0.16)"
        },
        positionStyle,
        morphStyle
      ]}
    >
      <Animated.Image
        source={image}
        resizeMode="cover"
        style={[
          { position: "absolute", left: 0, top: 0, width: imageW, height: imageH },
          imageStyle
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#FFFFFF"
          },
          flashStyle
        ]}
      />
    </Animated.View>
  );
}
