import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import * as SecureStore from "expo-secure-store";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  type ImageSourcePropType,
  Pressable,
  ScrollView,
  Switch,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  ZoomIn
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { CatMascot } from "@/components/cat-mascot";
import { Confetti } from "@/components/confetti";
import {
  BackgroundBlobs,
  Chip,
  Floaty,
  GameButton,
  IconButton,
  PopStar,
  StarRow,
  StatPill
} from "@/components/game-ui";
import { LevelPath } from "@/components/level-path";
import { PuzzleBoard } from "@/components/puzzle-board";
import { formatClock, LEVELS, sizeName, TIMED_SECONDS } from "@/constants/levels";
import { COLORS, FONT, GRADIENTS, starsForResult } from "@/constants/theme";
import {
  cancelReminders,
  maybeRequestNativeReview,
  scheduleEveryOtherDayReminder
} from "@/services/native-cadence";

const PUZZLE_IMAGE = require("../assets/images/test-img.jpg");

// Aspect ratio (width / height) of the built-in puzzle image. Read once so the
// board can be sized to match instead of assuming a square. resolveAssetSource
// is native-only, so fall back to square when it's unavailable (e.g. web).
const BASE_ASPECT = (() => {
  try {
    const resolve = (Image as { resolveAssetSource?: (src: ImageSourcePropType) => { width: number; height: number } })
      .resolveAssetSource;
    if (typeof resolve !== "function") return 1;
    const meta = resolve(PUZZLE_IMAGE);
    return meta?.height ? meta.width / meta.height : 1;
  } catch {
    return 1;
  }
})();

const PHOTO_GRIDS = [
  { grid: 3, label: "Easy", color: COLORS.teal },
  { grid: 4, label: "Normal", color: COLORS.yellow },
  { grid: 5, label: "Hard", color: COLORS.pink }
];

const SAVE_KEY = "picshuffle.save.v1";

// Largest board (in px) that fits the available area while keeping the image's
// aspect ratio. `aspect` is width / height.
function fitBoard(areaW: number, areaH: number, aspect: number) {
  if (areaW <= 0 || areaH <= 0) return { w: 0, h: 0 };
  const maxW = areaW - 4;
  const maxH = areaH - 4;
  let w = maxW;
  let h = w / aspect;
  if (h > maxH) {
    h = maxH;
    w = h * aspect;
  }
  return { w: Math.floor(w), h: Math.floor(h) };
}

// TODO: TESTING ONLY — remove before release. Unlocks every level regardless of
// saved progress so all levels can be reached during testing. Real unlock
// progress is still tracked and saved underneath; this only affects gating.
const UNLOCK_ALL_FOR_TESTING = true;

type Screen = "home" | "ready" | "photoSetup" | "play";
type Result = null | "win" | "timeup";
type Mode = "level" | "photo";

type SavedGame = {
  unlocked: number;
  completed?: number[];
  stars?: Record<string, number>;
  sound: boolean;
  music: boolean;
  notifications: boolean;
};

function shuffle(values: number[]) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function makeTiles(grid: number) {
  const total = grid * grid;
  let tiles = shuffle(Array.from({ length: total }, (_, index) => index));
  if (tiles.every((tile, index) => tile === index)) {
    tiles = [...tiles];
    [tiles[0], tiles[1]] = [tiles[1], tiles[0]];
  }
  return tiles;
}

function levelChipColor(grid: number) {
  if (grid <= 3) return COLORS.teal;
  if (grid === 4) return COLORS.yellow;
  return COLORS.pink;
}

function winTitle(stars: number) {
  if (stars >= 3) return "Purr-fect!";
  if (stars === 2) return "Great job!";
  return "You did it!";
}

export default function PicShuffleScreen() {
  const { width } = useWindowDimensions();
  const hydrated = useRef(false);

  const [screen, setScreen] = useState<Screen>("home");
  const [levelIndex, setLevelIndex] = useState(0);
  const [unlocked, setUnlocked] = useState(1);
  const [stars, setStars] = useState<Record<number, number>>({});
  const [sound, setSound] = useState(true);
  const [music, setMusic] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [tiles, setTiles] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [solved, setSolved] = useState(false);
  const [peeking, setPeeking] = useState(false);
  const [earnedStars, setEarnedStars] = useState(0);

  const [mode, setMode] = useState<Mode>("level");
  const [photo, setPhoto] = useState<{ uri: string; aspect: number } | null>(null);
  const [photoGrid, setPhotoGrid] = useState(3);
  const [boardArea, setBoardArea] = useState({ w: 0, h: 0 });

  const level = LEVELS[levelIndex];
  const isTimed = level.mode === "timed";
  const timeLimit = TIMED_SECONDS[level.grid] ?? 0;

  // The puzzle currently in play — either a campaign level or a one-off photo.
  const activeGrid = mode === "photo" ? photoGrid : level.grid;
  const activeTimed = mode === "photo" ? false : isTimed;
  const activeTimeLimit = mode === "photo" ? 0 : timeLimit;
  const activeImage: ImageSourcePropType =
    mode === "photo" && photo ? { uri: photo.uri } : PUZZLE_IMAGE;
  const activeAspect = mode === "photo" && photo ? photo.aspect : BASE_ASPECT;

  const board = fitBoard(boardArea.w, boardArea.h, activeAspect);
  const elapsed = activeTimed ? activeTimeLimit - seconds : seconds;
  const lowTime = activeTimed && seconds <= 10;
  const totalStars = useMemo(
    () => Object.values(stars).reduce((sum, value) => sum + value, 0),
    [stars]
  );

  // Number of levels the player may enter. Overridden while the testing flag is
  // on; the underlying `unlocked` still reflects genuine progress.
  const effectiveUnlocked = UNLOCK_ALL_FOR_TESTING ? LEVELS.length : unlocked;

  const currentPlayable = useMemo(() => {
    for (let i = 0; i < effectiveUnlocked; i += 1) {
      if (!(stars[i] > 0)) return i;
    }
    return Math.min(effectiveUnlocked - 1, LEVELS.length - 1);
  }, [stars, effectiveUnlocked]);

  useEffect(() => {
    async function hydrate() {
      const raw = await SecureStore.getItemAsync(SAVE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<SavedGame>;
        if (typeof saved.unlocked === "number") {
          setUnlocked(Math.min(Math.max(saved.unlocked, 1), LEVELS.length));
        }
        if (saved.stars && typeof saved.stars === "object") {
          const parsed: Record<number, number> = {};
          Object.entries(saved.stars).forEach(([key, value]) => {
            const index = Number(key);
            if (Number.isInteger(index) && index >= 0 && index < LEVELS.length) {
              parsed[index] = Math.min(Math.max(Number(value) || 0, 0), 3);
            }
          });
          setStars(parsed);
        } else if (Array.isArray(saved.completed)) {
          // old save format: completed levels count as 1 star
          const migrated: Record<number, number> = {};
          saved.completed.forEach((item) => {
            if (Number.isInteger(item) && item >= 0 && item < LEVELS.length) {
              migrated[item] = 1;
            }
          });
          setStars(migrated);
        }
        if (typeof saved.sound === "boolean") setSound(saved.sound);
        if (typeof saved.music === "boolean") setMusic(saved.music);
        if (typeof saved.notifications === "boolean") {
          setNotifications(saved.notifications);
          if (saved.notifications) scheduleEveryOtherDayReminder().catch(() => {});
        } else {
          scheduleEveryOtherDayReminder().catch(() => {});
        }
      } else {
        scheduleEveryOtherDayReminder().catch(() => {});
      }
      hydrated.current = true;
    }

    hydrate().catch(() => {
      hydrated.current = true;
    });
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    const save: SavedGame = { unlocked, stars, sound, music, notifications };
    SecureStore.setItemAsync(SAVE_KEY, JSON.stringify(save)).catch(() => {});
  }, [music, notifications, sound, stars, unlocked]);

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      setSeconds((value) => (activeTimed ? Math.max(value - 1, 0) : value + 1));
    }, 1000);
    return () => clearInterval(id);
  }, [activeTimed, running]);

  useEffect(() => {
    if (running && activeTimed && seconds === 0) {
      setRunning(false);
      setResult("timeup");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
  }, [activeTimed, running, seconds]);

  useEffect(() => {
    if (!peeking) return undefined;
    const id = setTimeout(() => setPeeking(false), 1300);
    return () => clearTimeout(id);
  }, [peeking]);

  function openLevel(index: number) {
    if (index >= effectiveUnlocked) return;
    setMode("level");
    setLevelIndex(index);
    setScreen("ready");
    setResult(null);
    setSolved(false);
    setPeeking(false);
    Haptics.selectionAsync().catch(() => {});
  }

  // (Re)start the current puzzle — a level from the ready screen, or a photo
  // via Reset/Shuffle/Replay. Reads the active config, so it serves both modes.
  function startGame() {
    setTiles(makeTiles(activeGrid));
    setMoves(0);
    setSeconds(activeTimed ? activeTimeLimit || 90 : 0);
    setRunning(true);
    setResult(null);
    setSolved(false);
    setPeeking(false);
    setScreen("play");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }

  async function pickPhoto() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9
      });
      if (res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];
      const aspect = asset.width && asset.height ? asset.width / asset.height : 1;
      setPhoto({ uri: asset.uri, aspect });
      setMode("photo");
      setResult(null);
      setSolved(false);
      setScreen("photoSetup");
      Haptics.selectionAsync().catch(() => {});
    } catch {
      // picker unavailable or dismissed — stay put
    }
  }

  function startPhotoGame(grid: number) {
    setMode("photo");
    setPhotoGrid(grid);
    setTiles(makeTiles(grid));
    setMoves(0);
    setSeconds(0);
    setRunning(true);
    setResult(null);
    setSolved(false);
    setPeeking(false);
    setScreen("play");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }

  function goHome() {
    setRunning(false);
    setMode("level");
    setScreen("home");
    setResult(null);
    setPeeking(false);
    setSolved(false);
  }

  function nextLevel() {
    const next = levelIndex + 1;
    if (next < LEVELS.length) {
      setLevelIndex(next);
      setScreen("ready");
      setResult(null);
      setSolved(false);
      setPeeking(false);
      return;
    }
    goHome();
  }

  function finishGame(nextTiles: number[], nextMoves: number) {
    const earned = starsForResult(
      activeGrid,
      activeTimed ? "timed" : "relaxed",
      nextMoves,
      seconds,
      activeTimeLimit
    );
    setTiles(nextTiles);
    setMoves(nextMoves);
    setRunning(false);
    setEarnedStars(earned);
    // Photo puzzles are one-offs and don't touch campaign progress.
    if (mode === "level") {
      setStars((current) => ({
        ...current,
        [levelIndex]: Math.max(current[levelIndex] ?? 0, earned)
      }));
      setUnlocked((current) => Math.min(LEVELS.length, Math.max(current, levelIndex + 2)));
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setTimeout(() => setSolved(true), 280);
    setTimeout(() => {
      setResult("win");
      maybeRequestNativeReview().catch(() => {});
    }, 1050);
  }

  function handleBoardMove(nextTiles: number[]) {
    if (result || solved) return;
    const nextMoves = moves + 1;
    if (nextTiles.every((tile, index) => tile === index)) {
      finishGame(nextTiles, nextMoves);
      return;
    }
    setTiles(nextTiles);
    setMoves(nextMoves);
  }

  async function toggleNotifications(value: boolean) {
    setNotifications(value);
    if (value) {
      const ok = await scheduleEveryOtherDayReminder().catch(() => false);
      setNotifications(ok);
    } else {
      await cancelReminders().catch(() => {});
    }
  }

  return (
    <LinearGradient colors={GRADIENTS.screen} style={{ flex: 1 }}>
      <BackgroundBlobs />
      <SafeAreaView style={{ flex: 1 }}>
        {screen === "home" && (
          <Animated.View entering={FadeIn.duration(240)} style={{ flex: 1 }}>
            <ScrollView
              contentInsetAdjustmentBehavior="automatic"
              contentContainerStyle={{ padding: 18, paddingBottom: 44 }}
              showsVerticalScrollIndicator={false}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: COLORS.surface,
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 999,
                    boxShadow: "0 4px 12px rgba(123,92,255,0.12)"
                  }}
                >
                  <Text style={{ fontSize: 15 }}>{"⭐"}</Text>
                  <Text style={{ color: COLORS.ink, fontFamily: FONT.black, fontSize: 15 }}>
                    {totalStars}
                    <Text style={{ color: COLORS.muted, fontFamily: FONT.semi, fontSize: 13 }}>
                      {` / ${LEVELS.length * 3}`}
                    </Text>
                  </Text>
                </View>
                <IconButton glyph={"⚙️"} onPress={() => setSettingsOpen(true)} />
              </View>

              <View style={{ alignItems: "center", gap: 2, marginTop: 6, marginBottom: 18 }}>
                <Floaty>
                  <CatMascot size={92} />
                </Floaty>
                <Text
                  style={{
                    color: COLORS.ink,
                    fontSize: 40,
                    fontFamily: FONT.black,
                    marginTop: 2
                  }}
                >
                  Pic Shuffle
                </Text>
                <Text style={{ color: COLORS.muted, fontFamily: FONT.semi, fontSize: 14, marginTop: -6 }}>
                  Slide the tiles, rebuild the picture!
                </Text>
              </View>

              <Pressable
                onPress={pickPhoto}
                style={({ pressed }) => ({
                  marginBottom: 16,
                  borderRadius: 22,
                  overflow: "hidden",
                  transform: [{ translateY: pressed ? 3 : 0 }],
                  boxShadow: pressed
                    ? "0 2px 0 #5B3FD6"
                    : "0 5px 0 #5B3FD6, 0 12px 22px rgba(123,92,255,0.24)"
                })}
              >
                <LinearGradient
                  colors={GRADIENTS.purple}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 13,
                    paddingVertical: 14,
                    paddingHorizontal: 16
                  }}
                >
                  <View
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 15,
                      backgroundColor: "rgba(255,255,255,0.22)",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <Text style={{ fontSize: 24 }}>{"📷"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: COLORS.surface, fontFamily: FONT.black, fontSize: 17 }}>
                      Your Photo
                    </Text>
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.9)",
                        fontFamily: FONT.semi,
                        fontSize: 12.5,
                        marginTop: -2
                      }}
                    >
                      Turn any pic into a puzzle
                    </Text>
                  </View>
                  <Text style={{ color: COLORS.surface, fontFamily: FONT.black, fontSize: 22 }}>
                    {"›"}
                  </Text>
                </LinearGradient>
              </Pressable>

              <LevelPath
                width={width - 36}
                unlocked={effectiveUnlocked}
                currentIndex={currentPlayable}
                stars={stars}
                onSelect={openLevel}
              />
            </ScrollView>
          </Animated.View>
        )}

        {screen === "ready" && (
          <View style={{ flex: 1, padding: 18, gap: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <IconButton glyph={"‹"} onPress={goHome} />
              <Text
                style={{
                  flex: 1,
                  textAlign: "center",
                  color: COLORS.ink,
                  fontSize: 21,
                  fontFamily: FONT.black
                }}
              >
                {`Level ${level.id}`}
              </Text>
              <View style={{ width: 44 }} />
            </View>

            <View style={{ flex: 1, justifyContent: "center" }}>
              <Animated.View
                entering={FadeInUp.springify().damping(15)}
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 32,
                  paddingVertical: 26,
                  paddingHorizontal: 22,
                  alignItems: "center",
                  gap: 14,
                  boxShadow: "0 18px 44px rgba(123,92,255,0.18)"
                }}
              >
                <View
                  style={{
                    padding: 10,
                    paddingBottom: 26,
                    backgroundColor: COLORS.surface,
                    borderRadius: 18,
                    transform: [{ rotate: "-2.5deg" }],
                    boxShadow: "0 10px 26px rgba(42,33,64,0.16)"
                  }}
                >
                  <Image
                    source={PUZZLE_IMAGE}
                    resizeMode="cover"
                    style={{ width: 184, height: 184, borderRadius: 10 }}
                  />
                </View>

                <View style={{ alignItems: "center", gap: 2 }}>
                  <Text style={{ color: COLORS.ink, fontSize: 28, fontFamily: FONT.black }}>
                    {level.title}
                  </Text>
                  <Text style={{ color: COLORS.muted, fontFamily: FONT.semi, fontSize: 14 }}>
                    {`${level.grid} × ${level.grid} pieces`}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Chip label={sizeName(level.grid)} color={levelChipColor(level.grid)} />
                  <Chip
                    label={isTimed ? `⏱ ${formatClock(timeLimit)}` : "Relaxed"}
                    color={isTimed ? COLORS.pink : COLORS.teal}
                  />
                </View>

                {(stars[levelIndex] ?? 0) > 0 && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ color: COLORS.muted, fontFamily: FONT.semi, fontSize: 13 }}>
                      Your best
                    </Text>
                    <StarRow earned={stars[levelIndex]} size={17} />
                  </View>
                )}
              </Animated.View>
            </View>

            <GameButton
              label="Play!"
              gradient={GRADIENTS.pink}
              depthColor={COLORS.pinkDark}
              onPress={startGame}
            />
          </View>
        )}

        {screen === "photoSetup" && photo && (
          <View style={{ flex: 1, padding: 18, gap: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <IconButton glyph={"‹"} onPress={goHome} />
              <Text
                style={{
                  flex: 1,
                  textAlign: "center",
                  color: COLORS.ink,
                  fontSize: 21,
                  fontFamily: FONT.black
                }}
              >
                Your Photo
              </Text>
              <IconButton glyph={"🔄"} onPress={pickPhoto} />
            </View>

            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 22 }}>
              <Animated.View
                entering={ZoomIn.springify().damping(15)}
                style={{
                  padding: 10,
                  paddingBottom: 24,
                  backgroundColor: COLORS.surface,
                  borderRadius: 18,
                  transform: [{ rotate: "-2deg" }],
                  boxShadow: "0 14px 32px rgba(42,33,64,0.2)"
                }}
              >
                {(() => {
                  const pv = fitBoard(232, 300, photo.aspect);
                  return (
                    <Image
                      source={{ uri: photo.uri }}
                      resizeMode="cover"
                      style={{ width: pv.w, height: pv.h, borderRadius: 10 }}
                    />
                  );
                })()}
              </Animated.View>

              <View style={{ alignItems: "center", gap: 12 }}>
                <Text style={{ color: COLORS.ink, fontFamily: FONT.bold, fontSize: 16 }}>
                  Choose difficulty
                </Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  {PHOTO_GRIDS.map((option) => {
                    const selected = photoGrid === option.grid;
                    return (
                      <Pressable
                        key={option.grid}
                        onPress={() => {
                          setPhotoGrid(option.grid);
                          Haptics.selectionAsync().catch(() => {});
                        }}
                        style={({ pressed }) => ({
                          alignItems: "center",
                          gap: 3,
                          paddingVertical: 12,
                          paddingHorizontal: 20,
                          borderRadius: 18,
                          backgroundColor: selected ? option.color : COLORS.surface,
                          borderWidth: 2.5,
                          borderColor: selected ? option.color : "rgba(0,0,0,0.06)",
                          transform: [{ scale: pressed ? 0.95 : 1 }],
                          boxShadow: selected
                            ? "0 6px 14px rgba(42,33,64,0.16)"
                            : "0 3px 8px rgba(123,92,255,0.08)"
                        })}
                      >
                        <Text
                          style={{
                            color: selected ? COLORS.surface : COLORS.ink,
                            fontFamily: FONT.black,
                            fontSize: 20
                          }}
                        >
                          {`${option.grid}×${option.grid}`}
                        </Text>
                        <Text
                          style={{
                            color: selected ? COLORS.surface : COLORS.muted,
                            fontFamily: FONT.bold,
                            fontSize: 12
                          }}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            <GameButton
              label="Start puzzle"
              icon={"🧩"}
              gradient={GRADIENTS.pink}
              depthColor={COLORS.pinkDark}
              onPress={() => startPhotoGame(photoGrid)}
            />
          </View>
        )}

        {screen === "play" && (
          <Animated.View entering={FadeIn.duration(220)} style={{ flex: 1, padding: 18, gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <IconButton glyph={"✕"} onPress={goHome} />
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  backgroundColor: COLORS.surface,
                  paddingVertical: 7,
                  borderRadius: 999,
                  boxShadow: "0 3px 10px rgba(123,92,255,0.10)"
                }}
              >
                <Text
                  style={{ color: COLORS.ink, fontFamily: FONT.black, fontSize: 16 }}
                  numberOfLines={1}
                >
                  {mode === "photo" ? "Your Photo" : `Level ${level.id} · ${level.title}`}
                </Text>
              </View>
              <IconButton glyph={"↺"} onPress={startGame} />
            </View>

            <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
              <StatPill icon={"🎯"} value={`${moves} moves`} />
              <StatPill icon={activeTimed ? "⏳" : "⏱️"} value={formatClock(seconds)} hot={lowTime} />
              <StatPill icon={"🧩"} value={`${activeGrid}×${activeGrid}`} />
            </View>

            {activeTimed && (
              <TimeBar fraction={activeTimeLimit > 0 ? seconds / activeTimeLimit : 0} hot={lowTime} />
            )}

            <View
              style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
              onLayout={(event) => {
                const { width: w, height: h } = event.nativeEvent.layout;
                setBoardArea((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
              }}
            >
              <View style={{ width: board.w, height: board.h }}>
                {board.w > 0 && (
                  <PuzzleBoard
                    key={`${mode}-${photo?.uri ?? levelIndex}-${activeGrid}`}
                    grid={activeGrid}
                    tiles={tiles}
                    boardWidth={board.w}
                    boardHeight={board.h}
                    image={activeImage}
                    solved={solved}
                    disabled={Boolean(result) || peeking}
                    onMove={handleBoardMove}
                  />
                )}

                {peeking && (
                  <Animated.View
                    entering={FadeIn.duration(160)}
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      bottom: 0,
                      left: 0,
                      borderRadius: 22,
                      borderWidth: 4,
                      borderColor: COLORS.yellow,
                      overflow: "hidden",
                      justifyContent: "flex-end",
                      alignItems: "center",
                      padding: 12,
                      boxShadow: "0 18px 36px rgba(42,33,64,0.25)"
                    }}
                  >
                    <Image
                      source={activeImage}
                      resizeMode="cover"
                      style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
                    />
                    <View
                      style={{
                        backgroundColor: COLORS.yellow,
                        paddingHorizontal: 14,
                        paddingVertical: 4,
                        borderRadius: 999
                      }}
                    >
                      <Text style={{ color: "#5A4A00", fontSize: 13, fontFamily: FONT.black }}>
                        Original
                      </Text>
                    </View>
                  </Animated.View>
                )}
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <GameButton
                label="Peek"
                icon={"👀"}
                gradient={GRADIENTS.purple}
                depthColor={COLORS.purpleDark}
                onPress={() => setPeeking(true)}
                compact
                style={{ flex: 1 }}
              />
              <GameButton
                label="Shuffle"
                icon={"🔀"}
                solid={COLORS.surface}
                textColor={COLORS.ink}
                depthColor="rgba(42,33,64,0.12)"
                onPress={startGame}
                compact
                style={{ flex: 1 }}
              />
            </View>
          </Animated.View>
        )}

        {result === "win" && mode === "level" && (
          <ResultOverlay
            stars={earnedStars}
            title={levelIndex + 1 < LEVELS.length ? winTitle(earnedStars) : "All cleared! 🏆"}
            subtitle={`⏱ ${formatClock(Math.max(elapsed, 0))}    🎯 ${moves} moves`}
            primaryLabel={levelIndex + 1 < LEVELS.length ? "Next level" : "Back to map"}
            onPrimary={levelIndex + 1 < LEVELS.length ? nextLevel : goHome}
            onReplay={startGame}
            onMap={goHome}
            mood="happy"
            confetti
          />
        )}

        {result === "win" && mode === "photo" && (
          <ResultOverlay
            stars={earnedStars}
            title={winTitle(earnedStars)}
            subtitle={`🧩 ${activeGrid}×${activeGrid}    🎯 ${moves} moves`}
            primaryLabel="New photo"
            onPrimary={pickPhoto}
            onReplay={startGame}
            onMap={goHome}
            mood="happy"
            confetti
          />
        )}

        {result === "timeup" && (
          <ResultOverlay
            title="Time's up!"
            subtitle="So close — give it another go?"
            primaryLabel="Try again"
            onPrimary={startGame}
            onReplay={startGame}
            onMap={goHome}
            mood="sleepy"
          />
        )}

        {settingsOpen && (
          <Pressable
            onPress={() => setSettingsOpen(false)}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundColor: "rgba(42,33,64,0.4)",
              justifyContent: "flex-end"
            }}
          >
            <Animated.View entering={FadeInUp.duration(240)}>
              <Pressable
                onPress={(event) => event.stopPropagation()}
                style={{
                  backgroundColor: COLORS.surface,
                  borderTopLeftRadius: 30,
                  borderTopRightRadius: 30,
                  padding: 22,
                  paddingBottom: 34,
                  gap: 15,
                  boxShadow: "0 -12px 44px rgba(0,0,0,0.24)"
                }}
              >
                <View style={{ alignItems: "center" }}>
                  <View
                    style={{
                      width: 44,
                      height: 5,
                      borderRadius: 99,
                      backgroundColor: "rgba(0,0,0,0.12)"
                    }}
                  />
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <Text style={{ color: COLORS.ink, fontSize: 24, fontFamily: FONT.black }}>
                    Settings
                  </Text>
                  <IconButton glyph={"✕"} onPress={() => setSettingsOpen(false)} size={38} />
                </View>
                <SettingRow icon={"🔊"} label="Sound effects" value={sound} onValueChange={setSound} />
                <SettingRow icon={"🎵"} label="Music" value={music} onValueChange={setMusic} />
                <SettingRow
                  icon={"🔔"}
                  label="Reminders"
                  value={notifications}
                  onValueChange={toggleNotifications}
                />
                <View style={{ height: 1, backgroundColor: "rgba(0,0,0,0.07)" }} />
                <Pressable
                  onPress={() => {
                    setUnlocked(1);
                    setStars({});
                    setSettingsOpen(false);
                    setScreen("home");
                  }}
                  style={({ pressed }) => ({
                    height: 50,
                    borderRadius: 16,
                    borderWidth: 2.5,
                    borderColor: COLORS.pink,
                    alignItems: "center",
                    justifyContent: "center",
                    transform: [{ scale: pressed ? 0.98 : 1 }]
                  })}
                >
                  <Text style={{ color: COLORS.pink, fontFamily: FONT.black, fontSize: 16 }}>
                    Reset progress
                  </Text>
                </Pressable>
                <Text
                  style={{
                    textAlign: "center",
                    color: COLORS.muted,
                    fontFamily: FONT.semi,
                    fontSize: 12
                  }}
                >
                  Pic Shuffle v1.0 · made with 🐾
                </Text>
              </Pressable>
            </Animated.View>
          </Pressable>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

function TimeBar({ fraction, hot }: { fraction: number; hot: boolean }) {
  const progress = useSharedValue(fraction);

  useEffect(() => {
    progress.value = withTiming(fraction, { duration: 950, easing: Easing.linear });
  }, [fraction, progress]);

  const style = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, progress.value)) * 100}%`
  }));

  return (
    <View
      style={{
        height: 10,
        borderRadius: 5,
        backgroundColor: "rgba(42,33,64,0.08)",
        overflow: "hidden"
      }}
    >
      <Animated.View
        style={[
          {
            height: "100%",
            borderRadius: 5,
            backgroundColor: hot ? COLORS.pink : COLORS.teal
          },
          style
        ]}
      />
    </View>
  );
}

function ResultOverlay({
  stars,
  title,
  subtitle,
  primaryLabel,
  onPrimary,
  onReplay,
  onMap,
  mood,
  confetti = false
}: {
  stars?: number;
  title: string;
  subtitle: string;
  primaryLabel: string;
  onPrimary: () => void;
  onReplay: () => void;
  onMap: () => void;
  mood: "happy" | "sleepy";
  confetti?: boolean;
}) {
  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        backgroundColor: "rgba(42,33,64,0.55)",
        alignItems: "center",
        justifyContent: "center",
        padding: 26
      }}
    >
      {confetti && <Confetti />}
      <Animated.View
        entering={ZoomIn.springify().damping(13).delay(120)}
        style={{
          width: "100%",
          maxWidth: 330,
          borderRadius: 32,
          backgroundColor: COLORS.surface,
          padding: 22,
          paddingTop: stars !== undefined ? 30 : 22,
          alignItems: "center",
          gap: 12,
          boxShadow: "0 30px 60px rgba(0,0,0,0.35)"
        }}
      >
        {stars !== undefined && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 10,
              marginTop: -6
            }}
          >
            {[0, 1, 2].map((slot) => (
              <PopStar key={slot} index={slot} earned={slot < stars} />
            ))}
          </View>
        )}
        <Floaty range={4} duration={2000}>
          <CatMascot mood={mood} size={110} />
        </Floaty>
        <Text
          style={{
            color: COLORS.ink,
            fontSize: 32,
            fontFamily: FONT.black,
            textAlign: "center",
            marginTop: -4
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            color: COLORS.muted,
            fontSize: 15,
            fontFamily: FONT.semi,
            textAlign: "center",
            marginTop: -6
          }}
        >
          {subtitle}
        </Text>
        <GameButton
          label={primaryLabel}
          gradient={GRADIENTS.pink}
          depthColor={COLORS.pinkDark}
          onPress={onPrimary}
          compact
          style={{ alignSelf: "stretch" }}
        />
        <View style={{ flexDirection: "row", gap: 28 }}>
          <Pressable onPress={onReplay} hitSlop={8}>
            <Text style={{ color: COLORS.muted, fontFamily: FONT.black, fontSize: 16 }}>
              ↺ Replay
            </Text>
          </Pressable>
          <Pressable onPress={onMap} hitSlop={8}>
            <Text style={{ color: COLORS.muted, fontFamily: FONT.black, fontSize: 16 }}>
              🗺 Map
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function SettingRow({
  icon,
  label,
  value,
  onValueChange
}: {
  icon: string;
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: COLORS.purpleSoft,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Text style={{ fontSize: 18 }}>{icon}</Text>
        </View>
        <Text style={{ color: COLORS.ink, fontSize: 16, fontFamily: FONT.bold }}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: COLORS.teal, false: "rgba(0,0,0,0.14)" }}
        thumbColor={COLORS.surface}
      />
    </View>
  );
}
