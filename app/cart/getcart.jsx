import { getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
export const getCart = async (userId) => {
  try {
    const cartRef = doc(db, "cart", userId);
    const cartSnap = await getDoc(cartRef);

    if (cartSnap.exists()) {
      return cartSnap.data().items || [];
    } else {
      return [];
    }
  } catch (error) {
    console.error("Error getting cart:", error);
    return [];
  }
};
