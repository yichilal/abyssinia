import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { EventRegister } from "react-native-event-listeners";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import PasswordStrengthIndicator from "../components/PasswordStrengthIndicator";
import { auth, db } from "../config/firebase";
import { validateEthiopianPhone, validateName } from "../utils/validations";

// --- Cloudinary Configuration (Keep as is) ---
const CLOUDINARY_UPLOAD_PRESET = "userprofile";
const CLOUDINARY_CLOUD_NAME = "dcrso99w7";
const CLOUDINARY_FOLDER = "samples/ecommerce";

// RegisterUser Component ---
const RegisterUser = () => {
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [location, setLocation] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [securePassword, setSecurePassword] = useState(true);
  const [focusedInput, setFocusedInput] = useState(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const nameRef = React.useRef(null);
  const phoneRef = React.useRef(null);

  // Typewriter effect state (Keep as is)
  const [displayText, setDisplayText] = useState("");
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const textArray = ["Abyssinia Gebeya", "For The Best", "Experience"];

  // Typewriter effect logic (Keep as is)
  useEffect(() => {
    const currentText = textArray[currentTextIndex];
    let charIndex = 0;
    const typewriterInterval = setInterval(() => {
      if (charIndex <= currentText.length) {
        setDisplayText(currentText.substring(0, charIndex));
        charIndex++;
      } else {
        clearInterval(typewriterInterval);
        setTimeout(() => {
          setCurrentTextIndex(
            (prevIndex) => (prevIndex + 1) % textArray.length
          );
        }, 1500); // Pause before next text
      }
    }, 100); // Speed of typing
    return () => clearInterval(typewriterInterval);
  }, [currentTextIndex]);

  // Image Picker Logic (Keep as is)
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Toast.show({
        type: "error",
        text1: "Permission Denied",
        text2: "Camera roll access is required to upload images.",
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8, // Reduced quality slightly for faster uploads
    });
    if (!result.canceled && result.assets?.length > 0) {
      setProfileImage(result.assets[0].uri);
    }
  };

  // Cloudinary Upload Logic (Keep as is)
  const uploadImageToCloudinary = async (imageUri) => {
    const formData = new FormData();
    formData.append("file", {
      uri: imageUri,
      name: `profile_${Date.now()}.jpg`,
      type: "image/jpeg", // Ensure correct MIME type
    });
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("folder", CLOUDINARY_FOLDER);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );
      const data = await response.json();
      if (!response.ok || !data.secure_url) {
        // Throw detailed error from Cloudinary if available
        throw new Error(data.error?.message || "Cloudinary upload failed");
      }
      console.log("Cloudinary Upload Success:", data.secure_url);
      return data.secure_url;
    } catch (error) {
      console.error("Error uploading image to Cloudinary:", error);
      Toast.show({
        type: "error",
        text1: "Image Upload Error",
        text2: error.message || "Failed to upload profile image.",
      });
      throw error; // Re-throw to stop registration process
    }
  };

  const handleNameChange = (text) => {
    setName(text);
    // Check for numbers immediately
    if (/\d/.test(text)) {
      setNameError("Name cannot contain numbers");
      return;
    }
    if (text.trim() === "") {
      setNameError("");
    } else if (!validateName(text)) {
      setNameError(
        "Name must contain only letters and be at least 2 characters"
      );
    } else {
      setNameError("");
    }
  };

  // Registration Handler (Modified to store in AsyncStorage)
  const handleRegister = async () => {
    // Enhanced validation
    if (!validateName(name)) {
      Toast.show({
        type: "error",
        text1: "Invalid Name",
        text2: "Name must contain only letters and be at least 2 characters.",
      });
      return;
    }

    if (!validateEthiopianPhone(phoneNumber)) {
      Toast.show({
        type: "error",
        text1: "Invalid Phone Number",
        text2: "Please enter a valid Ethiopian phone number.",
      });
      return;
    }

    if (!email.trim() || !password.trim() || !location.trim()) {
      Toast.show({
        type: "error",
        text1: "Missing Fields",
        text2: "Please fill in all required fields.",
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Toast.show({
        type: "error",
        text1: "Invalid Email",
        text2: "Please enter a valid email address.",
      });
      return;
    }

    if (password !== confirmPassword) {
      Toast.show({
        type: "error",
        text1: "Password Mismatch",
        text2: "Passwords do not match.",
      });
      return;
    }

    setLoading(true);
    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      console.log("Firebase User Created:", user.uid);

      // 2. Upload profile image if selected
      let profileImageUrl = "";
      if (profileImage) {
        profileImageUrl = await uploadImageToCloudinary(profileImage);
      }

      // 3. Prepare user data object
      const userData = {
        uid: user.uid,
        name: name.trim(),
        email: email.trim().toLowerCase(), // Store email consistently
        location: location.trim(),
        profileImage: profileImageUrl || "", // Store URL or empty string
        role: "customer", // Default role
        createdAt: new Date().toISOString(), // Timestamp
      };

      // 4. Save user data to Firestore
      await setDoc(doc(db, "userprofile", user.uid), userData);
      console.log("Firestore Document Written:", user.uid);

      // 5. *** Store user data in AsyncStorage ***
      await AsyncStorage.setItem("userProfile", JSON.stringify(userData));
      console.log("User Profile stored in AsyncStorage");

      // 6. Show success and navigate
      Toast.show({
        type: "success",
        text1: "Registration Successful",
        text2: `Welcome, ${userData.name}!`,
      });

      // Notify that auth status has changed to update UI elements
      EventRegister.emit("authStatusChanged");

      // Clear form (optional, good practice)
      setName("");
      setEmail("");
      setPassword("");
      setLocation("");
      setProfileImage(null);

      router.replace("/"); // Use replace to prevent going back to registration
    } catch (error) {
      console.error("Registration Error:", error);
      // Provide more specific Firebase errors if possible
      let errorMessage =
        error.message || "Something went wrong during registration.";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email address is already registered.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "The password is too weak.";
      }
      // Check for Cloudinary errors caught earlier
      else if (errorMessage.includes("Cloudinary")) {
        // Use the message shown by the Toast in uploadImageToCloudinary
      }
      Toast.show({
        type: "error",
        text1: "Registration Failed",
        text2: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate header height (adjust as needed)
  const HEADER_HEIGHT = Platform.OS === "android" ? 64 : 100;

  // --- JSX Structure ---
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={HEADER_HEIGHT + insets.top}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.contentContainer, { flexGrow: 1 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
        automaticallyAdjustKeyboardInsets={true}
      >
        <StatusBar barStyle="light-content" backgroundColor="#1E40AF" />

        {/* Header with Typewriter */}
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerText}>{displayText || "Welcome"}</Text>
        </View>

        {/* Registration Form */}
        <View style={styles.formContainer}>
          {/* Image Picker */}
          <TouchableOpacity
            style={[styles.imagePicker, loading && styles.disabledOverlay]}
            onPress={pickImage}
            disabled={loading}
          >
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Ionicons name="camera-outline" size={36} color="#6B7280" />
                <Text style={styles.uploadText}>Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>

          <View
            style={[
              styles.inputContainer,
              focusedInput === "name" && styles.inputFocusedContainer,
              nameError && styles.inputError,
            ]}
          >
            <Ionicons
              name="person-outline"
              size={20}
              color={
                focusedInput === "name"
                  ? "#1E40AF"
                  : nameError
                  ? "#EF4444"
                  : "#6B7280"
              }
              style={styles.icon}
            />
            <TextInput
              style={styles.input}
              placeholder="Full Name *"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={handleNameChange}
              onFocus={() => setFocusedInput("name")}
              onBlur={() => setFocusedInput(null)}
              autoCapitalize="words"
              editable={!loading}
            />
          </View>
          {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

          <View
            style={[
              styles.inputContainer,
              focusedInput === "email" && styles.inputFocusedContainer,
            ]}
          >
            <Ionicons
              name="mail-outline"
              size={20}
              color={focusedInput === "email" ? "#1E40AF" : "#6B7280"}
              style={styles.icon}
            />
            <TextInput
              style={styles.input}
              placeholder="Email *"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              onFocus={() => setFocusedInput("email")}
              onBlur={() => setFocusedInput(null)}
              editable={!loading}
            />
          </View>

          <View
            style={[
              styles.inputContainer,
              focusedInput === "phoneNumber" && styles.inputFocusedContainer,
            ]}
          >
            <Ionicons
              name="call-outline"
              size={20}
              color={focusedInput === "phoneNumber" ? "#1E40AF" : "#6B7280"}
              style={styles.icon}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone Number (e.g., 0912345678)"
              placeholderTextColor="#9CA3AF"
              value={phoneNumber}
              onChangeText={(text) => {
                const formattedNumber = text
                  .replace(/[^0-9]/g, "")
                  .slice(0, 10);
                setPhoneNumber(formattedNumber);
              }}
              onFocus={() => setFocusedInput("phoneNumber")}
              onBlur={() => setFocusedInput(null)}
              keyboardType="phone-pad"
              maxLength={10}
              editable={!loading}
            />
          </View>

          <View
            style={[
              styles.inputContainer,
              focusedInput === "password" && styles.inputFocusedContainer,
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={focusedInput === "password" ? "#1E40AF" : "#6B7280"}
              style={styles.icon}
            />
            <TextInput
              style={styles.input}
              placeholder="Password *"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={securePassword}
              onFocus={() => setFocusedInput("password")}
              onBlur={() => setFocusedInput(null)}
              editable={!loading}
            />
            <TouchableOpacity
              onPress={() => setSecurePassword(!securePassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={securePassword ? "eye-off-outline" : "eye-outline"}
                size={22}
                color="#6B7280"
              />
            </TouchableOpacity>
          </View>

          {password && <PasswordStrengthIndicator password={password} />}

          <View
            style={[
              styles.inputContainer,
              focusedInput === "confirmPassword" &&
                styles.inputFocusedContainer,
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={focusedInput === "confirmPassword" ? "#1E40AF" : "#6B7280"}
              style={styles.icon}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password *"
              placeholderTextColor="#9CA3AF"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={securePassword}
              onFocus={() => setFocusedInput("confirmPassword")}
              onBlur={() => setFocusedInput(null)}
              editable={!loading}
            />
          </View>

          <View
            style={[
              styles.inputContainer,
              focusedInput === "location" && styles.inputFocusedContainer,
            ]}
          >
            <Ionicons
              name="location-outline"
              size={20}
              color={focusedInput === "location" ? "#1E40AF" : "#6B7280"}
              style={styles.icon}
            />
            <TextInput
              style={styles.input}
              placeholder="Location (e.g., City, Country) *"
              placeholderTextColor="#9CA3AF"
              value={location}
              onChangeText={setLocation}
              onFocus={() => setFocusedInput("location")}
              onBlur={() => setFocusedInput(null)}
              autoCapitalize="words"
              editable={!loading}
            />
          </View>

          {/* Signup Button */}
          <TouchableOpacity
            style={[styles.signupButton, loading && styles.disabledOverlay]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.signupText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.authLinksContainer}>
            <TouchableOpacity
              onPress={() => router.push("user/LoginPage")}
              style={styles.authLinkItem}
              disabled={loading}
            >
              <Text style={styles.signInText}>
                Already have an account?{" "}
                <Text style={styles.signInLink}>Log In</Text>
              </Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              onPress={() => router.push("user/ForgotPassword")}
              style={styles.authLinkItem}
              disabled={loading}
            >
              <Ionicons name="key-outline" size={16} color="#1E40AF" />
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Toast />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
  },
  headerContainer: {
    backgroundColor: "#1E40AF",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 20 : 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: "center",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: -20,
    position: "relative",
  },
  headerText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFF",
    textAlign: "center",
    minHeight: 35,
  },
  formContainer: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
    backgroundColor: "#F9FAFB",
    flex: 1,
  },
  imagePicker: {
    alignSelf: "center",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 30,
    overflow: "hidden",
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  profileImagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  uploadText: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "500",
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    height: 52,
  },
  inputFocusedContainer: {
    borderColor: "#1E40AF",
    shadowColor: "#1E40AF",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
    height: "100%",
  },
  eyeIcon: {
    padding: 8,
  },
  signupButton: {
    backgroundColor: "#1E40AF",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  signupText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  authLinksContainer: {
    marginTop: 16,
    alignItems: "center",
    gap: 12,
  },
  authLinkItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  signInText: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
  },
  signInLink: {
    color: "#1E40AF",
    fontWeight: "600",
  },
  divider: {
    height: 1,
    width: "40%",
    backgroundColor: "#E5E7EB",
    marginVertical: 4,
  },
  forgotPasswordText: {
    color: "#1E40AF",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 6,
  },
  disabledOverlay: {
    opacity: 0.6,
  },
  inputError: {
    borderColor: "#EF4444",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: -12,
    marginBottom: 12,
    marginLeft: 4,
  },
  backButton: {
    position: "absolute",
    left: 20,
    top: Platform.OS === "android" ? StatusBar.currentHeight + 20 : 60,
    zIndex: 1,
  },
});

export default RegisterUser;
