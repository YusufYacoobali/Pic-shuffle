import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import {
  Image,
  Pressable,
  Text,
  View,
  type ImageSourcePropType,
  type ViewStyle
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming
} from "react-native-reanimated";

import { COLORS, FONT } from "@/constants/theme";

type GradientColors = readonly [string, string, ...string[]];

export function GameButton({
  label,
  icon,
  iconSource,
  gradient,
  depthColor,
  textColor = COLORS.surface,
  solid,
  onPress,
  compact = false,
  style
}: {
  label: string;
  icon?: string;
  iconSource?: ImageSourcePropType;
  gradient?: GradientColors;
  depthColor: string;
  textColor?: string;
  solid?: string;
  onPress: () => void;
  compact?: boolean;
  style?: ViewStyle;
}) {
  const height = compact ? 56 : 64;
  const radius = compact ? 19 : 22;
  const inner = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: "100%"
      }}
    >
      {iconSource ? (
        <Image
          source={iconSource}
          resizeMode="cover"
          style={{
            width: compact ? 28 : 34,
            height: compact ? 28 : 34,
            borderRadius: compact ? 9 : 11
          }}
        />
      ) : icon ? (
        <Text style={{ fontSize: compact ? 19 : 23 }}>{icon}</Text>
      ) : null}
      <Text
        style={{
          color: textColor,
          fontSize: compact ? 19 : 23,
          fontFamily: FONT.black,
          letterSpacing: 0.4
        }}
      >
        {label}
      </Text>
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        height,
        borderRadius: radius,
        overflow: "hidden",
        backgroundColor: solid ?? "transparent",
        transform: [{ translateY: pressed ? 4 : 0 }],
        boxShadow: pressed ? `0 1px 0 ${depthColor}` : `0 5px 0 ${depthColor}`,
        ...style
      })}
    >
      {gradient ? (
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1, borderRadius: radius }}
        >
          {inner}
        </LinearGradient>
      ) : (
        inner
      )}
    </Pressable>
  );
}

export function IconButton({
  glyph,
  image,
  onPress,
  size = 44
}: {
  glyph?: string;
  image?: ImageSourcePropType;
  onPress: () => void;
  size?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: COLORS.surface,
        alignItems: "center",
        justifyContent: "center",
        transform: [{ scale: pressed ? 0.9 : 1 }],
        boxShadow: "0 4px 12px rgba(123,92,255,0.16)"
      })}
    >
      {image ? (
        <Image
          source={image}
          resizeMode="cover"
          style={{ width: size * 0.76, height: size * 0.76, borderRadius: size * 0.2 }}
        />
      ) : (
        <Text style={{ fontSize: size * 0.42, color: COLORS.ink, fontFamily: FONT.black }}>
          {glyph}
        </Text>
      )}
    </Pressable>
  );
}

export function BadgeIcon({
  source,
  size = 46
}: {
  source: ImageSourcePropType;
  size?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22,
        overflow: "hidden",
        boxShadow: "0 5px 12px rgba(42,33,64,0.16)"
      }}
    >
      <Image source={source} resizeMode="cover" style={{ width: "100%", height: "100%" }} />
    </View>
  );
}

// A flat, on-brand coin — a gold disc with a soft inner ring and a star.
// Drawn (not an image) so it reads clean rather than AI-generated.
export function Coin({ size = 26 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: COLORS.gold,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: Math.max(1.5, size * 0.07),
        borderColor: COLORS.yellowDark
      }}
    >
      <View
        style={{
          position: "absolute",
          width: size * 0.66,
          height: size * 0.66,
          borderRadius: size,
          borderWidth: Math.max(1, size * 0.05),
          borderColor: "rgba(255,255,255,0.55)"
        }}
      />
      <Text style={{ fontSize: size * 0.5, color: "#7A5300", fontFamily: FONT.black, marginTop: -1 }}>
        ★
      </Text>
    </View>
  );
}

export function Chip({ label, color }: { label: string; color: string }) {
  return (
    <View
      style={{
        paddingHorizontal: 15,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: color,
        boxShadow: "0 3px 8px rgba(42,33,64,0.10)"
      }}
    >
      <Text style={{ color: COLORS.surface, fontFamily: FONT.bold, fontSize: 14 }}>{label}</Text>
    </View>
  );
}

export function StatPill({
  icon,
  value,
  hot = false
}: {
  icon: string;
  value: string;
  hot?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: hot ? COLORS.pink : COLORS.surface,
        boxShadow: hot
          ? "0 4px 14px rgba(255,77,151,0.45)"
          : "0 3px 10px rgba(123,92,255,0.12)"
      }}
    >
      <Text style={{ fontSize: 14 }}>{icon}</Text>
      <Text
        style={{
          color: hot ? COLORS.surface : COLORS.ink,
          fontFamily: FONT.bold,
          fontSize: 15,
          fontVariant: ["tabular-nums"]
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export function StarRow({
  earned,
  size = 20,
  gap = 2
}: {
  earned: number;
  size?: number;
  gap?: number;
}) {
  return (
    <View style={{ flexDirection: "row", gap }}>
      {[0, 1, 2].map((slot) => (
        <Text
          key={slot}
          style={{ fontSize: size, opacity: slot < earned ? 1 : 0.18 }}
        >
          {"⭐"}
        </Text>
      ))}
    </View>
  );
}

export function PopStar({ index, earned }: { index: number; earned: boolean }) {
  const scale = useSharedValue(0);
  const wiggle = useSharedValue(0);

  useEffect(() => {
    scale.value = withSequence(
      withTiming(0, { duration: 260 + index * 320 }),
      withSpring(1.25, { damping: 9, stiffness: 320 }),
      withSpring(1, { damping: 14, stiffness: 280 })
    );
    if (earned) {
      wiggle.value = withSequence(
        withTiming(0, { duration: 260 + index * 320 }),
        withTiming(-0.16, { duration: 90 }),
        withTiming(0.12, { duration: 110 }),
        withTiming(0, { duration: 130 })
      );
    }
  }, [earned, index, scale, wiggle]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${wiggle.value}rad` }]
  }));

  return (
    <Animated.View style={style}>
      <Text
        style={{
          fontSize: index === 1 ? 52 : 40,
          opacity: earned ? 1 : 0.16,
          marginTop: index === 1 ? -10 : 0
        }}
      >
        {"⭐"}
      </Text>
    </Animated.View>
  );
}

export function PulseRing({ size, color }: { size: number; color: string }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1500 }), -1, false);
  }, [pulse]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 0.45 }]
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 4,
          borderColor: color
        },
        style
      ]}
    />
  );
}

export function Floaty({
  children,
  range = 6,
  duration = 2300
}: {
  children: React.ReactNode;
  range?: number;
  duration?: number;
}) {
  const shift = useSharedValue(0);

  useEffect(() => {
    shift.value = withRepeat(withTiming(1, { duration }), -1, true);
  }, [duration, shift]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: (shift.value - 0.5) * range }]
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

export function BackgroundBlobs() {
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      <View
        style={{
          position: "absolute",
          top: -70,
          right: -80,
          width: 230,
          height: 230,
          borderRadius: 115,
          backgroundColor: "rgba(255,77,151,0.09)"
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 210,
          left: -90,
          width: 210,
          height: 210,
          borderRadius: 105,
          backgroundColor: "rgba(123,92,255,0.08)"
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: 60,
          right: -70,
          width: 190,
          height: 190,
          borderRadius: 95,
          backgroundColor: "rgba(46,211,191,0.10)"
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: -60,
          left: -40,
          width: 170,
          height: 170,
          borderRadius: 85,
          backgroundColor: "rgba(255,193,49,0.10)"
        }}
      />
    </View>
  );
}
