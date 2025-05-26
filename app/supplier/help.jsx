import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const Help = () => {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={styles.header}>How to Add a Product</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Step-by-Step Guide</Text>

        <View style={styles.step}>
          <Ionicons
            name="information-circle-outline"
            size={24}
            color="#3b82f6"
            style={styles.stepIcon}
          />
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>1. Basic Information</Text>
            <Text style={styles.stepText}>
              Fill in the required fields: Product Name, Category, and Brand.
              Add a Description if desired.
            </Text>
          </View>
        </View>

        <View style={styles.step}>
          <Ionicons
            name="image-outline"
            size={24}
            color="#10b981"
            style={styles.stepIcon}
          />
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>2. Product Media</Text>
            <Text style={styles.stepText}>
              Upload up to 10MB images and a 50MB video. Tap "Add Image" or "Add
              Video" and select from your library.
            </Text>
          </View>
        </View>

        <View style={styles.step}>
          <Ionicons
            name="list-outline"
            size={24}
            color="#3b82f6"
            style={styles.stepIcon}
          />
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>3. Product Attributes</Text>
            <Text style={styles.stepText}>
              Choose suggested attributes (e.g., Color) or add custom ones
              (e.g., Weight). They define your product variants.
            </Text>
          </View>
        </View>

        <View style={styles.step}>
          <Ionicons
            name="add-circle-outline"
            size={24}
            color="#22c55e"
            style={styles.stepIcon}
          />
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>4. Product Variants</Text>
            <Text style={styles.stepText}>
              Add at least one variant. Set attribute values (e.g., "Black"),
              Price, Stock, and an Image for each.
            </Text>
          </View>
        </View>

        <View style={styles.step}>
          <Ionicons
            name="cloud-upload-outline"
            size={24}
            color="#3b82f6"
            style={styles.stepIcon}
          />
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>5. Submit Product</Text>
            <Text style={styles.stepText}>
              Tap "Add Product" to submit. Confirm the action, and wait for the
              upload to complete.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tips</Text>
        <Text style={styles.tipText}>
          - Ensure all required fields (*) are filled to avoid errors.
          {"\n"}- Use high-quality images for better product visibility.
          {"\n"}- Add multiple variants to offer variety (e.g., different colors
          or sizes).
          {"\n"}- Check your internet connection before submitting large files.
        </Text>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 24,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 28,
    padding: 20,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  step: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  stepIcon: {
    marginRight: 12,
    marginTop: 4,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 4,
  },
  stepText: {
    fontSize: 16,
    color: "#64748b",
    lineHeight: 24,
  },
  tipText: {
    fontSize: 16,
    color: "#64748b",
    lineHeight: 24,
  },
  bottomSpacer: {
    height: 40,
  },
});

export default Help;
