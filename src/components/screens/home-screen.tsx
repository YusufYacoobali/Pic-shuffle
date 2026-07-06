import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { BadgeIcon, Coin, IconButton } from "@/components/game-ui";
import { UI_IMAGES } from "@/constants/assets";
import { getLevel, PACK_SIZE, PACKS, TOTAL_LEVELS, type PackDef } from "@/constants/packs";
import { COLORS, FONT } from "@/constants/theme";
import {
  isPackUnlocked,
  packClearedCount,
  packStars,
  type StarMap
} from "@/lib/progress";

type HomeScreenProps = {
  totalStars: number;
  coins: number;
  clearedLevels: number;
  perfectLevels: number;
  currentGlobal: number;
  unlockAll: boolean;
  stars: StarMap;
  onPickPhoto: () => void;
  onOpenPack: (packIndex: number) => void;
  onOpenLevel: (global: number) => void;
  onOpenAchievements: () => void;
  onOpenSettings: () => void;
};

export function HomeScreen({
  totalStars,
  coins,
  clearedLevels,
  perfectLevels,
  currentGlobal,
  unlockAll,
  stars,
  onPickPhoto,
  onOpenPack,
  onOpenLevel,
  onOpenAchievements,
  onOpenSettings
}: HomeScreenProps) {
  const currentLevel = getLevel(currentGlobal);
  const currentPack = PACKS[currentLevel.pack];

  return (
    <Animated.View entering={FadeIn.duration(240)} style={{ flex: 1 }}>
      <ScrollView
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
              <Text style={{ fontSize: 14 }}>{"\u2605"}</Text>
              <Text style={{ color: COLORS.ink, fontFamily: FONT.bold, fontSize: 15 }}>{totalStars}</Text>
            </StatChip>
          </View>
          <IconButton image={UI_IMAGES.settings} onPress={onOpenSettings} size={42} />
        </View>

        {/* Wordmark */}
        <View style={{ alignItems: "center", gap: 6, paddingTop: 4 }}>
          <Text style={{ color: COLORS.ink, fontSize: 36, fontFamily: FONT.black, letterSpacing: 0 }}>
            Pic Shuffle
          </Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {[COLORS.pink, COLORS.yellow, COLORS.teal, COLORS.purple].map((c) => (
              <View key={c} style={{ width: 16, height: 16, borderRadius: 5, backgroundColor: c }} />
            ))}
          </View>
        </View>

        {/* Continue - jumps straight into the current level */}
        <Pressable
          onPress={() => onOpenLevel(currentGlobal)}
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
              backgroundColor: currentPack.accent,
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Text style={{ color: COLORS.surface, fontFamily: FONT.black, fontSize: 22 }}>
              {currentLevel.number}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.muted, fontFamily: FONT.semi, fontSize: 12 }}>Continue</Text>
            <Text style={{ color: COLORS.ink, fontFamily: FONT.black, fontSize: 19 }} numberOfLines={1}>
              {`${currentPack.emoji} ${currentPack.name}`}
            </Text>
            <Text style={{ color: COLORS.muted, fontFamily: FONT.semi, fontSize: 12 }} numberOfLines={1}>
              {`Level ${currentLevel.number} - ${currentLevel.title} - ${currentLevel.grid}x${currentLevel.grid}`}
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
            <Text style={{ color: COLORS.pink, fontFamily: FONT.black, fontSize: 20, marginTop: -2 }}>{">"}</Text>
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
            subtitle={`${clearedLevels}/${TOTAL_LEVELS} cleared - ${perfectLevels} perfect`}
            tint={COLORS.tealSoft}
            titleColor={COLORS.tealDark}
            onPress={onOpenAchievements}
          />
        </View>

        {/* Packs */}
        <View style={{ paddingTop: 2 }}>
          <Text style={{ color: COLORS.ink, fontFamily: FONT.black, fontSize: 22 }}>Puzzle Packs</Text>
          <Text style={{ color: COLORS.muted, fontFamily: FONT.semi, fontSize: 12 }}>
            {`Clear all ${PACK_SIZE} levels in a pack to unlock the next one.`}
          </Text>
        </View>

        <View style={{ gap: 11 }}>
          {PACKS.map((pack, index) => (
            <PackCard
              key={pack.id}
              pack={pack}
              index={index}
              cleared={packClearedCount(stars, pack.index)}
              earned={packStars(stars, pack.index)}
              locked={!isPackUnlocked(stars, pack.index, unlockAll)}
              isCurrent={pack.index === currentPack.index}
              onPress={() => onOpenPack(pack.index)}
            />
          ))}
        </View>
      </ScrollView>
    </Animated.View>
  );
}

function PackCard({
  pack,
  index,
  cleared,
  earned,
  locked,
  isCurrent,
  onPress
}: {
  pack: PackDef;
  index: number;
  cleared: number;
  earned: number;
  locked: boolean;
  isCurrent: boolean;
  onPress: () => void;
}) {
  const fraction = cleared / PACK_SIZE;
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(40 + index * 40, 480)).duration(280)}>
      <Pressable
        disabled={locked}
        onPress={onPress}
        style={({ pressed }) => ({
          backgroundColor: COLORS.surface,
          borderRadius: 20,
          padding: 13,
          flexDirection: "row",
          alignItems: "center",
          gap: 13,
          opacity: locked ? 0.62 : 1,
          borderWidth: isCurrent ? 2 : 0,
          borderColor: pack.accent,
          transform: [{ scale: pressed ? 0.985 : 1 }],
          boxShadow: isCurrent
            ? "0 8px 18px rgba(32,26,48,0.12)"
            : "0 5px 14px rgba(32,26,48,0.07)"
        })}
      >
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            backgroundColor: pack.accentSoft,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Text style={{ fontSize: 26 }}>{locked ? "LOCK" : pack.emoji}</Text>
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: COLORS.ink, fontFamily: FONT.black, fontSize: 16 }} numberOfLines={1}>
              {pack.name}
            </Text>
            {!locked && cleared > 0 && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                <Text style={{ fontSize: 11 }}>{"\u2605"}</Text>
                <Text style={{ color: COLORS.muted, fontFamily: FONT.bold, fontSize: 12 }}>
                  {`${earned}/${PACK_SIZE * 3}`}
                </Text>
              </View>
            )}
          </View>

          {locked ? (
            <Text style={{ color: COLORS.muted, fontFamily: FONT.semi, fontSize: 12 }}>
              Finish the previous pack to unlock
            </Text>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View
                style={{
                  flex: 1,
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: "rgba(32,26,48,0.07)",
                  overflow: "hidden"
                }}
              >
                <View
                  style={{
                    width: `${Math.round(fraction * 100)}%`,
                    height: "100%",
                    borderRadius: 999,
                    backgroundColor: pack.accent
                  }}
                />
              </View>
              <Text style={{ color: COLORS.muted, fontFamily: FONT.bold, fontSize: 12 }}>
                {`${cleared}/${PACK_SIZE}`}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
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


