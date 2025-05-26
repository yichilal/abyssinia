import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
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
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/FontAwesome";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import LoadingDots from "../../components/LoadingDots";
import SearchBox from "../../components/SearchBox";
import { db } from "../config/firebase";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

const FavoritesContent = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [categories, setCategories] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const animatedOpacity = useRef(new Animated.Value(0)).current;

  // Header animation based on scroll
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50, 100],
    outputRange: [0, 0.5, 1],
    extrapolate: "clamp",
  });

  const headerElevation = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 15],
    extrapolate: "clamp",
  });

  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    setRefreshing(true);
    setError(null);
    try {
      const userProfileJson = await AsyncStorage.getItem("userProfile");
      let favoriteProductIds = [];
      if (userProfileJson) {
        // Logged in: fetch from Firestore
        const userProfile = JSON.parse(userProfileJson);
        const userId = userProfile.uid || userProfile.id;
        const favoritesRef = collection(db, "favorite");
        const q = query(favoritesRef, where("userId", "==", userId));
        const snapshot = await getDocs(q);
        favoriteProductIds = snapshot.docs.map((doc) => doc.data().productId);
      } else {
        // Not logged in: fetch from AsyncStorage
        const favoritesString = await AsyncStorage.getItem("favorites");
        favoriteProductIds = favoritesString ? JSON.parse(favoritesString) : [];
      }
      // Fetch product details
      const productPromises = favoriteProductIds.map(async (productId) => {
        const productDoc = await getDoc(doc(db, "products", productId));
        return productDoc.exists()
          ? { id: productDoc.id, ...productDoc.data() }
          : null;
      });
      const products = (await Promise.all(productPromises)).filter(Boolean);
      setFavorites(products);

      // Extract unique categories
      const uniqueCategories = [];
      const categoryNames = new Set();
      products.forEach((item) => {
        if (item.category && !categoryNames.has(item.category)) {
          categoryNames.add(item.category);
          uniqueCategories.push(item.category);
        }
      });
      setCategories(["All", ...uniqueCategories]);

      // Animate content in
      Animated.timing(animatedOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    } catch (err) {
      setError("Failed to load favorites.");
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = fetchFavorites();
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [fetchFavorites]);

  useEffect(() => {
    if (!searchQuery || searchQuery.trim() === "") {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const results = favorites.filter((product) =>
      product.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setSearchResults(results);
  }, [searchQuery, favorites]);

  const onRefresh = useCallback(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const removeFromFavorites = async (productId) => {
    // First animate the removal
    const newFavorites = favorites.filter((item) => item.id !== productId);

    // Update state first for immediate UI feedback
    setFavorites(newFavorites);

    try {
      const userProfileJson = await AsyncStorage.getItem("userProfile");
      if (userProfileJson) {
        // Logged in: remove from Firestore
        const userProfile = JSON.parse(userProfileJson);
        const userId = userProfile.uid || userProfile.id;
        const favoritesRef = collection(db, "favorite");
        const q = query(
          favoritesRef,
          where("userId", "==", userId),
          where("productId", "==", productId)
        );
        const snapshot = await getDocs(q);
        snapshot.forEach(async (favDoc) => {
          await deleteDoc(doc(db, "favorite", favDoc.id));
        });
      } else {
        // Not logged in: remove from AsyncStorage
        const favoritesString = await AsyncStorage.getItem("favorites");
        let favorites = favoritesString ? JSON.parse(favoritesString) : [];
        favorites = favorites.filter((id) => id !== productId);
        await AsyncStorage.setItem("favorites", JSON.stringify(favorites));
      }
    } catch (err) {
      console.error("Failed to remove from favorites:", err);
      // If the operation fails, revert the state
      fetchFavorites();
    }
  };

  const addToCart = async (product) => {
    if (!product.variants || product.variants.length === 0) {
      return;
    }

    // Select the first variant with stock, or the first variant if none have stock
    const selectedVariant =
      product.variants.find((v) => v.stock > 0) || product.variants[0];

    if (selectedVariant.stock <= 0) {
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
        product.images[0] ||
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
        const newQuantity = cart[existingItemIndex].quantity + 1;
        if (newQuantity > cart[existingItemIndex].stock) {
          return;
        }
        cart[existingItemIndex].quantity = newQuantity;
      } else {
        cart.push(cartItem);
      }

      await AsyncStorage.setItem("cart", JSON.stringify(cart));
    } catch (error) {
      console.error("Error adding to cart:", error);
    }
  };

  const renderHeader = () => (
    <LinearGradient
      colors={["#1E40AF", "#3B82F6"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <View style={styles.headerTop}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerText}>My Favorites</Text>
          <Text style={styles.subHeaderText}>
            {favorites.length} item{favorites.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <View style={styles.iconContainer}>
          <TouchableOpacity style={styles.searchButton}>
            <Icon name="search" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.searchContainer}>
        <SearchBox
          onSearchSubmit={(query) => setSearchQuery(query?.trim() || "")}
        />
      </View>
    </LinearGradient>
  );

  const renderFavoriteItem = ({ item, index }) => {
    const translateY = new Animated.Value(50);
    const opacity = new Animated.Value(0);

    // Staggered animations for each item
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();

    // For heart beat effect when pressed
    const heartbeat = new Animated.Value(1);
    const pulseHeart = () => {
      Animated.sequence([
        Animated.timing(heartbeat, {
          toValue: 1.3,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(heartbeat, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        removeFromFavorites(item.id);
      });
    };

    return (
      <Animated.View
        style={[
          styles.productCard,
          {
            transform: [{ translateY }],
            opacity: opacity,
          },
        ]}
      >
        <View style={styles.deliveryTimeContainer}>
          <Ionicons name="time-outline" size={12} color="#3B82F6" />
          <Text style={styles.deliveryTimeText}>Fast Delivery</Text>
        </View>

        <TouchableOpacity
          style={styles.imageContainer}
          onPress={() =>
            router.push({
              pathname: "/products/ProductsDetails",
              params: { id: item.id },
            })
          }
          activeOpacity={0.9}
        >
          <Image
            source={{
              uri:
                item.images?.[0] ||
                item.imageUrl ||
                "https://via.placeholder.com/80",
            }}
            style={styles.productImage}
          />

          {item.isNew && (
            <View style={styles.newTag}>
              <Text style={styles.newTagText}>NEW</Text>
            </View>
          )}

          <Animated.View
            style={[
              styles.heartIconContainer,
              { transform: [{ scale: heartbeat }] },
            ]}
          >
            <TouchableOpacity style={styles.heartIcon} onPress={pulseHeart}>
              <Icon name="heart" size={16} color="#EF4444" />
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>

        <View style={styles.productDetails}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.name || "Unnamed Product"}
          </Text>

          <View style={styles.productInfo}>
            <View style={styles.priceContainer}>
              <Text style={styles.productPrice}>
                ETB {(item.price || 0).toFixed(2)}
              </Text>
              <Text style={styles.productCategory}>
                {item.category || "Uncategorized"}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.addButton}
              onPress={() => addToCart(item)}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderCategoryItem = ({ item }) => {
    const categoryIconMap = {
      Electronics: "devices",
      Fashion: "checkroom",
      Home: "home",
      Books: "menu-book",
      Beauty: "spa",
      Sports: "sports-soccer",
      Toys: "toys",
      Automotive: "directions-car",
      Grocery: "shopping-basket",
      Health: "medical-services",
      Garden: "local-florist",
      Tools: "build",
    };

    const iconName = categoryIconMap[item] || "category";

    return (
      <TouchableOpacity
        style={[
          styles.categoryItem,
          selectedCategory === item && styles.categoryItemSelected,
        ]}
        onPress={() => setSelectedCategory(item)}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name={iconName}
          size={16}
          color={selectedCategory === item ? "#1E40AF" : "#64748B"}
          style={styles.categoryIcon}
        />
        <Text
          style={[
            styles.categoryText,
            selectedCategory === item && styles.categoryTextSelected,
          ]}
        >
          {item}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor="#1E40AF" barStyle="light-content" />
        <View style={styles.loadingContent}>
          <LoadingDots
            text="Loading Favorites"
            textColor="#1E40AF"
            dotColors={["#3B82F6", "#1E40AF"]}
          />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <MaterialIcons name="error-outline" size={64} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => fetchFavorites()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (favorites.length === 0 && !isSearching) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="favorite-border" size={64} color="#CBD5E1" />
        <Text style={styles.emptyText}>Your Favorites List is Empty</Text>
        <Text style={styles.emptySubtext}>
          Add items to your favorites to keep track of products you love
        </Text>
        <TouchableOpacity
          style={styles.shopNowButton}
          onPress={() => router.push("/")}
        >
          <MaterialIcons name="shopping-bag" size={18} color="#FFFFFF" />
          <Text style={styles.shopNowButtonText}>Browse Products</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const filteredFavorites =
    selectedCategory === "All"
      ? isSearching
        ? searchResults
        : favorites
      : (isSearching ? searchResults : favorites).filter(
          (item) => item.category === selectedCategory
        );

  return (
    <>
      <StatusBar backgroundColor="#1E40AF" barStyle="light-content" />
      {renderHeader()}

      {/* Category Filters */}
      {categories.length > 1 && !isSearching && (
        <View
          style={[styles.categoryContainer, { backgroundColor: "#FFFFFF" }]}
        >
          <FlatList
            data={categories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryList}
          />
        </View>
      )}

      {/* Main Content */}
      <Animated.FlatList
        data={filteredFavorites}
        renderItem={renderFavoriteItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.gridListContentContainer}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <MaterialIcons
                name={isSearching ? "search" : "favorite"}
                size={18}
                color="#1E40AF"
              />
              <Text style={styles.sectionTitle}>
                {isSearching ? "Search Results" : "Favorite Items"}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={() => {
          if (isSearching) {
            return (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="search-off" size={64} color="#CBD5E1" />
                <Text style={styles.emptyText}>
                  No products match your search.
                </Text>
                <TouchableOpacity
                  style={styles.clearSearchButton}
                  onPress={() => setSearchQuery("")}
                >
                  <Text style={styles.clearSearchText}>Clear Search</Text>
                </TouchableOpacity>
              </View>
            );
          } else if (selectedCategory !== "All") {
            return (
              <View style={styles.noCategoryItemsContainer}>
                <MaterialIcons name="category" size={48} color="#CBD5E1" />
                <Text style={styles.noCategoryItemsText}>
                  No favorites in {selectedCategory} category
                </Text>
                <TouchableOpacity
                  style={styles.showAllButton}
                  onPress={() => setSelectedCategory("All")}
                >
                  <Text style={styles.showAllButtonText}>Show All Items</Text>
                </TouchableOpacity>
              </View>
            );
          }
          return null;
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#1E40AF"]}
            tintColor="#1E40AF"
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        style={{ opacity: animatedOpacity }}
      />
    </>
  );
};

// Wrapper component with SafeAreaProvider
const Index = () => {
  return (
    <SafeAreaProvider style={{ backgroundColor: "#FFFFFF" }}>
      <FavoritesContent />
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  header: {
    width: "100%",
    paddingTop: 10,
    paddingBottom: 15,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerContent: {
    flex: 1,
    alignItems: "center",
  },
  headerText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  subHeaderText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
  iconContainer: {
    flexDirection: "row",
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginLeft: 8,
  },
  categoryContainer: {
    marginTop: 16,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  categoryList: {
    paddingHorizontal: 16,
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#E0F2FE",
  },
  categoryIcon: {
    marginRight: 6,
  },
  categoryItemSelected: {
    backgroundColor: "#DBEAFE",
    borderColor: "#3B82F6",
  },
  categoryText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "500",
  },
  categoryTextSelected: {
    color: "#1E40AF",
    fontWeight: "600",
  },
  gridListContentContainer: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: "#FFFFFF",
  },
  productCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    margin: 8,
    overflow: "hidden",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    width: CARD_WIDTH,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    position: "relative",
  },
  deliveryTimeContainer: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 6,
    zIndex: 10,
  },
  deliveryTimeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#3B82F6",
    marginLeft: 3,
  },
  imageContainer: {
    position: "relative",
    height: 130,
  },
  productImage: {
    width: "100%",
    height: "100%",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  newTag: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "#10B981",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  newTagText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
  heartIconContainer: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  heartIcon: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 12,
    padding: 5,
  },
  productDetails: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 6,
  },
  productInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceContainer: {
    flex: 1,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E40AF",
  },
  productCategory: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 2,
  },
  addButton: {
    backgroundColor: "#1E40AF",
    borderRadius: 10,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#1E40AF",
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    backgroundColor: "#FFFFFF",
  },
  emptyText: {
    fontSize: 18,
    color: "#1E293B",
    textAlign: "center",
    marginTop: 16,
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  shopNowButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#1E40AF",
    borderRadius: 12,
  },
  shopNowButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 18,
    color: "#EF4444",
    marginTop: 8,
    marginBottom: 24,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#1E40AF",
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  noCategoryItemsContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    marginTop: 20,
    backgroundColor: "#FFFFFF",
  },
  noCategoryItemsText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 16,
  },
  showAllButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  showAllButtonText: {
    color: "#1E40AF",
    fontWeight: "600",
    fontSize: 14,
  },
  clearSearchButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#3B82F6",
    borderRadius: 8,
  },
  clearSearchText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  categoryListContainer: {
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
  },
});

export default Index;
