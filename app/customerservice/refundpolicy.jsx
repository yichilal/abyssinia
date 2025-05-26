import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { db } from "../config/firebase";

const RefundPolicy = () => {
  const [policyData, setPolicyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const policyDocRef = doc(db, "settings", "refundPolicy");

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      policyDocRef,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          // Convert Firestore timestamp to readable date if it exists
          if (data.lastUpdated) {
            const date = data.lastUpdated.toDate();
            data.lastUpdated = date.toLocaleString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "numeric",
              second: "numeric",
              timeZoneName: "short",
            });
          }
          setPolicyData(data);
        } else {
          console.error("Refund Policy document does not exist");
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching refund policy:", error);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const renderSection = (section) => {
    if (!section) return null;

    const title = typeof section.title === "string" ? section.title : "Section";
    const content = typeof section.content === "string" ? section.content : "";

    return (
      <View key={title} style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {content.split("-").map(
          (item, index) =>
            item.trim() && (
              <View key={index} style={styles.listItem}>
                <Icon name="check-circle-outline" size={20} color="#10B981" />
                <Text style={styles.listText}>{item.trim()}</Text>
              </View>
            )
        )}
      </View>
    );
  };

  const sortSections = (sections) => {
    if (!sections) return [];

    // Convert sections object to array and sort by title number if available
    return Object.values(sections).sort((a, b) => {
      const titleA = typeof a?.title === "string" ? a.title : "";
      const titleB = typeof b?.title === "string" ? b.title : "";
      const numA = parseInt(titleA.split(".")[0]);
      const numB = parseInt(titleB.split(".")[0]);
      return isNaN(numA) || isNaN(numB) ? 0 : numA - numB;
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar barStyle="light-content" backgroundColor="#192f6a" />
        <LinearGradient
          colors={["#4c669f", "#3b5998", "#192f6a"]}
          style={[styles.gradient, { paddingTop: insets.top }]}
        />
        <ActivityIndicator size="large" color="#3b5998" />
        <Text style={styles.loadingText}>Loading refund policy...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#192f6a" />
      <LinearGradient
        colors={["#4c669f", "#3b5998", "#192f6a"]}
        style={[styles.headerGradient, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/");
              }
            }}
          >
            <Icon name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Icon name="policy" size={28} color="#FFF" />
            <Text style={styles.headerText}>
              {typeof policyData?.title === "string"
                ? policyData.title
                : "Refund Policy"}
            </Text>
          </View>
          <View style={styles.spacer} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {policyData?.description &&
          typeof policyData.description === "string" && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionText}>
                {policyData.description}
              </Text>
            </View>
          )}

        {policyData?.sections &&
          sortSections(policyData.sections).map((section) =>
            renderSection(section)
          )}

        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            Last Updated: {policyData?.lastUpdated || "N/A"}
          </Text>
          <Text style={[styles.footerText, { marginTop: 5 }]}>
            Version: {policyData?.version || "1.0"}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 200,
  },
  headerGradient: {
    paddingBottom: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  spacer: {
    width: 40,
  },
  headerText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFF",
    marginLeft: 12,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  descriptionContainer: {
    backgroundColor: "#EFF6FF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#3B82F6",
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#1F2937",
    textAlign: "justify",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 8,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 8,
  },
  listText: {
    fontSize: 15,
    color: "#4B5563",
    lineHeight: 24,
    marginLeft: 12,
    flex: 1,
    textAlign: "justify",
  },
  footerContainer: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: "#6B7280",
    fontStyle: "italic",
  },
});

export default RefundPolicy;
