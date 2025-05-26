import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
// Import Firestore query functions
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { EventRegister } from "react-native-event-listeners";
import Toast from "react-native-toast-message";
import Ionicons from "react-native-vector-icons/Ionicons";
import { auth, db } from "../config/firebase"; // Assuming correct path

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [securePassword, setSecurePassword] = useState(true);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const router = useRouter();

  // Keyboard listeners with cleanup
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Memoized styles to prevent unnecessary re-renders
  const dynamicStyles = useMemo(
    () => ({
      formContainer: {
        ...styles.formContainer,
        ...(keyboardVisible && styles.formContainerKeyboard),
      },
    }),
    [keyboardVisible]
  );

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackNavigation
    );
    return () => backHandler.remove();
  }, [loading]);

  const handleBackNavigation = useCallback(() => {
    if (loading) {
      return true;
    }
    router.replace("/");
    return true;
  }, [loading, router]);

  const validateForm = useCallback(() => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleInputChange = useCallback(
    (field, value) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: null,
        }));
      }
    },
    [errors]
  );

  const fetchUserProfile = async (userEmail, userUid) => {
    try {
      const profileQuery = query(
        collection(db, "userprofile"),
        where("email", "==", userEmail.toLowerCase()),
        limit(1)
      );
      const querySnapshot = await getDocs(profileQuery);

      if (querySnapshot.empty) {
        throw new Error("Profile not found");
      }

      const userProfileDoc = querySnapshot.docs[0];
      const userProfileData = userProfileDoc.data();

      if (userProfileData.uid !== userUid) {
        throw new Error("Profile UID mismatch");
      }

      return userProfileData;
    } catch (error) {
      console.error("Profile fetch error:", error);
      throw error;
    }
  };

  const handleLogin = async () => {
    try {
      Keyboard.dismiss();

      if (!validateForm()) {
        return;
      }

      setLoading(true);
      const userEmail = formData.email.trim().toLowerCase();

      // Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(
        auth,
        userEmail,
        formData.password
      );
      const user = userCredential.user;

      // Fetch user profile
      const userProfileData = await fetchUserProfile(userEmail, user.uid);

      // Check account status
      if (userProfileData.status === "blocked") {
        await auth.signOut();
        Toast.show({
          type: "error",
          text1: "Account Blocked",
          text2: "Your account has been blocked. Please contact support.",
          visibilityTime: 3000,
        });
        return;
      }

      if (userProfileData.status === "pending") {
        await auth.signOut();
        Toast.show({
          type: "error",
          text1: "Account Pending",
          text2: "Your account is pending approval.",
          visibilityTime: 3000,
        });
        return;
      }

      // Store profile data
      await AsyncStorage.setItem(
        "userProfile",
        JSON.stringify(userProfileData)
      );

      // Show success message and redirect
      Toast.show({
        type: "success",
        text1: "Welcome Back! 👋",
        text2: `Good to see you again, ${userProfileData.name || ""}!`,
        visibilityTime: 2000,
      });

      // Emit auth status change
      EventRegister.emit("authStatusChanged", true);

      // Redirect based on role
      setTimeout(() => {
        switch (userProfileData.role) {
          case "supplier":
            router.replace("/supplier/SupplierScreen");
            break;
          case "customer":
            router.replace("/");
            break;
          case "delivery":
            router.replace("/delivery/DeliveryScreen");
            break;
          default:
            Toast.show({
              type: "error",
              text1: "Account Error",
              text2:
                "There was an issue with your account type. Please contact support.",
              visibilityTime: 3000,
            });
        }
      }, 500);
    } catch (error) {
      // Handle errors without logging Firebase errors
      let errorTitle = "Login Failed";
      let errorMessage = "";

      switch (error.code) {
        case "auth/invalid-email":
          errorMessage = "Invalid email address!";
          setErrors((prev) => ({ ...prev, email: "Invalid email format" }));
          break;
        case "auth/invalid-credential":
          errorMessage = "Invalid Login Credentials!";
          setErrors((prev) => ({ ...prev, password: "Incorrect password" }));
          break;
        case "auth/user-disabled":
          errorMessage = "This user has been disabled!";
          break;
        case "auth/user-not-found":
          errorMessage = "No user found with this email!";
          setErrors((prev) => ({ ...prev, email: "Account not found" }));
          break;
        case "auth/wrong-password":
          errorMessage = "Incorrect password!";
          setErrors((prev) => ({ ...prev, password: "Incorrect password" }));
          break;
        case "auth/too-many-requests":
          errorMessage =
            "Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later.";
          break;
        case "auth/network-request-failed":
          errorMessage =
            "Network error! Please check your internet connection.";
          break;
        default:
          errorMessage = "Something went wrong. Please try again!";
          break;
      }

      Toast.show({
        type: "error",
        text1: errorTitle,
        text2: errorMessage,
        visibilityTime: 3000,
      });

      // Clear password field on error
      setFormData((prev) => ({
        ...prev,
        password: "",
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" backgroundColor="#1E40AF" />

      {/* Fixed Header */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={["#1E40AF", "#3B82F6", "#60A5FA"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackNavigation}
            disabled={loading}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerText}>Welcome Back</Text>
            <Text style={styles.subHeaderText}>Sign in to continue</Text>
          </View>
        </LinearGradient>
      </View>

      {/* Main Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.mainContainer}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.formContainer}>
            {/* Email Input */}
            <View
              style={[styles.inputWrapper, errors.email && styles.inputError]}
            >
              <Ionicons
                name="mail-outline"
                size={20}
                color={errors.email ? "#DC2626" : "#6B7280"}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, errors.email && styles.inputTextError]}
                placeholder="Email"
                placeholderTextColor="#9CA3AF"
                value={formData.email}
                onChangeText={(text) => handleInputChange("email", text)}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
                returnKeyType="next"
              />
            </View>
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}

            {/* Password Input */}
            <View
              style={[
                styles.inputWrapper,
                errors.password && styles.inputError,
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={errors.password ? "#DC2626" : "#6B7280"}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, errors.password && styles.inputTextError]}
                placeholder="Password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={securePassword}
                value={formData.password}
                onChangeText={(text) => handleInputChange("password", text)}
                autoCapitalize="none"
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setSecurePassword(!securePassword)}
                disabled={loading}
              >
                <Ionicons
                  name={securePassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>
            {errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}

            {/* Forgot Password Link */}
            <View style={styles.forgotPasswordContainer}>
              <TouchableOpacity
                style={styles.forgotPasswordLink}
                onPress={() => router.push("/user/ForgotPassword")}
                disabled={loading}
              >
                <Ionicons name="key-outline" size={16} color="#1E40AF" />
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>

            {/* Register Link */}
            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => router.push("/user/RegisterUser")}
              disabled={loading}
            >
              <Text style={styles.registerText}>
                Don't have an account?{" "}
                <Text style={styles.registerLinkText}>Register</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
      <Toast />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  headerContainer: {
    backgroundColor: "transparent",
    zIndex: 1,
  },
  headerGradient: {
    //paddingTop: Platform.OS === "android"  ? 0 : 0,
    paddingBottom: 10,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 80,
  },
  mainContainer: {
    flex: 1,
    width: "100%",
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === "ios" ? 20 : 0,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTextContainer: {
    alignItems: "center",
    marginBottom: 10,
  },
  headerText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFF",
    marginBottom: 8,
  },
  subHeaderText: {
    fontSize: 16,
    color: "#BFDBFE",
    fontWeight: "400",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    marginBottom: 18,
    paddingHorizontal: 12,
    height: 54,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  inputError: {
    borderColor: "#DC2626",
    backgroundColor: "#FEF2F2",
  },
  inputTextError: {
    color: "#DC2626",
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
    height: "100%",
    paddingVertical: 8,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 12,
    marginBottom: 12,
    marginLeft: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  eyeIcon: {
    padding: 10,
  },
  forgotPasswordContainer: {
    alignItems: "flex-end",
    marginBottom: 24,
    marginTop: 8,
  },
  forgotPasswordLink: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  forgotPasswordText: {
    color: "#1E40AF",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 4,
  },
  loginButton: {
    backgroundColor: "#1E40AF",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#1E40AF",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "600",
  },
  registerLink: {
    marginTop: 24,
    alignItems: "center",
  },
  registerText: {
    fontSize: 16,
    color: "#6B7280",
  },
  registerLinkText: {
    color: "#1E40AF",
    fontWeight: "600",
  },
});

export default LoginPage;
