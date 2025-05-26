import LoadingDots from "@/components/LoadingDots";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { signOut } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { auth, db } from "../config/firebase";

const { width } = Dimensions.get("window");
const PROFILE_IMAGE_SIZE = width * 0.28;

const ProfileScreen = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [animateValue] = useState(new Animated.Value(0));
  const router = useRouter();

  // Animate on component mount
  useEffect(() => {
    Animated.timing(animateValue, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // --- Fetch Profile useEffect ---
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const profileJson = await AsyncStorage.getItem("userProfile");
        if (profileJson !== null) {
          const localProfile = JSON.parse(profileJson);
          // Fetch latest profile from Firestore using email
          const q = query(
            collection(db, "userprofile"),
            where("email", "==", localProfile.email)
          );
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            setUserProfile(snapshot.docs[0].data());
          } else {
            setUserProfile(localProfile); // fallback to local
          }
        } else {
          console.log(
            "No user profile found in storage. Redirecting to login."
          );
          Toast.show({
            type: "info",
            text1: "Session expired",
            text2: "Please log in again.",
          });
          await signOut(auth);
          router.replace("/user/LoginPage");
        }
      } catch (error) {
        console.error(
          "Failed to fetch profile from storage or Firestore:",
          error
        );
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Could not load profile.",
        });
        await signOut(auth);
        await AsyncStorage.removeItem("userProfile");
        router.replace("/user/LoginPage");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [router]);

  // --- handleLogout ---
  const handleLogout = async () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to log out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          onPress: async () => {
            console.log("Logging out...");
            try {
              await signOut(auth);
              await AsyncStorage.removeItem("userProfile");
              Toast.show({
                type: "success",
                text1: "Logged Out",
                text2: "You have been successfully logged out.",
              });
              router.replace("/user/LoginPage");
            } catch (error) {
              console.error("Logout Error:", error);
              Toast.show({
                type: "error",
                text1: "Logout Failed",
                text2: error.message,
              });
            }
          },
          style: "destructive",
        },
      ],
      { cancelable: false }
    );
  };

  // --- Define Profile Actions ---
  const profileActions = [
    {
      category: "Account",
      icon: "person",
      items: [
        {
          label: "Account Info",
          icon: "person",
          iconType: "Ionicons",
          route: "/accounts/AccountInfo",
        },
        {
          label: "Payment Methods",
          icon: "card-outline",
          iconType: "Ionicons",
          route: "/accounts/PaymentMethod",
        },
        {
          label: "Call Phone",
          icon: "call-outline",
          iconType: "Ionicons",
          route: "/profile/callphone",
        },
      ],
    },
    {
      category: "Shopping",
      icon: "shopping-bag",
      items: [
        {
          label: "My Orders",
          icon: "receipt-outline",
          iconType: "Ionicons",
          route: "/accounts/Orders",
        },
        {
          label: "My Favorites",
          icon: "heart-outline",
          iconType: "Ionicons",
          route: "/accounts/favorites",
        },
        {
          label: "My Reviews",
          icon: "star-half-outline",
          iconType: "Ionicons",
          route: "/accounts/reviews",
        },
      ],
    },
    {
      category: "Support",
      icon: "headset",
      items: [
        {
          label: "Chat Support",
          icon: "chatbubbles-outline",
          iconType: "Ionicons",
          route: "/accounts/chatsupport",
        },
        {
          label: "Give Feedback",
          icon: "comment-text-outline",
          iconType: "MaterialCommunityIcons",
          route: "/accounts/givemefedback",
        },
      ],
    },
  ];

  // --- Navigation Handler ---
  const handleActionPress = (route, label) => {
    router.push(route);
  };

  // --- Render Icon Based on Type ---
  const renderIcon = (icon, type, color = "#4B5563", size = 22) => {
    switch (type) {
      case "MaterialIcons":
        return <MaterialIcons name={icon} size={size} color={color} />;
      case "MaterialCommunityIcons":
        return <MaterialCommunityIcons name={icon} size={size} color={color} />;
      default:
        return <Ionicons name={icon} size={size} color={color} />;
    }
  };

  // --- Render Loading State ---
  if (loading) {
    return (
      <View style={{ marginTop: 300 }}>
        <LoadingDots />
      </View>
    );
  }

  // --- Render Error State ---
  if (!userProfile) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Could not load user profile.</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.replace("/user/LoginPage")}
        >
          <Ionicons
            name="log-in-outline"
            size={20}
            color="#FFF"
            style={styles.buttonIcon}
          />
          <Text style={styles.loginButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Animation Properties ---
  const headerTranslateY = animateValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 0],
  });

  const contentOpacity = animateValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // --- Render Profile UI ---
  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Animated Header Section */}
      <Animated.View
        style={[
          styles.headerContainer,
          { transform: [{ translateY: headerTranslateY }] },
        ]}
      >
        <LinearGradient
          colors={["#1E40AF", "#3B82F6", "#60A5FA"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.profileImageContainer}>
            {userProfile.profileImage ? (
              <Image
                source={{ uri: userProfile.profileImage }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons
                  name="person"
                  size={PROFILE_IMAGE_SIZE * 0.5}
                  color="#FFF"
                />
              </View>
            )}

            <TouchableOpacity style={styles.editProfileButton}>
              <Ionicons name="camera-outline" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.name}>{userProfile.name || "N/A"}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.role}>{userProfile.role || "Customer"}</Text>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Content Section */}
      <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Profile Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Ionicons name="calendar-outline" size={22} color="#1E40AF" />
              <Text style={styles.statValue}>
                {userProfile.createdAt
                  ? new Date(userProfile.createdAt).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "short",
                      }
                    )
                  : "N/A"}
              </Text>
              <Text style={styles.statLabel}>Joined</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Ionicons name="location-outline" size={22} color="#1E40AF" />
              <Text style={styles.statValue}>
                {userProfile.location || "Ethiopia"}
              </Text>
              <Text style={styles.statLabel}>Location</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Ionicons name="mail-outline" size={22} color="#1E40AF" />
              <Text style={styles.statValue} numberOfLines={1}>
                {userProfile.email ? userProfile.email.split("@")[0] : "N/A"}
              </Text>
              <Text style={styles.statLabel}>Email</Text>
            </View>
          </View>

          {/* Contact Card */}
          <View style={styles.contactCard}>
            <Text style={styles.contactCardTitle}>Contact Information</Text>
            <View style={styles.contactItem}>
              <Ionicons name="mail" size={20} color="#1E40AF" />
              <Text style={styles.contactValue} selectable={true}>
                {userProfile.email || "N/A"}
              </Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="call" size={20} color="#1E40AF" />
              <Text style={styles.contactValue}>
                {userProfile.phone || "Not provided"}
              </Text>
            </View>
          </View>

          {/* Actions Section */}
          {profileActions.map((category, index) => (
            <View key={index} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <MaterialIcons name={category.icon} size={22} color="#1E40AF" />
                <Text style={styles.categoryTitle}>{category.category}</Text>
              </View>

              <View style={styles.actionsContainer}>
                {category.items.map((action, actionIndex) => (
                  <TouchableOpacity
                    key={actionIndex}
                    style={styles.actionItem}
                    onPress={() =>
                      handleActionPress(action.route, action.label)
                    }
                  >
                    <View style={styles.actionIconContainer}>
                      {renderIcon(action.icon, action.iconType, "#1E40AF")}
                    </View>
                    <Text style={styles.actionLabel}>{action.label}</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LinearGradient
              colors={["#F87171", "#EF4444", "#DC2626"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.logoutGradient}
            >
              <Ionicons
                name="log-out-outline"
                size={20}
                color="#FFF"
                style={styles.buttonIcon}
              />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* App Version */}
          <Text style={styles.versionText}>Abyssinia Gebeya v1.0.0</Text>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F8FF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F8FF",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 15,
    color: "#4B5563",
  },
  headerContainer: {
    zIndex: 1,
    backgroundColor: "#F5F8FF",
    marginBottom: 60,
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 80,
    alignItems: "center",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: 15,
  },
  profileImage: {
    width: PROFILE_IMAGE_SIZE,
    height: PROFILE_IMAGE_SIZE,
    borderRadius: PROFILE_IMAGE_SIZE / 2,
    borderWidth: 4,
    borderColor: "rgba(255, 255, 255, 0.7)",
  },
  avatarPlaceholder: {
    width: PROFILE_IMAGE_SIZE,
    height: PROFILE_IMAGE_SIZE,
    borderRadius: PROFILE_IMAGE_SIZE / 2,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "rgba(255, 255, 255, 0.7)",
  },
  editProfileButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#1E40AF",
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#F5F8FF",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  role: {
    fontSize: 14,
    color: "#FFF",
    textTransform: "capitalize",
    fontWeight: "500",
  },
  content: {
    flex: 1,
    marginTop: -50,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    marginTop: 6,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  statDivider: {
    width: 1,
    height: "60%",
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
  },
  contactCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 12,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  contactValue: {
    fontSize: 14,
    color: "#4B5563",
    marginLeft: 10,
  },
  categorySection: {
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginLeft: 8,
  },
  actionsContainer: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  actionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  actionLabel: {
    flex: 1,
    fontSize: 15,
    color: "#374151",
    fontWeight: "500",
  },
  logoutButton: {
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  logoutGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  buttonIcon: {
    marginRight: 10,
  },
  logoutButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  versionText: {
    textAlign: "center",
    fontSize: 12,
    color: "#94A3B8",
    marginBottom: 20,
  },
  errorText: {
    fontSize: 18,
    color: "#EF4444",
    textAlign: "center",
    marginTop: 50,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  loginButton: {
    flexDirection: "row",
    backgroundColor: "#3B82F6",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 30,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  loginButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ProfileScreen;
