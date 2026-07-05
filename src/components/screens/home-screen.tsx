import { useRef } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { BadgeIcon, Coin, IconButton } from "@/components/game-ui";
import { LEVEL_PATH_ROW_HEIGHT, LevelPath } from "@/components/level-path";
import { UI_IMAGES } from "@/constants/assets";
import { LEVELS } from "@/constants/levels";
import { COLORS, FONT } from "@/constants/theme";
import type { StarMap } from "@/lib/progress";

type HomeScreenProps = {
  width: number;
  totalStars: number;
  coins: number;
  clearedLevels: number;
  perfectLevels: number;
  currentPlayable: number;
  effectiveUnlocked: number;
  stars: StarMap;
  onPickPhoto: () => void;
  onOpenLevel: (index: number) => void;
  onOpenAchievements: () => void;
  onOpenSettings: () => void;
};

export function HomeScreen({
  width,
  totalStars,
  coins,
  clearedLevels,
  perfectLevels,
  currentPlayable,
  effectiveUnlocked,
  stars,
  onPickPhoto,
  onOpenLevel,
  onOpenAchievements,
  onOpenSettings
}: HomeScreenProps) {
  const scrollRef = useRef<ScrollView>(null);
  const pathY = useRef(0);
  const currentLevel = LEVELS[currentPlayable];

  function jumpToCurrent() {
    scrollRef.current?.scrollTo({
      y: Math.max(0, pathY.current + currentPlayable * LEVEL_PATH_ROW_HEIGHT - 40),
      animated: true
    });
  }

  return (
    <Animated.View entering={FadeIn.duration(240)} style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 44, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar: currency + progress on the left, settings on the right */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <StatChip>
              <Coin size={19} />
              <Text style={{ color: COLORS.ink, fontFamily: FONT.bold, fontSize: 15 }}>{coins}</Text>
            </StatChip>
            <StatChip>
              <Text style={{ fontSize: 14 }}>{"⭐"}</Text>
              <Text style={{ color: COLORS.ink, fontFamily: FONT.bold, fontSize: 15 }}>
                {totalStars}
                <Text style={{ color: COLORS.muted, fontFamily: FONT.semi, fontSize: 12 }}>
                  {` / ${LEVELS.length * 3}`}
                </Text>
              </Text>
            </StatChip>
          </View>
          <IconButton image={UI_IMAGES.settings} onPress={onOpenSettings} size={42} />
        </View>

        {/* Wordmark */}
        <View style={{ alignItems: "center", gap: 6, paddingTop: 4 }}>
          <Text style={{ color: COLORS.ink, fontSize: 36, fontFamily: FONT.black, letterSpacing: 0.3 }}>
            Pic Shuffle
          </Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {[COLORS.pink, COLORS.yellow, COLORS.teal, COLORS.purple].map((c) => (
              <View key={c} style={{ width: 16, height: 16, borderRadius: 5, backgroundColor: c }} />
            ))}
          </View>
        </View>

        {/* Continue — surfaces the current level so you never have to hunt for it */}
        <Pressable
          onPress={() => onOpenLevel(currentPlayable)}
          style={({ pressed }) => ({
            backgroundColor: COLORS.surface,
            borderRadius: 22,
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            transform: [{ scale: pressed ? 0.99 : 1 }],
            boxShadow: "0 6px 16px rgba(32,26,48,0.08)"
          })}
        >
          <View
            style={{
              width: 54,
              height: 54,
              borderRadius: 27,
              backgroundColor: COLORS.pink,
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Text style={{ color: COLORS.surface, fontFamily: FONT.black, fontSize: 22 }}>
              {currentLevel.id}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.muted, fontFamily: FONT.semi, fontSize: 12 }}>Continue</Text>
            <Text style={{ color: COLORS.ink, fontFamily: FONT.black, fontSize: 19 }}>
              {`Level ${currentLevel.id}`}
            </Text>
            <Text style={{ color: COLORS.muted, fontFamily: FONT.semi, fontSize: 12 }}>
              {`${currentLevel.title} · ${currentLevel.grid}×${currentLevel.grid}`}
            </Text>
          </View>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: COLORS.pinkSoft,
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Text style={{ color: COLORS.pink, fontFamily: FONT.black, fontSize: 20, marginTop: -2 }}>▶</Text>
          </View>
        </Pressable>

        {/* Secondary actions */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <ActionTile
            image={UI_IMAGES.photoPuzzle}
            title="Your Photo"
            subtitle="Turn a pic into a puzzle"
            tint={COLORS.purpleSoft}
            titleColor={COLORS.purpleDark}
            onPress={onPickPhoto}
          />
          <ActionTile
            image={UI_IMAGES.achievements}
            title="Goals"
            subtitle={`${clearedLevels}/${LEVELS.length} cleared · ${perfectLevels} perfect`}
            tint={COLORS.tealSoft}
            titleColor={COLORS.tealDark}
            onPress={onOpenAchievements}
          />
        </View>

        {/* Level ladder */}
        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingTop: 2 }}>
          <View>
            <Text style={{ color: COLORS.ink, fontFamily: FONT.black, fontSize: 22 }}>Levels</Text>
            <Text style={{ color: COLORS.muted, fontFamily: FONT.semi, fontSize: 12 }}>
              {`${clearedLevels} of ${LEVELS.length} cleared`}
            </Text>
          </View>
          <Pressable
            onPress={jumpToCurrent}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 999,
              backgroundColor: COLORS.surface,
              transform: [{ scale: pressed ? 0.96 : 1 }],
              boxShadow: "0 3px 10px rgba(32,26,48,0.08)"
            })}
          >
            <Text style={{ fontSize: 13 }}>{"📍"}</Text>
            <Text style={{ color: COLORS.ink, fontFamily: FONT.bold, fontSize: 13 }}>Current</Text>
          </Pressable>
        </View>

        <View onLayout={(event) => (pathY.current = event.nativeEvent.layout.y)}>
          <LevelPath
            width={width - 36}
            unlocked={effectiveUnlocked}
            currentIndex={currentPlayable}
            stars={stars}
            onSelect={onOpenLevel}
          />
        </View>
      </ScrollView>
    </Animated.View>
  );
}

function StatChip({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: COLORS.surface,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        boxShadow: "0 3px 10px rgba(32,26,48,0.08)"
      }}
    >
      {children}
    </View>
  );
}

function ActionTile({
  image,
  title,
  subtitle,
  tint,
  titleColor,
  onPress
}: {
  image: number;
  title: string;
  subtitle: string;
  tint: string;
  titleColor: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: tint,
        borderRadius: 20,
        padding: 14,
        gap: 10,
        minHeight: 116,
        transform: [{ scale: pressed ? 0.98 : 1 }]
      })}
    >
      <BadgeIcon source={image} size={44} />
      <View style={{ gap: 1 }}>
        <Text style={{ color: titleColor, fontFamily: FONT.black, fontSize: 17 }}>{title}</Text>
        <Text style={{ color: COLORS.muted, fontFamily: FONT.semi, fontSize: 11.5 }}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}
