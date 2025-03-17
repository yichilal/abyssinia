import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRoute } from "@react-navigation/native";
import { Video } from "expo-av";
import { router } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { auth, db } from "../config/firebase";

const ProductDetails = () => {
  const route = useRoute();
  const { id } = route.params;
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0); // Track the current media index
  const videoRef = useRef(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const productRef = doc(db, "products", id);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
          const productData = { id: productSnap.id, ...productSnap.data() };
          setProduct(productData);
        } else {
          setError("Product not found.");
        }
      } catch (err) {
        console.error("Error fetching product:", err);
        setError("Failed to fetch product data.");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleAddToCart = async () => {
    const user = auth.currentUser;

    if (!user) {
      router.push("user/LoginUser");
      Toast.show({
        type: "error",
        text1: "Authentication Required",
        text2: "You must log in or register to add items to your cart.",
      });
      return;
    }

    if (!product) return;

    const productDetails = {
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.images[0],
      quantity: quantity,
    };

    try {
      const cartString = await AsyncStorage.getItem("cart");
      const cart = cartString ? JSON.parse(cartString) : [];

      const existingItemIndex = cart.findIndex(
        (item) => item.id === product.id
      );

      if (existingItemIndex !== -1) {
        cart[existingItemIndex].quantity += quantity;
      } else {
        cart.push(productDetails);
      }

      await AsyncStorage.setItem("cart", JSON.stringify(cart));

      Toast.show({
        type: "success",
        text1: "Added to Cart",
        text2: "The product has been added to your cart.",
      });

      router.push("CartScreen");
    } catch (error) {
      console.error("Error saving to cart:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to add the product to your cart.",
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Product not found.</Text>
      </View>
    );
  }

  // Combine video and images into a single array for the media slider
  const mediaArray = product.video
    ? [product.video, ...product.images]
    : [...product.images];

  const renderMediaItem = ({ item, index }) => {
    const isVideo = index === 0 && product.video; // First item is video if it exists
    return (
      <TouchableOpacity
        onPress={() => setCurrentMediaIndex(index)}
        style={[
          styles.thumbnail,
          currentMediaIndex === index && styles.selectedThumbnail,
        ]}
      >
        {isVideo ? (
          <Video
            source={{ uri: item }}
            style={styles.thumbnailMedia}
            resizeMode="cover"
            shouldPlay={false}
            isMuted
          />
        ) : (
          <Image source={{ uri: item }} style={styles.thumbnailMedia} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Main Media Section (Video or Image) */}
      <View style={styles.mediaContainer}>
        {mediaArray[currentMediaIndex] ? (
          currentMediaIndex === 0 && product.video ? (
            <Video
              ref={videoRef}
              source={{ uri: mediaArray[currentMediaIndex] }}
              style={styles.media}
              useNativeControls
              resizeMode="contain"
              isLooping
            />
          ) : (
            <Image
              source={{ uri: mediaArray[currentMediaIndex] }}
              style={styles.media}
            />
          )
        ) : (
          <Text style={styles.noMediaText}>No media available</Text>
        )}
      </View>

      {/* Horizontal Thumbnail Slider */}
      <FlatList
        horizontal
        data={mediaArray}
        renderItem={renderMediaItem}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.thumbnailContainer}
        showsHorizontalScrollIndicator={false}
      />

      {/* Product Details */}
      <View style={styles.detailsContainer}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productPrice}>${product.price}</Text>
        <Text style={styles.productCategory}>Category: {product.category}</Text>
        <Text style={styles.productDescription}>{product.description}</Text>
        <Text style={styles.productStock}>Stock: {product.stockQuantity}</Text>
      </View>

      {/* Quantity Selector */}
      <View style={styles.quantityContainer}>
        <Text style={styles.quantityLabel}>Quantity:</Text>
        <View style={styles.quantitySelector}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => setQuantity(quantity > 1 ? quantity - 1 : 1)}
          >
            <Text style={styles.quantityButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.quantityText}>{quantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() =>
              setQuantity(
                quantity < product.stockQuantity ? quantity + 1 : quantity
              )
            }
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.addToCartButton}
          onPress={handleAddToCart}
        >
          <Text style={styles.buttonText}>Add to Cart</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.buyNowButton}
          onPress={() => router.push("cartscreen")}
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
  noMediaText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginVertical: 20,
  },
  mediaContainer: {
    marginBottom: 20,
  },
  media: {
    width: "100%",
    height: 300,
    borderRadius: 12,
  },
  thumbnailContainer: {
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedThumbnail: {
    borderColor: "#007BFF",
  },
  thumbnailMedia: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
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
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  quantityLabel: {
    fontSize: 16,
    color: "#333",
  },
  quantitySelector: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#007BFF",
    borderRadius: 8,
    padding: 5,
  },
  quantityButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
  },
  quantityButtonText: {
    fontSize: 20,
    color: "#007BFF",
  },
  quantityText: {
    fontSize: 18,
    marginHorizontal: 10,
    color: "#333",
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
