import { collection, getDocs, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { auth, db } from "../config/firebase";

const Posts = () => {
  const [products, setProducts] = useState([]); // State to store products
  const [loading, setLoading] = useState(true); // State to track loading status
  const user = auth.currentUser; // Get the currently logged-in user

  // Fetch products posted by the logged-in supplier
  useEffect(() => {
    const fetchProducts = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Create a query to fetch products where supplierId matches the logged-in user's UID
        const productsQuery = query(
          collection(db, "products"),
          where("supplierId", "==", user.uid)
        );

        const productsSnapshot = await getDocs(productsQuery);
        const productsList = productsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProducts(productsList);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [user]);

  // Render each product item
  const renderProductItem = ({ item }) => (
    <View style={styles.productContainer}>
      {/* Display the first image or video */}
      {item.images && item.images.length > 0 ? (
        <Image source={{ uri: item.images[0] }} style={styles.productImage} />
      ) : item.video ? (
        <Text style={styles.videoText}>Video available</Text>
      ) : (
        <Text style={styles.noMediaText}>No media available</Text>
      )}

      {/* Product Details */}
      <Text style={styles.productName}>{item.name}</Text>
      <Text style={styles.productPrice}>${item.price}</Text>
      <Text style={styles.productCategory}>Category: {item.category}</Text>
      <Text style={styles.productDescription}>{item.description}</Text>
      <Text style={styles.productStock}>Stock: {item.stockQuantity}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>My Products</Text>
      {products.length > 0 ? (
        <FlatList
          data={products}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <Text style={styles.noProductsText}>No products found.</Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f7f8fa",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  listContainer: {
    paddingBottom: 20,
  },
  productContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 10,
  },
  videoText: {
    textAlign: "center",
    color: "#007bff",
    marginBottom: 10,
  },
  noMediaText: {
    textAlign: "center",
    color: "#666",
    marginBottom: 10,
  },
  productName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 16,
    color: "#28a745",
    marginBottom: 8,
  },
  productCategory: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  productDescription: {
    fontSize: 14,
    color: "#444",
    marginBottom: 8,
  },
  productStock: {
    fontSize: 14,
    color: "#dc3545",
  },
  noProductsText: {
    textAlign: "center",
    fontSize: 16,
    color: "#666",
  },
});

export default Posts;
