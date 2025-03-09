import * as Google from "expo-auth-session/providers/google";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth"; // Correct Firebase imports
import { doc, setDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Button, Text, View } from "react-native";
import { auth, db } from "../config/firebase"; // Ensure correct Firebase config import

WebBrowser.maybeCompleteAuthSession();

const SignIn = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: "624362947041-rhgcgld43882rq7vp1os3shvd28j22bp.apps.googleusercontent.com", // Replace with your Google Client ID
    redirectUri: "https://auth.expo.io/@yichilal/my-app", // Match Google Cloud Console settings
  });

  useEffect(() => {
    const handleSignIn = async () => {
      if (response?.type === "success") {
        setIsLoading(true);
        try {
          const { id_token } = response.params;

          // Create Google credential
          const credential = GoogleAuthProvider.credential(id_token);

          // Sign in with Firebase
          const result = await signInWithCredential(auth, credential);
          const user = result.user;

          // Store user data in Firestore
          const userRef = doc(db, "users", user.uid);
          await setDoc(userRef, {
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            createdAt: new Date(),
          });

          console.log("User data saved to Firestore");
          alert(`Welcome, ${user.displayName}!`);

          // Navigate to home page
          router.replace("/index");
        } catch (error) {
          console.error("Error during Google Sign-In:", error.message);
          alert(`Error: ${error.message}`);
        } finally {
          setIsLoading(false);
        }
      }
    };

    handleSignIn(); // Call the async function
  }, [response]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Google Sign-In</Text>
      {isLoading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <Button
          title="Sign in with Google"
          onPress={() => promptAsync()}
          disabled={!request || isLoading}
        />
      )}
    </View>
  );
};

export default SignIn;
