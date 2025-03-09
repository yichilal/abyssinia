import { useNavigation, useRoute } from "@react-navigation/native";
import { Video } from "expo-av"; // Use expo-video instead of expo-av
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import Icon from "react-native-vector-icons/FontAwesome";
import { addToCart } from "../cart/AddToCart"; // Import the addToCart function
import { auth, db } from "../config/firebase"; // Adjust the path to your Firebase config

const ProductDetails = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { id } = route.params; // Get the product ID from navigation params
  const [product, setProduct] = useState(null); // State to store product data
  const [isVideoPlaying, setIsVideoPlaying] = useState(false); // State to control video playback
  const [loading, setLoading] = useState(true); // State to handle loading
  const [error, setError] = useState(null); // State to handle errors

  // Fetch product data when the component mounts
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const productRef = doc(db, "products", id); // Reference to the product document
        const productSnap = await getDoc(productRef); // Fetch the document

        if (productSnap.exists()) {
          setProduct({ id: productSnap.id, ...productSnap.data() }); // Set product data
        } else {
          setError("Product not found."); // Handle case where product doesn't exist
        }
      } catch (err) {
        console.error("Error fetching product:", err);
        setError("Failed to fetch product data."); // Handle errors
      } finally {
        setLoading(false); // Stop loading
      }
    };

    fetchProduct();
  }, [id]); // Re-fetch when the `id` changes

  // Handle "Add to Cart" button press
  const handleAddToCart = () => {
    const productId = product.id; // Get the product ID from the fetched product
    addToCart(productId); // Call the addToCart function
  };

  // Handle "Buy Now" button press
  const handleBuyNow = () => {
    const user = auth.currentUser; // Get the current user

    if (!user) {
      Toast.show({
        type: "error",
        text1: "Authentication Required",
        text2: "You must be logged in to proceed with the purchase.",
      });
      navigation.navigate("Login"); // Redirect to the login screen
    } else {
      // Proceed with the purchase
      console.log("Proceeding to checkout...");
      navigation.navigate("Checkout", { productId: product.id });
    }
  };

  // Show loading indicator while fetching data
  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  // Show error message if there's an error
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // Show message if product data is not available
  if (!product) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Product not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Product Images */}
      {product.images && product.images.length > 0 ? (
        <View style={styles.imageContainer}>
          {product.images.map((image, index) => (
            <Image
              key={index}
              source={{ uri: image }}
              style={styles.productImage}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.noImageText}>No images available</Text>
      )}

      {/* Product Details */}
      <View style={styles.detailsContainer}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productPrice}>${product.price}</Text>
        <Text style={styles.productCategory}>Category: {product.category}</Text>
        <Text style={styles.productDescription}>{product.description}</Text>
        <Text style={styles.productStock}>Stock: {product.stockQuantity}</Text>
      </View>

      {/* Video Section */}
      {product.video && (
        <View style={styles.videoContainer}>
          <Text style={styles.sectionHeader}>Product Video</Text>
          <View style={styles.videoWrapper}>
            <Video
              source={{ uri: product.video }} // Video URL from Firestore
              style={styles.videoPlayer}
              useNativeControls // Show native playback controls
              resizeMode="cover" // Adjust video sizing
              isLooping // Loop the video
              shouldPlay={isVideoPlaying} // Control playback
              onError={(error) => console.error("Video Error:", error)}
            />
            {!isVideoPlaying && (
              <TouchableOpacity
                style={styles.videoPlaceholder}
                onPress={() => setIsVideoPlaying(true)} // Start playing the video
              >
                <Icon name="play-circle" size={50} color="#007BFF" />
                <Text style={styles.videoText}>Play Video</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.addToCartButton}
          onPress={handleAddToCart} // Trigger addToCart function
        >
          <Text style={styles.buttonText}>Add to Cart</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.buyNowButton}
          onPress={handleBuyNow} // Trigger buyNow function
        >
          <Text style={styles.buttonText}>Buy Now</Text>
        </TouchableOpacity>
      </View>

      <Toast />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f8fa",
    padding: 16,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 18,
    color: "#ff0000",
    textAlign: "center",
    marginTop: 20,
  },
  noImageText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginVertical: 20,
  },
  imageContainer: {
    marginBottom: 20,
  },
  productImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 10,
  },
  detailsContainer: {
    marginBottom: 20,
  },
  productName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  productPrice: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#007BFF",
    marginBottom: 10,
  },
  productCategory: {
    fontSize: 16,
    color: "#666",
    marginBottom: 10,
  },
  productDescription: {
    fontSize: 16,
    color: "#444",
    marginBottom: 10,
  },
  productStock: {
    fontSize: 16,
    color: "#28a745",
    marginBottom: 10,
  },
  videoContainer: {
    marginBottom: 20,
    alignItems: "center",
  },
  videoWrapper: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  videoPlayer: {
    width: "100%",
    height: "100%",
  },
  videoPlaceholder: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  videoText: {
    fontSize: 16,
    color: "#007BFF",
    marginTop: 10,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  addToCartButton: {
    flex: 1,
    backgroundColor: "#007BFF",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginRight: 10,
  },
  buyNowButton: {
    flex: 1,
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default ProductDetails;