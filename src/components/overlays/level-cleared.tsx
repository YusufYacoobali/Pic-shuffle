import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Confetti } from "@/components/confetti";
import { Coin, GameButton, PopStar } from "@/components/game-ui";
import { COLORS, FONT, GRADIENTS } from "@/constants/theme";

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function CoinReward({ award, balanceBefore }: { award: number; balanceBefore: number }) {
  const [display, setDisplay] = useState(balanceBefore);
  const pop = useSharedValue(1);
  const plusY = useSharedValue(0);
  const plusOpacity = useSharedValue(0);

  useEffect(() => {
    const startDelay = 520;
    const duration = 650;
    let interval: ReturnType<typeof setInterval> | undefined;
    const timer = setTimeout(() => {
      plusOpacity.value = withSequence(
        withTiming(1, { duration: 160 }),
        withDelay(360, withTiming(0, { duration: 320 }))
      );
      plusY.value = withTiming(-30, { duration: 780 });
      pop.value = withSequence(
        withSpring(1.28, { damping: 8, stiffness: 320 }),
        withSpring(1, { damping: 12, stiffness: 260 })
      );
      const startTime = Date.now();
      interval = setInterval(() => {
        const p = Math.min(1, (Date.now() - startTime) / duration);
        setDisplay(Math.round(balanceBefore + award * easeOut(p)));
        if (p >= 1 && interval) clearInterval(interval);
      }, 40);
    }, startDelay);
    return () => {
      clearTimeout(timer);
      if (interval) clearInterval(interval);
    };
  }, [award, balanceBefore, plusOpacity, plusY, pop]);

  const pillStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const plusStyle = useAnimatedStyle(() => ({
    opacity: plusOpacity.value,
    transform: [{ translateY: plusY.value }]
  }));

  return (
    <View style={{ alignItems: "center" }}>
      <Animated.View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingLeft: 8,
            paddingRight: 16,
            paddingVertical: 7,
            borderRadius: 999,
            backgroundColor: COLORS.surface,
            borderWidth: 2,
            borderColor: COLORS.stroke,
            boxShadow: "0 7px 0 rgba(32,26,48,0.16)"
          },
          pillStyle
        ]}
      >
        <Coin size={26} />
        <Text style={{ color: COLORS.ink, fontFamily: FONT.black, fontSize: 20, fontVariant: ["tabular-nums"] }}>
          {display}
        </Text>
      </Animated.View>
      <Animated.Text style={[{ color: COLORS.yellowDark, fontFamily: FONT.black, fontSize: 18, marginTop: 2 }, plusStyle]}>
        {`+${award}`}
      </Animated.Text>
    </View>
  );
}

export function LevelClearedOverlay({
  title,
  subtitle,
  stars,
  coinsAwarded,
  coinBalanceBefore,
  primaryLabel,
  onPrimary
}: {
  title: string;
  subtitle: string;
  stars: number;
  coinsAwarded: number;
  coinBalanceBefore: number;
  primaryLabel: string;
  onPrimary: () => void;
}) {
  const insets = useSafeAreaInsets();
  const topOffset = Math.max(insets.top + 12, 64);
  const bottomOffset = Math.max(insets.bottom + 12, 24);

  return (
    <View style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} pointerEvents="box-none">
      <Confetti />

      <LinearGradient
        colors={["rgba(255,248,234,1)", "rgba(255,248,234,0.98)", "rgba(255,248,234,0)"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 350 }}
        pointerEvents="none"
      />

      <View
        style={{ position: "absolute", top: topOffset, left: 0, right: 0, alignItems: "center", gap: 7 }}
        pointerEvents="none"
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
          {[0, 1, 2].map((slot) => (
            <PopStar key={slot} index={slot} earned={slot < stars} />
          ))}
        </View>
        <Animated.Text
          entering={FadeInUp.delay(120).duration(260)}
          style={{ color: COLORS.ink, fontSize: 32, fontFamily: FONT.black, textAlign: "center", letterSpacing: 0 }}
        >
          {title}
        </Animated.Text>
        <Animated.Text
          entering={FadeIn.delay(260)}
          style={{ color: COLORS.muted, fontSize: 15, fontFamily: FONT.semi, textAlign: "center", marginTop: -4 }}
        >
          {subtitle}
        </Animated.Text>
        <Animated.View entering={FadeIn.delay(420)} style={{ marginTop: 4 }}>
          <CoinReward award={coinsAwarded} balanceBefore={coinBalanceBefore} />
        </Animated.View>
      </View>

      <Animated.View
        entering={FadeInUp.delay(360).springify().damping(16)}
        style={{ position: "absolute", left: 18, right: 18, bottom: bottomOffset }}
      >
        <GameButton
          label={primaryLabel}
          gradient={GRADIENTS.pink}
          depthColor={COLORS.pinkDark}
          onPress={onPrimary}
          style={{ alignSelf: "stretch" }}
        />
      </Animated.View>
    </View>
  );
}

export function TimeUpOverlay({ onRetry, onMap }: { onRetry: () => void; onMap: () => void }) {
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        top: 0,
        justifyContent: "flex-end"
      }}
    >
      <LinearGradient
        colors={["rgba(32,26,48,0)", "rgba(32,26,48,0.5)"]}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 320 }}
        pointerEvents="none"
      />
      <Animated.View
        entering={FadeInUp.springify().damping(16)}
        style={{
          margin: 18,
          padding: 20,
          borderRadius: 26,
          backgroundColor: COLORS.surface,
          alignItems: "center",
          gap: 12,
          boxShadow: "0 20px 44px rgba(32,26,48,0.3)"
        }}
      >
        <Text style={{ color: COLORS.pink, fontFamily: FONT.black, fontSize: 13 }}>TIME</Text>
        <Text style={{ color: COLORS.ink, fontSize: 26, fontFamily: FONT.black }}>Time&apos;s up!</Text>
        <Text style={{ color: COLORS.muted, fontSize: 14, fontFamily: FONT.semi, textAlign: "center", marginTop: -6 }}>
          So close - give it another go?
        </Text>
        <GameButton
          label="Try again"
          gradient={GRADIENTS.pink}
          depthColor={COLORS.pinkDark}
          onPress={onRetry}
          compact
          style={{ alignSelf: "stretch" }}
        />
        <Pressable onPress={onMap} hitSlop={8} style={{ paddingVertical: 2 }}>
          <Text style={{ color: COLORS.muted, fontFamily: FONT.bold, fontSize: 15 }}>Back to map</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}
