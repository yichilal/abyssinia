import { useRouter } from "expo-router"; // For navigation
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { auth, db } from "../config/firebase"; // Adjust the path to your Firebase config

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); // State to handle loading
  const router = useRouter(); // Initialize the router

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Please fill in all fields.",
      });
      return;
    }

    if (!validateEmail(email)) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Please enter a valid email address.",
      });
      return;
    }

    setLoading(true); // Start loading

    try {
      // Sign in the user with email and password
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      console.log("User UID:", user.uid); // Debugging: Log the UID

      // Fetch the user's role from the userprofile collection
      const userprofileDoc = await getDoc(doc(db, "userprofile", user.uid));

      if (!userprofileDoc.exists()) {
        throw new Error("User profile not found.");
      }

      const userRole = userprofileDoc.data().role; // Get the user's role

      console.log("User Role:", userRole); // Debugging: Log the role

      // Redirect based on the user's role
      redirectUserBasedOnRole(userRole);

      Toast.show({
        type: "success",
        text1: "Login Successful",
        text2: `Welcome, ${userRole}!`,
      });
    } catch (error) {
      console.error("Login Error:", error);
      Toast.show({
        type: "error",
        text1: "Login Failed",
        text2: error.message || "An error occurred during login.",
      });
    } finally {
      setLoading(false); // Stop loading
    }
  };

  const redirectUserBasedOnRole = (role) => {
    switch (role) {
      case "supplier":
        router.push("/supplier/SupplierScreen"); // Redirect to supplier dashboard
        break;
      case "customer":
        router.push("index"); // Redirect to customer dashboard
        break;
      case "delivery":
        router.push("/delivery/DeliveryScreen"); // Redirect to delivery dashboard
        break;
      default:
        throw new Error("Invalid user role.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!loading}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
        editable={!loading}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading} // Disable the button when loading
      >
        {loading ? (
          <ActivityIndicator color="#fff" /> // Show a loading indicator
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("Register")}
        disabled={loading}
      >
        <Text style={styles.link}>Don't have an account? Register</Text>
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

export default LoginPage;
