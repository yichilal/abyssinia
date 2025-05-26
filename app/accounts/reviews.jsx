import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, getDocs, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { db } from "../config/firebase";
import LoadingDots from "@/components/LoadingDots";

const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    fetchUserAndReviews();
  }, []);

  const fetchUserAndReviews = async () => {
    try {
      setLoading(true);
      // First fetch user from local storage
      const profileJson = await AsyncStorage.getItem("userProfile");
      if (!profileJson) {
        Toast.show({
          type: "error",
          text1: "Authentication Error",
          text2: "Please login to view your reviews",
        });
        return;
      }

      const localProfile = JSON.parse(profileJson);
      setUserProfile(localProfile);

      // Then fetch reviews using the user's email
      const reviewsQuery = query(
        collection(db, "reviews"),
        where("userEmail", "==", localProfile.email)
      );

      const querySnapshot = await getDocs(reviewsQuery);
      const reviewsList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      }));

      // Sort reviews by createdAt in descending order (newest first)
      reviewsList.sort((a, b) => b.createdAt - a.createdAt);

      setReviews(reviewsList);
    } catch (error) {
      console.error("Error fetching user or reviews:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load reviews",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? "star" : "star-outline"}
            size={16}
            color={star <= rating ? "#FFD700" : "#D1D5DB"}
            style={styles.star}
          />
        ))}
      </View>
    );
  };

  const renderReviewItem = ({ item }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        {item.productData?.imageUrl ? (
          <Image
            source={{ uri: item.productData.imageUrl }}
            style={styles.productImage}
          />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Ionicons name="image-outline" size={24} color="#9CA3AF" />
          </View>
        )}
        <View style={styles.reviewInfo}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.productName || "Product Name"}
          </Text>
          <Text style={styles.reviewDate}>
            {item.createdAt?.toLocaleDateString() || "Date not available"}
          </Text>
          <Text style={styles.userEmail}>{item.userEmail}</Text>
        </View>
      </View>

      <View style={styles.reviewContent}>
        {renderStars(item.rating || item.stars)}
        <Text style={styles.reviewText}>
          {item.reviewText || "No review text provided"}
        </Text>
      </View>

      {item.variantDetails && (
        <View style={styles.variantDetails}>
          <Text style={styles.variantTitle}>Product Details:</Text>
          {Object.entries(item.variantDetails).map(([key, value]) => (
            <Text key={key} style={styles.variantText}>
              {key}: {value}
            </Text>
          ))}
        </View>
      )}

      <View style={styles.reviewFooter}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="create-outline" size={20} color="#4B5563" />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
          <Text style={[styles.actionButtonText, { color: "#EF4444" }]}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={{ marginTop: 300 }}>
        <LoadingDots />
      </View>
    );
  }

  if (!userProfile) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#EF4444" />
        <Text style={styles.emptyText}>Authentication Required</Text>
        <Text style={styles.emptySubText}>
          Please login to view your reviews
        </Text>
      </View>
    );
  }

  if (reviews.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="star-outline" size={60} color="#9CA3AF" />
        <Text style={styles.emptyText}>No Reviews Yet</Text>
        <Text style={styles.emptySubText}>
          Your product reviews will appear here
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={reviews}
        renderItem={renderReviewItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
      <Toast />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 8,
    textAlign: "center",
  },
  listContainer: {
    padding: 16,
  },
  reviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  reviewInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  reviewDate: {
    fontSize: 14,
    color: "#6B7280",
  },
  userEmail: {
    fontSize: 14,
    color: "#4B5563",
    marginTop: 4,
  },
  reviewContent: {
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: "row",
    marginBottom: 8,
  },
  star: {
    marginRight: 4,
  },
  reviewText: {
    fontSize: 15,
    color: "#4B5563",
    lineHeight: 22,
  },
  variantDetails: {
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  variantTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  variantText: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 4,
  },
  reviewFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 16,
  },
  actionButtonText: {
    fontSize: 14,
    color: "#4B5563",
    marginLeft: 4,
  },
});

export default Reviews;
