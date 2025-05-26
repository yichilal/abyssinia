import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { router } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { auth, db } from "../config/firebase";

const SupplierScreen = () => {
  const { width } = useWindowDimensions();
  const [user, setUser] = useState(auth.currentUser);
  const [supplierData, setSupplierData] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [accountDisabled, setAccountDisabled] = useState(false);
  const navigation = useNavigation();

  // Get first recommendation with video
  const videoRecommendation = recommendations.find((rec) => rec.videoUrl);
  const player = useVideoPlayer(
    videoRecommendation?.videoUrl || "",
    (player) => {
      player.loop = false;
    }
  );

  const fetchData = useCallback(() => {
    if (!user?.email) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setLoading(true);
    const q1 = query(
      collection(db, "userprofile"),
      where("email", "==", user.email)
    );
    const q2 = query(
      collection(db, "notifications"),
      where("recipientId", "==", user.uid),
      where("read", "==", false)
    );
    const q3 = collection(db, "recommendations");

    const unsub1 = onSnapshot(q1, (snap) => {
      if (snap.empty) {
        setSupplierData(null);
      } else {
        const data = snap.docs[0].data();
        setSupplierData(data);
        if (data.disabled || data.status === "disabled") {
          setAccountDisabled(true);
          Alert.alert(
            "Account Disabled",
            "Your supplier account has been disabled by admin. Please contact support.",
            [{ text: "OK", onPress: () => router.replace("/") }]
          );
        } else {
          setAccountDisabled(false);
        }
      }
    });

    const unsub2 = onSnapshot(q2, (snap) => setNotificationCount(snap.size));
    const unsub3 = onSnapshot(q3, (snap) =>
      setRecommendations(
        snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      )
    );

    setLoading(false);
    setRefreshing(false);
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [user]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (user) return fetchData();
  }, [user, fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const isAddProductEnabled =
    !accountDisabled && supplierData?.status === "approved";

  const navItems = [
    {
      icon: "newspaper",
      color: "#3b82f6",
      label: "Posts",
      route: "supplier/Posts",
      disabled: accountDisabled,
    },
    {
      icon: "add-box",
      color: isAddProductEnabled ? "#22c55e" : "#9ca3af",
      label: "Add Product",
      route: "supplier/AddProduct",
      disabled: !isAddProductEnabled || accountDisabled,
      isMaterial: true,
    },
    {
      icon: "notifications",
      color: "#f59e0b",
      label: "Notifications",
      route: "supplier/Notifications",
      hasBadge: true,
      disabled: accountDisabled,
    },
    {
      icon: "chatbubble-ellipses",
      color: "#8b5cf6",
      label: "Messages",
      route: "/supplier/Message",
      disabled: accountDisabled,
    },
    {
      icon: "help-circle-outline",
      color: "#3b82f6",
      label: "Help",
      route: "supplier/help",
      disabled: accountDisabled,
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E40AF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="log-in-outline" size={40} color="#EF4444" />
        <Text style={styles.errorText}>Please log in to continue</Text>
      </View>
    );
  }

  if (accountDisabled) {
    return (
      <View style={styles.disabledContainer}>
        <Ionicons name="warning-outline" size={60} color="#EF4444" />
        <Text style={styles.disabledTitle}>Account Disabled</Text>
        <Text style={styles.disabledText}>
          Your supplier account has been disabled by the administrator.
        </Text>
        <Text style={styles.disabledText}>
          Please contact support for more information.
        </Text>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => auth.signOut().then(() => router.replace("/"))}
        >
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#1E40AF"
        />
      }
    >
      <View style={[styles.headerContainer, { width: width - 32 }]}>
        <View style={styles.profileSection}>
          <TouchableOpacity
            onPress={() => router.push("supplier/ProfileSupplier")}
          >
            <View style={styles.profileCircle}>
              {supplierData?.profilePicture ? (
                <Image
                  source={{ uri: supplierData.profilePicture }}
                  style={styles.profileImage}
                />
              ) : (
                <Ionicons name="person" size={32} color="#FFF" />
              )}
            </View>
            <Text style={styles.profileName}>
              {supplierData
                ? `${supplierData.fName || "Unknown"} ${
                    supplierData.lName || ""
                  }`
                : "Supplier"}
            </Text>
            <View
              style={[
                styles.statusBadge,
                supplierData?.status === "approved"
                  ? styles.statusApproved
                  : styles.statusPending,
              ]}
            >
              <Text style={styles.statusText}>
                {supplierData?.status || "Pending"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.navigationContainer}>
          {navItems.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.navItem, item.disabled && styles.disabledNavItem]}
              onPress={() => router.push(item.route)}
              disabled={item.disabled}
            >
              <View
                style={[
                  styles.navIconBackground,
                  { backgroundColor: item.color },
                ]}
              >
                {item.isMaterial ? (
                  <MaterialIcons name={item.icon} size={24} color="#FFF" />
                ) : (
                  <Ionicons name={item.icon} size={24} color="#FFF" />
                )}
                {item.hasBadge && notificationCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationCount}>
                      {notificationCount > 9 ? "9+" : notificationCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.navLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.contentSection, { width: width - 32 }]}>
        <Text style={styles.sectionTitle}>Dashboard</Text>
        <Text style={styles.sectionText}>
          {supplierData
            ? supplierData.status === "approved"
              ? "Manage your products and posts with ease."
              : "Pending approval. Please wait."
            : "Complete your profile to start."}
        </Text>

        {videoRecommendation && (
          <View style={styles.videoContent}>
            <Text style={styles.recommendationText}>
              {videoRecommendation.text}
            </Text>
            <View style={styles.videoContainer}>
              <VideoView
                style={styles.video}
                player={player}
                allowsFullscreen
                allowsPictureInPicture
                nativeControls
              />
              <TouchableOpacity
                style={styles.playButton}
                onPress={() => {
                  player.playing ? player.pause() : player.play();
                }}
              >
                <Ionicons
                  name={player.playing ? "pause" : "play"}
                  size={24}
                  color="#FFF"
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

// Styles remain unchanged
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#1E40AF",
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
    color: "#EF4444",
    textAlign: "center",
  },
  headerContainer: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  profileSection: {
    backgroundColor: "#1E40AF",
    padding: 24,
    alignItems: "center",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  profileCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 40,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFF",
    marginBottom: 8,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#FFF",
  },
  statusApproved: {
    backgroundColor: "#DCFCE7",
  },
  statusPending: {
    backgroundColor: "#FEE2E2",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    color: "#1E2937",
  },
  navigationContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 12,
    backgroundColor: "#FFF",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  navItem: {
    alignItems: "center",
    padding: 4,
  },
  navIconBackground: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: "#6B7280",
    marginTop: 4,
  },
  disabledButton: {
    opacity: 0.5,
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFF",
  },
  notificationCount: {
    color: "#FFF",
    fontSize: 8,
    fontWeight: "700",
  },
  contentSection: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E40AF",
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 22,
    marginBottom: 16,
  },
  videoContent: {
    marginTop: 16,
  },
  recommendationText: {
    fontSize: 14,
    color: "#1E2937",
    lineHeight: 22,
    marginBottom: 12,
  },
  videoContainer: {
    position: "relative",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#000",
    width: "100%",
    aspectRatio: 16 / 9,
  },
  video: {
    width: "100%",
    height: "100%",
  },
  playButton: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -24 }, { translateY: -24 }],
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    padding: 12,
    borderRadius: 24,
  },
  disabledContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F9FAFB",
  },
  disabledTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#EF4444",
    marginVertical: 16,
    textAlign: "center",
  },
  disabledText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 24,
  },
  logoutButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#EF4444",
    borderRadius: 8,
  },
  logoutButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 16,
  },
  disabledNavItem: {
    opacity: 0.5,
  },
});

export default SupplierScreen;
