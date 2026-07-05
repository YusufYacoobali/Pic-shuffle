import { View } from "react-native";

type CatMascotProps = {
  mood?: "happy" | "sleepy";
  size?: number;
};

export function CatMascot({ mood = "happy", size = 104 }: CatMascotProps) {
  const face = size * 0.8;
  const ear = size * 0.28;
  const eyeTop = face * 0.38;
  const eyeOpen = mood === "happy";

  return (
    <View style={{ width: size, height: size * 0.92, alignItems: "center" }}>
      <View
        style={{
          position: "absolute",
          top: 0,
          left: size * 0.12,
          width: 0,
          height: 0,
          borderLeftWidth: ear * 0.5,
          borderRightWidth: ear * 0.5,
          borderBottomWidth: ear,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderBottomColor: "#FBEFE2",
          transform: [{ rotate: "-16deg" }]
        }}
      />
      <View
        style={{
          position: "absolute",
          top: size * 0.1,
          left: size * 0.2,
          width: 0,
          height: 0,
          borderLeftWidth: ear * 0.22,
          borderRightWidth: ear * 0.22,
          borderBottomWidth: ear * 0.52,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderBottomColor: "#FFB3D1",
          transform: [{ rotate: "-16deg" }]
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 0,
          right: size * 0.12,
          width: 0,
          height: 0,
          borderLeftWidth: ear * 0.5,
          borderRightWidth: ear * 0.5,
          borderBottomWidth: ear,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderBottomColor: "#FBEFE2",
          transform: [{ rotate: "16deg" }]
        }}
      />
      <View
        style={{
          position: "absolute",
          top: size * 0.1,
          right: size * 0.2,
          width: 0,
          height: 0,
          borderLeftWidth: ear * 0.22,
          borderRightWidth: ear * 0.22,
          borderBottomWidth: ear * 0.52,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderBottomColor: "#FFB3D1",
          transform: [{ rotate: "16deg" }]
        }}
      />
      <View
        style={{
          position: "absolute",
          top: size * 0.15,
          width: face,
          height: face * 0.93,
          borderRadius: face * 0.42,
          backgroundColor: "#FBEFE2",
          alignItems: "center",
          shadowColor: "#7B5CFF",
          shadowOpacity: 0.18,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 }
        }}
      >
        <View
          style={{
            position: "absolute",
            top: eyeTop,
            left: face * 0.23,
            width: face * 0.14,
            height: eyeOpen ? face * 0.18 : face * 0.08,
            borderRadius: face * 0.09,
            backgroundColor: eyeOpen ? "#3A2E22" : "transparent",
            borderTopWidth: eyeOpen ? 0 : 3,
            borderTopColor: "#3A2E22"
          }}
        />
        <View
          style={{
            position: "absolute",
            top: eyeTop,
            right: face * 0.23,
            width: face * 0.14,
            height: eyeOpen ? face * 0.18 : face * 0.08,
            borderRadius: face * 0.09,
            backgroundColor: eyeOpen ? "#3A2E22" : "transparent",
            borderTopWidth: eyeOpen ? 0 : 3,
            borderTopColor: "#3A2E22"
          }}
        />
        <View
          style={{
            position: "absolute",
            top: face * 0.55,
            left: face * 0.08,
            width: face * 0.18,
            height: face * 0.13,
            borderRadius: face * 0.09,
            backgroundColor: "#FF9DC4"
          }}
        />
        <View
          style={{
            position: "absolute",
            top: face * 0.55,
            right: face * 0.08,
            width: face * 0.18,
            height: face * 0.13,
            borderRadius: face * 0.09,
            backgroundColor: "#FF9DC4"
          }}
        />
        <View
          style={{
            position: "absolute",
            top: face * 0.54,
            width: 0,
            height: 0,
            borderLeftWidth: face * 0.06,
            borderRightWidth: face * 0.06,
            borderTopWidth: face * 0.07,
            borderLeftColor: "transparent",
            borderRightColor: "transparent",
            borderTopColor: "#FF6FA5"
          }}
        />
        <View
          style={{
            position: "absolute",
            top: face * 0.64,
            width: face * 0.18,
            height: face * 0.09,
            borderBottomLeftRadius: face * 0.09,
            borderBottomRightRadius: face * 0.09,
            borderBottomWidth: 3,
            borderColor: "#3A2E22"
          }}
        />
      </View>
    </View>
  );
}
