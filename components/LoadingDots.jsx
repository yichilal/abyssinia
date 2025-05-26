import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

const LoadingDots = ({
  text = "Loading",
  textColor = "#1E40AF",
  dotColors = ["#3B82F6", "#1E40AF"],
}) => {
  const scale1 = useRef(new Animated.Value(0.6)).current;
  const scale2 = useRef(new Animated.Value(0.6)).current;
  const scale3 = useRef(new Animated.Value(0.6)).current;

  const opacity1 = useRef(new Animated.Value(0.3)).current;
  const opacity2 = useRef(new Animated.Value(0.3)).current;
  const opacity3 = useRef(new Animated.Value(0.3)).current;

  const createPulseAnimation = (scale, opacity, delay) => {
    return Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: 650,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 650,
            delay,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 0.6,
            duration: 650,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.3,
            duration: 650,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
  };

  useEffect(() => {
    const animation1 = createPulseAnimation(scale1, opacity1, 0);
    const animation2 = createPulseAnimation(scale2, opacity2, 220);
    const animation3 = createPulseAnimation(scale3, opacity3, 440);

    animation1.start();
    animation2.start();
    animation3.start();

    return () => {
      animation1.reset();
      animation2.reset();
      animation3.reset();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={[styles.loadingText, { color: textColor }]}>{text}</Text>
      <View style={styles.dotsContainer}>
        <Animated.View
          style={[
            styles.dot,
            {
              transform: [{ scale: scale1 }],
              opacity: opacity1,
            },
          ]}
        >
          <LinearGradient
            colors={dotColors}
            style={styles.dotGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.dot,
            {
              transform: [{ scale: scale2 }],
              opacity: opacity2,
            },
          ]}
        >
          <LinearGradient
            colors={dotColors}
            style={styles.dotGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.dot,
            {
              transform: [{ scale: scale3 }],
              opacity: opacity3,
            },
          ]}
        >
          <LinearGradient
            colors={dotColors}
            style={styles.dotGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    height: 120,
    width: "100%",
  },
  loadingText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  dotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginHorizontal: 6,
    overflow: "hidden",
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  dotGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 11,
  },
});

export default LoadingDots;
