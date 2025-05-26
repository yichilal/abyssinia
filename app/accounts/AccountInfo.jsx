import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { collection, getDocs, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { db } from "../config/firebase";
import LoadingDots from "@/components/LoadingDots";

const AccountInfo = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      setError(null);
      try {
        const profileJson = await AsyncStorage.getItem("userProfile");
        if (!profileJson) {
          setError("User not logged in.");
          setLoading(false);
          return;
        }
        const profile = JSON.parse(profileJson);
        const q = query(
          collection(db, "userprofile"),
          where("email", "==", profile.email)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setUser(snapshot.docs[0].data());
        } else {
          setError("User profile not found.");
        }
      } catch (err) {
        setError("Failed to fetch user info.");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  if (loading) {
    return (
      <View style={{ marginTop: 300 }}>
        <LoadingDots />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={50} color="red" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back-outline" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Info</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            {user.profilePicture ? (
              <Image
                source={{ uri: user.profilePicture }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Ionicons name="person" size={40} color="#94A3B8" />
              </View>
            )}
          </View>
          <Text style={styles.userName}>
            {user.fName || ""} {user.lName || ""}
          </Text>
          <View style={styles.roleContainer}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{user.role || "N/A"}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{user.status || "N/A"}</Text>
            </View>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.contentContainer}>
          {/* Personal Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-outline" size={24} color="#1E40AF" />
              <Text style={styles.sectionTitle}>Personal Information</Text>
            </View>
            <View style={styles.cardGrid}>
              <View style={styles.infoCard}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="mail-outline" size={24} color="#1E40AF" />
                </View>
                <Text style={styles.infoLabel}>Email Address</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {user.email || "N/A"}
                </Text>
              </View>

              <View style={styles.infoCard}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="call-outline" size={24} color="#1E40AF" />
                </View>
                <Text style={styles.infoLabel}>Phone Number</Text>
                <Text style={styles.infoValue}>
                  {user.phoneNumber || "N/A"}
                </Text>
              </View>

              <View style={styles.infoCard}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="location-outline" size={24} color="#1E40AF" />
                </View>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue} numberOfLines={2}>
                  {typeof user.address === "string"
                    ? user.address
                    : user.address
                    ? "Location data"
                    : "N/A"}
                </Text>
              </View>
            </View>
          </View>

          {/* Business Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="business-outline" size={24} color="#1E40AF" />
              <Text style={styles.sectionTitle}>Business Information</Text>
            </View>
            <View style={styles.cardGrid}>
              <View style={styles.infoCard}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="location-outline" size={24} color="#1E40AF" />
                </View>
                <Text style={styles.infoLabel}>Supplier Location</Text>
                <Text style={styles.infoValue} numberOfLines={2}>
                  {typeof user.supplierLocation === "string"
                    ? user.supplierLocation
                    : user.supplierLocation
                    ? "Location data"
                    : "N/A"}
                </Text>
              </View>

              <View style={styles.infoCard}>
                <View style={styles.infoIconContainer}>
                  <Ionicons
                    name="briefcase-outline"
                    size={24}
                    color="#1E40AF"
                  />
                </View>
                <Text style={styles.infoLabel}>Trade Type</Text>
                <Text style={styles.infoValue}>{user.tradeType || "N/A"}</Text>
              </View>

              <View style={styles.infoCard}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="calendar-outline" size={24} color="#1E40AF" />
                </View>
                <Text style={styles.infoLabel}>Created At</Text>
                <Text style={styles.infoValue} numberOfLines={2}>
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleString()
                    : "N/A"}
                </Text>
              </View>
            </View>
          </View>

          {/* Trade License */}
          {user.tradeLicense && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="document-text-outline"
                  size={24}
                  color="#1E40AF"
                />
                <Text style={styles.sectionTitle}>Trade License</Text>
              </View>
              <Image
                source={{ uri: user.tradeLicense }}
                style={styles.licenseImage}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default AccountInfo;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E40AF",
    paddingTop: Platform.OS === "android" ? 40 : 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFF",
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: "#FFF",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  profileImageContainer: {
    marginBottom: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#1E40AF",
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#E2E8F0",
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  roleContainer: {
    flexDirection: "row",
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#DBEAFE",
  },
  roleText: {
    color: "#1E40AF",
    fontWeight: "600",
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#D1FAE5",
  },
  statusText: {
    color: "#065F46",
    fontWeight: "600",
    fontSize: 14,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginLeft: 12,
  },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -8,
  },
  infoCard: {
    width: "50%",
    padding: 8,
  },
  infoCardInner: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    height: "100%",
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    color: "#1E293B",
    fontWeight: "500",
    lineHeight: 20,
  },
  licenseImage: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748B",
    fontWeight: "500",
  },
  errorText: {
    fontSize: 16,
    color: "#DC2626",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 20,
    fontWeight: "600",
    backgroundColor: "#FEE2E2",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
});
