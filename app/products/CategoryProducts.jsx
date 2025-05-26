import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { EventRegister } from "react-native-event-listeners";
import Toast from "react-native-toast-message";
import Icon from "react-native-vector-icons/FontAwesome";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import LoadingDots from "../../components/LoadingDots"; // Assuming LoadingDots is in components folder
import { db } from "../config/firebase";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.45 - 20; // Adjusted for 2 columns with spacing

const CategoryProducts = () => {
  const { category } = useLocalSearchParams();
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [likedProducts, setLikedProducts] = useState([]);

  // Load liked products from AsyncStorage
  useEffect(() => {
    const loadLikedProducts = async () => {
      try {
        const storedLikes = await AsyncStorage.getItem("likedProducts");
        if (storedLikes) {
          setLikedProducts(JSON.parse(storedLikes));
        }
      } catch (error) {
        console.error("Failed to load liked products:", error);
      }
    };
    loadLikedProducts();
  }, []);

  const fetchProducts = useCallback(() => {
    setRefreshing(true);
    const q = query(
      collection(db, "products"),
      where("category", "==", category),
      where("status", "==", "verified") // Only fetch verified products
    );

    const unsubscribe = onSnapshot(
      q,
      async (querySnapshot) => {
        try {
          if (querySnapshot.empty) {
            setProducts([]);
            setLoading(false);
            setRefreshing(false);
            return;
          }

          const productPromises = querySnapshot.docs.map(async (productDoc) => {
            const productData = {
              id: productDoc.id,
              ...productDoc.data(),
            };

            // Skip if status is not 'verified' - redundant check but good for safety
            if (productData.status !== "verified") return null;

            try {
              const variantsRef = collection(
                db,
                "products",
                productDoc.id,
                "variants"
              );
              const variantsSnapshot = await new Promise((resolve, reject) => {
                getDocs(variantsRef).then(resolve).catch(reject);
              });

              const variants = variantsSnapshot.docs.map((variantDoc) => ({
                id: variantDoc.id,
                ...variantDoc.data(),
              }));

              return {
                ...productData,
                variants: variants || [],
                price:
                  variants.length > 0
                    ? Math.min(...variants.map((v) => v.price || 0))
                    : productData.price || 0,
                images:
                  productData.images ||
                  (productData.image ? [productData.image] : []),
                category: productData.category || category,
                status: productData.status,
                isNew: productData.isNew || false, // Add isNew flag
                selectedVariant:
                  variants.find((v) => v.stock > 0) || variants[0] || null,
                imageUrl:
                  (variants.find((v) => v.stock > 0) || variants[0] || {})
                    .image ||
                  productData.images?.[0] ||
                  "https://via.placeholder.com/150",
              };
            } catch (variantError) {
              console.error(
                `Error fetching variants for product ${productDoc.id}:`,
                variantError
              );
              return {
                ...productData,
                variants: [],
                price: productData.price || 0,
                images:
                  productData.images ||
                  (productData.image ? [productData.image] : []),
                category: productData.category || category,
                status: productData.status,
                isNew: productData.isNew || false, // Add isNew flag
                imageUrl:
                  productData.images?.[0] || "https://via.placeholder.com/150",
              };
            }
          });

          const productsList = (await Promise.all(productPromises)).filter(
            Boolean
          ); // Filter out nulls
          setProducts(productsList);
          setLoading(false);
          setRefreshing(false);
        } catch (error) {
          console.error("Error processing products:", error);
          setProducts([]);
          setLoading(false);
          setRefreshing(false);
        }
      },
      (error) => {
        console.error("Firestore subscription error:", error);
        setLoading(false);
        setRefreshing(false);
      }
    );

    return unsubscribe;
  }, [category]);

  useEffect(() => {
    const unsubscribe = fetchProducts();
    return () => unsubscribe();
  }, [fetchProducts]);

  const onRefresh = useCallback(() => {
    fetchProducts();
  }, [fetchProducts]);

  const toggleLike = async (productId) => {
    const newLikedProducts = likedProducts.includes(productId)
      ? likedProducts.filter((id) => id !== productId)
      : [...likedProducts, productId];
    setLikedProducts(newLikedProducts);
    try {
      await AsyncStorage.setItem(
        "likedProducts",
        JSON.stringify(newLikedProducts)
      );
      Toast.show({
        type: "success",
        text1: newLikedProducts.includes(productId)
          ? "Added to Favorites"
          : "Removed from Favorites",
      });
    } catch (error) {
      console.error("Failed to save liked product:", error);
      Toast.show({ type: "error", text1: "Error updating favorites" });
      setLikedProducts(likedProducts);
    }
  };

  const handleAddToCart = async (product) => {
    if (!product.variants || product.variants.length === 0) {
      Toast.show({
        type: "error",
        text1: "No Variants",
        text2: "This product has no variants available.",
      });
      return;
    }

    const selectedVariant =
      product.variants.find((v) => v.stock > 0) || product.variants[0];

    if (!selectedVariant || selectedVariant.stock <= 0) {
      Toast.show({
        type: "error",
        text1: "Out of Stock",
        text2: "This product is currently unavailable.",
      });
      return;
    }

    const cartItem = {
      id: `${product.id}_${selectedVariant.id}`,
      productId: product.id,
      variantId: selectedVariant.id,
      name: product.name,
      price: selectedVariant.price || 0,
      imageUrl:
        selectedVariant.image ||
        product.images?.[0] ||
        "https://via.placeholder.com/80",
      quantity: 1,
      variantDetails: product.attributes
        ? Object.fromEntries(
            product.attributes.map((attr) => [
              attr,
              selectedVariant[attr] || "N/A",
            ])
          )
        : {},
      stock: selectedVariant.stock || 0,
    };

    try {
      const cartString = await AsyncStorage.getItem("cart");
      let cart = cartString ? JSON.parse(cartString) : [];
      const existingItemIndex = cart.findIndex(
        (item) => item.id === cartItem.id
      );

      if (existingItemIndex !== -1) {
        if (cart[existingItemIndex].quantity < cart[existingItemIndex].stock) {
          cart[existingItemIndex].quantity += 1;
          Toast.show({
            type: "success",
            text1: "Quantity Updated",
            text2: `${cartItem.name} quantity increased.`,
          });
        } else {
          Toast.show({
            type: "info",
            text1: "Stock Limit",
            text2: `Max ${cart[existingItemIndex].stock} units.`,
          });
          return;
        }
      } else {
        cart.push(cartItem);
        Toast.show({
          type: "success",
          text1: "Added to Cart",
          text2: `${cartItem.name} added.`,
        });
      }
      await AsyncStorage.setItem("cart", JSON.stringify(cart));
      EventRegister.emit("cartUpdated", { count: cart.length });
    } catch (error) {
      console.error("Error adding to cart:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to add item to cart.",
      });
    }
  };

  const renderProductItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.productCard,
        item.status === "Sold" && styles.soldProductCard,
      ]}
      onPress={() =>
        router.push({
          pathname: "/products/ProductsDetails",
          params: { id: item.id },
        })
      }
      disabled={item.status === "Sold"}
      activeOpacity={0.85}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.imageUrl || "https://via.placeholder.com/150" }}
          style={styles.productImage}
          resizeMode="cover"
        />
        {item.status === "Sold" && (
          <View style={styles.soldOverlay}>
            <Text style={styles.soldOverlayText}>SOLD</Text>
          </View>
        )}
        {item.isNew && item.status !== "Sold" && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.heartIcon}
          onPress={(e) => {
            e.stopPropagation();
            toggleLike(item.id);
          }}
        >
          <Icon
            name={likedProducts.includes(item.id) ? "heart" : "heart-o"}
            size={18}
            color={likedProducts.includes(item.id) ? "#EF4444" : "#6B7280"}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.productDetails}>
        <Text style={styles.productName} numberOfLines={1}>
          {item.name || "Unnamed Product"}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.productPrice}>
            ${(item.price || 0).toFixed(2)}
          </Text>
          <Text
            style={[
              styles.productStatus,
              item.status === "Sold"
                ? styles.soldStatus
                : item.status === "verified"
                ? styles.inStockStatus
                : styles.otherStatus,
            ]}
          >
            {item.status === "verified" ? "In Stock" : item.status || "Unknown"}
          </Text>
        </View>
        {item.status !== "Sold" && (
          <TouchableOpacity
            style={styles.addToCartButton}
            onPress={(e) => {
              e.stopPropagation(); // Prevent card press
              handleAddToCart(item);
            }}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <LinearGradient
          colors={["#F8FAFC", "#EFF6FF"]}
          style={StyleSheet.absoluteFillObject}
        />
        <LoadingDots text={`Loading ${category} Products...`} />
      </View>
    );
  }

  return (
    <>
      <StatusBar backgroundColor="#1E40AF" barStyle="light-content" />
      <LinearGradient
        colors={["#1E40AF", "#3B82F6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {category}
        </Text>
        <View style={{ width: 24 }} />
        {/* Placeholder for balance */}
      </LinearGradient>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={renderProductItem}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#1E40AF"]}
            tintColor="#1E40AF"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="search-off" size={80} color="#CBD5E1" />
            <Text style={styles.emptyText}>
              No products found in "{category}".
            </Text>
            <Text style={styles.emptySubText}>
              Try checking other categories or refining your search.
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => router.replace("/index/Category")}
            >
              <Text style={styles.browseButtonText}>Browse Categories</Text>
            </TouchableOpacity>
          </View>
        }
      />
      <Toast />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC", // Light background for the main content area
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 30,
    paddingBottom: 15,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  backButton: {
    padding: 5, // Make it easier to tap
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    flex: 1, // Allow title to take available space and center
    marginHorizontal: 10, // Add some space around title
  },
  listContainer: {
    paddingHorizontal: 10, // Add horizontal padding to the list
    paddingTop: 10,
    paddingBottom: 20,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    // backgroundColor: "#F8FAFC", // Consistent background
  },
  loadingText: {
    // Kept for compatibility, but LoadingDots has its own text
    marginTop: 10,
    fontSize: 16,
    color: "#4B5569", // Darker gray for better readability
  },
  productCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    margin: CARD_WIDTH * 0.05, // Relative margin
    width: CARD_WIDTH,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    overflow: "hidden", // Ensure content stays within card boundaries
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  soldProductCard: {
    opacity: 0.6,
  },
  imageContainer: {
    width: "100%",
    height: CARD_WIDTH * 0.9, // Aspect ratio for image
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: "#E2E8F0", // Placeholder background
    position: "relative", // For absolute positioning of badges/icons
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  soldOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12, // Match card radius
  },
  soldOverlayText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
    textTransform: "uppercase",
  },
  newBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#10B981", // Green for new
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    zIndex: 1,
  },
  newBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  heartIcon: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    padding: 6,
    borderRadius: 15,
    zIndex: 1,
  },
  productDetails: {
    padding: 10,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E40AF", // Brand color for price
  },
  productStatus: {
    fontSize: 11,
    fontWeight: "500",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden", // Ensure text fits in rounded pill
  },
  inStockStatus: {
    backgroundColor: "#D1FAE5", // Light green
    color: "#065F46", // Dark green text
  },
  soldStatus: {
    backgroundColor: "#FEE2E2", // Light red
    color: "#991B1B", // Dark red text
  },
  otherStatus: {
    backgroundColor: "#FEF3C7", // Light yellow
    color: "#92400E", // Dark yellow text
  },
  addToCartButton: {
    backgroundColor: "#1E40AF",
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4, // Add some space above the button
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    marginTop: 50, // Give some space from header
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#334155",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  browseButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  // Fallback for no image, if needed, though product image defaults to a placeholder
  noImageContainer: {
    width: "100%",
    height: CARD_WIDTH * 0.9,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E2E8F0",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  noImageText: {
    color: "#64748B",
    fontSize: 12,
  },
});

export default CategoryProducts;
