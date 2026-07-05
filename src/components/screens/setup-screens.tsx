import { Image, Pressable, Text, View, type ImageSourcePropType } from "react-native";
import Animated, { FadeInUp, ZoomIn } from "react-native-reanimated";

import { Chip, GameButton, IconButton, StarRow } from "@/components/game-ui";
import { UI_IMAGES } from "@/constants/assets";
import { formatClock, sizeName, type Level } from "@/constants/levels";
import { COLORS, FONT, GRADIENTS } from "@/constants/theme";
import { fitBoard } from "@/lib/board-layout";
import { levelChipColor } from "@/lib/puzzle-rules";

type ReadyScreenProps = {
  level: Level;
  levelIndex: number;
  stars: Record<number, number>;
  image: ImageSourcePropType;
  isTimed: boolean;
  timeLimit: number;
  onBack: () => void;
  onStart: () => void;
};

type PhotoGridOption = {
  grid: number;
  label: string;
  color: string;
};

type PhotoSetupScreenProps = {
  photo: { uri: string; aspect: number };
  photoGrid: number;
  options: PhotoGridOption[];
  onBack: () => void;
  onPickPhoto: () => void;
  onSelectGrid: (grid: number) => void;
  onStart: () => void;
};

export function ReadyScreen({
  level,
  levelIndex,
  stars,
  image,
  isTimed,
  timeLimit,
  onBack,
  onStart
}: ReadyScreenProps) {
  return (
    <View style={{ flex: 1, padding: 18, gap: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <IconButton image={UI_IMAGES.back} onPress={onBack} />
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
            <Image source={image} resizeMode="cover" style={{ width: 184, height: 184, borderRadius: 10 }} />
          </View>

          <View style={{ alignItems: "center", gap: 2 }}>
            <Text style={{ color: COLORS.ink, fontSize: 28, fontFamily: FONT.black }}>{level.title}</Text>
            <Text style={{ color: COLORS.muted, fontFamily: FONT.semi, fontSize: 14 }}>
              {`${level.grid} x ${level.grid} pieces`}
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Chip label={sizeName(level.grid)} color={levelChipColor(level.grid)} />
            <Chip
              label={isTimed ? formatClock(timeLimit) : "Relaxed"}
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

      <GameButton label="Play!" gradient={GRADIENTS.pink} depthColor={COLORS.pinkDark} onPress={onStart} />
    </View>
  );
}

export function PhotoSetupScreen({
  photo,
  photoGrid,
  options,
  onBack,
  onPickPhoto,
  onSelectGrid,
  onStart
}: PhotoSetupScreenProps) {
  return (
    <View style={{ flex: 1, padding: 18, gap: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <IconButton image={UI_IMAGES.back} onPress={onBack} />
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
        <IconButton image={UI_IMAGES.photoPuzzle} onPress={onPickPhoto} />
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
            const preview = fitBoard(232, 300, photo.aspect);
            return (
              <Image
                source={{ uri: photo.uri }}
                resizeMode="cover"
                style={{ width: preview.w, height: preview.h, borderRadius: 10 }}
              />
            );
          })()}
        </Animated.View>

        <View style={{ alignItems: "center", gap: 12 }}>
          <Text style={{ color: COLORS.ink, fontFamily: FONT.bold, fontSize: 16 }}>Choose difficulty</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {options.map((option) => {
              const selected = photoGrid === option.grid;
              return (
                <Pressable
                  key={option.grid}
                  onPress={() => onSelectGrid(option.grid)}
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
                    {`${option.grid}x${option.grid}`}
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
        iconSource={UI_IMAGES.photoPuzzle}
        gradient={GRADIENTS.pink}
        depthColor={COLORS.pinkDark}
        onPress={onStart}
      />
    </View>
  );
}
