import { AntDesign, FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router"; // Import the router
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../config/firebase";

const ProfileScreen = () => {
  const [user, setUser] = useState(null); // State to store user data
  const [isLoggedIn, setIsLoggedIn] = useState(false); // State to track authentication

  // Check authentication state on component mount
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        // User is logged in
        setIsLoggedIn(true);

        // Fetch user data from Firestore
        const userDoc = await getDoc(doc(db, "userprofile", currentUser.uid));
        if (userDoc.exists()) {
          setUser(userDoc.data()); // Set user data
          console.log("User Data:", userDoc.data());
        } else {
          console.log("No user document found in Firestore.");
        }
      } else {
        // User is not logged in
        setIsLoggedIn(false);
        setUser(null);
      }
    });

    return () => unsubscribe(); // Cleanup subscription
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Profile Picture and Username Section */}
      {isLoggedIn && user && (
        <View style={styles.profileContainer}>
          <View style={styles.profileImageContainer}>
            <Image
              source={{
                uri: user?.photoURL || "https://via.placeholder.com/150",
              }}
              style={styles.profileImage}
            />
            <TouchableOpacity style={styles.editIcon}>
              <MaterialIcons name="edit" size={20} color="white" />
            </TouchableOpacity>
          </View>
          <Text style={styles.username}>{user.username}</Text>
        </View>
      )}

      {/* Pressable Text Options */}
      {isLoggedIn && (
        <View style={styles.pressableTextContainer}>
          <PressableText
            title="Payments"
            onPress={() => console.log("Payments pressed")}
          />
          <PressableText
            title="Orders"
            onPress={() => console.log("Orders pressed")}
          />
          <PressableText
            title="Favorites"
            onPress={() => router.push("accounts/favorite")}
          />
          <PressableText
            title="Reviews"
            onPress={() => console.log("Reviews pressed")}
          />
          <PressableText
            title="Returns"
            onPress={() => console.log("Returns pressed")}
          />
          <PressableText
            title="Delivery Status"
            onPress={() => console.log("Delivery Status pressed")}
          />
          <PressableText
            title="Help Center"
            onPress={() => console.log("Help Center pressed")}
          />
          <PressableText
            title="Feedbacks"
            onPress={() => console.log("Feedbacks pressed")}
          />
          <PressableText
            title="Q&A"
            onPress={() => console.log("Q&A pressed")}
          />
        </View>
      )}

      {/* Top Card for Sign-In/Sign-Up */}
      {!isLoggedIn && (
        <View style={styles.topCard}>
          <Text style={styles.topCardText}>
            Sign in by Google to Abyssinia Gebeya for the best experience, or
            sign up by email and password.
          </Text>
          <View style={styles.topCardButtons}>
            <Pressable
              style={styles.topCardButton}
              onPress={() => router.push("user/SignIn")}
            >
              <FontAwesome name="google" size={20} color="#DB4437" />
              <Text style={styles.topCardButtonText}>Sign in with Google</Text>
            </Pressable>
            <Pressable
              style={styles.topCardButton}
              onPress={() => router.push("user/SignUpScreen")}
            >
              <MaterialIcons name="email" size={20} color="#007BFF" />
              <Text style={styles.topCardButtonText}>Sign up with Email</Text>
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

// Reusable Pressable Text Component
const PressableText = ({ title, onPress }) => (
  <Pressable style={styles.pressableText} onPress={onPress}>
    <Text style={styles.pressableTextTitle}>{title}</Text>
    <AntDesign name="right" size={16} color="#666" />
  </Pressable>
);

// Styles
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    paddingTop: 30,
  },
  topCard: {
    width: "90%",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    elevation: 5,
    marginBottom: 20,
    alignItems: "center",
  },
  topCardText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginBottom: 15,
    lineHeight: 24,
  },
  topCardButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  topCardButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    flex: 1,
    marginHorizontal: 5,
    justifyContent: "center",
  },
  topCardButtonText: {
    fontSize: 14,
    marginLeft: 10,
    color: "#333",
    fontWeight: "500",
  },
  profileContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  profileImageContainer: {
    position: "relative",
    alignItems: "center",
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "white",
  },
  editIcon: {
    position: "absolute",
    bottom: 0,
    right: 5,
    backgroundColor: "#FF6F61",
    borderRadius: 20,
    padding: 5,
  },
  username: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 10,
  },
  pressableTextContainer: {
    width: "90%",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 10,
    elevation: 5,
    marginBottom: 20,
  },
  pressableText: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  pressableTextTitle: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
});

export default ProfileScreen;
