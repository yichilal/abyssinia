import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { onValue, ref } from "firebase/database";
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { auth, db, rtdb } from "../config/firebase";

const CLOUDINARY_CLOUD_NAME = "dcrso99w7";
const CLOUDINARY_UPLOAD_PRESET = "userprofile"; // Replace with your upload preset

const ProfileSupplier = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [supplierData, setSupplierData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [updatedName, setUpdatedName] = useState("");
  const [updatedProfilePicture, setUpdatedProfilePicture] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Handle auth state changes
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        // Redirect to login if no user
        router.replace("/user/LoginPage");
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Fetch supplier data
  useEffect(() => {
    let unsubscribeSupplier = null;

    const fetchSupplierData = async () => {
      if (!user?.email) return;

      try {
        const suppliersRef = collection(db, "userprofile");
        const q = query(suppliersRef, where("email", "==", user.email));

        unsubscribeSupplier = onSnapshot(
          q,
          (snapshot) => {
            if (!snapshot.empty) {
              const data = {
                uid: snapshot.docs[0].id,
                ...snapshot.docs[0].data(),
              };
              setSupplierData(data);
              setUpdatedName(`${data.fName} ${data.lName}`);
              setUpdatedProfilePicture(data.profilePicture || null);
            }
            setLoading(false);
          },
          (error) => {
            console.error("Error fetching supplier data:", error);
            Toast.show({
              type: "error",
              text1: "Error",
              text2: "Failed to fetch profile data",
              visibilityTime: 3000,
            });
            setLoading(false);
          }
        );
      } catch (error) {
        console.error("Error setting up supplier listener:", error);
        setLoading(false);
      }
    };

    fetchSupplierData();

    return () => {
      if (unsubscribeSupplier) {
        unsubscribeSupplier();
      }
    };
  }, [user]);

  // Fetch notifications
  useEffect(() => {
    let unsubscribeNotifications = null;

    const fetchNotifications = async () => {
      if (!user?.uid) return;

      try {
        const notificationsRef = collection(db, "notifications");
        const q = query(
          notificationsRef,
          where("recipientId", "==", user.uid),
          where("read", "==", false)
        );

        unsubscribeNotifications = onSnapshot(q, (snapshot) => {
          setUnreadNotifications(snapshot.size);
        });
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchNotifications();

    return () => {
      if (unsubscribeNotifications) {
        unsubscribeNotifications();
      }
    };
  }, [user]);

  // Fetch messages
  useEffect(() => {
    let unsubscribeMessages = null;

    const fetchMessages = async () => {
      if (!user?.uid) return;

      try {
        const chatId = `admin_${user.uid}`;
        const messagesRef = ref(rtdb, `chats/${chatId}/messages`);

        unsubscribeMessages = onValue(messagesRef, (snapshot) => {
          if (!snapshot.exists()) return;

          const messages = snapshot.val();
          const unreadCount = Object.values(messages).filter(
            (msg) => msg.sender === "admin" && !msg.isRead
          ).length;

          setUnreadMessages(unreadCount);
        });
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchMessages();

    return () => {
      if (unsubscribeMessages) {
        unsubscribeMessages();
      }
    };
  }, [user]);

  // Enhanced image picker with Cloudinary upload
  const pickImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Denied",
          "Please allow access to photos to update your profile picture."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        setLoading(true);
        const imageUri = result.assets[0].uri;

        try {
          // First read the file as base64
          const base64 = await FileSystem.readAsStringAsync(imageUri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          // Create form data for Cloudinary upload
          const formData = new FormData();
          formData.append("file", `data:image/jpeg;base64,${base64}`);
          formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
          formData.append("cloud_name", CLOUDINARY_CLOUD_NAME);

          // Upload to Cloudinary
          const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
            {
              method: "POST",
              body: formData,
            }
          );

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error?.message || "Upload failed");
          }

          if (data.secure_url) {
            // Update Firestore with new profile picture URL
            const supplierRef = doc(db, "userprofile", supplierData.uid);
            await updateDoc(supplierRef, {
              profilePicture: data.secure_url,
            });

            setUpdatedProfilePicture(data.secure_url);
            Alert.alert("Success", "Profile picture updated successfully!");
          } else {
            throw new Error("Failed to get upload URL from Cloudinary");
          }
        } catch (uploadError) {
          console.error("Upload error:", uploadError);
          Alert.alert(
            "Upload Failed",
            "Failed to upload image. Please try again."
          );
        }
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to process image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Update profile in Firestore
  const updateProfile = async () => {
    if (!supplierData || !supplierData.uid) return;

    try {
      const [firstName, ...lastNameParts] = updatedName.trim().split(" ");
      const lastName = lastNameParts.join(" ") || supplierData.lName;

      const supplierRef = doc(db, "userprofile", supplierData.uid);
      await updateDoc(supplierRef, {
        fName: firstName || supplierData.fName,
        lName: lastName || supplierData.lName,
        profilePicture: updatedProfilePicture || supplierData.profilePicture,
      });

      Alert.alert("Success", "Profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      console.error("Update Error:", error);
      Alert.alert("Error", "Failed to update profile.");
    }
  };

  const handleProfilePictureClick = () => {
    if (!supplierData) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Profile data not available",
        visibilityTime: 2000,
      });
      return;
    }

    const formatValue = (value) => value || "Not provided";

    Alert.alert(
      "Profile Details",
      `Name: ${formatValue(supplierData.fName + " " + supplierData.lName)}\n` +
        `Email: ${formatValue(supplierData.email)}\n` +
        `Phone: ${formatValue(supplierData.phoneNumber)}\n` +
        `Trade Type: ${formatValue(supplierData.tradeType)}\n` +
        `Address: ${formatValue(supplierData.address)}\n` +
        `Status: ${formatValue(supplierData.status)}`,
      [
        {
          text: "Close",
          style: "cancel",
        },
        isEditing
          ? {
              text: "Edit",
              onPress: () => pickImage(),
              style: "default",
            }
          : null,
      ].filter(Boolean)
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading Profile...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Please log in to view your profile</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.replace("/user/LoginPage")}
        >
          <Text style={styles.loginButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleProfilePictureClick}
            style={styles.imageContainer}
            activeOpacity={0.7}
          >
            {supplierData?.profilePicture ? (
              <Image
                source={{
                  uri: supplierData.profilePicture,
                  cache: "reload",
                }}
                style={styles.profileImage}
                onError={() => {
                  Toast.show({
                    type: "error",
                    text1: "Error",
                    text2: "Failed to load profile image",
                    visibilityTime: 2000,
                  });
                  setUpdatedProfilePicture(null);
                }}
              />
            ) : (
              <View style={styles.placeholderContainer}>
                <MaterialIcons name="person" size={90} color="#9ca3af" />
                <Text style={styles.placeholderText}>Tap to view details</Text>
              </View>
            )}
            {isEditing && (
              <TouchableOpacity
                style={styles.editIcon}
                onPress={pickImage}
                activeOpacity={0.7}
              >
                <MaterialIcons name="edit" size={26} color="#fff" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          {isEditing ? (
            <TextInput
              value={updatedName}
              onChangeText={setUpdatedName}
              style={styles.input}
              placeholder="Full Name"
              autoCapitalize="words"
              placeholderTextColor="#9ca3af"
            />
          ) : (
            <Text style={styles.nameText}>
              {`${supplierData.fName} ${supplierData.lName}`}
            </Text>
          )}

          <View style={styles.statusBadge}>
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    supplierData.status === "approved" ? "#059669" : "#dc2626",
                },
              ]}
            >
              {supplierData.status || "Pending"}
            </Text>
          </View>
        </View>

        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("Notifications")}
          >
            <View style={styles.menuItemContent}>
              <View
                style={[styles.iconContainer, { backgroundColor: "#fef3c7" }]}
              >
                <MaterialIcons name="notifications" size={24} color="#d97706" />
              </View>
              <Text style={styles.menuItemText}>Notifications</Text>
            </View>
            {unreadNotifications > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadNotifications}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("Message")}
          >
            <View style={styles.menuItemContent}>
              <View
                style={[styles.iconContainer, { backgroundColor: "#ede9fe" }]}
              >
                <MaterialIcons name="message" size={24} color="#7c3aed" />
              </View>
              <Text style={styles.menuItemText}>Messages</Text>
            </View>
            {unreadMessages > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadMessages}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoText}>{supplierData.email}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoText}>
                {supplierData.phoneNumber || "N/A"}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Trade Type</Text>
              <Text style={styles.infoText}>
                {supplierData.tradeType || "N/A"}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoText}>
                {supplierData.address || "N/A"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, isEditing && styles.saveButton]}
            onPress={isEditing ? updateProfile : () => setIsEditing(true)}
          >
            <Text style={styles.buttonText}>
              {isEditing ? "Save Changes" : "Edit Profile"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => auth.signOut().then(() => router.push("/"))}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    alignItems: "center",
    paddingTop: 24,
    paddingHorizontal: 24,
    backgroundColor: "#fff",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "600",
    color: "#4b5563",
  },
  errorText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#ef4444",
  },
  imageContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    position: "relative",
    borderWidth: 3,
    borderColor: "#e5e7eb",
    overflow: "hidden",
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 70,
  },
  editIcon: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "#3b82f6",
    borderRadius: 20,
    padding: 8,
    elevation: 2,
  },
  nameText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: 0.2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  input: {
    width: "100%",
    padding: 14,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: "#ffffff",
    fontSize: 16,
    color: "#1f2937",
    textAlign: "center",
  },
  menuContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  menuItemText: {
    marginLeft: 16,
    fontSize: 16,
    color: "#1f2937",
    fontWeight: "600",
  },
  badge: {
    backgroundColor: "#ef4444",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  infoContainer: {
    marginHorizontal: 24,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 20,
  },
  infoRow: {
    marginBottom: 16,
  },
  infoItem: {
    backgroundColor: "#f9fafb",
    padding: 16,
    borderRadius: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "500",
  },
  buttonContainer: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  button: {
    backgroundColor: "#3b82f6",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButton: {
    backgroundColor: "#10b981",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  logoutButton: {
    backgroundColor: "#fee2e2",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  logoutText: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  placeholderContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  loginButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  loginButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});

export default ProfileSupplier;
