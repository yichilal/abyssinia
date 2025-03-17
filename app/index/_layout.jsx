import { FontAwesome, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import "../../global.css";

const Layout = () => {
  const router = useRouter(); // Navigation hook

  // Animation logic
  const words = ["supplier", "register", "login", "delivery"];
  const [part, setPart] = useState("");
  const [i, setI] = useState(0);
  const [offset, setOffset] = useState(0);
  const [forwards, setForwards] = useState(true);
  const [skipCount, setSkipCount] = useState(0); // Add skipCount state
  const skipDelay = 15; // Delay before reversing the animation
  const speed = 70; // Animation speed in milliseconds

  useEffect(() => {
    const interval = setInterval(() => {
      if (forwards) {
        if (offset >= words[i].length) {
          // Wait for a short delay before reversing
          setSkipCount((prev) => prev + 1);
          if (skipCount >= skipDelay) {
            setForwards(false);
            setSkipCount(0);
          }
        } else {
          setOffset((prev) => prev + 1);
        }
      } else {
        if (offset === 0) {
          // Move to the next word and restart the animation
          setI((prev) => (prev + 1 >= words.length ? 0 : prev + 1));
          setForwards(true);
        } else {
          setOffset((prev) => prev - 1);
        }
      }

      // Update the visible part of the word
      setPart(words[i].substr(0, offset));
    }, speed);

    return () => clearInterval(interval); // Cleanup interval on unmount
  }, [forwards, offset, i, skipCount]);

  return (
    <>
      {/* Tabs Navigation */}
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => (
          <View style={styles.tabBarContainer}>
            {/* Sign-In Card */}
            <View style={styles.signInCard}>
              <Text style={styles.signInText}>Sign in as a customer</Text>
              <TouchableOpacity
                style={styles.button88}
                onPress={() => router.push("user/RegisterUser")} // Navigate to a valid route
              >
                <Text style={styles.buttonText}>Sign In</Text>
              </TouchableOpacity>
            </View>

            {/* Default Tab Bar */}
            <View style={styles.tabBar}>
              {/* Home Icon */}
              <TouchableOpacity
                style={styles.tabButton}
                onPress={() => props.navigation.navigate("index")}
              >
                <MaterialIcons
                  name="home"
                  size={24}
                  color={props.state.index === 0 ? "green" : "gray"}
                />
                <Text
                  style={{
                    color: props.state.index === 0 ? "green" : "gray",
                    fontSize: 12,
                  }}
                >
                  Home
                </Text>
              </TouchableOpacity>

              {/* Cart Icon */}
              <TouchableOpacity
                style={styles.tabButton}
                onPress={() => props.navigation.navigate("cartscreen")}
              >
                <Ionicons
                  name="cart"
                  size={24}
                  color={props.state.index === 1 ? "green" : "gray"}
                />
                <Text
                  style={{
                    color: props.state.index === 1 ? "green" : "gray",
                    fontSize: 12,
                  }}
                >
                  Cart
                </Text>
              </TouchableOpacity>

              {/* Animated Register Button in the Middle */}
              <TouchableOpacity
                style={styles.registerButton}
                onPress={() => router.push("supplier/RegisterSupplier")} // Navigate to a valid route
              >
                <Text style={styles.word}>{part}</Text>{" "}
                {/* Wrap `part` in a <Text> component */}
              </TouchableOpacity>

              {/* Categories Icon */}
              <TouchableOpacity
                style={styles.tabButton}
                onPress={() => props.navigation.navigate("category")}
              >
                <FontAwesome
                  name="th-list"
                  size={24}
                  color={props.state.index === 2 ? "green" : "gray"}
                />
                <Text
                  style={{
                    color: props.state.index === 2 ? "green" : "gray",
                    fontSize: 12,
                  }}
                >
                  Categories
                </Text>
              </TouchableOpacity>

              {/* Profile Icon */}
              <TouchableOpacity
                style={styles.tabButton}
                onPress={() => props.navigation.navigate("profilescreen")}
              >
                <Ionicons
                  name="person-circle"
                  size={24}
                  color={props.state.index === 3 ? "green" : "gray"}
                />
                <Text
                  style={{
                    color: props.state.index === 3 ? "green" : "gray",
                    fontSize: 12,
                  }}
                >
                  Profile
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      >
        <Tabs.Screen name="index" options={{ tabBarLabel: "Home" }} />
        <Tabs.Screen name="cartscreen" options={{ tabBarLabel: "Cart" }} />
        <Tabs.Screen name="category" options={{ tabBarLabel: "Categories" }} />
        <Tabs.Screen
          name="profilescreen"
          options={{ tabBarLabel: "Profile" }}
        />
      </Tabs>
    </>
  );
};

export default Layout;

// Styles
const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: "column",
    backgroundColor: "#fff",
  },
  signInCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  signInText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  button88: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#14a73e",
    shadowColor: "#14a73e98",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 60,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
    paddingHorizontal: 10,
  },
  tabButton: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  registerButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#14a73e",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 5, // Reduced margin to minimize width
    overflow: "hidden", // Ensure text doesn't overflow
    width: 100, // Slightly reduced width
    height: 40, // Fixed height for the button
  },
  word: {
    color: "white", // Text color
    fontSize: 14, // Font size
    fontWeight: "bold", // Font weight
    textShadowColor: "#222324", // Text shadow color
    textShadowOffset: { width: 2, height: 2 }, // Text shadow offset
    textShadowRadius: 2, // Text shadow radius
  },
});
