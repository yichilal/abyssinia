import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";

/**
 * Fetches the cart items for a specific user from Firestore.
 * @param {string} userId - The ID of the user whose cart items are to be fetched.
 * @returns {Array} - An array of cart items.
 */
export const getCart = async (userId) => {
  try {
    if (!userId) {
      throw new Error("User ID is required.");
    }

    const cartQuery = query(collection(db, "cart"), where("userId", "==", userId));
    const querySnapshot = await getDocs(cartQuery);

    const cartItems = [];
    querySnapshot.forEach((doc) => {
      cartItems.push({ id: doc.id, ...doc.data() });
    });

    return cartItems;
  } catch (error) {
    console.error("Error fetching cart:", error);
    return [];
  }
};