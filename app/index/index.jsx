import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  query as firestoreQuery,
  where as firestoreWhere,
  getDocs,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
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
import { EventRegister } from "react-native-event-listeners";
import Toast from "react-native-toast-message";
import Icon from "react-native-vector-icons/FontAwesome";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import LoadingDots from "../../components/LoadingDots";
import PromotionsCarousel from "../../components/PromotionsCarousel";
import SearchBox from "../../components/SearchBox";
import { db } from "../config/firebase";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.42;
const CATEGORY_ITEM_WIDTH = width * 0.26;

const Index = () => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likedProducts, setLikedProducts] = useState([]);
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [networkStatusVisible, setNetworkStatusVisible] = useState(false);
  const [networkAnimation] = useState(new Animated.Value(100));

  const checkNetworkStatus = async () => {
    try {
      const response = await fetch("https://www.google.com", {
        method: "HEAD",
        timeout: 5000,
      });
      const newIsOnline = response.status === 200;

      if (newIsOnline !== isOnline) {
        setIsOnline(newIsOnline);
        setNetworkStatusVisible(true);

        // Animate network status in
        Animated.spring(networkAnimation, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 9,
        }).start();

        // If online, hide after delay
        if (newIsOnline) {
          setTimeout(() => {
            Animated.spring(networkAnimation, {
              toValue: 100,
              useNativeDriver: true,
              tension: 50,
              friction: 9,
            }).start(() => setNetworkStatusVisible(false));
          }, 3000);
        }
      }
    } catch (error) {
      if (isOnline) {
        setIsOnline(false);
        setNetworkStatusVisible(true);
        Animated.spring(networkAnimation, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 9,
        }).start();
      }
    }
  };

  // Check network status periodically
  useEffect(() => {
    checkNetworkStatus();
    const intervalId = setInterval(checkNetworkStatus, 5000);
    return () => clearInterval(intervalId);
  }, [isOnline]);

  const fetchProducts = useCallback(() => {
    if (!isOnline) {
      setLoading(false);
      setRefreshing(false);
      return () => {}; // Return empty cleanup function when offline
    }

    setRefreshing(true);
    let unsubscribeProducts = null;

    try {
      unsubscribeProducts = onSnapshot(
        collection(db, "products"),
        async (querySnapshot) => {
          if (querySnapshot.empty) {
            setProducts([]);
            setNewPostsCount(0);
            setCategories([]);
            setLoading(false);
            setRefreshing(false);
            return;
          }

          const productPromises = querySnapshot.docs.map(async (productDoc) => {
            const productData = { id: productDoc.id, ...productDoc.data() };

            // Only include products with status 'verified'
            if (productData.status !== "verified") return null;

            // Fetch variants to check stock
            const variantsRef = collection(
              db,
              "products",
              productDoc.id,
              "variants"
            );
            const variantsSnapshot = await getDocs(variantsRef);
            const variants = variantsSnapshot.docs.map((variantDoc) => ({
              id: variantDoc.id,
              ...variantDoc.data(),
            }));
            const totalStock = variants.reduce(
              (sum, v) => sum + (v.stock || 0),
              0
            );

            // If stock is 0 and status is not 'Sold', update status to 'Sold'
            if (totalStock === 0 && productData.status !== "Sold") {
              await updateDoc(doc(db, "products", productDoc.id), {
                status: "Sold",
              });
              productData.status = "Sold";
            }

            const createdAt = productData.createdAt?.toDate
              ? productData.createdAt.toDate()
              : new Date();

            // Check if product is new (either marked as new or created within 24 hours)
            const isNew =
              productData.isNew === true ||
              Date.now() - createdAt.getTime() < 24 * 60 * 60 * 1000;

            // If product is new but not marked as new, update it
            if (isNew && productData.isNew !== true) {
              await updateDoc(doc(db, "products", productDoc.id), {
                isNew: true,
              });
              productData.isNew = true;
            }

            // Select the first variant with stock, or the first variant if none have stock
            const selectedVariant =
              variants.find((v) => v.stock > 0) || variants[0] || null;

            return {
              ...productData,
              variants,
              price:
                variants.length > 0
                  ? Math.min(...variants.map((v) => v.price || 0))
                  : 0,
              imageUrl:
                selectedVariant?.image ||
                productData.images?.[0] ||
                "https://via.placeholder.com/80",
              images: productData.images || [],
              category: productData.category || "Uncategorized",
              status: productData.status,
              createdAt,
              isNew,
            };
          });

          const productsList = (await Promise.all(productPromises)).filter(
            Boolean
          );
          setProducts(productsList);

          // Set featured products (sort by newest with stock)
          const featured = [...productsList]
            .filter((p) => p.status !== "Sold")
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 5);
          setFeaturedProducts(featured);

          setNewPostsCount(productsList.filter((p) => p.isNew).length);
          setLoading(false);
          setRefreshing(false);

          const uniqueCategories = [];
          const categoryNames = new Set();
          productsList.forEach((item) => {
            if (item.category && !categoryNames.has(item.category)) {
              categoryNames.add(item.category);
              uniqueCategories.push({
                id: item.id,
                name: item.category,
                imageUrl: item.imageUrl,
              });
            }
          });
          setCategories(uniqueCategories);
        },
        (error) => {
          console.error("Error fetching products:", error);
          Toast.show({
            type: "error",
            text1: "Error",
            text2: "Firestore fetch failed.",
          });
          setLoading(false);
          setRefreshing(false);
        }
      );
    } catch (error) {
      console.error("Error setting up products listener:", error);
      setLoading(false);
      setRefreshing(false);
      return () => {};
    }

    return () => {
      if (unsubscribeProducts) {
        unsubscribeProducts();
      }
    };
  }, [isOnline]);

  useEffect(() => {
    const unsubscribe = fetchProducts();
    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [fetchProducts]);

  useEffect(() => {
    if (!searchQuery || searchQuery.trim() === "") {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const results = products.filter((product) =>
      product.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setSearchResults(results);
  }, [searchQuery, products]);

  const onRefresh = useCallback(() => {
    fetchProducts();
  }, [fetchProducts]);

  const toggleLike = async (id) => {
    try {
      const userProfileJson = await AsyncStorage.getItem("userProfile");
      const isLoggedIn = !!userProfileJson;
      const productRef = doc(db, "products", id);
      const isLiked = likedProducts.includes(id);

      if (isLoggedIn) {
        // Firestore favorite logic
        const userProfile = JSON.parse(userProfileJson);
        const userId = userProfile.uid || userProfile.id;
        const favoritesRef = collection(db, "favorite");
        if (isLiked) {
          // Remove from Firestore
          const q = firestoreQuery(
            favoritesRef,
            firestoreWhere("userId", "==", userId),
            firestoreWhere("productId", "==", id)
          );
          const snapshot = await getDocs(q);
          snapshot.forEach(async (favDoc) => {
            await deleteDoc(doc(db, "favorite", favDoc.id));
          });
          setLikedProducts((prev) =>
            prev.filter((productId) => productId !== id)
          );
          Toast.show({
            type: "success",
            text1: "Removed from Favorites",
          });
        } else {
          // Add to Firestore
          await addDoc(favoritesRef, {
            userId,
            productId: id,
            createdAt: new Date().toISOString(),
          });
          setLikedProducts((prev) => [...prev, id]);
          Toast.show({
            type: "success",
            text1: "Added to Favorites",
          });
        }
      } else {
        // Local storage favorite logic
        const favoritesString = await AsyncStorage.getItem("favorites");
        let favorites = favoritesString ? JSON.parse(favoritesString) : [];
        if (isLiked) {
          favorites = favorites.filter((productId) => productId !== id);
          setLikedProducts(favorites);
          Toast.show({
            type: "success",
            text1: "Removed from Favorites",
          });
        } else {
          favorites.push(id);
          setLikedProducts(favorites);
          Toast.show({
            type: "success",
            text1: "Added to Favorites",
          });
        }
        await AsyncStorage.setItem("favorites", JSON.stringify(favorites));
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to update favorite.",
      });
    }
  };

  const handleCategoryPress = (categoryName) => {
    router.push({
      pathname: "/products/CategoryProducts",
      params: { category: categoryName },
    });
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

    // Select the first variant with stock, or the first variant if none have stock
    const selectedVariant =
      product.variants.find((v) => v.stock > 0) || product.variants[0];

    if (selectedVariant.stock <= 0) {
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
          Toast.show({
            type: "info",
            text1: "Stock Limit Reached",
            text2: `Cannot add more than ${cart[existingItemIndex].stock} units.`,
          });
          return;
        }
        cart[existingItemIndex].quantity = newQuantity;
        Toast.show({
          type: "success",
          text1: "Quantity Updated",
          text2: `${cartItem.name} quantity increased in cart.`,
        });
      } else {
        cart.push(cartItem);
        Toast.show({
          type: "success",
          text1: "Added to Cart",
          text2: `${cartItem.name} added.`,
        });
      }

      await AsyncStorage.setItem("cart", JSON.stringify(cart));

      // Emit event to update cart badge
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

  const handleNotificationPress = () => {
    router.push("/notifications");
  };

  const renderHeader = () => (
    <LinearGradient
      colors={["#1E40AF", "#3B82F6"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <View style={styles.headerTop}>
        <View style={styles.headerContent}>
          <Text style={styles.headerText}>Abyssinia Gebeya</Text>
          <Text style={styles.subHeaderText}>Your 24/7 Open Market</Text>
        </View>
        <View style={styles.iconContainer}>
          <TouchableOpacity
            style={styles.notification}
            onPress={handleNotificationPress}
          >
            <Icon name="bell" size={20} color="#FFFFFF" />
            {newPostsCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>
                  {newPostsCount > 9 ? "9+" : newPostsCount}
                </Text>
              </View>
            )}
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

  const renderFeaturedItem = ({ item }) => (
    <TouchableOpacity
      style={styles.featuredCard}
      onPress={() =>
        router.push({
          pathname: "/products/ProductsDetails",
          params: { id: item.id },
        })
      }
      disabled={item.status === "Sold"}
      activeOpacity={0.9}
    >
      <View style={styles.featuredImageContainer}>
        <Image source={{ uri: item.imageUrl }} style={styles.featuredImage} />
        {item.isNew && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.featuredHeartIcon}
          onPress={() => toggleLike(item.id)}
        >
          <Icon
            name={likedProducts.includes(item.id) ? "heart" : "heart-o"}
            size={20}
            color={likedProducts.includes(item.id) ? "#EF4444" : "#FFFFFF"}
          />
        </TouchableOpacity>
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.5)"]}
          style={styles.featuredGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>
      <View style={styles.featuredDetails}>
        <Text style={styles.featuredName} numberOfLines={1}>
          {item.name || "Unnamed Product"}
        </Text>
        <View style={styles.featuredInfo}>
          <Text style={styles.featuredPrice}>
            ${(item.price || 0).toFixed(2)}
          </Text>
          <TouchableOpacity
            style={styles.miniCartButton}
            onPress={() => handleAddToCart(item)}
          >
            <Ionicons name="cart-outline" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderProductItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.productCard,
        likedProducts.includes(item.id) && styles.likedProductCard,
        item.status === "Sold" && styles.soldProductCard,
      ]}
      onPress={() =>
        router.push({
          pathname: "/products/ProductsDetails",
          params: { id: item.id },
        })
      }
      disabled={item.status === "Sold"}
      activeOpacity={0.9}
    >
      <View style={styles.deliveryTimeContainer}>
        <Ionicons name="time-outline" size={12} color="#3B82F6" />
        <Text style={styles.deliveryTimeText}>Fast Delivery</Text>
      </View>

      <View style={styles.imageContainer}>
        <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
        {item.status === "Sold" && (
          <View style={styles.soldOverlay}>
            <Text style={styles.soldOverlayText}>SOLD</Text>
          </View>
        )}
        {item.isNew && item.status !== "Sold" && (
          <View style={styles.newTag}>
            <Text style={styles.newTagText}>NEW</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.heartIcon}
          onPress={() => toggleLike(item.id)}
        >
          <Icon
            name={likedProducts.includes(item.id) ? "heart" : "heart-o"}
            size={16}
            color={likedProducts.includes(item.id) ? "#EF4444" : "#6B7280"}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.productDetails}>
        <Text style={styles.productName} numberOfLines={1}>
          {item.name || "Unnamed Product"}
        </Text>

        <View style={styles.productInfo}>
          <View style={styles.priceContainer}>
            <Text style={styles.productPrice}>
              ${(item.price || 0).toFixed(2)}
            </Text>
            <Text
              style={[
                styles.productStatus,
                item.status === "Sold" && styles.soldStatus,
              ]}
            >
              {item.status === "verified" ? "In Stock" : item.status}
            </Text>
          </View>

          {item.status !== "Sold" && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => handleAddToCart(item)}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

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

    const iconName = categoryIconMap[item.name] || "category";

    return (
      <TouchableOpacity
        style={styles.categoryItem}
        onPress={() => handleCategoryPress(item.name)}
        activeOpacity={0.7}
      >
        <View style={styles.categoryImageContainer}>
          <LinearGradient
            colors={["rgba(59, 130, 246, 0.1)", "rgba(30, 64, 175, 0.2)"]}
            style={styles.categoryGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.categoryImage}
            />
          ) : (
            <View style={styles.categoryIconFallback}>
              <MaterialIcons name={iconName} size={26} color="#3B82F6" />
            </View>
          )}
        </View>
        <Text style={styles.categoryText} numberOfLines={1}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={["#F8FAFC", "#EFF6FF"]}
          style={styles.loadingGradient}
        >
          <LoadingDots text="Loading Products" />
        </LinearGradient>
      </View>
    );
  }

  return (
    <>
      <StatusBar backgroundColor="#1E40AF" barStyle="light-content" />

      {/* Network Status Banner */}
      {networkStatusVisible && (
        <Animated.View
          style={[
            styles.networkStatus,
            {
              transform: [{ translateY: networkAnimation }],
              backgroundColor: isOnline
                ? "rgba(5, 150, 105, 0.95)"
                : "rgba(220, 38, 38, 0.95)",
            },
          ]}
        >
          <View style={styles.networkStatusContent}>
            <View style={styles.networkIconContainer}>
              <Ionicons
                name={isOnline ? "wifi" : "wifi-off"}
                size={24}
                color="#FFF"
              />
              {isOnline && (
                <View style={styles.statusDot}>
                  <View style={styles.innerDot} />
                </View>
              )}
            </View>
            <View style={styles.networkTextContainer}>
              <Text style={styles.networkStatusText}>
                {isOnline ? "Connected" : "No Internet Connection"}
              </Text>
              <Text style={styles.networkMessageText}>
                {isOnline
                  ? "You're back online"
                  : "Please check your internet connection"}
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      {renderHeader()}
      <FlatList
        data={isSearching ? searchResults : products}
        keyExtractor={(item) => item.id}
        renderItem={renderProductItem}
        numColumns={2}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              if (isOnline) {
                onRefresh();
              } else {
                Toast.show({
                  type: "error",
                  text1: "No Internet Connection",
                  text2: "Please check your connection and try again",
                  visibilityTime: 3000,
                });
              }
            }}
            colors={["#1E40AF"]}
            tintColor="#1E40AF"
          />
        }
        ListHeaderComponent={() => (
          <>
            {!isSearching && (
              <>
                <PromotionsCarousel />
                {featuredProducts.length > 0 && (
                  <>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionTitleContainer}>
                        <MaterialIcons name="star" size={18} color="#F59E0B" />
                        <Text style={styles.sectionTitle}>
                          Featured Products
                        </Text>
                      </View>
                      <TouchableOpacity style={styles.seeAllButton}>
                        <Text style={styles.seeAllText}>See All</Text>
                      </TouchableOpacity>
                    </View>
                    <FlatList
                      data={featuredProducts}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      renderItem={renderFeaturedItem}
                      keyExtractor={(item) => `featured-${item.id}`}
                      contentContainerStyle={styles.featuredList}
                    />
                  </>
                )}
              </>
            )}

            {!isSearching && (
              <>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleContainer}>
                    <MaterialIcons name="category" size={18} color="#1E40AF" />
                    <Text style={styles.sectionTitle}>Categories</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.seeAllButton}
                    onPress={() => router.push("/index/Category")}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.seeAllText}>See All</Text>
                    <MaterialIcons
                      name="chevron-right"
                      size={18}
                      color="#3B82F6"
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.categoryListContainer}>
                  <FlatList
                    data={categories}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    renderItem={renderCategoryItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.categoryList}
                  />
                </View>
              </>
            )}

            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <MaterialIcons
                  name={isSearching ? "search" : "shopping-bag"}
                  size={18}
                  color="#1E40AF"
                />
                <Text style={styles.sectionTitle}>
                  {isSearching ? "Search Results" : "All Products"}
                </Text>
              </View>
              {!isSearching && products.length > 0 && (
                <TouchableOpacity style={styles.filterButton}>
                  <MaterialIcons name="filter-list" size={20} color="#1E40AF" />
                  <Text style={styles.filterText}>Filter</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            {!isOnline ? (
              <>
                <MaterialIcons name="wifi-off" size={64} color="#CBD5E1" />
                <Text style={styles.emptyText}>No internet connection</Text>
                <Text style={styles.emptySubtext}>
                  Please check your connection and try again
                </Text>
              </>
            ) : isSearching ? (
              <>
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
              </>
            ) : (
              <>
                <MaterialIcons name="shopping-bag" size={64} color="#CBD5E1" />
                <Text style={styles.emptyText}>
                  No products available at the moment.
                </Text>
                <Text style={styles.emptySubtext}>
                  Check back later for new items!
                </Text>
              </>
            )}
          </View>
        )}
      />
      <Toast />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#F8FAFC",
  },
  header: {
    padding: 12,
    paddingTop: 30,
    paddingBottom: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 1,
  },
  subHeaderText: {
    fontSize: 13,
    color: "#E0F2FE",
  },
  iconContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchContainer: {
    marginTop: 6,
  },
  notification: {
    position: "relative",
    padding: 6,
  },
  notificationBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginLeft: 6,
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  seeAllText: {
    color: "#3B82F6",
    fontWeight: "600",
    fontSize: 13,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  filterText: {
    color: "#1E40AF",
    fontWeight: "600",
    fontSize: 13,
    marginLeft: 4,
  },
  featuredList: {
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  featuredCard: {
    width: width * 0.7,
    marginRight: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  featuredImageContainer: {
    position: "relative",
    height: 160,
  },
  featuredImage: {
    width: "100%",
    height: "100%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  featuredGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 60,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  featuredHeartIcon: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 20,
    padding: 8,
    zIndex: 2,
  },
  newBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "#10B981",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 2,
  },
  newBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  featuredDetails: {
    padding: 14,
  },
  featuredName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 10,
  },
  featuredInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  featuredPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E40AF",
  },
  miniCartButton: {
    backgroundColor: "#F97316",
    borderRadius: 20,
    padding: 8,
    shadowColor: "#F97316",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryListContainer: {
    marginBottom: 8,
    backgroundColor: "#F8FAFC",
  },
  categoryList: {
    paddingBottom: 12,
    paddingLeft: 4,
  },
  categoryItem: {
    alignItems: "center",
    marginRight: 14,
    width: CATEGORY_ITEM_WIDTH,
  },
  categoryImageContainer: {
    backgroundColor: "#fff",
    borderRadius: 18,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    width: CATEGORY_ITEM_WIDTH * 0.9,
    height: CATEGORY_ITEM_WIDTH * 0.9,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  categoryGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
  },
  categoryImage: {
    width: "75%",
    height: "75%",
    borderRadius: 12,
  },
  categoryIconFallback: {
    width: "75%",
    height: "75%",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
    marginTop: 8,
    textAlign: "center",
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
  likedProductCard: {
    borderColor: "#FEE2E2",
    borderWidth: 1,
  },
  soldProductCard: {
    opacity: 0.7,
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
  soldOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  soldOverlayText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
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
  heartIcon: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 12,
    padding: 5,
  },
  productDetails: {
    padding: 10,
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
  productStatus: {
    fontSize: 11,
    fontWeight: "500",
    color: "#10B981",
    marginTop: 2,
  },
  soldStatus: {
    color: "#EF4444",
    fontWeight: "600",
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
    justifyContent: "center",
    alignItems: "center",
  },
  loadingGradient: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    marginTop: 20,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    marginTop: 16,
    fontWeight: "500",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 8,
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
  networkStatus: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  networkStatusContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  networkIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  statusDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  innerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#059669",
  },
  networkTextContainer: {
    flex: 1,
  },
  networkStatusText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  networkMessageText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 13,
  },
});

export default Index;
