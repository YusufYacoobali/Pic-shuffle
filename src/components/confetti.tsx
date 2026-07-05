import { useEffect, useMemo } from "react";
import { useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming
} from "react-native-reanimated";

const CONFETTI_COLORS = ["#FF4D97", "#FFC131", "#2ED3BF", "#7B5CFF", "#FF8A5C", "#5CC8FF"];

type Piece = {
  left: number;
  delay: number;
  duration: number;
  color: string;
  width: number;
  height: number;
  round: boolean;
  spin: number;
  sway: number;
};

function ConfettiPiece({ piece, screenHeight }: { piece: Piece; screenHeight: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      piece.delay,
      withRepeat(
        withTiming(1, { duration: piece.duration, easing: Easing.linear }),
        -1,
        false
      )
    );
  }, [piece, progress]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: p < 0.04 ? 0 : p > 0.88 ? (1 - p) / 0.12 : 1,
      transform: [
        { translateY: -80 + p * (screenHeight + 160) },
        { translateX: Math.sin(p * Math.PI * 3) * piece.sway },
        { rotate: `${p * piece.spin}deg` },
        { rotateX: `${p * piece.spin * 1.4}deg` }
      ]
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: 0,
          left: `${piece.left}%`,
          width: piece.width,
          height: piece.height,
          borderRadius: piece.round ? piece.width / 2 : 2,
          backgroundColor: piece.color
        },
        style
      ]}
    />
  );
}

export function Confetti({ count = 28 }: { count?: number }) {
  const { height } = useWindowDimensions();

  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: count }, (_, index) => ({
        left: Math.random() * 100,
        delay: Math.random() * 1800,
        duration: 2400 + Math.random() * 1600,
        color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
        width: 7 + Math.random() * 7,
        height: 10 + Math.random() * 8,
        round: Math.random() < 0.3,
        spin: (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 540),
        sway: 14 + Math.random() * 26
      })),
    [count]
  );

  return (
    <>
      {pieces.map((piece, index) => (
        <ConfettiPiece key={index} piece={piece} screenHeight={height} />
      ))}
    </>
  );
}
