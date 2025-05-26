import { collection, getDocs, query, where } from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { auth, db } from "../config/firebase";

const Posts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const user = auth.currentUser;

  const fetchProducts = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      // Query products
      const productsQuery = query(
        collection(db, "products"),
        where("supplierId", "==", user.uid)
      );

      const productsSnapshot = await getDocs(productsQuery);
      const productsPromises = productsSnapshot.docs.map(async (doc) => {
        const productData = {
          id: doc.id,
          ...doc.data(),
          images: doc.data().images || [], // Ensure images is always an array
          video: doc.data().video || null, // Ensure video has a default value
          category: doc.data().category || "Uncategorized", // Default category
          description: doc.data().description || "", // Default empty description
          name: doc.data().name || "Unnamed Product", // Default product name
        };

        // Fetch variants for each product
        try {
          const variantsRef = collection(db, "products", doc.id, "variants");
          const variantsSnap = await getDocs(variantsRef);
          const variantsData = variantsSnap.docs.map((variantDoc) => ({
            id: variantDoc.id,
            ...variantDoc.data(),
            stock: variantDoc.data().stock || 0, // Ensure stock has a default value
            price: Number(variantDoc.data().price) || 0, // Ensure price is a number
          }));

          // Calculate total stock and price range from variants
          const totalStock = variantsData.reduce(
            (sum, variant) => sum + variant.stock,
            0
          );
          const prices = variantsData
            .map((variant) => variant.price)
            .filter((price) => !isNaN(price));
          const priceRange =
            prices.length > 0
              ? {
                  min: Math.min(...prices),
                  max: Math.max(...prices),
                }
              : { min: 0, max: 0 }; // Default price range

          return {
            ...productData,
            variants: variantsData,
            totalStock,
            priceRange,
          };
        } catch (variantError) {
          console.error(
            `Error fetching variants for product ${doc.id}:`,
            variantError
          );
          return {
            ...productData,
            variants: [],
            totalStock: 0,
            priceRange: { min: 0, max: 0 },
          };
        }
      });

      const productsWithVariants = await Promise.all(productsPromises);
      setProducts(productsWithVariants);
    } catch (error) {
      console.error("Error fetching products:", error);
      setError("Failed to load products. Please try again.");
      setProducts([]); // Ensure products is always an array
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const ProductItem = ({ item }) => (
    <View style={styles.productCard}>
      <View style={styles.mediaContainer}>
        {item.images && item.images.length > 0 ? (
          <Image
            source={{ uri: item.images[0] }}
            style={styles.productImage}
            resizeMode="cover"
          />
        ) : item.video ? (
          <View style={styles.videoPlaceholder}>
            <Text style={styles.videoText}>Video Content</Text>
          </View>
        ) : (
          <View style={styles.noMedia}>
            <Text style={styles.noMediaText}>No Media</Text>
          </View>
        )}
      </View>

      <View style={styles.productDetails}>
        <Text style={styles.productName}>{item.name || "Unnamed Product"}</Text>

        {/* Price Range Display */}
        <Text style={styles.productPrice}>
          {item.priceRange
            ? item.priceRange.min === item.priceRange.max
              ? `$${item.priceRange.min.toFixed(2)}`
              : `$${item.priceRange.min.toFixed(
                  2
                )} - $${item.priceRange.max.toFixed(2)}`
            : "Price not set"}
        </Text>

        <Text style={styles.productCategory}>
          {item.category || "Uncategorized"}
        </Text>

        <Text style={styles.productDescription} numberOfLines={2}>
          {item.description || "No description available"}
        </Text>

        {/* Variants Summary */}
        <View style={styles.variantsSummary}>
          <Text style={styles.variantsTitle}>
            {(item.variants || []).length}{" "}
            {(item.variants || []).length === 1 ? "Variant" : "Variants"}
          </Text>
          <Text style={styles.variantsStock}>
            Total Stock: {item.totalStock || 0}
          </Text>
        </View>

        {/* Stock Status */}
        <Text
          style={[
            styles.productStock,
            { color: (item.totalStock || 0) > 0 ? "#28a745" : "#dc3545" },
          ]}
        >
          {(item.totalStock || 0) > 0
            ? `In Stock: ${item.totalStock}`
            : "Out of Stock"}
        </Text>
      </View>
    </View>
  );

  const renderHeader = () => (
    <>
      <Text style={styles.pageTitle}>My Products</Text>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>
        {user ? "No products found." : "Please sign in to view products."}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading Products...</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={products}
      renderItem={ProductItem}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmpty}
      contentContainerStyle={styles.productList}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f6f8",
  },
  productList: {
    padding: 16,
    paddingBottom: 20,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 20,
    textAlign: "center",
  },
  productCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  mediaContainer: {
    width: "100%",
    height: 220,
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  videoPlaceholder: {
    flex: 1,
    backgroundColor: "#e9ecef",
    justifyContent: "center",
    alignItems: "center",
  },
  videoText: {
    color: "#007bff",
    fontSize: 16,
    fontWeight: "500",
  },
  noMedia: {
    flex: 1,
    backgroundColor: "#f1f3f5",
    justifyContent: "center",
    alignItems: "center",
  },
  noMediaText: {
    color: "#6c757d",
    fontSize: 14,
  },
  productDetails: {
    padding: 16,
  },
  productName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: "500",
    color: "#28a745",
    marginBottom: 6,
  },
  productCategory: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 6,
    textTransform: "capitalize",
  },
  productDescription: {
    fontSize: 14,
    color: "#495057",
    marginBottom: 8,
    lineHeight: 20,
  },
  variantsSummary: {
    backgroundColor: "#f8f9fa",
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  variantsTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  variantsStock: {
    fontSize: 13,
    color: "#6c757d",
  },
  productStock: {
    fontSize: 14,
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f6f8",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#495057",
  },
  errorContainer: {
    backgroundColor: "#ffe5e5",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: "#dc3545",
    fontSize: 14,
    textAlign: "center",
  },
  emptyState: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#6c757d",
    textAlign: "center",
  },
});

export default Posts;
