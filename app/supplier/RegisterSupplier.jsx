import { useFocusEffect } from "@react-navigation/native";
import CheckBox from "expo-checkbox";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import Toast from "react-native-toast-message";
import Icon from "react-native-vector-icons/MaterialIcons";
import { auth, db } from "../config/firebase";

// --- Cloudinary Configuration ---
const CLOUDINARY_UPLOAD_PRESET = "supplier";
const CLOUDINARY_CLOUD_NAME = "dcrso99w7";
const CLOUDINARY_FOLDER = "samples/ecommerce";

// Password strength requirements
const requirements = [
  { re: /[0-9]/, label: "Include at least one number", id: "numbers" },
  {
    re: /[a-z]/,
    label: "Include at least one lowercase letter",
    id: "lowercase",
  },
  {
    re: /[A-Z]/,
    label: "Include at least one uppercase letter",
    id: "uppercase",
  },
  {
    re: /[$&+,:;=?@#|'<>.^*()%!-]/,
    label: "Include at least one special symbol",
    id: "special",
  },
  { re: /.{8,}/, label: "At least 8 characters long", id: "length" },
];

const getStrength = (password) => {
  let multiplier = password.length > 5 ? 0 : 1;
  requirements.forEach((requirement) => {
    if (!requirement.re.test(password)) multiplier += 1;
  });
  return Math.max(100 - (100 / (requirements.length + 1)) * multiplier, 0);
};

// Add this helper function after the requirements constant
const validatePhoneNumber = (phone) => {
  // Remove any whitespace
  const cleanPhone = phone.replace(/\s+/g, "");

  // Patterns for Ethiopian phone numbers
  const patterns = {
    mobile09: /^09\d{8}$/, // 09xxxxxxxx format
    mobile251: /^\+251\d{9}$/, // +251xxxxxxxxx format
    mobile07: /^07\d{8}$/, // 07xxxxxxxx format
  };

  // Check if the number matches any of the patterns
  return (
    patterns.mobile09.test(cleanPhone) ||
    patterns.mobile251.test(cleanPhone) ||
    patterns.mobile07.test(cleanPhone)
  );
};

const formatPhoneNumber = (phone) => {
  // Remove any whitespace and non-digit characters except '+'
  const cleaned = phone.replace(/[^\d+]/g, "");

  // If starts with 07 or 09, keep as is
  if (cleaned.startsWith("07") || cleaned.startsWith("09")) {
    return cleaned;
  }

  // If it's a full number without +251, add it
  if (cleaned.length === 9 && !cleaned.startsWith("+")) {
    return `+251${cleaned}`;
  }

  return cleaned;
};

// Add this component after the requirements array
const PasswordStrengthIndicator = ({ password }) => {
  const checks = requirements.map((requirement) => ({
    ...requirement,
    isMet: requirement.re.test(password),
  }));

  const strength = password
    ? (checks.filter((check) => check.isMet).length / checks.length) * 100
    : 0;

  return (
    <View style={styles.passwordStrengthContainer}>
      <View style={styles.strengthBar}>
        <View
          style={[
            styles.strengthFill,
            {
              width: `${strength}%`,
              backgroundColor:
                strength < 30
                  ? "#EF4444"
                  : strength < 60
                  ? "#F59E0B"
                  : strength < 100
                  ? "#3B82F6"
                  : "#10B981",
            },
          ]}
        />
      </View>
      <View style={styles.requirementsList}>
        {checks.map((requirement, index) => (
          <View key={requirement.id} style={styles.requirementItem}>
            <Icon
              name={
                requirement.isMet ? "check-circle" : "radio-button-unchecked"
              }
              size={16}
              color={requirement.isMet ? "#10B981" : "#9CA3AF"}
            />
            <Text
              style={[
                styles.requirementText,
                requirement.isMet && styles.requirementMetText,
              ]}
            >
              {requirement.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// --- Component Definition ---
const RegisterSupplier = () => {
  // --- State Variables ---
  const [fName, setFname] = useState("");
  const [lName, setLname] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tradeType, setTradeType] = useState("");
  const [address, setAddress] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [tradeLicense, setTradeLicense] = useState(null);
  const [profilePicture, setProfilePicture] = useState(null);
  const [isChecked, setIsChecked] = useState(false);
  const [status] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [role] = useState("supplier");
  const [fadeAnim] = useState(new Animated.Value(0));
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();

  // Add animation effect
  useFocusEffect(
    useCallback(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    }, [])
  );

  // --- Helper Functions ---

  // Upload file to Cloudinary
  const uploadToCloudinary = async (fileUri, fileType = "image") => {
    setLoading(true);
    try {
      const formData = new FormData();
      const isPdf = fileType === "pdf";
      const mimeType = isPdf ? "application/pdf" : "image/jpeg";
      const extension = isPdf ? "pdf" : "jpg";
      const uploadType = isPdf ? "raw" : "image";

      formData.append("file", {
        uri: fileUri,
        type: mimeType,
        name: `${fileType}_${Date.now()}.${extension}`,
      });
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      formData.append("folder", CLOUDINARY_FOLDER);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${uploadType}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const responseJson = await response.json();
      if (response.ok && responseJson.secure_url) {
        console.log(`Uploaded ${fileType} to: ${responseJson.secure_url}`);
        Toast.show({
          type: "success",
          text1: "Upload Success",
          text2: `${
            fileType === "profile" ? "Profile Picture" : "Trade License"
          } uploaded successfully!`,
        });
        return responseJson.secure_url;
      } else {
        throw new Error(
          responseJson.error?.message || "Cloudinary upload failed"
        );
      }
    } catch (error) {
      console.error(`Cloudinary ${fileType} Upload Error:`, error);
      Toast.show({
        type: "error",
        text1: "Upload Error",
        text2: `Failed to upload ${
          fileType === "profile" ? "profile picture" : "trade license"
        }. Please try again.`,
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Pick file (image or PDF)
  const pickFile = async (setFile, type) => {
    try {
      if (type === "pdf") {
        // For trade license, use document picker
        const result = await DocumentPicker.getDocumentAsync({
          type: [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ],
          copyToCacheDirectory: true,
        });

        if (result.canceled === false) {
          const selectedAsset = result.assets[0];
          const fileExtension = selectedAsset.name
            .split(".")
            .pop()
            .toLowerCase();
          const allowedExtensions = ["pdf", "doc", "docx"];

          if (!allowedExtensions.includes(fileExtension)) {
            Toast.show({
              type: "error",
              text1: "Invalid File Type",
              text2:
                "Please select a PDF or Word document for the trade license.",
            });
            return;
          }

          setLoading(true);
          const uploadUrl = await uploadToCloudinary(selectedAsset.uri, "pdf");
          if (uploadUrl) {
            setFile(uploadUrl);
          }
        }
      } else {
        // For profile picture, use image picker
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Toast.show({
            type: "error",
            text1: "Permission Denied",
            text2: "Media access is required to upload files!",
          });
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

        if (!result.canceled && result.assets?.length > 0) {
          const selectedAsset = result.assets[0];
          setLoading(true);
          const uploadUrl = await uploadToCloudinary(
            selectedAsset.uri,
            "image"
          );
          if (uploadUrl) {
            setFile(uploadUrl);
          }
        }
      }
    } catch (error) {
      console.error(`File Picker Error (${type}):`, error);
      Toast.show({
        type: "error",
        text1: "Error Picking File",
        text2: `Could not select ${
          type === "pdf" ? "trade license" : "profile picture"
        }. Please try again.`,
      });
    }
  };

  const handleMapPress = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
  };

  const confirmLocation = () => {
    if (selectedLocation) {
      setShowMap(false);
      Toast.show({
        type: "success",
        text1: "Location Set",
        text2: "Supplier location updated successfully!",
      });
    } else {
      Toast.show({
        type: "error",
        text1: "Location Required",
        text2: "Please select a location on the map.",
      });
    }
  };

  // Validate inputs before submitting
  const validateInputs = () => {
    if (
      !/^[a-zA-Z]{2,}$/.test(fName.trim()) ||
      !/^[a-zA-Z]{2,}$/.test(lName.trim())
    ) {
      Toast.show({
        type: "error",
        text1: "Invalid Name",
        text2: "Names must be at least 2 letters.",
      });
      return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      Toast.show({
        type: "error",
        text1: "Invalid Email",
        text2: "Please enter a valid email address.",
      });
      return false;
    }
    if (!validatePhoneNumber(phoneNumber.trim())) {
      Toast.show({
        type: "error",
        text1: "Invalid Phone Number",
        text2:
          "Please enter a valid Ethiopian phone number (09xxxxxxxx, +251xxxxxxxxx, or 07xxxxxxxx).",
      });
      return false;
    }
    if (password !== confirmPassword) {
      Toast.show({
        type: "error",
        text1: "Password Mismatch",
        text2: "Passwords do not match.",
      });
      return false;
    }
    if (getStrength(password) < 80) {
      Toast.show({
        type: "error",
        text1: "Weak Password",
        text2: "Password must meet all strength requirements.",
      });
      return false;
    }
    if (!tradeType.trim()) {
      Toast.show({
        type: "error",
        text1: "Invalid Trade Type",
        text2: "Please specify your trade type.",
      });
      return false;
    }
    if (!address.trim()) {
      Toast.show({
        type: "error",
        text1: "Invalid Address",
        text2: "Please enter a valid address.",
      });
      return false;
    }
    if (!selectedLocation) {
      Toast.show({
        type: "error",
        text1: "Location Required",
        text2: "Please select a location on the map.",
      });
      return false;
    }
    if (!profilePicture) {
      Toast.show({
        type: "error",
        text1: "Profile Picture Required",
        text2: "Please upload a profile picture.",
      });
      return false;
    }
    if (!tradeLicense) {
      Toast.show({
        type: "error",
        text1: "Trade License Required",
        text2: "Please upload your trade license (PDF).",
      });
      return false;
    }
    if (!isChecked) {
      Toast.show({
        type: "error",
        text1: "Terms Not Accepted",
        text2: "You must agree to the Terms & Conditions.",
      });
      return false;
    }
    return true;
  };

  // Handle user registration
  const createUser = async () => {
    if (!validateInputs()) {
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      const user = userCredential.user;

      // Save to userprofile collection
      const userProfileData = {
        uid: user.uid,
        fName: fName.trim(),
        lName: lName.trim(),
        email: user.email,
        phoneNumber: phoneNumber.trim(),
        profilePicture,
        role: "supplier",
        status: "pending",
        createdAt: new Date().toISOString(),
        // Supplier-specific data
        tradeType: tradeType.trim(),
        address: address.trim(),
        supplierLocation: {
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
        },
        tradeLicense,
      };

      await setDoc(doc(db, "userprofile", user.uid), userProfileData);
      console.log(
        `Profile saved for UID: ${user.uid} in userprofile collection`
      );

      Toast.show({
        type: "success",
        text1: "Registration Successful!",
        text2: "Your supplier account is created and pending approval.",
        visibilityTime: 4000,
      });

      setTimeout(() => {
        router.push("/user/LoginPage");
      }, 2500);
    } catch (error) {
      console.error("Registration Error:", error);
      let errorMessage = error.message;
      if (error.code === "auth/email-already-in-use") {
        errorMessage =
          "This email address is already registered. Please log in or use a different email.";
      } else if (error.code === "auth/weak-password") {
        errorMessage =
          "The password is too weak. Please choose a stronger password.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "The email address format is invalid.";
      }
      Toast.show({
        type: "error",
        text1: "Registration Failed",
        text2: errorMessage || "An unknown error occurred.",
        visibilityTime: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[...Array(totalSteps)].map((_, index) => (
        <View key={index} style={styles.stepContainer}>
          <View
            style={[
              styles.stepDot,
              currentStep >= index + 1 && styles.stepDotActive,
            ]}
          >
            <Text
              style={[
                styles.stepNumber,
                currentStep >= index + 1 && styles.stepNumberActive,
              ]}
            >
              {index + 1}
            </Text>
          </View>
          {index < totalSteps - 1 && (
            <View
              style={[
                styles.stepLine,
                currentStep > index + 1 && styles.stepLineActive,
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderStepTitle = () => {
    const titles = ["Basic Information", "Business Details", "Verification"];
    return <Text style={styles.stepTitle}>{titles[currentStep - 1]}</Text>;
  };

  // --- Render JSX ---
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContentContainer}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={["#1E40AF", "#3B82F6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Become a Supplier</Text>
          <Text style={styles.headerSubtitle}>
            Join our growing marketplace
          </Text>
        </View>
      </LinearGradient>

      <Animated.View style={[styles.formWrapper, { opacity: fadeAnim }]}>
        {renderStepIndicator()}
        {renderStepTitle()}

        <View style={styles.formContainer}>
          {currentStep === 1 && (
            <>
              <View style={styles.imageUploadSection}>
                <TouchableOpacity
                  style={styles.imagePicker}
                  onPress={() => pickFile(setProfilePicture, "profile")}
                  disabled={loading}
                >
                  {profilePicture ? (
                    <Image
                      source={{ uri: profilePicture }}
                      style={styles.imagePreview}
                    />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <LinearGradient
                        colors={["#E2E8F0", "#CBD5E1"]}
                        style={styles.gradientPlaceholder}
                      >
                        <Icon name="add-a-photo" size={40} color="#94A3B8" />
                      </LinearGradient>
                    </View>
                  )}
                  {loading && (
                    <View style={styles.imageLoadingOverlay}>
                      <ActivityIndicator size="large" color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
                <Text style={styles.imageLabel}>Profile Picture *</Text>
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputContainer, styles.inputHalf]}>
                  <Icon name="person" size={20} color="#6B7280" />
                  <TextInput
                    style={styles.input}
                    placeholder="First Name *"
                    value={fName}
                    onChangeText={setFname}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={[styles.inputContainer, styles.inputHalf]}>
                  <Icon name="person-outline" size={20} color="#6B7280" />
                  <TextInput
                    style={styles.input}
                    placeholder="Last Name *"
                    value={lName}
                    onChangeText={setLname}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Icon name="email" size={20} color="#6B7280" />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address *"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputContainer}>
                <Icon name="phone" size={20} color="#6B7280" />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number (09xxxxxxxx, +251xxxxxxxxx, 07xxxxxxxx) *"
                  value={phoneNumber}
                  onChangeText={(text) => {
                    const formattedNumber = formatPhoneNumber(text);
                    setPhoneNumber(formattedNumber);
                  }}
                  keyboardType="phone-pad"
                  placeholderTextColor="#9CA3AF"
                  maxLength={13} // Maximum length for +251 format
                />
              </View>
            </>
          )}

          {currentStep === 2 && (
            <>
              <View style={styles.inputContainer}>
                <Icon name="business" size={20} color="#6B7280" />
                <TextInput
                  style={styles.input}
                  placeholder="Business Type *"
                  value={tradeType}
                  onChangeText={setTradeType}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputContainer}>
                <Icon name="location-city" size={20} color="#6B7280" />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Business Address *"
                  value={address}
                  onChangeText={setAddress}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <TouchableOpacity
                style={styles.mapButton}
                onPress={() => setShowMap(true)}
              >
                <LinearGradient
                  colors={["#10B981", "#059669"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradientButton}
                >
                  <Icon name="map" size={24} color="#FFFFFF" />
                  <Text style={styles.buttonText}>
                    {selectedLocation ? "Change Location" : "Select Location"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {selectedLocation && (
                <View style={styles.locationCard}>
                  <Text style={styles.locationTitle}>Selected Location</Text>
                  <View style={styles.coordinatesContainer}>
                    <View style={styles.coordinateItem}>
                      <Text style={styles.coordinateLabel}>Latitude</Text>
                      <Text style={styles.coordinateValue}>
                        {selectedLocation.latitude.toFixed(6)}
                      </Text>
                    </View>
                    <View style={styles.coordinateItem}>
                      <Text style={styles.coordinateLabel}>Longitude</Text>
                      <Text style={styles.coordinateValue}>
                        {selectedLocation.longitude.toFixed(6)}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </>
          )}

          {currentStep === 3 && (
            <>
              <View style={styles.passwordSection}>
                <View style={styles.inputContainer}>
                  <Icon name="lock" size={20} color="#6B7280" />
                  <TextInput
                    style={[
                      styles.input,
                      password &&
                        getStrength(password) === 100 &&
                        styles.validInput,
                    ]}
                    placeholder="Password *"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    placeholderTextColor="#9CA3AF"
                  />
                  {password && (
                    <TouchableOpacity
                      style={styles.passwordToggle}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Icon
                        name={showPassword ? "visibility-off" : "visibility"}
                        size={20}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                  )}
                </View>

                {password && <PasswordStrengthIndicator password={password} />}

                <View style={styles.inputContainer}>
                  <Icon name="lock-outline" size={20} color="#6B7280" />
                  <TextInput
                    style={[
                      styles.input,
                      confirmPassword &&
                        password === confirmPassword &&
                        styles.validInput,
                    ]}
                    placeholder="Confirm Password *"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => pickFile(setTradeLicense, "pdf")}
              >
                <LinearGradient
                  colors={["#6366F1", "#4F46E5"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradientButton}
                >
                  <Icon
                    name={tradeLicense ? "check-circle" : "upload-file"}
                    size={24}
                    color="#FFFFFF"
                  />
                  <Text style={styles.buttonText}>
                    {tradeLicense
                      ? "License Uploaded - Tap to Change"
                      : "Upload Trade License"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.termsContainer}>
                <CheckBox
                  value={isChecked}
                  onValueChange={setIsChecked}
                  style={styles.checkbox}
                  color={isChecked ? "#059669" : undefined}
                />
                <Text style={styles.termsText}>
                  I agree to the{" "}
                  <Text
                    style={styles.termsLink}
                    onPress={() => router.push("/supplier/TermsAndConditions")}
                  >
                    Terms & Conditions
                  </Text>
                </Text>
              </View>
            </>
          )}

          <View style={styles.navigationButtons}>
            {currentStep > 1 && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setCurrentStep((prev) => prev - 1)}
              >
                <Text style={styles.backButtonText}>Previous</Text>
              </TouchableOpacity>
            )}

            {currentStep < totalSteps ? (
              <TouchableOpacity
                style={styles.nextButton}
                onPress={() => setCurrentStep((prev) => prev + 1)}
              >
                <Text style={styles.nextButtonText}>Next</Text>
                <Icon name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.registerButton,
                  !isChecked && styles.registerButtonDisabled,
                ]}
                onPress={createUser}
                disabled={!isChecked || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.registerButtonText}>Register Now</Text>
                    <Icon name="how-to-reg" size={24} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Add auth links */}
          <View style={styles.authLinksContainer}>
            <Text style={styles.authText}>Already have an account?</Text>
            <View style={styles.authLinksRow}>
              <TouchableOpacity onPress={() => router.push("/user/LoginPage")}>
                <Text style={styles.authLink}>Login</Text>
              </TouchableOpacity>
              <Text style={styles.authLinkDivider}>|</Text>
              <TouchableOpacity
                onPress={() => router.push("/user/ForgotPassword")}
              >
                <Text style={styles.authLink}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>

      <Modal
        visible={showMap}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowMap(false)}
      >
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={["#1E40AF", "#3B82F6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalHeader}
          >
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowMap(false)}
            >
              <Icon name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Business Location</Text>
            <TouchableOpacity
              style={styles.modalConfirmButton}
              onPress={confirmLocation}
            >
              <Text style={styles.modalConfirmText}>Confirm</Text>
            </TouchableOpacity>
          </LinearGradient>

          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={{
              latitude: 9.145,
              longitude: 40.4897,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
            onPress={handleMapPress}
          >
            {selectedLocation && (
              <Marker
                coordinate={{
                  latitude: selectedLocation.latitude,
                  longitude: selectedLocation.longitude,
                }}
              />
            )}
          </MapView>
        </View>
      </Modal>

      <Toast />
    </ScrollView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContentContainer: {
    paddingBottom: 40,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#E0E7FF",
    opacity: 0.9,
  },
  formWrapper: {
    marginTop: -20,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  stepContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  stepDotActive: {
    backgroundColor: "#1E40AF",
  },
  stepNumber: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "600",
  },
  stepNumberActive: {
    color: "#FFFFFF",
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: "#1E40AF",
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 24,
  },
  imageUploadSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  imagePicker: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
  },
  gradientPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  inputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 56,
  },
  inputHalf: {
    width: "48%",
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#1F2937",
  },
  mapButton: {
    marginBottom: 16,
  },
  gradientButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  locationCard: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  coordinatesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  coordinateItem: {
    flex: 1,
  },
  coordinateLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  coordinateValue: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "500",
  },
  passwordSection: {
    marginBottom: 16,
  },
  termsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  checkbox: {
    marginRight: 12,
  },
  termsText: {
    fontSize: 14,
    color: "#4B5563",
    flex: 1,
  },
  termsLink: {
    color: "#1E40AF",
    fontWeight: "600",
  },
  navigationButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  backButtonText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "600",
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E40AF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  registerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#059669",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    flex: 1,
    marginLeft: 16,
  },
  registerButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  registerButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    marginRight: 8,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  modalConfirmButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalConfirmText: {
    color: "#1E40AF",
    fontSize: 16,
    fontWeight: "600",
  },
  map: {
    flex: 1,
  },
  passwordStrengthContainer: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  strengthBar: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    marginBottom: 16,
    overflow: "hidden",
  },
  strengthFill: {
    height: "100%",
    borderRadius: 2,
    transition: "width 0.3s ease",
  },
  requirementsList: {
    gap: 8,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  requirementText: {
    fontSize: 12,
    color: "#6B7280",
  },
  requirementMetText: {
    color: "#10B981",
    fontWeight: "500",
  },
  validInput: {
    borderColor: "#10B981",
    backgroundColor: "#F0FDF4",
  },
  passwordToggle: {
    padding: 8,
  },
  authLinksContainer: {
    marginTop: 24,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 24,
  },
  authText: {
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
  },
  authLink: {
    color: "#1E40AF",
    fontWeight: "600",
    marginLeft: 4,
  },
  authLinksRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  authLinkDivider: {
    color: "#9CA3AF",
    marginHorizontal: 8,
  },
});

export default RegisterSupplier;
