import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNetwork } from "../context/NetworkContext";

const NetworkStatus = () => {
  const { isOnline } = useNetwork();
  const [isVisible, setIsVisible] = useState(false);
  const animation = useRef(new Animated.Value(100)).current;
  const insets = useSafeAreaInsets();
  const hideTimeoutRef = useRef(null);

  const animateToPosition = (toValue) => {
    // Cancel any existing animations
    animation.stopAnimation();

    Animated.spring(animation, {
      toValue,
      useNativeDriver: true,
      tension: 85, // Controls the spring tightness
      friction: 12, // Controls the spring bounce
    }).start(() => {
      if (toValue === 100) {
        setIsVisible(false);
      }
    });
  };

  useEffect(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    setIsVisible(true);
    animateToPosition(0);

    if (isOnline) {
      // Show for 2 seconds when connection is restored
      hideTimeoutRef.current = setTimeout(() => {
        animateToPosition(100);
      }, 2000);
    }

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [isOnline]);

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: animation }],
          backgroundColor: isOnline
            ? "rgba(5, 150, 105, 0.98)"
            : "rgba(220, 38, 38, 0.98)",
          paddingTop: Platform.OS === "ios" ? insets.top : 16,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={isOnline ? "wifi" : "wifi-off"}
            size={24}
            color="#FFF"
          />
          {isOnline && (
            <View style={styles.statusDot}>
              <View style={styles.innerDot} />
            </View>
          )}
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.statusText}>
            {isOnline ? "Connected" : "No Internet Connection"}
          </Text>
          <Text style={styles.messageText}>
            {isOnline
              ? "You're back online"
              : "Please check your internet connection"}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    paddingHorizontal: 16,
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  statusDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  innerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#059669",
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  messageText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 13,
  },
});

export default NetworkStatus;
