import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { Image, Text, View, type ImageSourcePropType } from "react-native";
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
  tiles,
  solved,
  result,
  peeking,
  onGoHome,
  onShuffle,
  onPeek,
  onOpenSettings,
  onMove,
  onBoardAreaChange
}: PlayScreenProps) {
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
            {board.w > 0 && board.h > 0 && (
              <PuzzleBoard
                key={sessionKey}
                grid={grid}
                tiles={tiles}
                boardWidth={board.w}
                boardHeight={board.h}
                image={image}
                solved={solved}
                disabled={Boolean(result) || peeking}
                onMove={onMove}
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
                  padding: 10,
                  boxShadow: "0 18px 36px rgba(42,33,64,0.25)"
                }}
              >
                <Image
                  source={image}
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
