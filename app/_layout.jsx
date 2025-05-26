import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";
import NetworkStatus from "./components/NetworkStatus";
import { checkConnection } from "./config/firebase";
import { NetworkProvider } from "./context/NetworkContext";

export default function RootLayout() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const removeLocalStorage = async () => {
      try {
        await AsyncStorage.removeItem("userEmail");
        await AsyncStorage.removeItem("userPassword");
        console.log("User data removed from local storage.");
      } catch (error) {
        console.error("Error removing user data from local storage:", error);
      }
    };
    removeLocalStorage();
  }, []);

  useEffect(() => {
    let timeoutId;

    const checkNetworkStatus = async () => {
      const connectionStatus = await checkConnection();
      setIsOnline(connectionStatus);
      timeoutId = setTimeout(checkNetworkStatus, 5000);
    };

    checkNetworkStatus();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return (
    <NetworkProvider>
      <SafeAreaProvider>
        <View style={styles.container}>
          <NetworkStatus />
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: "#1E40AF",
              },
              headerTintColor: "#fff",
              headerTitleStyle: {
                fontWeight: "bold",
              },
              headerBackTitleVisible: false,
            }}
          >
            <Stack.Screen
              name="index"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="notifications"
              options={{
                title: "Notifications",
              }}
            />
            <Stack.Screen
              name="accounts"
              options={{
                title: "My Account",
              }}
            />
            <Stack.Screen
              name="products"
              options={{
                title: "Products",
              }}
            />
            <Stack.Screen
              name="supplier"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="user"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="search"
              options={{
                title: "Search",
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="customerservice"
              options={{
                title: "Customer Service",
              }}
            />
            <Stack.Screen
              name="config"
              options={{
                title: "Settings",
              }}
            />
          </Stack>
        </View>
      </SafeAreaProvider>
    </NetworkProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
