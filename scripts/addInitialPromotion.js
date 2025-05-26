import { initializeApp } from "firebase/app";
import { addDoc, collection, getFirestore } from "firebase/firestore";

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
const db = getFirestore(app);

const addInitialPromotions = async () => {
  try {
    const promotionsRef = collection(db, "promotions");

    // Add the image promotion
    await addDoc(promotionsRef, {
      type: "image",
      imageUrl:
        "https://res.cloudinary.com/dcrso99w7/image/upload/v1747939183/aljrnmhhkmpspjxmkh9k.jpg",
      createdAt: new Date("2025-05-22T18:39:41.000Z"),
    });

    // Add a text promotion
    await addDoc(promotionsRef, {
      type: "text",
      text: "Special Offer! Get 20% off on all products this week!",
      createdAt: new Date("2025-05-22T18:39:41.000Z"),
    });

    console.log("Initial promotions added successfully!");
  } catch (error) {
    console.error("Error adding initial promotions:", error);
  }
};

// Run the function
addInitialPromotions();
