import { router } from "expo-router";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
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
import Toast from "react-native-toast-message";
import Icon from "react-native-vector-icons/FontAwesome";
import { db } from "./config/firebase";

const Notifications = () => {
  const [newProducts, setNewProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNewProducts = useCallback(() => {
    console.log("Fetching new products...");
    const unsubscribe = onSnapshot(
      query(collection(db, "products"), orderBy("createdAt", "desc")),
      (querySnapshot) => {
        console.log(
          "Query snapshot received:",
          querySnapshot.size,
          "documents"
        );
        if (querySnapshot.empty) {
          console.log("No new products found");
          setNewProducts([]);
          setLoading(false);
          return;
        }

        const productPromises = querySnapshot.docs.map(async (productDoc) => {
          const productData = { id: productDoc.id, ...productDoc.data() };
          console.log("Processing product:", productData.name);

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

          console.log(
            "Product isNew status:",
            isNew,
            "for product:",
            productData.name
          );

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

            console.log(
              "Filtered new products count:",
              validNewProducts.length
            );
            setNewProducts(validNewProducts);
            setLoading(false);
          })
          .catch((error) => {
            console.error("Error processing products:", error);
            Toast.show({
              type: "error",
              text1: "Error",
              text2: "Failed to load notifications.",
            });
            setLoading(false);
          });
      },
      (error) => {
        console.error("Firestore error:", error);
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Firestore fetch failed.",
        });
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = fetchNewProducts();
    return () => unsubscribe();
  }, [fetchNewProducts]);

  const markProductAsViewed = async (productId) => {
    try {
      console.log("Marking product as viewed:", productId);
      await updateDoc(doc(db, "products", productId), { isNew: false });
      setNewProducts((prev) =>
        prev.filter((product) => product.id !== productId)
      );
      Toast.show({
        type: "success",
        text1: "Notification Viewed",
        text2: "Product marked as viewed.",
      });
    } catch (error) {
      console.error("Error marking product as viewed:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to mark notification as viewed.",
      });
    }
  };

  const renderNewProductItem = ({ item }) => (
    <TouchableOpacity
      style={styles.notificationCard}
      onPress={() => {
        markProductAsViewed(item.id);
        router.push({
          pathname: "/products/ProductsDetails",
          params: { id: item.id },
        });
      }}
    >
      <View style={styles.imageContainer}>
        {item.images.length > 0 ? (
          <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
        ) : (
          <View style={styles.noImage}>
            <Text style={styles.noImageText}>No Image</Text>
          </View>
        )}
        {item.isNew && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>New</Text>
          </View>
        )}
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.productName} numberOfLines={1}>
          {item.name || "Unnamed Product"}
        </Text>
        <Text style={styles.productPrice}>
          ETB {(item.price || 0).toFixed(2)}
        </Text>
        <View style={styles.statusContainer}>
          <Text
            style={[
              styles.productStatus,
              item.status === "In Stock" ? styles.inStock : styles.outOfStock,
            ]}
          >
            {item.status}
          </Text>
        </View>
        <Text style={styles.createdAt}>
          Added: {item.createdAt.toLocaleString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Fetching Notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerText}>New Posts</Text>
      </View>
      {newProducts.length > 0 ? (
        <FlatList
          data={newProducts}
          keyExtractor={(item) => item.id}
          renderItem={renderNewProductItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Icon name="bell-slash" size={48} color="#9CA3AF" />
          <Text style={styles.emptyText}>No new posts available</Text>
        </View>
      )}
      <Toast />
    </View>
  );
};

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    backgroundColor: "#4F46E5",
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  backButton: {
    marginRight: 16,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    padding: 10,
    borderRadius: 12,
  },
  headerText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFF",
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 24,
  },
  notificationCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  imageContainer: {
    position: "relative",
    width: 120,
    height: 120,
    borderRadius: 16,
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
  },
  noImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  noImageText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  newBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#4F46E5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  newBadgeText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },
  notificationContent: {
    flex: 1,
    marginLeft: 16,
    justifyContent: "space-between",
  },
  productName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 20,
    fontWeight: "700",
    color: "#4F46E5",
    marginBottom: 8,
  },
  statusContainer: {
    marginBottom: 8,
  },
  productStatus: {
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  inStock: {
    backgroundColor: "#D1FAE5",
    color: "#059669",
  },
  outOfStock: {
    backgroundColor: "#FEE2E2",
    color: "#DC2626",
  },
  createdAt: {
    fontSize: 12,
    color: "#6B7280",
    fontStyle: "italic",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
    color: "#4B5563",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyText: {
    fontSize: 18,
    color: "#6B7280",
    marginTop: 16,
    fontWeight: "500",
  },
});

export default Notifications;
