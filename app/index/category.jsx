import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { EventRegister } from "react-native-event-listeners";
import Toast from "react-native-toast-message";
import Icon from "react-native-vector-icons/FontAwesome";
import Ionicons from "react-native-vector-icons/Ionicons";
import SearchBox from "../../components/SearchBox";
import { db } from "../config/firebase";

const Category = () => {
  const { category } = useLocalSearchParams();
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [likedProducts, setLikedProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(category || "");
  const [newProducts, setNewProducts] = useState([]);

  // Fetch new products for notifications
  const fetchNewProducts = useCallback(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, "products"), orderBy("createdAt", "desc")),
      (querySnapshot) => {
        if (querySnapshot.empty) {
          setNewProducts([]);
          return;
        }

        const productPromises = querySnapshot.docs.map(async (productDoc) => {
          const productData = { id: productDoc.id, ...productDoc.data() };

          const variantsRef = collection(
            db,
            "products",
            productDoc.id,
            "variants"
          );
          const variantsSnapshot = await new Promise((resolve) =>
            onSnapshot(variantsRef, resolve)
          );
          const variants = variantsSnapshot.docs.map((variantDoc) => ({
            id: variantDoc.id,
            ...variantDoc.data(),
          }));

          const createdAt = productData.createdAt
            ? new Date(productData.createdAt)
            : new Date();

          // Check if product is new (either marked as new or created within 24 hours)
          const isNew =
            productData.isNew === true ||
            Date.now() - createdAt.getTime() < 24 * 60 * 60 * 1000;

          return {
            ...productData,
            variants,
            price:
              variants.length > 0
                ? Math.min(...variants.map((v) => v.price))
                : 0,
            imageUrl:
              productData.images?.[0] || "https://via.placeholder.com/80",
            images: productData.images || [],
            category: productData.category || "Uncategorized",
            status: variants.some((v) => v.stock > 0)
              ? "In Stock"
              : "Out of Stock",
            createdAt,
            isNew,
          };
        });

        Promise.all(productPromises)
          .then((productsList) => {
            const validNewProducts = productsList
              .filter(
                (product) =>
                  product && product.id && product.name && product.isNew
              )
              .sort((a, b) => b.createdAt - a.createdAt);

            setNewProducts(validNewProducts);
          })
          .catch((error) => {
            console.error(
              "Error processing products for notifications:",
              error
            );
          });
      }
    );

    return unsubscribe;
  }, []);

  const fetchData = useCallback(() => {
    setRefreshing(true);

    const unsubscribeProducts = onSnapshot(
      collection(db, "products"),
      (querySnapshot) => {
        const productsList = querySnapshot.docs
          .map((doc) => {
            const productData = {
              id: doc.id,
              ...doc.data(),
              images: doc.data().images || [],
              price: doc.data().price || 0,
              status: doc.data().status || "In Stock",
              category: doc.data().category || "Uncategorized",
              rating: doc.data().rating || 0,
              reviewCount: doc.data().reviewCount || 0,
              stock: doc.data().stock === undefined ? 10 : doc.data().stock,
            };
            if (productData.status !== "verified") {
              return null;
            }
            return productData;
          })
          .filter(Boolean);

        const uniqueCategories = [];
        const categoryNames = new Set();
        productsList.forEach((item) => {
          if (item.category && !categoryNames.has(item.category)) {
            categoryNames.add(item.category);
            uniqueCategories.push({
              id: item.id,
              name: item.category,
              imageUrl: item.images[0] || "https://via.placeholder.com/80",
            });
          }
        });

        setCategories(uniqueCategories);
        setProducts(productsList);

        let filtered = productsList;
        if (selectedCategory) {
          filtered = filtered.filter(
            (product) => product.category === selectedCategory
          );
        }
        if (searchQuery) {
          filtered = filtered.filter((product) =>
            product.name?.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }

        setFilteredProducts(filtered);
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.error("Error fetching products:", error);
        setLoading(false);
        setRefreshing(false);
      }
    );

    return unsubscribeProducts;
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    const unsubscribeProducts = fetchData();
    const unsubscribeNotifications = fetchNewProducts();

    return () => {
      unsubscribeProducts();
      unsubscribeNotifications();
    };
  }, [fetchData, fetchNewProducts]);

  const toggleLike = (id) => {
    setLikedProducts((prev) =>
      prev.includes(id)
        ? prev.filter((productId) => productId !== id)
        : [...prev, id]
    );
  };

  const handleCategoryPress = (categoryName) => {
    setSelectedCategory(categoryName);
  };

  const handleProductPress = (id) => {
    router.push({
      pathname: "/products/ProductsDetails",
      params: { id },
    });
  };

  const handleAddToCartInCategory = async (product) => {
    if (!product || product.stock === undefined || product.stock <= 0) {
      Toast.show({
        type: "error",
        text1: "Out of Stock",
        text2: "This product is currently unavailable.",
      });
      return;
    }

    const cartItem = {
      id: product.id,
      productId: product.id,
      name: product.name || "Unnamed Product",
      price: product.price || 0,
      imageUrl: product.images?.[0] || "https://via.placeholder.com/80",
      quantity: 1,
      stock: product.stock,
      variantDetails: {},
    };

    try {
      const cartString = await AsyncStorage.getItem("cart");
      let cart = cartString ? JSON.parse(cartString) : [];

      const existingItemIndex = cart.findIndex(
        (item) => item.id === cartItem.id
      );

      if (existingItemIndex !== -1) {
        const newQuantity = cart[existingItemIndex].quantity + 1;
        if (newQuantity > (cart[existingItemIndex].stock || product.stock)) {
          Toast.show({
            type: "info",
            text1: "Stock Limit Reached",
            text2: `Cannot add more. Max ${
              cart[existingItemIndex].stock || product.stock
            } units.`,
          });
          return;
        }
        cart[existingItemIndex].quantity = newQuantity;
        Toast.show({
          type: "success",
          text1: "Quantity Updated",
          text2: `${cartItem.name} quantity updated in cart.`,
        });
      } else {
        cart.push(cartItem);
        Toast.show({
          type: "success",
          text1: "Added to Cart",
          text2: `${cartItem.name} added to your cart.`,
        });
      }

      await AsyncStorage.setItem("cart", JSON.stringify(cart));
      EventRegister.emit("cartUpdated", { count: cart.length });
    } catch (error) {
      console.error("Error adding to cart from category:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to add item to cart.",
      });
    }
  };

  const onRefresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const navigateToNotifications = () => {
    router.push("/notifications");
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E40AF" />
        <Text style={styles.loadingText}>Loading Products...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>
              {selectedCategory || "All Categories"}
            </Text>
            <Text style={styles.headerSubtitle}>Abyssinia Gebeya</Text>
          </View>
          <View style={styles.headerIconsContainer}>
            <TouchableOpacity
              onPress={() => router.push("/cartscreen")}
              style={styles.headerCartIcon}
            >
              <Ionicons name="cart-outline" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.notification}
              onPress={navigateToNotifications}
            >
              <Icon name="bell" size={24} color="#BFDBFE" />
              {newProducts.length > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.badgeText}>{newProducts.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.headerSearchContainer}>
          <SearchBox
            onSearchSubmit={(query) => setSearchQuery(query || "")}
            placeholder={`Search in ${selectedCategory || "products"}...`}
          />
        </View>
      </View>

      <FlatList
        style={styles.productList}
        contentContainerStyle={styles.productListContent}
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#1E40AF"]}
            tintColor="#1E40AF"
          />
        }
        ListHeaderComponent={
          <>
            <Text style={styles.sectionTitle}>Categories</Text>
            <FlatList
              horizontal
              data={categories}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.categoryCard,
                    selectedCategory === item.name && styles.selectedCategory,
                  ]}
                  onPress={() => handleCategoryPress(item.name)}
                >
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.categoryImage}
                    onError={(e) =>
                      console.log("Image load error:", e.nativeEvent.error)
                    }
                  />
                  <Text style={styles.categoryText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <Text style={styles.sectionTitle}>
              {selectedCategory
                ? `${selectedCategory} Products`
                : "All Products"}
            </Text>
          </>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.productCard,
              likedProducts.includes(item.id) && styles.likedProduct,
            ]}
            onPress={() => handleProductPress(item.id)}
          >
            <TouchableOpacity
              style={styles.likeButton}
              onPress={() => toggleLike(item.id)}
            >
              <Icon
                name={likedProducts.includes(item.id) ? "heart" : "heart-o"}
                size={20}
                color={likedProducts.includes(item.id) ? "#EF4444" : "#6B7280"}
              />
            </TouchableOpacity>
            {item.images.length > 0 ? (
              <Image
                source={{ uri: item.images[0] }}
                style={styles.productImage}
                onError={(e) =>
                  console.log("Image load error:", e.nativeEvent.error)
                }
              />
            ) : (
              <View style={styles.noImage}>
                <Text style={styles.noImageText}>No Image</Text>
              </View>
            )}
            <View style={styles.productInfoContainer}>
              <Text style={styles.productName} numberOfLines={1}>
                {item.name || "Unnamed Product"}
              </Text>
              <View style={styles.priceAndButtonRow}>
                <Text style={styles.productPrice}>
                  ${item.price.toFixed(2)}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.addToCartButton,
                    (item.stock === undefined || item.stock <= 0) &&
                      styles.disabledCartButton,
                  ]}
                  onPress={() => handleAddToCartInCategory(item)}
                  disabled={item.stock === undefined || item.stock <= 0}
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListFooterComponent={<View style={styles.footerPadding} />}
      />
      <Toast />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    backgroundColor: "#1E40AF",
    paddingTop: 40,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerContent: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFF",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#BFDBFE",
    fontWeight: "400",
    marginBottom: 8,
  },
  headerSearchContainer: {
    paddingHorizontal: 16,
    backgroundColor: "#1E40AF",
    borderBottomLeftRadius: 200,
    borderBottomRightRadius: 20,
  },
  headerIconsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerCartIcon: {
    padding: 8,
    marginRight: 8,
  },
  notification: {
    position: "relative",
    padding: 8,
  },
  notificationBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "600",
  },
  searchContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
  },
  productList: {
    flex: 1,
  },
  productListContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    marginVertical: 16,
    paddingHorizontal: 8,
  },
  categoryCard: {
    alignItems: "center",
    marginRight: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    minWidth: 100,
  },
  selectedCategory: {
    borderColor: "#1E40AF",
    borderWidth: 2,
    backgroundColor: "#DBEAFE",
  },
  categoryImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "500",
    textAlign: "center",
  },
  productCard: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 12,
    margin: 6,
    maxWidth: "48%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  likedProduct: {
    backgroundColor: "#DBEAFE",
  },
  likeButton: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 1,
    backgroundColor: "rgba(255,255,255,0.7)",
    padding: 6,
    borderRadius: 15,
  },
  productImage: {
    width: "100%",
    height: 140,
    resizeMode: "cover",
  },
  noImage: {
    width: "100%",
    height: 140,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  noImageText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  productInfoContainer: {
    padding: 10,
  },
  productName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 6,
    height: 20,
  },
  priceAndButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#10B981",
  },
  addToCartButton: {
    backgroundColor: "#1E40AF",
    padding: 6,
    borderRadius: 15,
  },
  disabledCartButton: {
    backgroundColor: "#9CA3AF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
  footerPadding: {
    height: 20,
  },
});

export default Category;
