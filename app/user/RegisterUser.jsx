import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { auth, db } from "../config/firebase";

const CLOUDINARY_UPLOAD_PRESET = "userprofile"; // Your Cloudinary upload preset
const CLOUDINARY_CLOUD_NAME = "dcrso99w7"; // Your Cloudinary cloud name
const CLOUDINARY_FOLDER = "samples/ecommerce"; // Optional folder in Cloudinary

const RegisterUser = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [location, setLocation] = useState("");
  const [profileImage, setProfileImage] = useState(null); // State for profile image
  const [loading, setLoading] = useState(false); // State to handle loading
  const router = useRouter(); // Initialize the router

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Toast.show({
        type: "error",
        text1: "Permission Denied",
        text2: "Sorry, we need camera roll permissions to upload images.",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri); // Set the selected image URI
    }
  };

  const uploadImageToCloudinary = async (imageUri) => {
    const formData = new FormData();
    formData.append("file", {
      uri: imageUri,
      name: `profile_${Date.now()}.jpg`, // Unique file name
      type: "image/jpeg",
    });
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("cloud_name", CLOUDINARY_CLOUD_NAME);
    formData.append("folder", CLOUDINARY_FOLDER); // Optional: Organize images in a folder

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const data = await response.json();
      return data.secure_url; // Return the uploaded image URL
    } catch (error) {
      console.error("Error uploading image to Cloudinary:", error);
      throw error;
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password || !location) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Please fill in all fields.",
      });
      return;
    }

    setLoading(true); // Start loading

    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Upload profile image to Cloudinary if selected
      let profileImageUrl = "";
      if (profileImage) {
        profileImageUrl = await uploadImageToCloudinary(profileImage);
      }

      // Create a user profile document in Firestore
      await setDoc(doc(db, "userprofile", user.uid), {
        name,
        email,
        location,
        profileImage: profileImageUrl || "", // Use the Cloudinary URL or an empty string
        role: "customer", // Default role set to "customer"
        createdAt: new Date().toISOString(), // Add a timestamp
      });

      Toast.show({
        type: "success",
        text1: "Registration Successful",
        text2: "Your account has been created.",
      });

      // Navigate to the login screen after successful registration
      router.push("user/LoginUser");
    } catch (error) {
      console.error("Registration Error:", error);
      Toast.show({
        type: "error",
        text1: "Registration Failed",
        text2: error.message || "An error occurred during registration.",
      });
    } finally {
      setLoading(false); // Stop loading
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>

      {/* Profile Image Picker */}
      <TouchableOpacity
        onPress={pickImage}
        style={styles.profileImageContainer}
      >
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={styles.profileImage} />
        ) : (
          <Text style={styles.profileImagePlaceholder}>
            Upload Profile Image
          </Text>
        )}
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Name"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Location"
        value={location}
        onChangeText={setLocation}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleRegister}
        disabled={loading} // Disable the button when loading
      >
        {loading ? (
          <ActivityIndicator color="#fff" /> // Show a loading indicator
        ) : (
          <Text style={styles.buttonText}>Register</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push("user/LoginPage")}>
        <Text style={styles.link}>Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  profileImageContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50, // Circular image
  },
  profileImagePlaceholder: {
    fontSize: 16,
    color: "#007BFF",
  },
  input: {
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  button: {
    backgroundColor: "#007BFF",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  link: {
    color: "#007BFF",
    textAlign: "center",
    marginTop: 16,
  },
});

export default RegisterUser;
