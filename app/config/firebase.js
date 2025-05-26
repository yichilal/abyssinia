// config/firebase.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import {
  enableMultiTabIndexedDbPersistence,
  initializeFirestore,
} from "firebase/firestore";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyApoJvJHwbUrXjAc0DYCO74WwPd9eDbJ1s",
  authDomain: "abyssiniagebeyapro.firebaseapp.com",
  databaseURL: "https://abyssiniagebeyapro-default-rtdb.firebaseio.com",
  projectId: "abyssiniagebeyapro",
  storageBucket: "abyssiniagebeyapro.appspot.com",
  messagingSenderId: "211802540278",
  appId: "1:211802540278:web:adab765e0dc734a5d984d7",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Initialize Firestore with settings for better offline support
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
  cacheSizeBytes: 100 * 1024 * 1024, // Increased to 100 MB for better offline support
});

// Enable offline persistence for Firestore with better error handling
if (Platform.OS !== "web") {
  try {
    enableMultiTabIndexedDbPersistence(db).catch((err) => {
      if (err.code === "failed-precondition") {
        console.warn("Firestore persistence has already been enabled.");
      } else if (err.code === "unimplemented") {
        console.warn("Device does not support persistence.");
      } else {
        console.error("Error enabling persistence:", err);
      }
    });
  } catch (error) {
    console.warn("Could not enable persistence:", error);
  }
}

// Add connection state listener
let isConnected = true;
const checkConnection = async () => {
  try {
    const response = await fetch("https://www.google.com");
    isConnected = response.status === 200;
  } catch (error) {
    isConnected = false;
  }
  return isConnected;
};

export { auth, checkConnection, db, isConnected };
export default app;
