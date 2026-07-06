import { useMemo } from "react";
import { View } from "react-native";

const CONFETTI_COLORS = ["#FF4D97", "#FFC131", "#2ED3BF", "#7B5CFF", "#FF8A5C", "#5CC8FF"];

type Piece = {
  left: number;
  delay: number;
  duration: number;
  color: string;
  width: number;
  height: number;
  round: boolean;
  rotate: string;
};

function ConfettiPiece({ piece }: { piece: Piece }) {
  return (
    <View
      style={{
        position: "absolute",
        top: piece.delay,
        left: `${piece.left}%`,
        width: piece.width,
        height: piece.height,
        borderRadius: piece.round ? piece.width / 2 : 2,
        backgroundColor: piece.color,
        opacity: 0.88,
        transform: [{ rotate: piece.rotate }]
      }}
    />
  );
}

export function Confetti({ count = 18 }: { count?: number }) {
  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: count }, (_, index) => ({
        left: Math.random() * 100,
        delay: 18 + Math.random() * 185,
        duration: 0,
        color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
        width: 7 + Math.random() * 7,
        height: 10 + Math.random() * 8,
        round: Math.random() < 0.3,
        rotate: `${Math.random() * 180 - 90}deg`
      })),
    [count]
  );

  return (
    <>
      {pieces.map((piece, index) => (
        <ConfettiPiece key={index} piece={piece} />
      ))}
    </>
  );
}
