import {
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
  useFonts
} from "@expo-google-fonts/fredoka";
import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function Layout() {
  const [fontsLoaded] = useFonts({
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: "#FFF8EA" }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#FFF8EA" }
        }}
      />
    </GestureHandlerRootView>
  );
}
