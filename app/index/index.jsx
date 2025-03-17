import { router } from "expo-router";
import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import Icon from "react-native-vector-icons/FontAwesome";
import SearchBox from "../../components/SearchBox";
import { db } from "../config/firebase";

const Index = () => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likedProducts, setLikedProducts] = useState([]);
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch categories and products from Firestore
  useEffect(() => {
    const unsubscribeCategories = onSnapshot(
      collection(db, "products"),
      (snapshot) => {
        const categoryList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Extract unique categories
        const uniqueCategories = [];
        const categoryNames = new Set();
        categoryList.forEach((item) => {
          if (item.category && !categoryNames.has(item.category)) {
            categoryNames.add(item.category);
            uniqueCategories.push({
              id: item.id,
              name: item.category,
              imageUrl:
                item.images && item.images.length > 0
                  ? item.images[0]
                  : "https://via.placeholder.com/80",
            });
          }
        });

        setCategories(uniqueCategories);
      }
    );

    const unsubscribeProducts = onSnapshot(
      collection(db, "products"),
      (querySnapshot) => {
        if (querySnapshot.empty) {
          console.log("No products found.");
          setProducts([]);
          setLoading(false);
          return;
        }

        const productsList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setProducts(productsList);
        setNewPostsCount(productsList.length);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching products:", error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeCategories();
      unsubscribeProducts();
    };
  }, []);

  // Live search logic
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    // Filter products based on the search query
    const results = products.filter((product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setSearchResults(results);
  }, [searchQuery, products]);

  // Toggle like for a product
  const toggleLike = async (id) => {
    try {
      const productRef = doc(db, "products", id);
      const product = products.find((p) => p.id === id);
      const isLiked = likedProducts.includes(id);

      // Toggle the favorite field in Firestore
      await updateDoc(productRef, {
        favorite: !isLiked,
      });

      // Update local state
      setLikedProducts((prev) =>
        isLiked ? prev.filter((productId) => productId !== id) : [...prev, id]
      );

      Toast.show({
        type: "success",
        text1: isLiked ? "Removed from Favorites" : "Added to Favorites",
      });
    } catch (error) {
      console.error("Error toggling favorite:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to update favorite status.",
      });
    }
  };

  // Handle category press
  const handleCategoryPress = (categoryName) => {
    router.push({
      pathname: "/products/CategoryProducts",
      params: { category: categoryName },
    });
  };

  // Handle add to cart
  const handleAddToCart = (id) => {
    console.log("Add to Cart:", id);
    // Add your logic for adding the product to the cart here
  };

  // Render the header
  const renderHeader = () => (
    <View>
      <View style={styles.notificationContainer}>
        <Icon name="bell" size={24} color="#111" />
        {newPostsCount > 0 && (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{newPostsCount}</Text>
          </View>
        )}
      </View>

      {/* Combined Card for Text and SearchBox */}
      <View style={styles.combinedCard}>
        <View style={styles.textContainer}>
          <Text style={styles.headerText}>
            Abyssinia Gebeya for Best Experience
          </Text>
          <Text style={styles.subHeaderText}>24 Hours Open Market</Text>
        </View>
        <View style={styles.searchBoxContainer}>
          <SearchBox
            onSearchSubmit={(query) => setSearchQuery(query)} // Update search query as user types
          />
        </View>
      </View>
    </View>
  );

  // Render a product item
  const renderProductItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.productCard,
        likedProducts.includes(item.id) && styles.likedProductCard,
      ]}
      onPress={() =>
        router.push({
          pathname: "/products/ProductsDetails",
          params: { id: item.id },
        })
      }
    >
      <TouchableOpacity
        style={styles.heartIconContainer}
        onPress={() => toggleLike(item.id)}
      >
        <Icon
          name={likedProducts.includes(item.id) ? "heart" : "heart-o"}
          size={24}
          color={likedProducts.includes(item.id) ? "red" : "#333"}
        />
      </TouchableOpacity>
      {item.images && item.images.length > 0 ? (
        <Image source={{ uri: item.images[0] }} style={styles.productImage} />
      ) : (
        <Text style={styles.noImageText}>No Image Available</Text>
      )}
      <Text style={styles.productName}>{item.name}</Text>
      <View style={styles.productInfo}>
        <Text style={styles.productPrice}>${item.price}</Text>
        <View style={styles.productStatusContainer}>
          <Icon name="check-circle" size={16} color="#007BFF" />
          <Text style={styles.productStatus}>{item.status}</Text>
        </View>
        <TouchableOpacity
          style={styles.cartIconContainer}
          onPress={() => handleAddToCart(item.id)}
        >
          <Icon name="shopping-cart" size={20} color="#007BFF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      {/* Status Bar */}
      <StatusBar backgroundColor="#8C81F3" barStyle="light-content" />

      {/* Fixed Header */}
      {renderHeader()}

      {/* Scrollable Content */}
      <ScrollView style={styles.scrollView}>
        {/* Display Search Results or Categories and Products */}
        {isSearching ? (
          <>
            <Text style={styles.sectionHeader}>Search Results</Text>
            <FlatList
              key={`search-results-${searchResults.length}`} // Force re-render when search results change
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={renderProductItem}
              numColumns={2}
              contentContainerStyle={styles.container}
              showsVerticalScrollIndicator={false}
            />
          </>
        ) : (
          <>
            <Text style={styles.sectionHeader}>Categories</Text>
            <FlatList
              key="categories" // Unique key for categories FlatList
              data={categories}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.categoryItem}
                  onPress={() => handleCategoryPress(item.name)}
                >
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.circleImage}
                  />
                  <Text style={styles.categoryName}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />

            <Text style={styles.sectionHeader}>All Products</Text>
            <FlatList
              key={`all-products-${products.length}`} // Force re-render when products change
              data={products}
              keyExtractor={(item) => item.id}
              renderItem={renderProductItem}
              numColumns={2}
              contentContainerStyle={styles.container}
              showsVerticalScrollIndicator={false}
            />
          </>
        )}
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#fff",
    paddingBottom: 20,
  },
  notificationContainer: {
    position: "absolute",
    top: 10,
    right: 16,
    alignItems: "center",
    zIndex: 1,
  },
  badgeContainer: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#FF6347",
    borderRadius: 10,
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  combinedCard: {
    backgroundColor: "#8C81F3",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    padding: 10,
    marginBottom: 20,
  },
  textContainer: {
    marginBottom: 5,
  },
  headerText: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    color: "#fff",
  },
  subHeaderText: {
    fontSize: 16,
    textAlign: "center",
    color: "#fff",
    padding: 10,
  },
  searchBoxContainer: {
    width: "100%",
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 4,
    marginBottom: 10,
    color: "#333",
    padding: 20,
  },
  categoryItem: {
    alignItems: "center",
    marginRight: 22,
    marginTop: 0,
  },
  circleImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
    resizeMode: "cover",
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 5,
  },
  productCard: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    padding: 10,
    borderRadius: 10,
    margin: 5,
    alignItems: "center",
    width: "48%",
  },
  likedProductCard: {
    backgroundColor: "rgba(40, 167, 69, 0.1)",
  },
  productImage: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    resizeMode: "cover",
  },
  noImageText: {
    fontSize: 12,
    color: "red",
    textAlign: "center",
    marginTop: 20,
  },
  productName: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 5,
    color: "#333",
  },
  productInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginTop: 10,
  },
  productPrice: {
    fontSize: 14,
    color: "#007BFF",
    fontWeight: "bold",
  },
  productStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  productStatus: {
    fontSize: 12,
    color: "#28A745",
    marginLeft: 5,
  },
  heartIconContainer: {
    position: "absolute",
    top: 15,
    right: 15,
    zIndex: 1,
  },
  cartIconContainer: {
    marginLeft: 10,
  },
  scrollView: {
    flex: 1,
  },
});

export default Index;
