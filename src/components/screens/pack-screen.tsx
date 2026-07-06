import { useEffect, useMemo, useRef } from "react";
import { ScrollView, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { IconButton } from "@/components/game-ui";
import { LEVEL_PATH_ROW_HEIGHT, LevelPath, type PathNode } from "@/components/level-path";
import { UI_IMAGES } from "@/constants/assets";
import { getPackLevels, PACK_SIZE, type PackDef } from "@/constants/packs";
import { COLORS, FONT } from "@/constants/theme";
import { isLevelUnlocked, packClearedCount, packStars, type StarMap } from "@/lib/progress";

export function PackScreen({
  width,
  pack,
  stars,
  currentGlobal,
  unlockAll,
  onBack,
  onSelectLevel
}: {
  width: number;
  pack: PackDef;
  stars: StarMap;
  currentGlobal: number;
  unlockAll: boolean;
  onBack: () => void;
  onSelectLevel: (global: number) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const levels = useMemo(() => getPackLevels(pack.index), [pack.index]);

  const nodes = useMemo<PathNode[]>(
    () =>
      levels.map((level) => {
        const earned = stars[level.global] ?? 0;
        const unlocked = isLevelUnlocked(stars, level.global, unlockAll);
        const state = !unlocked
          ? "locked"
          : level.global === currentGlobal
            ? "current"
            : earned > 0
              ? "done"
              : "open";
        return {
          key: level.global,
          label: String(level.number),
          state,
          stars: earned,
          kind: level.kind,
          timed: level.mode === "timed"
        };
      }),
    [levels, stars, currentGlobal, unlockAll]
  );

  const currentSlot = nodes.findIndex((node) => node.state === "current");
  const cleared = packClearedCount(stars, pack.index);
  const earnedStars = packStars(stars, pack.index);

  // Drop the player at their current level instead of making them scroll.
  useEffect(() => {
    if (currentSlot <= 1) return;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, currentSlot * LEVEL_PATH_ROW_HEIGHT - 170),
        animated: false
      });
    }, 60);
    return () => clearTimeout(timer);
  }, [currentSlot]);

  return (
    <Animated.View entering={FadeIn.duration(220)} style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 18,
          paddingTop: 14,
          paddingBottom: 10
        }}
      >
        <IconButton image={UI_IMAGES.back} onPress={onBack} size={42} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.ink, fontFamily: FONT.black, fontSize: 20 }} numberOfLines={1}>
            {`${pack.emoji} ${pack.name}`}
          </Text>
          <Text style={{ color: COLORS.muted, fontFamily: FONT.semi, fontSize: 12 }}>
            {`${cleared}/${PACK_SIZE} cleared - ${earnedStars}/${PACK_SIZE * 3} stars`}
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: pack.accentSoft
          }}
        >
          <Text style={{ color: pack.accent, fontFamily: FONT.black, fontSize: 12 }}>
            {pack.theme === "nature" ? "Nature" : "Food"}
          </Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40, paddingTop: 6 }}
        showsVerticalScrollIndicator={false}
      >
        <LevelPath width={width - 36} nodes={nodes} accent={pack.accent} onSelect={onSelectLevel} />
      </ScrollView>
    </Animated.View>
  );
}

