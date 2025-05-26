import {
  collection,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { auth, db } from "../config/firebase";

const Notifications = () => {
  const [verifiedProducts, setVerifiedProducts] = useState([]);
  const [rejectedProducts, setRejectedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const user = auth.currentUser;

  // Add function to mark notifications as read
  const markNotificationsAsRead = useCallback(async () => {
    if (!user) return;

    try {
      const unreadQuery = query(
        collection(db, "products"),
        where("supplierId", "==", user.uid),
        where("isRead", "==", false),
        where("status", "in", ["verified", "rejected"])
      );

      const unreadSnapshot = await getDocs(unreadQuery);

      const updatePromises = unreadSnapshot.docs.map(async (doc) => {
        await updateDoc(doc.ref, { isRead: true });
      });

      await Promise.all(updatePromises);
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  }, [user]);

  // Call markNotificationsAsRead when component mounts
  useEffect(() => {
    if (user) {
      markNotificationsAsRead();
    }
  }, [markNotificationsAsRead, user]);

  const setupProductListener = useCallback(
    (status, setProducts) => {
      if (!user) return () => {};

      const productQuery = query(
        collection(db, "products"),
        where("supplierId", "==", user.uid),
        where("status", "==", status)
      );

      return onSnapshot(
        productQuery,
        async (snapshot) => {
          try {
            const productsData = await Promise.all(
              snapshot.docs.map(async (doc) => {
                const data = doc.data();
                const productData = {
                  id: doc.id,
                  ...data,
                  images: data.images || [],
                  name: data.name || "Unnamed Product",
                  price: data.price || 0,
                  verifiedAt: data.verifiedAt || null,
                  rejectedAt: data.rejectedAt || null,
                  rejectionReason: data.rejectionReason || "",
                  status: data.status || "pending",
                  isRead: data.isRead || false,
                  variants: [],
                  totalStock: 0,
                  priceRange: { min: 0, max: 0 },
                };

                // Fetch variants
                try {
                  const variantsRef = collection(
                    db,
                    "products",
                    doc.id,
                    "variants"
                  );
                  const variantsSnap = await getDocs(variantsRef);
                  const variantsData = variantsSnap.docs.map((variantDoc) => ({
                    id: variantDoc.id,
                    ...variantDoc.data(),
                    stock: variantDoc.data().stock || 0,
                    price: Number(variantDoc.data().price) || 0,
                  }));

                  const totalStock = variantsData.reduce(
                    (sum, variant) => sum + variant.stock,
                    0
                  );
                  const prices = variantsData
                    .map((variant) => variant.price)
                    .filter((price) => !isNaN(price));
                  const priceRange =
                    prices.length > 0
                      ? { min: Math.min(...prices), max: Math.max(...prices) }
                      : { min: productData.price, max: productData.price };

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
                  return productData;
                }
              })
            );

            setProducts(productsData);
          } catch (error) {
            console.error(`Error processing ${status} products:`, error);
            setError(`Failed to load ${status} products. Please try again.`);
          }
        },
        (error) => {
          console.error(`Error fetching ${status} products:`, error);
          setError(`Failed to load ${status} products. Please try again.`);
        }
      );
    },
    [user]
  );

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribeVerified = setupProductListener(
      "verified",
      setVerifiedProducts
    );
    const unsubscribeRejected = setupProductListener(
      "rejected",
      setRejectedProducts
    );
    setLoading(false);

    return () => {
      unsubscribeVerified();
      unsubscribeRejected();
    };
  }, [user, setupProductListener]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    try {
      const date = timestamp.toDate();
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };

  const renderProductItem = ({ item, type }) => (
    <View style={[styles.productCard, !item.isRead && styles.unreadCard]}>
      <View style={styles.productHeader}>
        <View style={styles.statusContainer}>
          <Ionicons
            name={type === "verified" ? "checkmark-circle" : "close-circle"}
            size={24}
            color={type === "verified" ? "#10B981" : "#EF4444"}
          />
          <Text
            style={[
              styles.statusText,
              { color: type === "verified" ? "#10B981" : "#EF4444" },
            ]}
          >
            {type === "verified" ? "Verified" : "Rejected"}
          </Text>
          {!item.isRead && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.dateText}>
          {formatDate(type === "verified" ? item.verifiedAt : item.rejectedAt)}
        </Text>
      </View>

      <View style={styles.productContent}>
        <Image
          source={{
            uri: item.images[0] || "https://via.placeholder.com/100",
          }}
          style={styles.productImage}
        />
        <View style={styles.productDetails}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.priceText}>
            {item.priceRange.min === item.priceRange.max
              ? `ETB ${item.priceRange.min.toFixed(2)}`
              : `ETB ${item.priceRange.min.toFixed(
                  2
                )} - ${item.priceRange.max.toFixed(2)}`}
          </Text>
          <Text style={styles.variantsText}>
            {item.variants.length}{" "}
            {item.variants.length === 1 ? "Variant" : "Variants"}
            {" • "}Total Stock: {item.totalStock}
          </Text>
        </View>
      </View>

      {type === "rejected" && item.rejectionReason && (
        <View style={styles.rejectionContainer}>
          <Text style={styles.rejectionTitle}>Rejection Reason:</Text>
          <Text style={styles.rejectionText}>{item.rejectionReason}</Text>
        </View>
      )}
    </View>
  );

  const renderSection = (title, data, type) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {data && data.length > 0 ? (
        data.map((item) => (
          <View key={item.id}>{renderProductItem({ item, type })}</View>
        ))
      ) : (
        <Text style={styles.emptyText}>No {title.toLowerCase()} yet</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066FF" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListHeaderComponent={
        <>
          <Text style={styles.pageTitle}>Product Notifications</Text>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </>
      }
      data={[]}
      renderItem={null}
      ListFooterComponent={
        <>
          {renderSection("Verified Products", verifiedProducts, "verified")}
          {renderSection("Rejected Products", rejectedProducts, "rejected")}
        </>
      }
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    padding: 16,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  productCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "600",
  },
  dateText: {
    fontSize: 12,
    color: "#6B7280",
  },
  productContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  priceText: {
    fontSize: 15,
    color: "#059669",
    fontWeight: "500",
    marginBottom: 4,
  },
  variantsText: {
    fontSize: 13,
    color: "#6B7280",
  },
  rejectionContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  rejectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#DC2626",
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: 13,
    color: "#7F1D1D",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#374151",
  },
  errorContainer: {
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 14,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    fontStyle: "italic",
    textAlign: "center",
    padding: 16,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#3b82f6",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3b82f6",
    marginLeft: 8,
  },
});

export default Notifications;
