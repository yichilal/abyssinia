import { Ionicons } from "@expo/vector-icons";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../app/config/firebase";

const { width } = Dimensions.get("window");

const PromotionsCarousel = () => {
  const [promotions, setPromotions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    const promotionsRef = collection(db, "promotions");
    const q = query(promotionsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const promotionsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPromotions(promotionsData);
    });

    return () => unsubscribe();
  }, []);

  const handleNext = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    setCurrentIndex((prevIndex) =>
      prevIndex === promotions.length - 1 ? 0 : prevIndex + 1
    );
  };

  if (promotions.length === 0) return null;

  const currentPromotion = promotions[currentIndex];

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {currentPromotion.type === "image" ? (
          <Image
            source={{ uri: currentPromotion.imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.textContainer}>
            <Text style={styles.text}>{currentPromotion.text}</Text>
          </View>
        )}
      </Animated.View>

      <TouchableOpacity style={styles.skipButton} onPress={handleNext}>
        <Ionicons name="arrow-forward" size={24} color="#FFF" />
        <Text style={styles.skipText}>Next</Text>
      </TouchableOpacity>

      <View style={styles.indicators}>
        {promotions.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              index === currentIndex && styles.activeIndicator,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 180,
    width: width - 32,
    backgroundColor: "#FFFFFF",
    position: "relative",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flex: 1,
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "rgba(249, 250, 251, 0.95)",
  },
  text: {
    color: "#1F2937",
    fontSize: 18,
    textAlign: "center",
    fontWeight: "600",
    letterSpacing: 0.5,
    lineHeight: 24,
  },
  skipButton: {
    position: "absolute",
    right: 16,
    bottom: 12,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  skipText: {
    color: "#FFF",
    marginLeft: 8,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  indicators: {
    position: "absolute",
    bottom: 12,
    left: 16,
    flexDirection: "row",
    gap: 8,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  activeIndicator: {
    backgroundColor: "#000",
    width: 18,
    height: 6,
  },
});

export default PromotionsCarousel;
