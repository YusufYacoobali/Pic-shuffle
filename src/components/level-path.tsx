import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { PulseRing, StarRow } from "@/components/game-ui";
import type { LevelKind } from "@/constants/packs";
import { COLORS, FONT } from "@/constants/theme";

export const LEVEL_PATH_ROW_HEIGHT = 112;
const NODE = 76;
const CURRENT_NODE = 92;
const WAVE = [0, 1, 0.2, -1, -0.3, 1, 0, -1, 0.4, 0.9];

export type PathNodeState = "locked" | "open" | "done" | "current";

export type PathNode = {
  key: number;
  label: string;
  state: PathNodeState;
  stars: number;
  kind: LevelKind;
  timed: boolean;
};

function nodeCenter(index: number, width: number) {
  const amplitude = Math.min(96, width / 2 - CURRENT_NODE / 2 - 10);
  const wave = WAVE[index % WAVE.length];
  return {
    x: width / 2 + wave * amplitude,
    y: index * LEVEL_PATH_ROW_HEIGHT + LEVEL_PATH_ROW_HEIGHT / 2
  };
}

function connectorReached(previous: PathNode, current: PathNode) {
  return previous.state === "done" || current.state === "done" || current.state === "current";
}

export function LevelPath({
  width,
  nodes,
  accent = COLORS.pink,
  onSelect
}: {
  width: number;
  nodes: PathNode[];
  accent?: string;
  onSelect: (key: number) => void;
}) {
  const height = nodes.length * LEVEL_PATH_ROW_HEIGHT + 30;

  return (
    <View style={{ width, height }}>
      {nodes.map((node, index) => {
        if (index === 0) return null;
        const previous = nodes[index - 1];
        const from = nodeCenter(index - 1, width);
        const to = nodeCenter(index, width);
        const reached = connectorReached(previous, node);
        return [0.22, 0.5, 0.78].map((t) => (
          <View
            key={`dot-${node.key}-${t}`}
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

      {nodes.map((node, index) => {
        const locked = node.state === "locked";
        const done = node.state === "done";
        const current = node.state === "current";
        const boss = node.kind === "boss";
        const size = current || boss ? CURRENT_NODE : NODE;
        const center = nodeCenter(index, width);

        return (
          <Animated.View
            key={node.key}
            entering={FadeInDown.delay(Math.min(60 + index * 45, 900))
              .springify()
              .damping(16)}
            style={{
              position: "absolute",
              left: center.x - size / 2,
              top: center.y - size / 2,
              width: size,
              alignItems: "center"
            }}
          >
            <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
              {current && <PulseRing size={size} color={accent} />}
              <Pressable
                disabled={locked}
                onPress={() => onSelect(node.key)}
                style={({ pressed }) => ({
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: locked
                    ? "rgba(255,255,255,0.72)"
                    : current
                      ? accent
                      : done
                        ? COLORS.teal
                        : boss
                          ? COLORS.gold
                          : COLORS.surface,
                  borderWidth: 4,
                  borderColor: locked
                    ? "rgba(42,33,64,0.08)"
                    : current
                      ? "rgba(255,255,255,0.6)"
                      : done
                        ? "#BDF3EB"
                        : boss
                          ? "#FFE28A"
                          : COLORS.pinkSoft,
                  transform: [{ scale: pressed ? 0.92 : 1 }],
                  boxShadow: current
                    ? "0 8px 20px rgba(255,61,127,0.4)"
                    : done
                      ? "0 6px 14px rgba(46,211,191,0.35)"
                      : locked
                        ? "none"
                        : "0 6px 14px rgba(123,92,255,0.14)"
                })}
              >
                {locked ? (
                  <Text style={{ fontSize: size * 0.34 }}>{"\u{1F512}"}</Text>
                ) : (
                  <Text
                    style={{
                      fontSize: size * 0.4,
                      fontFamily: FONT.black,
                      color: current || done || boss ? COLORS.surface : COLORS.ink
                    }}
                  >
                    {node.label}
                  </Text>
                )}
              </Pressable>

              {boss && !locked && (
                <View style={{ position: "absolute", top: -13 }}>
                  <Text style={{ fontSize: 20 }}>{"\u{1F451}"}</Text>
                </View>
              )}

              {node.kind === "challenge" && !locked && !done && (
                <View
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: COLORS.purple,
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 6px rgba(70,54,200,0.4)"
                  }}
                >
                  <Text style={{ fontSize: 12 }}>{"\u26A1"}</Text>
                </View>
              )}
            </View>

            {done && !current && <StarRow earned={node.stars} size={13} />}

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
                  {boss ? "\u{1F451} BOSS" : node.timed ? "\u23F1 PLAY" : "PLAY"}
                </Text>
              </View>
            )}

            {!current && !locked && !done && (
              <Text style={{ marginTop: 3, fontFamily: FONT.semi, fontSize: 11, color: COLORS.muted }}>
                {boss ? "Boss" : node.kind === "challenge" ? "Challenge" : node.timed ? "Timed" : ""}
              </Text>
            )}
          </Animated.View>
        );
      })}
    </View>
  );
}
