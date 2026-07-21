import { Image, Pressable, Text, View } from "react-native";
import Animated, { FadeInUp, ZoomIn } from "react-native-reanimated";

import { Chip, GameButton, IconButton, StarRow } from "@/components/game-ui";
import { UI_IMAGES } from "@/constants/assets";
import { formatClock, sizeName } from "@/constants/levels";
import { LEVEL_IMAGE_ASPECT, type LevelDef, type PackDef } from "@/constants/packs";
import { COLORS, FONT, GRADIENTS } from "@/constants/theme";
import { fitBoard } from "@/lib/board-layout";
import { levelChipColor } from "@/lib/puzzle-rules";

type ReadyScreenProps = {
  level: LevelDef;
  pack: PackDef;
  imageUri: string;
  bestStars: number;
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

export function ReadyScreen({ level, pack, imageUri, bestStars, onBack, onStart }: ReadyScreenProps) {
  const preview = fitBoard(190, 250, LEVEL_IMAGE_ASPECT);
  const isTimed = level.mode === "timed";

  return (
    <View style={{ flex: 1, padding: 18, gap: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <IconButton image={UI_IMAGES.back} onPress={onBack} />
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ color: COLORS.ink, fontSize: 20, fontFamily: FONT.black }} numberOfLines={1}>
            {`${pack.emoji} Level ${level.number}`}
          </Text>
          <Text style={{ color: COLORS.muted, fontFamily: FONT.semi, fontSize: 12 }} numberOfLines={1}>
            {pack.name}
          </Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <View style={{ flex: 1, justifyContent: "center" }}>
        <Animated.View
          entering={FadeInUp.springify().damping(15)}
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 32,
            paddingVertical: 22,
            paddingHorizontal: 22,
            alignItems: "center",
            gap: 13,
            boxShadow: "0 18px 44px rgba(123,92,255,0.18)"
          }}
        >
          {level.kind !== "easy" && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                backgroundColor: level.kind === "boss" ? COLORS.gold : COLORS.purple,
                paddingHorizontal: 13,
                paddingVertical: 4,
                borderRadius: 999
              }}
            >
              <Text style={{ color: COLORS.surface, fontFamily: FONT.black, fontSize: 12 }}>
                {level.kind === "boss" ? "BOSS PUZZLE" : "CHALLENGE"}
              </Text>
            </View>
          )}

          <View
            style={{
              padding: 9,
              paddingBottom: 22,
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              transform: [{ rotate: "-2.5deg" }],
              boxShadow: "0 10px 26px rgba(42,33,64,0.16)"
            }}
          >
            <Image
              source={{ uri: imageUri }}
              resizeMode="cover"
              style={{
                width: preview.w,
                height: preview.h,
                borderRadius: 10,
                backgroundColor: pack.accentSoft
              }}
            />
          </View>

          <View style={{ alignItems: "center", gap: 2 }}>
            <Text style={{ color: COLORS.ink, fontSize: 26, fontFamily: FONT.black }}>{level.title}</Text>
            <Text style={{ color: COLORS.muted, fontFamily: FONT.semi, fontSize: 14 }}>
              {`${level.grid} x ${level.grid} pieces`}
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Chip label={sizeName(level.grid)} color={levelChipColor(level.grid)} />
            <Chip
              label={isTimed ? formatClock(level.timeLimit) : "Relaxed"}
              color={isTimed ? COLORS.pink : COLORS.teal}
            />
          </View>

          {bestStars > 0 && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ color: COLORS.muted, fontFamily: FONT.semi, fontSize: 13 }}>
                Your best
              </Text>
              <StarRow earned={bestStars} size={17} />
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
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10 }}>
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
                    width: 112,
                    paddingHorizontal: 10,
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

