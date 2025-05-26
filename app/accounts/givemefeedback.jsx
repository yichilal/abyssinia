import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import React, { useState } from "react";
import {
  ActivityIndicator,
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
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { auth, db } from "../config/firebase";

const GiveFeedback = () => {
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState("");
  const [image, setImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [title, setTitle] = useState("");

  const categories = [
    {
      id: "product",
      label: "Product Quality",
      icon: "inventory-2",
    },
    {
      id: "service",
      label: "Customer Service",
      icon: "support-agent",
    },
    {
      id: "delivery",
      label: "Delivery Experience",
      icon: "local-shipping",
    },
    {
      id: "app",
      label: "App Experience",
      icon: "phone-android",
    },
    {
      id: "suggestion",
      label: "Suggestion",
      icon: "lightbulb",
    },
    {
      id: "other",
      label: "Other",
      icon: "more-horiz",
    },
  ];

  const uploadImageToCloudinary = async (uri) => {
    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append("file", {
        uri,
        type: "image/jpeg",
        name: "upload.jpg",
      });
      formData.append("upload_preset", "feedback");
      formData.append("folder", "sample/ecomerse");

      const response = await fetch(
        "https://api.cloudinary.com/v1_1/dcrso99w7/image/upload",
        {
          method: "POST",
          body: formData,
          headers: {
            Accept: "application/json",
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const data = await response.json();
      if (data.secure_url) {
        return data.secure_url;
      } else {
        throw new Error("Failed to get image URL");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

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
    if (!title.trim()) {
      Toast.show({
        type: "error",
        text1: "Missing Information",
        text2: "Please provide a brief title for your feedback",
      });
      return;
    }

    if (!feedback.trim()) {
      Toast.show({
        type: "error",
        text1: "Missing Information",
        text2: "Please describe your feedback in detail",
      });
      return;
    }

    if (!category) {
      Toast.show({
        type: "error",
        text1: "Category Required",
        text2: "Please select a feedback category",
      });
      return;
    }

    if (rating === 0) {
      Toast.show({
        type: "error",
        text1: "Rating Required",
        text2: "Please provide a rating for your experience",
      });
      return;
    }

    if (!auth.currentUser) {
      Toast.show({
        type: "error",
        text1: "Authentication Required",
        text2: "Please log in to submit feedback",
      });
      router.replace("/user/LoginPage");
      return;
    }

    setLoading(true);
    try {
      let imageUrl = null;
      if (image) {
        imageUrl = await uploadImageToCloudinary(image);
      }

      const feedbackData = {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        title: title.trim(),
        feedback: feedback.trim(),
        rating,
        category,
        imageUrl,
        createdAt: serverTimestamp(),
        status: "pending", // pending, reviewed, resolved
      };

      await addDoc(collection(db, "feedback"), feedbackData);

      Toast.show({
        type: "success",
        text1: "Feedback Submitted",
        text2: "Thank you for helping us improve!",
      });

      setFeedback("");
      setRating(0);
      setCategory("");
      setTitle("");
      setImage(null);
      router.back();
    } catch (error) {
      console.error("Error submitting feedback:", error);
      Toast.show({
        type: "error",
        text1: "Submission Failed",
        text2: "Please try again or contact support",
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
        <Text style={styles.ratingText}>
          {rating > 0
            ? rating === 5
              ? "Excellent"
              : rating === 4
              ? "Very Good"
              : rating === 3
              ? "Good"
              : rating === 2
              ? "Fair"
              : "Poor"
            : "Tap to rate"}
        </Text>
      </View>
    );
  };

  const selectedCategoryLabel = categories.find(
    (cat) => cat.id === category
  )?.label;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.keyboardAvoidView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 25}
      >
        <LinearGradient
          colors={["#1E40AF", "#3B82F6", "#60A5FA"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Submit Feedback</Text>
          </View>
        </LinearGradient>

        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeTitle}>We Value Your Input</Text>
              <Text style={styles.welcomeText}>
                Your feedback helps us improve our products and services. Please
                share your thoughts with us.
              </Text>
            </View>

            {/* Title Input */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Feedback Title</Text>
              <TextInput
                style={styles.titleInput}
                placeholder="Brief summary of your feedback"
                value={title}
                onChangeText={setTitle}
                maxLength={50}
              />
              <Text style={styles.charCount}>{title.length}/50</Text>
            </View>

            {/* Category Selection */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Select Category</Text>
              <View style={styles.categoriesContainer}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryButton,
                      category === cat.id && styles.selectedCategory,
                    ]}
                    onPress={() => setCategory(cat.id)}
                  >
                    <MaterialIcons
                      name={cat.icon}
                      size={20}
                      color={category === cat.id ? "#FFF" : "#4B5563"}
                    />
                    <Text
                      style={[
                        styles.categoryText,
                        category === cat.id && styles.selectedCategoryText,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {category && (
                <Text style={styles.selectedInfo}>
                  Selected: {selectedCategoryLabel}
                </Text>
              )}
            </View>

            {/* Rating Section */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Rate Your Experience</Text>
              {renderStars()}
            </View>

            {/* Feedback Description */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Feedback Details</Text>
              <TextInput
                style={styles.input}
                placeholder="Please describe your feedback in detail. Include any specific information that would help us address your concerns or implement your suggestions."
                value={feedback}
                onChangeText={setFeedback}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                placeholderTextColor="#9CA3AF"
              />
              <Text style={styles.charCount}>{feedback.length}/500</Text>
            </View>

            {/* Image Attachment */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>
                Attach Image <Text style={styles.optionalText}>(Optional)</Text>
              </Text>

              {!image ? (
                <TouchableOpacity
                  style={styles.imageUploadButton}
                  onPress={pickImage}
                  disabled={uploadingImage}
                >
                  <MaterialIcons
                    name={image ? "image" : "image-outline"}
                    size={32}
                    color="#1E40AF"
                  />
                  <Text style={styles.imageButtonText}>
                    {uploadingImage
                      ? "Uploading..."
                      : image
                      ? "Change Image"
                      : "Add Image"}
                  </Text>
                  {uploadingImage && (
                    <ActivityIndicator
                      size="small"
                      color="#1E40AF"
                      style={{ marginLeft: 8 }}
                    />
                  )}
                </TouchableOpacity>
              ) : (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: image }} style={styles.attachedImage} />
                  <View style={styles.imageActions}>
                    <TouchableOpacity
                      style={styles.changeImageButton}
                      onPress={pickImage}
                    >
                      <MaterialIcons name="refresh" size={20} color="#1E40AF" />
                      <Text style={styles.changeImageText}>Change</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => setImage(null)}
                    >
                      <MaterialIcons name="delete" size={20} color="#DC2626" />
                      <Text style={styles.removeImageText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                (loading || uploadingImage) && styles.disabledButton,
              ]}
              onPress={handleSubmit}
              disabled={loading || uploadingImage}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Feedback</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.privacyNote}>
              Your feedback is confidential and will be used only to improve our
              services.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <Toast position="top" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  keyboardAvoidView: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginLeft: 16,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  content: {
    padding: 20,
  },
  welcomeSection: {
    backgroundColor: "#EFF6FF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#1E40AF",
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 22,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 12,
  },
  titleInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: "#1E293B",
  },
  charCount: {
    fontSize: 12,
    color: "#6B7280",
    alignSelf: "flex-end",
    marginTop: 4,
  },
  categoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: "#F3F4F6",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  selectedCategory: {
    backgroundColor: "#1E40AF",
    borderColor: "#1E40AF",
  },
  categoryText: {
    color: "#4B5563",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 6,
  },
  selectedCategoryText: {
    color: "#FFFFFF",
  },
  selectedInfo: {
    fontSize: 13,
    color: "#1E40AF",
    fontWeight: "500",
    marginTop: 8,
  },
  starsContainer: {
    alignItems: "center",
    marginBottom: 10,
  },
  starButton: {
    padding: 5,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4B5563",
    marginTop: 8,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 16,
    fontSize: 15,
    color: "#1E293B",
    minHeight: 150,
    textAlignVertical: "top",
  },
  imageUploadButton: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    borderRadius: 8,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  imageButtonText: {
    marginTop: 8,
    color: "#1E40AF",
    fontSize: 14,
    fontWeight: "500",
  },
  imagePreviewContainer: {
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  attachedImage: {
    width: "100%",
    height: 200,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  imageActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    backgroundColor: "#F9FAFB",
  },
  changeImageButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  changeImageText: {
    color: "#1E40AF",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 4,
  },
  removeImageButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  removeImageText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 4,
  },
  optionalText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "normal",
  },
  submitButton: {
    backgroundColor: "#1E40AF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  disabledButton: {
    backgroundColor: "#93C5FD",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  privacyNote: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 16,
    fontStyle: "italic",
  },
});

export default GiveFeedback;
