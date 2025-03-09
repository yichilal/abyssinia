import { arrayUnion, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";

// Function to add product to cart
const addToCart = async (userId, product) => {
  const cartRef = doc(db, "cart", userId);
  const cartSnap = await getDoc(cartRef);

  if (cartSnap.exists()) {
    await updateDoc(cartRef, {
      items: arrayUnion({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
      }),
    });
  } else {
    await setDoc(cartRef, {
      items: [
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
        },
      ],
    });
  }
};
