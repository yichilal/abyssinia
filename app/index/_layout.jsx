import { FontAwesome, Ionicons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Tabs, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { EventRegister } from "react-native-event-listeners";
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");

const Layout = () => {
  const router = useRouter();
  const [part, setPart] = useState("");
  const [i, setI] = useState(0);
  const [offset, setOffset] = useState(0);
  const [forwards, setForwards] = useState(true);
  const [skipCount, setSkipCount] = useState(0);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const words = ["Supplier", "Register", "Login", "Delivery"];
  const skipDelay = 15;
  const speed = 70;

  // Animation for Register button (spring effect)
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const bgColor = useSharedValue(0);

  // Load cart count from AsyncStorage
  const loadCartCount = async () => {
    try {
      const cartString = await AsyncStorage.getItem("cart");
      if (cartString) {
        const cart = JSON.parse(cartString);
        if (Array.isArray(cart)) {
          setCartItemCount(cart.length);
        }
      } else {
        setCartItemCount(0);
      }
    } catch (error) {
      console.error("Error loading cart count:", error);
      setCartItemCount(0);
    }
  };

  // Check if user is logged in
  const checkUserLoginStatus = async () => {
    try {
      const userProfileString = await AsyncStorage.getItem("userProfile");
      setIsUserLoggedIn(!!userProfileString); // Convert to boolean - true if exists, false otherwise
    } catch (error) {
      console.error("Error checking user login status:", error);
      setIsUserLoggedIn(false);
    }
  };

  // Add event listener for cart updates and check login status
  useEffect(() => {
    // Initial cart load and login check
    loadCartCount();
    checkUserLoginStatus();

    // Listen for cart update events
    const cartUpdateListener = EventRegister.addEventListener(
      "cartUpdated",
      (data) => {
        if (data && typeof data.count === "number") {
          setCartItemCount(data.count);
        } else {
          // If no count is provided, reload from storage
          loadCartCount();
        }
      }
    );

    // Listen for auth status changes
    const authUpdateListener = EventRegister.addEventListener(
      "authStatusChanged",
      () => {
        checkUserLoginStatus();
      }
    );

    return () => {
      // Cleanup listeners on unmount
      EventRegister.removeEventListener(cartUpdateListener);
      EventRegister.removeEventListener(authUpdateListener);
    };
  }, []);

  // Load cart count and check login status when the screen is focused
  useFocusEffect(
    useCallback(() => {
      loadCartCount();
      checkUserLoginStatus();
    }, [])
  );

  // Memoize the navigation handler
  const handleRegisterPress = useCallback(() => {
    rotation.value = withTiming(rotation.value + 360, {
      duration: 600,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });

    bgColor.value = withTiming(
      1,
      {
        duration: 400,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      },
      () => {
        bgColor.value = withTiming(0, { duration: 400 });
      }
    );

    router.push("/supplier/RegisterSupplier");
  }, [router, rotation, bgColor]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (forwards) {
        if (offset >= words[i].length) {
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
          setI((prev) => (prev + 1 >= words.length ? 0 : prev + 1));
          setForwards(true);
          // Use spring animation for smoother effect
          scale.value = withSpring(1.15, { damping: 6, stiffness: 80 }, () => {
            scale.value = withSpring(1, { damping: 6, stiffness: 80 });
          });
        } else {
          setOffset((prev) => prev - 1);
        }
      }
      setPart(words[i].slice(0, offset));
    }, speed);

    return () => clearInterval(interval);
  }, [forwards, offset, i, skipCount, scale]);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotateZ: `${rotation.value}deg` }],
    backgroundColor: interpolateColor(
      bgColor.value,
      [0, 1],
      ["#10B981", "#0D9488"]
    ),
  }));

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <View style={styles.tabBarContainer}>
          {!isUserLoggedIn && (
            <View style={styles.signInCard}>
              <View style={styles.signInContent}>
                <Ionicons
                  name="person"
                  size={18}
                  color="#1E40AF"
                  style={styles.signInIcon}
                />
                <Text style={styles.signInText}>Sign in as a Customer</Text>
              </View>
              <TouchableOpacity
                style={styles.signInButton}
                onPress={() => router.push("/user/RegisterUser")}
                activeOpacity={0.8}
              >
                <Text style={styles.signInButtonText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => props.navigation.navigate("index")}
              activeOpacity={0.7}
            >
              <View style={styles.tabItemContent}>
                {props.state.index === 0 && (
                  <View style={styles.activeIndicator} />
                )}
                <MaterialIcons
                  name="home"
                  size={24}
                  color={props.state.index === 0 ? "#1E40AF" : "#94A3B8"}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    props.state.index === 0 && styles.activeTabLabel,
                  ]}
                >
                  Home
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => props.navigation.navigate("cartscreen")}
              activeOpacity={0.7}
            >
              <View style={styles.tabItemContent}>
                {props.state.index === 1 && (
                  <View style={styles.activeIndicator} />
                )}
                <View style={styles.iconContainer}>
                  <Ionicons
                    name="cart"
                    size={24}
                    color={props.state.index === 1 ? "#1E40AF" : "#94A3B8"}
                  />
                  {cartItemCount > 0 && (
                    <View style={styles.cartBadge}>
                      <Text style={styles.cartBadgeText}>
                        {cartItemCount > 99 ? "99+" : cartItemCount}
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.tabLabel,
                    props.state.index === 1 && styles.activeTabLabel,
                  ]}
                >
                  Cart
                </Text>
              </View>
            </TouchableOpacity>
            <Animated.View style={[styles.registerButton, animatedButtonStyle]}>
              <TouchableOpacity
                onPress={handleRegisterPress}
                activeOpacity={0.85}
                style={styles.registerButtonTouchable}
              >
                <Text style={styles.registerButtonText}>{part}</Text>
              </TouchableOpacity>
            </Animated.View>
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => props.navigation.navigate("Category")}
              activeOpacity={0.7}
            >
              <View style={styles.tabItemContent}>
                {props.state.index === 2 && (
                  <View style={styles.activeIndicator} />
                )}
                <FontAwesome
                  name="th-list"
                  size={22}
                  color={props.state.index === 2 ? "#1E40AF" : "#94A3B8"}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    props.state.index === 2 && styles.activeTabLabel,
                  ]}
                >
                  Categories
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => props.navigation.navigate("profilescreen")}
              activeOpacity={0.7}
            >
              <View style={styles.tabItemContent}>
                {props.state.index === 3 && (
                  <View style={styles.activeIndicator} />
                )}
                <Ionicons
                  name="person"
                  size={24}
                  color={props.state.index === 3 ? "#1E40AF" : "#94A3B8"}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    props.state.index === 3 && styles.activeTabLabel,
                  ]}
                >
                  Profile
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}
    >
      <Tabs.Screen name="index" options={{ tabBarLabel: "Home" }} />
      <Tabs.Screen name="cartscreen" options={{ tabBarLabel: "Cart" }} />
      <Tabs.Screen name="Category" options={{ tabBarLabel: "Categories" }} />
      <Tabs.Screen name="profilescreen" options={{ tabBarLabel: "Profile" }} />
    </Tabs>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    backgroundColor: "#F8FAFC",
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  signInCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E0F2FE",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  signInContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  signInIcon: {
    marginRight: 10,
  },
  signInText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
  },
  signInButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  signInButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#EFF6FF",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  tabItemContent: {
    alignItems: "center",
    position: "relative",
  },
  iconContainer: {
    position: "relative",
  },
  cartBadge: {
    position: "absolute",
    top: -8,
    right: -10,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  cartBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  activeIndicator: {
    position: "absolute",
    top: -16,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#1E40AF",
  },
  tabLabel: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 4,
    fontWeight: "500",
  },
  activeTabLabel: {
    color: "#1E40AF",
    fontWeight: "600",
  },
  registerButton: {
    backgroundColor: "#10B981",
    borderRadius: 28,
    width: 56,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#064E3B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    marginBottom: 25,
  },
  registerButtonTouchable: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 28,
  },
  registerButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
});

export default Layout;
