import { Stack } from "expo-router";
import React from "react";

export default function ProductsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="CategoryProducts" />
      <Stack.Screen name="ProductsDetails" />
      <Stack.Screen name="checkout" />
      <Stack.Screen name="pay" options={{ headerShown: true }} />
      <Stack.Screen name="Verifay" />
      <Stack.Screen name="OrderConfirmation" />
    </Stack>
  );
}
