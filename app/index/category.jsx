import { useLocalSearchParams, useRouter } from "expo-router";
import { collection, onSnapshot } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import SearchBox from "../../components/SearchBox";
import { db } from "../config/firebase";

const { width } = Dimensions.get("window"); // Get the width of the phone screen

const Category = () => {
  const { category } = useLocalSearchParams(); // Get the category name from the route params
  const router = useRouter(); // Use the useRouter hook for navigation
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likedProducts, setLikedProducts] = useState([]);
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(category || null);

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
        const productsList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProducts(productsList);

        // Filter products based on the selected category
        if (selectedCategory) {
          const filtered = productsList.filter(
            (product) => product.category === selectedCategory
          );
          setFilteredProducts(filtered);
        } else {
          setFilteredProducts(productsList);
        }

        setNewPostsCount(productsList.length);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeCategories();
      unsubscribeProducts();
    };
  }, [selectedCategory]);

  const toggleLike = (id) => {
    setLikedProducts((prev) =>
      prev.includes(id)
        ? prev.filter((productId) => productId !== id)
        : [...prev, id]
    );
  };

  const handleCategoryPress = (categoryName) => {
    // Navigate to the category products page
    router.push({
      pathname: "/products/CategoryProducts",
      params: { category: categoryName },
    });
  };

  const handleProductPress = (id) => {
    router.push({
      pathname: "/products/ProductsDetails",
      params: { id }, // Pass product ID to the details page
    });
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.scrollViewContent}
      ListHeaderComponent={
        <>
          <View style={styles.notificationContainer}>
            <Icon name="bell" size={24} color="#ECECEC" />
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
              <SearchBox />
            </View>
          </View>

          {/* Categories Section */}
          <Text style={styles.sectionHeader}>Categories</Text>
          <View style={styles.categoryList}>
            {categories.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.categoryItem}
                onPress={() => handleCategoryPress(item.name)}
              >
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.circleImage}
                  onError={(e) =>
                    console.log("Image load error:", e.nativeEvent.error)
                  }
                />
                <Text style={styles.categoryName}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Products Section Header */}
          <Text style={styles.sectionHeader}>
            {selectedCategory
              ? `Products in ${selectedCategory}`
              : "Most Reviewed"}
          </Text>
        </>
      }
      data={filteredProducts}
      keyExtractor={(item) => item.id}
      numColumns={2}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.productCard}
          onPress={() => handleProductPress(item.id)}
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
          <TouchableOpacity onPress={() => handleProductPress(item.id)}>
            {item.images && item.images.length > 0 ? (
              <Image
                source={{ uri: item.images[0] }}
                style={styles.productImage}
                onError={(e) =>
                  console.log("Image load error:", e.nativeEvent.error)
                }
              />
            ) : (
              <Text style={styles.noImageText}>No Image Available</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.productName}>{item.name}</Text>
          <View style={styles.productInfo}>
            <Text style={styles.productPrice}>${item.price}</Text>
            <View style={styles.productStatusContainer}>
              <Icon name="check-circle" size={16} color="#007BFF" />
              <Text style={styles.productStatus}>{item.status}</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}
      ListFooterComponent={<View style={{ height: 20 }} />}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollViewContent: {
    padding: 16,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  combinedCard: {
    backgroundColor: "#8C81F3", // Updated color for the combined card
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
    width: width - 32, // Set width to screen width minus padding
    alignSelf: "center", // Center the card horizontally
  },
  textContainer: {
    marginBottom: 10,
  },
  headerText: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    color: "#fff", // White text for better contrast
  },
  subHeaderText: {
    fontSize: 14,
    textAlign: "center",
    color: "#fff", // White text for better contrast
    padding: 10,
  },
  searchBoxContainer: {},
  sectionHeader: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
    color: "#333",
  },
  categoryList: {
    flexDirection: "column",
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  circleImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    resizeMode: "cover",
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
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
  productImage: {
    width: "100%",
    height: 180,
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
    top: 10,
    right: 10,
  },
});

export default Category;
