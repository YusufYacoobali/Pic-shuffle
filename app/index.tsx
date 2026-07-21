import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type ImageSourcePropType, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BackgroundBlobs } from "@/components/game-ui";
import { AchievementsModal, ReviewPromptModal, SettingsSheet } from "@/components/overlays/game-overlays";
import { LevelClearedOverlay, TimeUpOverlay } from "@/components/overlays/level-cleared";
import { HomeScreen } from "@/components/screens/home-screen";
import { PackScreen } from "@/components/screens/pack-screen";
import { PlayScreen } from "@/components/screens/play-screen";
import { PhotoSetupScreen, ReadyScreen } from "@/components/screens/setup-screens";
import { formatClock } from "@/constants/levels";
import {
  getLevel,
  LEVEL_IMAGE_ASPECT,
  PACKS,
  TOTAL_LEVELS
} from "@/constants/packs";
import { COLORS, GRADIENTS, starsForResult } from "@/constants/theme";
import { fitBoard } from "@/lib/board-layout";
import { makeTiles } from "@/lib/puzzle-rules";
import {
  coinsForStars,
  findCurrentLevel,
  isLevelUnlocked,
  isPackCleared,
  summarizeProgress,
  type SavedGame,
  type StarMap
} from "@/lib/progress";
import {
  cancelReminders,
  markReviewPromptShown,
  requestReviewOrOpenStoreSafely,
  scheduleDailyReminder,
  shouldShowReviewPrompt
} from "@/services/native-cadence";
import {
  cachePuzzleImagePack,
  cachePuzzleImage,
  resolveCachedPuzzleImage
} from "@/services/puzzle-image-cache";

const PHOTO_GRIDS = [
  { grid: 3, label: "Easy", color: COLORS.teal },
  { grid: 4, label: "Normal", color: COLORS.yellow },
  { grid: 5, label: "Hard", color: COLORS.pink },
  { grid: 6, label: "Very hard", color: COLORS.purple },
  { grid: 7, label: "Expert", color: COLORS.pink },
  { grid: 8, label: "Extreme", color: COLORS.pink }
];

const SAVE_KEY = "picshuffle.save.v1";

// Flip to true locally when quickly checking later packs. Production progress
// starts at pack 1 and unlocks forward from saved stars.
const UNLOCK_ALL_FOR_TESTING = false;

type Screen = "home" | "pack" | "ready" | "photoSetup" | "play";
type Result = null | "win" | "timeup";
type Mode = "level" | "photo";
type ReviewPromptStage = null | "ask" | "review";

export default function PicShuffleScreen() {
  const { width } = useWindowDimensions();
  const hydrated = useRef(false);

  const [screen, setScreen] = useState<Screen>("home");
  const [globalIndex, setGlobalIndex] = useState(0);
  const [packIndex, setPackIndex] = useState(0);
  const [stars, setStars] = useState<StarMap>({});
  const [coins, setCoins] = useState(0);
  const [cachedImages, setCachedImages] = useState<Record<string, string>>({});
  const [lastAward, setLastAward] = useState({ coins: 0, before: 0 });
  const [sound, setSound] = useState(true);
  const [music, setMusic] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [reviewPrompt, setReviewPrompt] = useState<ReviewPromptStage>(null);

  const [tiles, setTiles] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [boardReady, setBoardReady] = useState(false);
  const [gameSession, setGameSession] = useState(0);
  const [result, setResult] = useState<Result>(null);
  const [solved, setSolved] = useState(false);
  const [peeking, setPeeking] = useState(false);
  const [earnedStars, setEarnedStars] = useState(0);

  const [mode, setMode] = useState<Mode>("level");
  const [photo, setPhoto] = useState<{
    uri: string;
    aspect: number;
    width: number;
    height: number;
  } | null>(null);
  const [photoGrid, setPhotoGrid] = useState(3);
  const [boardArea, setBoardArea] = useState({ w: 0, h: 0 });

  const level = getLevel(globalIndex);
  const pack = PACKS[level.pack];

  // The puzzle currently in play - either a campaign level or a one-off photo.
  const activeGrid = mode === "photo" ? photoGrid : level.grid;
  const activeTimed = mode === "photo" ? false : level.mode === "timed";
  const activeTimeLimit = mode === "photo" ? 0 : level.timeLimit;
  const activeImageUri =
    mode === "photo" && photo ? photo.uri : cachedImages[level.image] ?? level.image;
  // The game timer updates this component every second. Keep one source
  // object per URI so dozens of tile images are not treated as new native
  // image requests on every tick.
  const activeImage = useMemo<ImageSourcePropType>(
    () => ({ uri: activeImageUri }),
    [activeImageUri]
  );
  const activeImageWidth = mode === "photo" && photo ? photo.width : 1080;
  const activeImageHeight = mode === "photo" && photo ? photo.height : 1920;
  const activeAspect = mode === "photo" && photo ? photo.aspect : LEVEL_IMAGE_ASPECT;

  const board = fitBoard(boardArea.w, boardArea.h, activeAspect);
  const elapsed = activeTimed ? activeTimeLimit - seconds : seconds;
  const lowTime = activeTimed && seconds <= 10;
  const progress = useMemo(() => summarizeProgress(stars), [stars]);
  const currentGlobal = useMemo(
    () => findCurrentLevel(stars, UNLOCK_ALL_FOR_TESTING),
    [stars]
  );
  const currentProgressPack = getLevel(currentGlobal).pack;
  const rememberCachedImage = useCallback((remoteUri: string, localUri: string) => {
    setCachedImages((current) =>
      current[remoteUri] === localUri ? current : { ...current, [remoteUri]: localUri }
    );
  }, []);

  useEffect(() => {
    async function hydrate() {
      const raw = await SecureStore.getItemAsync(SAVE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<SavedGame>;
        // v1 and v2 saves both keep stars keyed by global level index; the old
        // 10-level campaign maps onto pack 1 levels 1-10, so no remapping.
        if (saved.stars && typeof saved.stars === "object") {
          const parsed: StarMap = {};
          Object.entries(saved.stars).forEach(([key, value]) => {
            const index = Number(key);
            if (Number.isInteger(index) && index >= 0 && index < TOTAL_LEVELS) {
              parsed[index] = Math.min(Math.max(Number(value) || 0, 0), 3);
            }
          });
          setStars(parsed);
        } else if (Array.isArray(saved.completed)) {
          const migrated: StarMap = {};
          saved.completed.forEach((item) => {
            if (Number.isInteger(item) && item >= 0 && item < TOTAL_LEVELS) {
              migrated[item] = 1;
            }
          });
          setStars(migrated);
        }
        if (typeof saved.coins === "number" && saved.coins >= 0) {
          setCoins(Math.floor(saved.coins));
        }
        if (typeof saved.sound === "boolean") setSound(saved.sound);
        if (typeof saved.music === "boolean") setMusic(saved.music);
        if (typeof saved.notifications === "boolean") {
          setNotifications(saved.notifications);
          if (saved.notifications) scheduleDailyReminder().catch(() => {});
        } else {
          scheduleDailyReminder().catch(() => {});
        }
      } else {
        scheduleDailyReminder().catch(() => {});
      }
      hydrated.current = true;
    }

    hydrate().catch(() => {
      hydrated.current = true;
    });
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    const save: SavedGame = { version: 2, stars, coins, sound, music, notifications };
    SecureStore.setItemAsync(SAVE_KEY, JSON.stringify(save)).catch(() => {});
  }, [coins, music, notifications, sound, stars]);

  useEffect(() => {
    if (!running || !boardReady) return undefined;
    const id = setInterval(() => {
      setSeconds((value) => (activeTimed ? Math.max(value - 1, 0) : value + 1));
    }, 1000);
    return () => clearInterval(id);
  }, [activeTimed, boardReady, running]);

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

  useEffect(() => {
    let cancelled = false;
    cachePuzzleImagePack(currentProgressPack)
      .then((images) => {
        if (cancelled || Object.keys(images).length === 0) return;
        setCachedImages((current) => ({ ...current, ...images }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [currentProgressPack]);

  useEffect(() => {
    if (mode !== "level") return;
    let cancelled = false;
    resolveCachedPuzzleImage(level.image)
      .then((uri) => {
        if (!cancelled && uri !== level.image) rememberCachedImage(level.image, uri);
      })
      .catch(() => {});
    cachePuzzleImage(level.image)
      .then((uri) => {
        if (!cancelled) rememberCachedImage(level.image, uri);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [level.image, mode, rememberCachedImage]);

  useEffect(() => {
    if (result !== "win" || mode !== "level" || reviewPrompt) return undefined;

    let cancelled = false;
    const timer = setTimeout(() => {
      shouldShowReviewPrompt(progress.clearedLevels)
        .then(async (show) => {
          if (!show || cancelled) return;
          await markReviewPromptShown();
          if (!cancelled) setReviewPrompt("ask");
        })
        .catch(() => {});
    }, 1600);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [mode, progress.clearedLevels, result, reviewPrompt]);

  function openPack(index: number) {
    setPackIndex(index);
    setScreen("pack");
    setResult(null);
    setSolved(false);
    Haptics.selectionAsync().catch(() => {});
  }

  function openLevel(global: number) {
    if (!isLevelUnlocked(stars, global, UNLOCK_ALL_FOR_TESTING)) return;
    setMode("level");
    setGlobalIndex(global);
    setPackIndex(getLevel(global).pack);
    setScreen("ready");
    setResult(null);
    setSolved(false);
    setPeeking(false);
    Haptics.selectionAsync().catch(() => {});
  }

  // (Re)start the current puzzle - a level from the ready screen, or a photo
  // via Reset/Shuffle. Reads the active config, so it serves both modes.
  function startGame() {
    setGameSession((value) => value + 1);
    setBoardReady(false);
    setBoardArea({ w: 0, h: 0 });
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
      setPhoto({
        uri: asset.uri,
        aspect,
        width: asset.width || 1,
        height: asset.height || 1
      });
      setMode("photo");
      setResult(null);
      setSolved(false);
      setScreen("photoSetup");
      Haptics.selectionAsync().catch(() => {});
    } catch {
      // picker unavailable or dismissed - stay put
    }
  }

  function startPhotoGame(grid: number) {
    setGameSession((value) => value + 1);
    setBoardReady(false);
    setBoardArea({ w: 0, h: 0 });
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
    setBoardReady(false);
    setMode("level");
    setScreen("home");
    setResult(null);
    setPeeking(false);
    setSolved(false);
  }

  // Exiting play returns to where the level lives: its pack ladder for
  // campaign levels, home for one-off photos.
  function exitPlay() {
    setRunning(false);
    setBoardReady(false);
    setResult(null);
    setPeeking(false);
    setSolved(false);
    if (mode === "photo") {
      setMode("level");
      setScreen("home");
    } else {
      setScreen("pack");
      setPackIndex(level.pack);
    }
  }

  function nextLevel() {
    const next = globalIndex + 1;
    if (next < TOTAL_LEVELS && isLevelUnlocked(stars, next, UNLOCK_ALL_FOR_TESTING)) {
      setGlobalIndex(next);
      setPackIndex(getLevel(next).pack);
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
        [globalIndex]: Math.max(current[globalIndex] ?? 0, earned)
      }));
    }
    // Award coins (soft currency for peeks/hints later) and record the amount
    // so the celebration can animate the balance ticking up.
    const award = coinsForStars(earned);
    setLastAward({ coins: award, before: coins });
    setCoins((current) => current + award);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setTimeout(() => setSolved(true), 420);
    setTimeout(() => {
      setResult("win");
    }, 980);
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
      const ok = await scheduleDailyReminder().catch(() => false);
      setNotifications(ok);
    } else {
      await cancelReminders().catch(() => {});
    }
  }

  const clearedBoss = mode === "level" && level.kind === "boss";
  const packJustCleared = clearedBoss && isPackCleared(stars, level.pack);

  return (
    <LinearGradient colors={GRADIENTS.screen} style={{ flex: 1 }}>
      <BackgroundBlobs />
      <SafeAreaView style={{ flex: 1 }}>
        {screen === "home" && (
          <HomeScreen
            totalStars={progress.totalStars}
            coins={coins}
            clearedLevels={progress.clearedLevels}
            perfectLevels={progress.perfectLevels}
            currentGlobal={currentGlobal}
            unlockAll={UNLOCK_ALL_FOR_TESTING}
            stars={stars}
            onPickPhoto={pickPhoto}
            onOpenPack={openPack}
            onOpenLevel={openLevel}
            onOpenAchievements={() => setAchievementsOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        )}

        {screen === "pack" && (
          <PackScreen
            width={width}
            pack={PACKS[packIndex]}
            stars={stars}
            currentGlobal={currentGlobal}
            unlockAll={UNLOCK_ALL_FOR_TESTING}
            onBack={goHome}
            onSelectLevel={openLevel}
          />
        )}

        {screen === "ready" && (
          <ReadyScreen
            level={level}
            pack={pack}
            imageUri={cachedImages[level.image] ?? level.image}
            bestStars={stars[globalIndex] ?? 0}
            onBack={() => openPack(level.pack)}
            onStart={startGame}
          />
        )}

        {screen === "photoSetup" && photo && (
          <PhotoSetupScreen
            photo={photo}
            photoGrid={photoGrid}
            options={PHOTO_GRIDS}
            onBack={goHome}
            onPickPhoto={pickPhoto}
            onSelectGrid={(grid) => {
              setPhotoGrid(grid);
              Haptics.selectionAsync().catch(() => {});
            }}
            onStart={() => startPhotoGame(photoGrid)}
          />
        )}

        {screen === "play" && (
          <PlayScreen
            mode={mode}
            levelLabel={mode === "photo" ? "Photo" : `${pack.emoji} Lv ${level.number}`}
            grid={activeGrid}
            moves={moves}
            seconds={seconds}
            activeTimed={activeTimed}
            activeTimeLimit={activeTimeLimit}
            lowTime={lowTime}
            board={board}
            sessionKey={`${mode}-${photo?.uri ?? globalIndex}-${activeGrid}-${gameSession}`}
            image={activeImage}
            imageUri={activeImageUri}
            imageWidth={activeImageWidth}
            imageHeight={activeImageHeight}
            tiles={tiles}
            solved={solved}
            result={result}
            peeking={peeking}
            onGoHome={exitPlay}
            onShuffle={startGame}
            onPeek={() => setPeeking(true)}
            onOpenSettings={() => setSettingsOpen(true)}
            onMove={handleBoardMove}
            onReadyStateChange={setBoardReady}
            onBoardAreaChange={({ w, h }) => {
              setBoardArea((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
            }}
          />
        )}

        {result === "win" && (
          <LevelClearedOverlay
            stars={earnedStars}
            coinsAwarded={lastAward.coins}
            coinBalanceBefore={lastAward.before}
            title={
              mode === "photo"
                ? "Puzzle Solved!"
                : packJustCleared
                  ? "Pack Complete!"
                  : level.kind === "boss"
                    ? "Boss Beaten!"
                    : "Level Cleared!"
            }
            subtitle={`${formatClock(Math.max(elapsed, 0))} - ${moves} moves`}
            primaryLabel={
              mode === "photo"
                ? "New photo"
                : globalIndex + 1 < TOTAL_LEVELS
                  ? packJustCleared
                    ? "Next pack"
                    : "Next"
                  : "Back to map"
            }
            onPrimary={mode === "photo" ? pickPhoto : globalIndex + 1 < TOTAL_LEVELS ? nextLevel : goHome}
          />
        )}

        {result === "timeup" && <TimeUpOverlay onRetry={startGame} onMap={exitPlay} />}

        {achievementsOpen && (
          <AchievementsModal
            totalStars={progress.totalStars}
            clearedLevels={progress.clearedLevels}
            perfectLevels={progress.perfectLevels}
            clearedPacks={progress.clearedPacks}
            currentGlobal={currentGlobal}
            onClose={() => setAchievementsOpen(false)}
            onPlayCurrent={() => {
              setAchievementsOpen(false);
              openLevel(currentGlobal);
            }}
          />
        )}

        {settingsOpen && (
          <SettingsSheet
            sound={sound}
            music={music}
            notifications={notifications}
            onSoundChange={setSound}
            onMusicChange={setMusic}
            onNotificationsChange={toggleNotifications}
            onResetProgress={() => {
              setStars({});
              setCoins(0);
              setSettingsOpen(false);
              setScreen("home");
            }}
            onClose={() => setSettingsOpen(false)}
          />
        )}

        {reviewPrompt && (
          <ReviewPromptModal
            stage={reviewPrompt}
            onEnjoying={() => setReviewPrompt("review")}
            onRateNow={() => {
              requestReviewOrOpenStoreSafely().catch(() => {});
              setReviewPrompt(null);
            }}
            onClose={() => setReviewPrompt(null)}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

