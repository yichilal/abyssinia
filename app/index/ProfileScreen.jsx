import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router"; // Import the router
import React from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const ProfileScreen = () => {
  const isLoggedIn = false; // Replace with actual authentication state

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Profile Picture Section */}
      {isLoggedIn ? (
        <>
          <View style={styles.profileContainer}>
            <Image
              source={{ uri: "https://via.placeholder.com/150" }} // Replace with actual image URL
              style={styles.profileImage}
            />
            <TouchableOpacity style={styles.editIcon}>
              <MaterialIcons name="edit" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* Profile Options */}
          <View style={styles.optionsContainer}>
            <MenuItem icon="person-outline" title="Profile Details" />
            <MenuItem icon="history" title="Order History" />
            <MenuItem
              icon="hearto"
              title="Saved Wishlist"
              onPress={() => router.push("accounts/favorite")} // Navigate to Favorites screen
            />
            <MenuItem icon="creditcard" title="Payment Methods" />
            <MenuItem icon="questioncircleo" title="Help Center" />
            <MenuItem icon="poweroff" title="Logout Option" />
          </View>
        </>
      ) : (
        <View style={styles.signInContainer}>
          <Text style={styles.signInText}>
            Please{" "}
            <Text
              style={styles.signInLink}
              onPress={() => router.push("user/SignIn")} // Navigate to SignIn screen
            >
              sign in
            </Text>{" "}
            to Abyssinia Gebeya
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

// Reusable Menu Item Component
const MenuItem = ({ icon, title, onPress }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <AntDesign name={icon} size={24} color="#333" />
    <Text style={styles.menuText}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    paddingTop: 30,
  },
  profileContainer: {
    alignItems: "center",
    marginBottom: 20,
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
  optionsContainer: {
    width: "90%",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 10,
    elevation: 5,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  menuText: {
    fontSize: 16,
    marginLeft: 15,
    color: "#333",
  },
  signInContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  signInText: {
    fontSize: 18,
    color: "#333",
  },
  signInLink: {
    color: "#007BFF",
    fontWeight: "bold",
  },
});

export default ProfileScreen;