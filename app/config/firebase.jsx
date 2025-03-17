// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyApoJvJHwbUrXjAc0DYCO74WwPd9eDbJ1s",
  authDomain: "abyssiniagebeyapro.firebaseapp.com",
  projectId: "abyssiniagebeyapro",
  storageBucket: "abyssiniagebeyapro.appspot.com",
  messagingSenderId: "211802540278",
  appId: "1:211802540278:web:adab765e0dc734a5d984d7",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // Initialize Firestore
const googleProvider = new GoogleAuthProvider();

export { auth, db, googleProvider }; // Export auth, db, and googleProvider
//624362947041-boutiuidoncd47t2bhsg7rss5u4eg4pp.apps.googleusercontent.com
