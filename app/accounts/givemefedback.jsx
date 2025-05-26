import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { auth, db } from "../config/firebase";

const GiveFeedback = () => {
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState("");
  const [image, setImage] = useState(null);

  const categories = [
    "Product Quality",
    "Service",
    "Delivery",
    "App Experience",
    "Other",
  ];

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Toast.show({
        type: "error",
        text1: "Permission Required",
        text2: "Please grant permission to access your photos",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Please enter your feedback",
      });
      return;
    }

    if (!category) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Please select a category",
      });
      return;
    }

    if (rating === 0) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Please provide a rating",
      });
      return;
    }

    if (!auth.currentUser) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Please log in to submit feedback",
      });
      router.replace("/user/LoginPage");
      return;
    }

    setLoading(true);
    try {
      const feedbackData = {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        feedback: feedback.trim(),
        rating,
        category,
        imageUrl: image,
        createdAt: serverTimestamp(),
        status: "pending", // pending, reviewed, resolved
      };

      await addDoc(collection(db, "feedback"), feedbackData);

      Toast.show({
        type: "success",
        text1: "Thank You!",
        text2: "Your feedback has been submitted successfully",
      });

      setFeedback("");
      setRating(0);
      setCategory("");
      setImage(null);
      router.back();
    } catch (error) {
      console.error("Error submitting feedback:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to submit feedback. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            style={styles.starButton}
          >
            <Ionicons
              name={star <= rating ? "star" : "star-outline"}
              size={32}
              color={star <= rating ? "#FFD700" : "#CBD5E1"}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#1E40AF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Give Feedback</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.label}>
            We value your feedback! Please let us know your thoughts,
            suggestions, or any issues you've encountered.
          </Text>

          {/* Rating Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rate your experience</Text>
            {renderStars()}
          </View>

          {/* Category Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Category</Text>
            <View style={styles.categoriesContainer}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryButton,
                    category === cat && styles.selectedCategory,
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      category === cat && styles.selectedCategoryText,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Image Attachment */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Attach Image (Optional)</Text>
            <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
              <Ionicons name="image-outline" size={24} color="#1E40AF" />
              <Text style={styles.imageButtonText}>
                {image ? "Change Image" : "Add Image"}
              </Text>
            </TouchableOpacity>
            {image && (
              <Image source={{ uri: image }} style={styles.attachedImage} />
            )}
          </View>

          {/* Feedback Text */}
          <TextInput
            style={styles.input}
            placeholder="Type your feedback here..."
            value={feedback}
            onChangeText={setFeedback}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? "Submitting..." : "Submit Feedback"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <Toast />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1E293B",
    marginLeft: 16,
    marginTop: 30,
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    color: "#4B5563",
    marginBottom: 20,
    lineHeight: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 10,
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 10,
  },
  starButton: {
    padding: 5,
  },
  categoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
    marginBottom: 8,
  },
  selectedCategory: {
    backgroundColor: "#1E40AF",
  },
  categoryText: {
    color: "#4B5563",
    fontSize: 14,
    fontWeight: "500",
  },
  selectedCategoryText: {
    color: "#FFFFFF",
  },
  imageButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E5E7EB",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  imageButtonText: {
    marginLeft: 8,
    color: "#1E40AF",
    fontSize: 16,
    fontWeight: "500",
  },
  attachedImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: "#1E293B",
    minHeight: 150,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: "#1E40AF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#93C5FD",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default GiveFeedback;
