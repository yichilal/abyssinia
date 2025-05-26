import { doc, onSnapshot } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { db } from "../config/firebase";

const TermsAndConditions = () => {
  const [termsData, setTermsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const termsDocRef = doc(db, "settings", "terms");

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      termsDocRef,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          // Convert Firestore timestamp to readable date
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
          setTermsData(data);
        } else {
          console.error("Terms document does not exist");
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching terms:", error);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const renderSection = (section) => {
    if (!section) return null;

    return (
      <View key={section.title}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        {section.content.split("-").map(
          (item, index) =>
            item.trim() && (
              <View key={index} style={styles.listItem}>
                <Icon name="check" size={20} color="#10B981" />
                <Text style={styles.listText}>{item.trim()}</Text>
              </View>
            )
        )}
      </View>
    );
  };

  const sortSections = (sections) => {
    if (!sections) return [];

    // Convert sections object to array and sort by title number
    return Object.values(sections).sort((a, b) => {
      const numA = parseInt(a.title.split(".")[0]);
      const numB = parseInt(b.title.split(".")[0]);
      return numA - numB;
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text>Loading terms and conditions...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E40AF" />
      <View style={styles.headerContainer}>
        <Icon name="gavel" size={30} color="#FFF" />
        <Text style={styles.headerText}>
          {termsData?.title || "Terms & Conditions"}
        </Text>
      </View>

      <View style={styles.contentContainer}>
        {termsData?.sections &&
          sortSections(termsData.sections).map((section) =>
            renderSection(section)
          )}

        <Text style={styles.footerText}>
          Last Updated: {termsData?.lastUpdated || "N/A"}
        </Text>
        <Text style={[styles.footerText, { marginTop: 5 }]}>
          Version: {termsData?.version || "N/A"}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  headerContainer: {
    backgroundColor: "#1E40AF",
    paddingTop: StatusBar.currentHeight + 20,
    paddingBottom: 20,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  headerText: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFF",
    marginLeft: 12,
    letterSpacing: 0.5,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 20,
    marginBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: "#1E40AF",
    paddingBottom: 4,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 8,
  },
  listText: {
    fontSize: 16,
    color: "#4B5563",
    lineHeight: 24,
    marginLeft: 12,
    flex: 1,
    textAlign: "justify",
  },
  footerText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 30,
    marginBottom: 20,
    fontStyle: "italic",
  },
});

export default TermsAndConditions;
