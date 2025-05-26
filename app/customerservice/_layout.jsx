import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { StyleSheet, View } from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

export default function CustomerServiceLayout() {
  return (
    <SafeAreaProvider>
      <CustomerServiceLayoutContent />
    </SafeAreaProvider>
  );
}

function CustomerServiceLayoutContent() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const headerGradientColors = ["#1E40AF", "#3B82F6", "#60A5FA"];

  return (
    <View style={[styles.container]}>
      <StatusBar style="light" backgroundColor={headerGradientColors[0]} />

      <LinearGradient
        colors={headerGradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            paddingTop: insets.top,
          },
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  background: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 180,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 6,
  },
});
