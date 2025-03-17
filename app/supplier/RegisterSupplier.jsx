import CheckBox from "expo-checkbox";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router"; // Import useRouter
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../config/firebase";

const CLOUDINARY_UPLOAD_PRESET = "supplier"; // Your Cloudinary upload preset
const CLOUDINARY_CLOUD_NAME = "dcrso99w7"; // Your Cloudinary cloud name
const CLOUDINARY_FOLDER = "samples/ecommerce"; // Folder path

const RegisterSupplier = () => {
  const [fName, setFname] = useState("");
  const [lName, setLname] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [tradeType, setTradeType] = useState("");
  const [address, setAddress] = useState("");
  const [tradeLicense, setTradeLicense] = useState(null);
  const [profilePicture, setProfilePicture] = useState(null);
  const [isChecked, setIsChecked] = useState(false);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState("supplier"); // Default role as supplier

  const router = useRouter(); // Initialize the router

  const uploadToCloudinary = async (fileUri) => {
    setLoading(true);
    try {
      let formData = new FormData();
      formData.append("file", {
        uri: fileUri,
        type: "image/jpeg",
        name: "upload.jpg",
      });
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      formData.append("folder", CLOUDINARY_FOLDER); // Store in the correct folder

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const responseJson = await response.json();
      setLoading(false);

      if (responseJson.secure_url) {
        return responseJson.secure_url;
      } else {
        throw new Error("Failed to upload image");
      }
    } catch (error) {
      setLoading(false);
      Alert.alert("Upload Error", "Failed to upload. Try again.");
      console.error("Cloudinary Upload Error:", error);
      return null;
    }
  };

  const pickImage = async (setImage) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets?.length > 0) {
      const uploadUrl = await uploadToCloudinary(result.assets[0].uri);
      if (uploadUrl) {
        setImage(uploadUrl);
      }
    }
  };

  const createUser = async () => {
    if (!profilePicture || !tradeLicense) {
      Alert.alert(
        "Error",
        "Please upload both Profile Picture and Trade License."
      );
      return;
    }

    setLoading(true);
    try {
      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Store user data in the `userprofile` collection
      await setDoc(doc(db, "userprofile", user.uid), {
        uid: user.uid,
        fName,
        lName,
        email, // Store original email without modification
        phoneNumber,
        tradeType,
        address,
        status,
        tradeLicense,
        profilePicture,
        role: "supplier", // Set role as supplier
        createdAt: new Date().toISOString(), // Add a timestamp
      });

      setLoading(false);
      Alert.alert("Success", "Supplier registered successfully!");

      // Clear all input fields and uploaded files after successful registration
      setFname("");
      setLname("");
      setEmail("");
      setPhoneNumber("");
      setPassword("");
      setTradeType("");
      setAddress("");
      setTradeLicense(null);
      setProfilePicture(null);
      setIsChecked(false);
    } catch (error) {
      setLoading(false);
      Alert.alert("Error", error.message);
      console.error("Registration Error:", error.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      {/* Card at the top */}
      <View style={styles.card}>
        <Text style={styles.cardText}>Supplier Registration</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.push("user/LoginPage")} // Navigate to Login Page
        >
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Picture */}
      <View style={styles.profileContainer}>
        <TouchableOpacity
          onPress={() => pickImage(setProfilePicture)}
          style={styles.profileImageContainer}
        >
          {profilePicture ? (
            <Image
              source={{ uri: profilePicture }}
              style={styles.profileImage}
            />
          ) : (
            <Text style={styles.profilePlaceholder}>+</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Form Fields */}
      <View style={styles.container}>
        <TextInput
          placeholder="First Name"
          value={fName}
          onChangeText={setFname}
          style={styles.input}
        />
        <TextInput
          placeholder="Last Name"
          value={lName}
          onChangeText={setLname}
          style={styles.input}
        />
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          placeholder="Phone Number"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          style={styles.input}
        />
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />
        <TextInput
          placeholder="Trade Type"
          value={tradeType}
          onChangeText={setTradeType}
          style={styles.input}
        />
        <TextInput
          placeholder="Address"
          value={address}
          onChangeText={setAddress}
          style={styles.input}
        />

        <TouchableOpacity
          style={styles.uploadButton}
          onPress={() => pickImage(setTradeLicense)}
        >
          <Text style={styles.uploadText}>
            {tradeLicense ? "Trade License Uploaded" : "Upload Trade License"}
          </Text>
        </TouchableOpacity>

        <View style={styles.checkboxContainer}>
          <CheckBox value={isChecked} onValueChange={setIsChecked} />
          <Text style={styles.checkboxText}>
            I agree to the Terms & Conditions
          </Text>
        </View>

        {isChecked && (
          <TouchableOpacity
            style={styles.submitButton}
            onPress={createUser}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Register</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  card: {
    width: "100%",
    height: 80, // Minimized height
    backgroundColor: "#8C81F3", // Dark color similar to status bar
    justifyContent: "center",
    alignItems: "center",
    paddingTop: StatusBar.currentHeight, // Connect to status bar
    flexDirection: "row", // Align items horizontally
    paddingHorizontal: 20, // Add padding for the login button
  },
  cardText: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "bold",
    flex: 1, // Take up remaining space
  },
  loginButton: {
    backgroundColor: "#28a745", // Green color
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20, // Rounded corners
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  profileContainer: {
    alignItems: "center",
    marginTop: 20, // Add margin to avoid overlap
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60, // Circular border
    borderWidth: 3,
    borderColor: "#28a745", // Green border
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff", // White background for the circle
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50, // Circular image
  },
  profilePlaceholder: {
    fontSize: 32,
    color: "#888",
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#f8f9fa",
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  uploadButton: {
    backgroundColor: "#007bff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    alignItems: "center",
  },
  uploadText: { color: "#fff", fontSize: 16 },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },
  checkboxText: { marginLeft: 10, fontSize: 14 },
  submitButton: {
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});

export default RegisterSupplier;
