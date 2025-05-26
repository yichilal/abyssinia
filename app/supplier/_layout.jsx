import { Stack } from "expo-router";
import React from "react";

export default function SupplierLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="AddProduct"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Notifications"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Posts"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ProfileSupplier"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="RegisterSupplier"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="SupplierScreen"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="TermsAndConditions"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Message"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="help"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
