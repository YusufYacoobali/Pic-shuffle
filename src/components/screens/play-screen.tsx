import { LinearGradient } from "expo-linear-gradient";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  Text,
  View,
  type ImageSourcePropType
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";

import { IconButton } from "@/components/game-ui";
import { PuzzleBoard } from "@/components/puzzle-board";
import { UI_IMAGES } from "@/constants/assets";
import { formatClock } from "@/constants/levels";
import { COLORS, FONT, GRADIENTS } from "@/constants/theme";
import {
  preparePuzzleImages,
  type PreparedPuzzleImages
} from "@/services/puzzle-tile-images";

const StablePuzzleBoard = memo(PuzzleBoard);

type BoardSize = {
  w: number;
  h: number;
};

type PlayScreenProps = {
  mode: "level" | "photo";
  levelLabel: string;
  grid: number;
  moves: number;
  seconds: number;
  activeTimed: boolean;
  activeTimeLimit: number;
  lowTime: boolean;
  board: BoardSize;
  sessionKey: string;
  image: ImageSourcePropType;
  imageUri: string;
  imageWidth: number;
  imageHeight: number;
  tiles: number[];
  solved: boolean;
  result: null | "win" | "timeup";
  peeking: boolean;
  onGoHome: () => void;
  onShuffle: () => void;
  onPeek: () => void;
  onOpenSettings: () => void;
  onMove: (nextTiles: number[]) => void;
  onBoardAreaChange: (size: BoardSize) => void;
  onReadyStateChange: (ready: boolean) => void;
};

export function PlayScreen({
  mode,
  levelLabel,
  grid,
  moves,
  seconds,
  activeTimed,
  activeTimeLimit,
  lowTime,
  board,
  sessionKey,
  image,
  imageUri,
  imageWidth,
  imageHeight,
  tiles,
  solved,
  result,
  peeking,
  onGoHome,
  onShuffle,
  onPeek,
  onOpenSettings,
  onMove,
  onBoardAreaChange,
  onReadyStateChange
}: PlayScreenProps) {
  // The clock redraws this header once a second. Keep the expensive board
  // isolated from those redraws while still forwarding moves to the latest
  // game-state handler.
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const handleMove = useCallback((nextTiles: number[]) => {
    onMoveRef.current(nextTiles);
  }, []);

  const needsPreparedTiles = Platform.OS !== "web" && grid >= 6;
  const preparationKey = [
    imageUri,
    imageWidth,
    imageHeight,
    grid,
    Math.round(board.w),
    Math.round(board.h)
  ].join("|");
  const [prepared, setPrepared] = useState<{
    key: string;
    images: PreparedPuzzleImages;
  } | null>(null);
  const [preparationError, setPreparationError] = useState<{ key: string } | null>(null);
  const [preparationAttempt, setPreparationAttempt] = useState(0);

  useEffect(() => {
    if (!needsPreparedTiles || board.w <= 0 || board.h <= 0) return undefined;
    let cancelled = false;
    setPreparationError(null);
    preparePuzzleImages({
      sourceUri: imageUri,
      sourceWidth: imageWidth,
      sourceHeight: imageHeight,
      grid,
      boardWidth: board.w,
      boardHeight: board.h
    })
      .then((images) => {
        if (!cancelled) setPrepared({ key: preparationKey, images });
      })
      .catch(() => {
        if (!cancelled) setPreparationError({ key: preparationKey });
      });
    return () => {
      cancelled = true;
    };
  }, [
    board.h,
    board.w,
    grid,
    imageHeight,
    imageUri,
    imageWidth,
    needsPreparedTiles,
    preparationAttempt,
    preparationKey
  ]);

  const preparedImages = prepared?.key === preparationKey ? prepared.images : null;
  const boardReady = !needsPreparedTiles || Boolean(preparedImages);
  const displayImage = useMemo<ImageSourcePropType>(
    () => (preparedImages ? { uri: preparedImages.fullImageUri } : image),
    [image, preparedImages]
  );
  const tileImages = useMemo<ImageSourcePropType[] | undefined>(
    () => preparedImages?.tileImageUris.map((uri) => ({ uri })),
    [preparedImages]
  );

  useEffect(() => {
    onReadyStateChange(boardReady);
  }, [boardReady, onReadyStateChange, sessionKey]);

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      style={{ flex: 1, paddingHorizontal: 8, paddingTop: 8, paddingBottom: 10, gap: 8 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <IconButton image={UI_IMAGES.close} onPress={onGoHome} size={40} />
        <View style={{ flex: 1, alignItems: "center" }}>
          <MiniPill label={mode === "photo" ? "Photo" : levelLabel} />
        </View>
        <IconButton image={UI_IMAGES.peek} onPress={onPeek} size={40} />
        <IconButton image={UI_IMAGES.shuffle} onPress={onShuffle} size={40} />
        <IconButton image={UI_IMAGES.settings} onPress={onOpenSettings} size={40} />
      </View>

      <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
        <CompactStat value={`${moves}`} caption="moves" accent={COLORS.pink} />
        <CompactStat
          value={formatClock(seconds)}
          caption={activeTimed ? "left" : "time"}
          accent={lowTime ? COLORS.pink : COLORS.teal}
          hot={lowTime}
        />
        <CompactStat value={`${grid}x${grid}`} caption="grid" accent={COLORS.purple} />
      </View>

      {activeTimed && (
        <TimeBar fraction={activeTimeLimit > 0 ? seconds / activeTimeLimit : 0} hot={lowTime} />
      )}

      <View
        style={{ flex: 1, alignItems: "center", justifyContent: "center", width: "100%" }}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          onBoardAreaChange({ w: width, h: height });
        }}
      >
        <LinearGradient
          colors={GRADIENTS.card}
          style={{
            width: board.w ? board.w + 10 : "100%",
            height: board.h ? board.h + 10 : "100%",
            maxWidth: "100%",
            maxHeight: "100%",
            borderRadius: 28,
            padding: 5,
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 18px 34px rgba(42,33,64,0.22)"
          }}
        >
          <View style={{ width: board.w, height: board.h }}>
            {board.w > 0 && board.h > 0 && boardReady && (
              <StablePuzzleBoard
                key={sessionKey}
                grid={grid}
                tiles={tiles}
                boardWidth={board.w}
                boardHeight={board.h}
                image={displayImage}
                tileImages={tileImages}
                solved={solved}
                disabled={Boolean(result) || peeking}
                onMove={handleMove}
              />
            )}

            {board.w > 0 && board.h > 0 && !boardReady && (
              <View
                style={{
                  width: "100%",
                  height: "100%",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  padding: 24
                }}
              >
                {preparationError?.key === preparationKey ? (
                  <>
                    <Text
                      style={{
                        color: COLORS.ink,
                        fontFamily: FONT.bold,
                        fontSize: 15,
                        textAlign: "center"
                      }}
                    >
                      Couldn&apos;t prepare this puzzle image.
                    </Text>
                    <Pressable
                      onPress={() => setPreparationAttempt((value) => value + 1)}
                      style={({ pressed }) => ({
                        borderRadius: 999,
                        paddingHorizontal: 18,
                        paddingVertical: 9,
                        backgroundColor: COLORS.purple,
                        opacity: pressed ? 0.78 : 1
                      })}
                    >
                      <Text style={{ color: COLORS.surface, fontFamily: FONT.bold, fontSize: 14 }}>
                        Retry
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <ActivityIndicator size="large" color={COLORS.purple} />
                    <Text style={{ color: COLORS.muted, fontFamily: FONT.bold, fontSize: 13 }}>
                      Preparing memory-safe tiles…
                    </Text>
                  </>
                )}
              </View>
            )}

            {peeking && boardReady && (
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
                  padding: 10,
                  boxShadow: "0 18px 36px rgba(42,33,64,0.25)"
                }}
              >
                <Image
                  source={displayImage}
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
        </LinearGradient>
      </View>

      {!result && (
        <View style={{ alignItems: "center" }}>
          <MiniPill label={activeTimed ? "Timed challenge" : "Relaxed puzzle"} />
        </View>
      )}
    </Animated.View>
  );
}

function CompactStat({
  value,
  caption,
  accent,
  hot = false
}: {
  value: string;
  caption?: string;
  accent: string;
  hot?: boolean;
}) {
  return (
    <View
      style={{
        minWidth: caption ? 58 : 66,
        maxWidth: caption ? 74 : 92,
        borderRadius: 999,
        paddingHorizontal: 9,
        paddingVertical: 5,
        backgroundColor: hot ? COLORS.pink : COLORS.surface,
        alignItems: "center",
        justifyContent: "center",
        boxShadow: hot
          ? "0 5px 14px rgba(255,77,151,0.34)"
          : "0 4px 12px rgba(123,92,255,0.12)"
      }}
    >
      <Text
        style={{
          color: hot ? COLORS.surface : accent,
          fontFamily: FONT.black,
          fontSize: caption ? 15 : 13,
          fontVariant: ["tabular-nums"]
        }}
        numberOfLines={1}
      >
        {value}
      </Text>
      {caption ? (
        <Text
          style={{
            color: hot ? "rgba(255,255,255,0.82)" : COLORS.muted,
            fontFamily: FONT.bold,
            fontSize: 9,
            marginTop: -3
          }}
          numberOfLines={1}
        >
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

function MiniPill({ label }: { label: string }) {
  return (
    <View
      style={{
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.68)"
      }}
    >
      <Text style={{ color: COLORS.muted, fontFamily: FONT.bold, fontSize: 12 }}>{label}</Text>
    </View>
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
        height: 8,
        borderRadius: 999,
        backgroundColor: "rgba(42,33,64,0.08)",
        overflow: "hidden"
      }}
    >
      <Animated.View
        style={[
          {
            height: "100%",
            borderRadius: 999,
            backgroundColor: hot ? COLORS.pink : COLORS.teal
          },
          style
        ]}
      />
    </View>
  );
}
