import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { StarRow, PulseRing } from "@/components/game-ui";
import { LEVELS, sizeName } from "@/constants/levels";
import { COLORS, FONT } from "@/constants/theme";

const ROW_HEIGHT = 112;
const NODE = 76;
const CURRENT_NODE = 92;
const WAVE = [0, 1, 0.2, -1, -0.3, 1, 0, -1, 0.4, 0.9];

function nodeCenter(index: number, width: number) {
  const amplitude = Math.min(96, width / 2 - CURRENT_NODE / 2 - 10);
  const wave = WAVE[index % WAVE.length];
  return {
    x: width / 2 + wave * amplitude,
    y: index * ROW_HEIGHT + ROW_HEIGHT / 2
  };
}

export function LevelPath({
  width,
  unlocked,
  currentIndex,
  stars,
  onSelect
}: {
  width: number;
  unlocked: number;
  currentIndex: number;
  stars: Record<number, number>;
  onSelect: (index: number) => void;
}) {
  const height = LEVELS.length * ROW_HEIGHT + 30;

  return (
    <View style={{ width, height }}>
      {LEVELS.map((_, index) => {
        if (index === 0) return null;
        const from = nodeCenter(index - 1, width);
        const to = nodeCenter(index, width);
        const reached = index < unlocked;
        return [0.22, 0.5, 0.78].map((t) => (
          <View
            key={`dot-${index}-${t}`}
            style={{
              position: "absolute",
              left: from.x + (to.x - from.x) * t - 5,
              top: from.y + (to.y - from.y) * t - 5,
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: reached ? COLORS.teal : "rgba(42,33,64,0.12)",
              opacity: reached ? 0.75 : 1
            }}
          />
        ));
      })}

      {LEVELS.map((level, index) => {
        const done = (stars[index] ?? 0) > 0;
        const locked = index >= unlocked;
        const current = index === currentIndex && !locked;
        const size = current ? CURRENT_NODE : NODE;
        const center = nodeCenter(index, width);

        return (
          <Animated.View
            key={level.id}
            entering={FadeInDown.delay(60 + index * 45).springify().damping(16)}
            style={{
              position: "absolute",
              left: center.x - size / 2,
              top: center.y - size / 2,
              width: size,
              alignItems: "center"
            }}
          >
            <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
              {current && <PulseRing size={size} color={COLORS.pink} />}
              <Pressable
                disabled={locked}
                onPress={() => onSelect(index)}
                style={({ pressed }) => ({
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: locked
                    ? "rgba(255,255,255,0.72)"
                    : current
                      ? COLORS.pink
                      : done
                        ? COLORS.teal
                        : COLORS.surface,
                  borderWidth: 4,
                  borderColor: locked
                    ? "rgba(42,33,64,0.08)"
                    : current
                      ? "#FFD3E7"
                      : done
                        ? "#BDF3EB"
                        : COLORS.pinkSoft,
                  transform: [{ scale: pressed ? 0.92 : 1 }],
                  boxShadow: current
                    ? "0 8px 20px rgba(255,77,151,0.45)"
                    : done
                      ? "0 6px 14px rgba(46,211,191,0.35)"
                      : locked
                        ? "none"
                        : "0 6px 14px rgba(123,92,255,0.14)"
                })}
              >
                {locked ? (
                  <Text style={{ fontSize: size * 0.34 }}>{"🔒"}</Text>
                ) : (
                  <Text
                    style={{
                      fontSize: size * 0.4,
                      fontFamily: FONT.black,
                      color: current || done ? COLORS.surface : COLORS.ink
                    }}
                  >
                    {level.id}
                  </Text>
                )}
              </Pressable>
            </View>

            {done && !current && <StarRow earned={stars[index] ?? 0} size={13} />}

            {current && (
              <View
                style={{
                  marginTop: 4,
                  backgroundColor: COLORS.yellow,
                  paddingHorizontal: 13,
                  paddingVertical: 3,
                  borderRadius: 999,
                  boxShadow: "0 3px 0 #E8A400"
                }}
              >
                <Text style={{ fontFamily: FONT.black, fontSize: 13, color: "#5A4A00" }}>
                  {level.mode === "timed" ? "⏱ PLAY" : "PLAY"}
                </Text>
              </View>
            )}

            {!current && !locked && !done && (
              <Text style={{ marginTop: 3, fontFamily: FONT.semi, fontSize: 11, color: COLORS.muted }}>
                {sizeName(level.grid)}
              </Text>
            )}
          </Animated.View>
        );
      })}
    </View>
  );
}
