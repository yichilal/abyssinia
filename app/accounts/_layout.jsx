import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import React from "react";
import { Platform, StyleSheet } from "react-native";

// Using clear hierarchy, consistent visual language, and intuitive icons
// This leverages the psychology of familiarity and reduces cognitive load
const TabBarIcon = ({ name, color, size = 22 }) => (
  <Ionicons name={name} size={size} color={color} />
);

export default function AccountsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#FFFFFF" },
        animation: "slide_from_right",
        // Custom transition animations for a premium feel
        ...Platform.select({
          ios: {
            gestureEnabled: true,
            gestureDirection: "horizontal",
          },
        }),
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Account",
        }}
      />
      <Stack.Screen
        name="AccountInfo"
        options={{
          title: "Profile",
        }}
      />
      <Stack.Screen
        name="Orders"
        options={{
          title: "Your Orders",
        }}
      />
      <Stack.Screen
        name="favorites"
        options={{
          title: "Favorites",
        }}
      />
      <Stack.Screen
        name="PaymentMethod"
        options={{
          title: "Payment Methods",
        }}
      />
      <Stack.Screen
        name="TrackDelivery"
        options={{
          title: "Track Order",
        }}
      />
      <Stack.Screen
        name="chatsupport"
        options={{
          title: "Chat Support",
        }}
      />
      <Stack.Screen
        name="givemefedback"
        options={{
          title: "Feedback",
        }}
      />
      <Stack.Screen
        name="reviews"
        options={{
          title: "Reviews",
        }}
      />
      <Stack.Screen
        name="(support)"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}

// Psychological principles: Visual hierarchy, whitespace, and consistent visual weight
const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    bottom: 25,
    left: 20,
    right: 20,
    elevation: 5,
    backgroundColor:
      Platform.OS === "ios" ? "transparent" : "rgba(255, 255, 255, 0.9)",
    borderRadius: 30,
    height: 70,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    borderTopWidth: 0,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 5,
  },
  androidTabBackground: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
  },
});
