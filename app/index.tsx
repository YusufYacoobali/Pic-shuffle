import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import * as SecureStore from "expo-secure-store";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  type ImageSourcePropType,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BackgroundBlobs } from "@/components/game-ui";
import { AchievementsModal, SettingsSheet } from "@/components/overlays/game-overlays";
import { LevelClearedOverlay, TimeUpOverlay } from "@/components/overlays/level-cleared";
import { HomeScreen } from "@/components/screens/home-screen";
import { PlayScreen } from "@/components/screens/play-screen";
import { PhotoSetupScreen, ReadyScreen } from "@/components/screens/setup-screens";
import { formatClock, LEVELS, TIMED_SECONDS } from "@/constants/levels";
import { COLORS, GRADIENTS, starsForResult } from "@/constants/theme";
import { fitBoard } from "@/lib/board-layout";
import { makeTiles } from "@/lib/puzzle-rules";
import {
  coinsForStars,
  findCurrentPlayable,
  summarizeProgress,
  type SavedGame,
  type StarMap
} from "@/lib/progress";
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

// TODO: TESTING ONLY - remove before release. Unlocks every level regardless of
// saved progress so all levels can be reached during testing. Real unlock
// progress is still tracked and saved underneath; this only affects gating.
const UNLOCK_ALL_FOR_TESTING = true;

type Screen = "home" | "ready" | "photoSetup" | "play";
type Result = null | "win" | "timeup";
type Mode = "level" | "photo";

export default function PicShuffleScreen() {
  const { width } = useWindowDimensions();
  const hydrated = useRef(false);

  const [screen, setScreen] = useState<Screen>("home");
  const [levelIndex, setLevelIndex] = useState(0);
  const [unlocked, setUnlocked] = useState(1);
  const [stars, setStars] = useState<StarMap>({});
  const [coins, setCoins] = useState(0);
  const [lastAward, setLastAward] = useState({ coins: 0, before: 0 });
  const [sound, setSound] = useState(true);
  const [music, setMusic] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);

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

  // The puzzle currently in play - either a campaign level or a one-off photo.
  const activeGrid = mode === "photo" ? photoGrid : level.grid;
  const activeTimed = mode === "photo" ? false : isTimed;
  const activeTimeLimit = mode === "photo" ? 0 : timeLimit;
  const activeImage: ImageSourcePropType =
    mode === "photo" && photo ? { uri: photo.uri } : PUZZLE_IMAGE;
  const activeAspect = mode === "photo" && photo ? photo.aspect : BASE_ASPECT;

  const board = fitBoard(boardArea.w, boardArea.h, activeAspect);
  const elapsed = activeTimed ? activeTimeLimit - seconds : seconds;
  const lowTime = activeTimed && seconds <= 10;
  const { totalStars, clearedLevels, perfectLevels } = useMemo(
    () => summarizeProgress(stars),
    [stars]
  );

  // Number of levels the player may enter. Overridden while the testing flag is
  // on; the underlying `unlocked` still reflects genuine progress.
  const effectiveUnlocked = UNLOCK_ALL_FOR_TESTING ? LEVELS.length : unlocked;

  const currentPlayable = useMemo(
    () => findCurrentPlayable(stars, effectiveUnlocked, LEVELS.length),
    [stars, effectiveUnlocked]
  );

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
        if (typeof saved.coins === "number" && saved.coins >= 0) {
          setCoins(Math.floor(saved.coins));
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
    const save: SavedGame = { unlocked, stars, coins, sound, music, notifications };
    SecureStore.setItemAsync(SAVE_KEY, JSON.stringify(save)).catch(() => {});
  }, [coins, music, notifications, sound, stars, unlocked]);

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

  // (Re)start the current puzzle - a level from the ready screen, or a photo
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
      // picker unavailable or dismissed - stay put
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
    // Award coins (soft currency for peeks/hints later) and record the amount
    // so the celebration can animate the balance ticking up.
    const award = coinsForStars(earned);
    setLastAward({ coins: award, before: coins });
    setCoins((current) => current + award);
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
          <HomeScreen
            width={width}
            totalStars={totalStars}
            coins={coins}
            clearedLevels={clearedLevels}
            perfectLevels={perfectLevels}
            currentPlayable={currentPlayable}
            effectiveUnlocked={effectiveUnlocked}
            stars={stars}
            onPickPhoto={pickPhoto}
            onOpenLevel={openLevel}
            onOpenAchievements={() => setAchievementsOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        )}

        {screen === "ready" && (
          <ReadyScreen
            level={level}
            levelIndex={levelIndex}
            stars={stars}
            image={PUZZLE_IMAGE}
            isTimed={isTimed}
            timeLimit={timeLimit}
            onBack={goHome}
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
            levelLabel={mode === "photo" ? "Photo" : `Lv ${level.id}`}
            grid={activeGrid}
            moves={moves}
            seconds={seconds}
            activeTimed={activeTimed}
            activeTimeLimit={activeTimeLimit}
            lowTime={lowTime}
            board={board}
            sessionKey={`${mode}-${photo?.uri ?? levelIndex}-${activeGrid}`}
            image={activeImage}
            tiles={tiles}
            solved={solved}
            result={result}
            peeking={peeking}
            onGoHome={goHome}
            onShuffle={startGame}
            onPeek={() => setPeeking(true)}
            onOpenSettings={() => setSettingsOpen(true)}
            onMove={handleBoardMove}
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
                : levelIndex + 1 < LEVELS.length
                  ? "Level Cleared!"
                  : "All Cleared!"
            }
            subtitle={`${formatClock(Math.max(elapsed, 0))} · ${moves} moves`}
            primaryLabel={
              mode === "photo"
                ? "New photo"
                : levelIndex + 1 < LEVELS.length
                  ? "Next"
                  : "Back to map"
            }
            onPrimary={mode === "photo" ? pickPhoto : levelIndex + 1 < LEVELS.length ? nextLevel : goHome}
            onReplay={startGame}
          />
        )}

        {result === "timeup" && <TimeUpOverlay onRetry={startGame} onMap={goHome} />}

        {achievementsOpen && (
          <AchievementsModal
            totalStars={totalStars}
            clearedLevels={clearedLevels}
            perfectLevels={perfectLevels}
            currentPlayable={currentPlayable}
            onClose={() => setAchievementsOpen(false)}
            onPlayCurrent={() => {
              setAchievementsOpen(false);
              openLevel(currentPlayable);
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
              setUnlocked(1);
              setStars({});
              setSettingsOpen(false);
              setScreen("home");
            }}
            onClose={() => setSettingsOpen(false)}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}



