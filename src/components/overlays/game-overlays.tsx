import { Pressable, Switch, Text, View, type ImageSourcePropType } from "react-native";
import Animated, { FadeInUp, ZoomIn } from "react-native-reanimated";

import { BadgeIcon, GameButton, IconButton } from "@/components/game-ui";
import { UI_IMAGES } from "@/constants/assets";
import { LEVELS } from "@/constants/levels";
import { COLORS, FONT, GRADIENTS } from "@/constants/theme";

export function AchievementsModal({
  totalStars,
  clearedLevels,
  perfectLevels,
  currentPlayable,
  onClose,
  onPlayCurrent
}: {
  totalStars: number;
  clearedLevels: number;
  perfectLevels: number;
  currentPlayable: number;
  onClose: () => void;
  onPlayCurrent: () => void;
}) {
  return (
    <Pressable
      onPress={onClose}
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        backgroundColor: "rgba(42,33,64,0.4)",
        alignItems: "center",
        justifyContent: "center",
        padding: 22
      }}
    >
      <Animated.View entering={ZoomIn.springify().damping(16)} style={{ width: "100%", maxWidth: 340 }}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 30,
            padding: 22,
            gap: 16,
            boxShadow: "0 24px 54px rgba(42,33,64,0.28)"
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <BadgeIcon source={UI_IMAGES.achievements} size={72} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.ink, fontFamily: FONT.black, fontSize: 25 }}>
                Achievements
              </Text>
              <Text style={{ color: COLORS.muted, fontFamily: FONT.semi, fontSize: 13 }}>
                Keep rebuilding pictures to fill the shelf.
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <AchievementStat label="Stars" value={`${totalStars}/${LEVELS.length * 3}`} />
            <AchievementStat label="Cleared" value={`${clearedLevels}/${LEVELS.length}`} />
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <AchievementStat label="Perfect" value={String(perfectLevels)} />
            <AchievementStat label="Current" value={`Lv ${LEVELS[currentPlayable].id}`} />
          </View>

          <GameButton
            label="Play current"
            iconSource={UI_IMAGES.currentLevel}
            gradient={GRADIENTS.pink}
            depthColor={COLORS.pinkDark}
            onPress={onPlayCurrent}
            compact
          />
          <Pressable onPress={onClose} style={{ alignItems: "center", paddingVertical: 4 }}>
            <Text style={{ color: COLORS.muted, fontFamily: FONT.bold, fontSize: 15 }}>Close</Text>
          </Pressable>
        </Pressable>
      </Animated.View>
    </Pressable>
  );
}

export function SettingsSheet({
  sound,
  music,
  notifications,
  onSoundChange,
  onMusicChange,
  onNotificationsChange,
  onResetProgress,
  onClose
}: {
  sound: boolean;
  music: boolean;
  notifications: boolean;
  onSoundChange: (value: boolean) => void;
  onMusicChange: (value: boolean) => void;
  onNotificationsChange: (value: boolean) => void;
  onResetProgress: () => void;
  onClose: () => void;
}) {
  return (
    <Pressable
      onPress={onClose}
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
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: COLORS.ink, fontSize: 24, fontFamily: FONT.black }}>Settings</Text>
            <IconButton image={UI_IMAGES.close} onPress={onClose} size={38} />
          </View>
          <SettingRow
            image={UI_IMAGES.settingsSound}
            label="Sound effects"
            value={sound}
            onValueChange={onSoundChange}
          />
          <SettingRow
            image={UI_IMAGES.settingsMusic}
            label="Music"
            value={music}
            onValueChange={onMusicChange}
          />
          <SettingRow
            image={UI_IMAGES.settingsReminders}
            label="Reminders"
            value={notifications}
            onValueChange={onNotificationsChange}
          />
          <View style={{ height: 1, backgroundColor: "rgba(0,0,0,0.07)" }} />
          <Pressable
            onPress={onResetProgress}
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
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <BadgeIcon source={UI_IMAGES.settingsReset} size={30} />
              <Text style={{ color: COLORS.pink, fontFamily: FONT.black, fontSize: 16 }}>
                Reset progress
              </Text>
            </View>
          </Pressable>
          <Text style={{ textAlign: "center", color: COLORS.muted, fontFamily: FONT.semi, fontSize: 12 }}>
            Pic Shuffle v1.0
          </Text>
        </Pressable>
      </Animated.View>
    </Pressable>
  );
}

function AchievementStat({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        minHeight: 74,
        borderRadius: 18,
        backgroundColor: COLORS.purpleSoft,
        padding: 12,
        justifyContent: "center"
      }}
    >
      <Text style={{ color: COLORS.muted, fontFamily: FONT.bold, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: COLORS.ink, fontFamily: FONT.black, fontSize: 22 }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function SettingRow({
  image,
  label,
  value,
  onValueChange
}: {
  image: ImageSourcePropType;
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
        <BadgeIcon source={image} size={38} />
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
