import { Stack } from "expo-router";
import React from "react";

export default function UserLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="LoginPage" />
      <Stack.Screen name="RegisterUser" />
      <Stack.Screen name="SignIn" />
      <Stack.Screen name="forgetpassword" />
    </Stack>
  );
}
