import LoadingDots from "@/components/LoadingDots";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  FlatList,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { db } from "../config/firebase";

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchUserProfileAndOrders = async () => {
      setLoading(true);
      setError(null);
      try {
        const profileJson = await AsyncStorage.getItem("userProfile");
        if (profileJson) {
          const profile = JSON.parse(profileJson);
          if (profile && profile.email) {
            setUserEmail(profile.email);

            const ordersRef = collection(db, "orders");
            const q = query(ordersRef, where("userEmail", "==", profile.email));
            const querySnapshot = await getDocs(q);

            const fetchedOrders = [];
            querySnapshot.forEach((doc) => {
              fetchedOrders.push({ id: doc.id, ...doc.data() });
            });
            fetchedOrders.sort((a, b) => {
              const dateA = a.createdAt?.toDate
                ? a.createdAt.toDate()
                : new Date(0);
              const dateB = b.createdAt?.toDate
                ? b.createdAt.toDate()
                : new Date(0);
              return dateB - dateA;
            });
            setOrders(fetchedOrders);
          } else {
            setError(
              "Could not find user email in profile. Please log in again."
            );
          }
        } else {
          setError("User profile not found. Please log in again.");
          router.replace("/user/LoginPage");
        }
      } catch (err) {
        setError(
          err.message || "An error occurred while fetching your orders."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfileAndOrders();
  }, []);

  const handleCopyOrderId = (orderId) => {
    Clipboard.setString(orderId);
    Toast.show({
      type: "success",
      text1: "Order ID Copied",
      text2: "Order ID has been copied to clipboard",
      position: "bottom",
    });
  };

  const handleContactSupport = (order) => {
    const orderDetails = `Order ID: ${
      order.transactionRef || order.id
    }\nDate: ${
      order.createdAt
        ? new Date(
            order.createdAt.toDate ? order.createdAt.toDate() : order.createdAt
          ).toLocaleDateString()
        : "N/A"
    }\nTotal: ${order.totalAmount?.toFixed(2) || "N/A"} ETB\nStatus: ${
      order.status || "N/A"
    }\nItems: ${order.cartItems
      ?.map((item) => `${item.name} (x${item.quantity})`)
      .join(", ")}`.trim();

    router.push({
      pathname: "/customerservice/chat",
      params: { orderDetails },
    });
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        status: "delivered",
        acceptedBy: userEmail,
        deliveryAcceptedAt: serverTimestamp(),
      });

      setOrders(
        orders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: "delivered",
                acceptedBy: userEmail,
              }
            : order
        )
      );

      Toast.show({
        type: "success",
        text1: "Order Accepted",
        text2: "Order has been marked as delivered",
        position: "bottom",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to update order status",
        position: "bottom",
      });
    }
  };

  const handleSubmitReview = async () => {
    if (rating === 0) {
      Alert.alert("Error", "Please select a star rating.");
      return;
    }
    if (!selectedProduct || !selectedProduct.productId) {
      Alert.alert("Error", "Product information is missing for review.");
      return;
    }
    if (!selectedOrder) {
      Alert.alert("Error", "Order information is missing for review.");
      return;
    }

    setLoading(true);
    try {
      const customerName = selectedOrder.customerDetails
        ? `${selectedOrder.customerDetails.firstName} ${selectedOrder.customerDetails.lastName}`
        : "Anonymous";

      const reviewData = {
        productId: selectedProduct.productId,
        productName: selectedProduct.name,
        rating: rating,
        stars: rating,
        reviewText: reviewText.trim(),
        userEmail: userEmail,
        customerName: customerName,
        createdAt: serverTimestamp(),
        orderId: selectedOrder.id,
        orderData: {
          orderDate: selectedOrder.createdAt?.toDate
            ? selectedOrder.createdAt.toDate()
            : selectedOrder.createdAt,
          totalAmount: selectedOrder.totalAmount,
          status: selectedOrder.status,
          shippingAddress: selectedOrder.shippingAddress,
        },
        productData: {
          imageUrl: selectedProduct.imageUrl,
          price: selectedProduct.price,
          quantity: selectedProduct.quantity,
          variantDetails: selectedProduct.variantDetails,
        },
      };

      await addDoc(collection(db, "reviews"), reviewData);

      Toast.show({
        type: "success",
        text1: "Review Submitted",
        text2: `Thank you for reviewing ${selectedProduct.name}!`,
      });

      const currentIndex = selectedOrder.cartItems.findIndex(
        (item) => item.id === selectedProduct.id
      );
      if (currentIndex < selectedOrder.cartItems.length - 1) {
        const nextCartItem = selectedOrder.cartItems[currentIndex + 1];
        const nextProduct = {
          ...nextCartItem,
          productId: nextCartItem.id?.split("_")[0],
        };
        if (!nextProduct.productId) {
          Alert.alert(
            "Error",
            "Could not find next product information for review."
          );
          setLoading(false);
          setShowReviewModal(false);
          return;
        }
        setSelectedProduct(nextProduct);
        setRating(0);
        setReviewText("");
      } else {
        setShowReviewModal(false);
        setSelectedOrder(null);
        setSelectedProduct(null);
        setRating(0);
        setReviewText("");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to submit review. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return styles.statusPending;
      case "accepted":
        return styles.statusAccepted;
      case "shipped":
        return styles.statusShipped;
      case "delivered":
        return styles.statusDelivered;
      case "cancelled":
        return styles.statusCancelled;
      case "success":
        return styles.statusSuccess;
      default:
        return styles.statusDefault;
    }
  };

  const renderOrderItem = ({ item }) => (
    <View style={styles.orderItemContainer}>
      <View style={styles.orderHeader}>
        <View style={styles.orderIdContainer}>
          <Ionicons
            name="receipt-outline"
            size={20}
            color="#4B5563"
            style={styles.headerIcon}
          />
          <Text style={styles.orderIdText}>Order ID: </Text>
          <Text style={styles.orderIdValue} selectable>
            {item.transactionRef || item.id}
          </Text>
          <TouchableOpacity
            onPress={() => handleCopyOrderId(item.transactionRef || item.id)}
            style={styles.copyButton}
          >
            <Ionicons name="copy-outline" size={18} color="#1E40AF" />
          </TouchableOpacity>
        </View>
        <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
          <Text style={styles.statusText}>
            {item.status ? item.status.toUpperCase() : "PENDING"}
          </Text>
        </View>
      </View>

      <View style={styles.orderDetailsGrid}>
        <View style={styles.detailItemContainer}>
          <Ionicons
            name="calendar-outline"
            size={16}
            color="#6B7280"
            style={styles.detailIcon}
          />
          <Text style={styles.detailLabel}>Date: </Text>
          <Text style={styles.detailValue}>
            {item.createdAt
              ? new Date(
                  item.createdAt.toDate
                    ? item.createdAt.toDate()
                    : item.createdAt
                ).toLocaleDateString()
              : "N/A"}
          </Text>
        </View>
        <View style={styles.detailItemContainerRight}>
          <Ionicons
            name="cash-outline"
            size={16}
            color="#6B7280"
            style={styles.detailIcon}
          />
          <Text style={styles.detailLabel}>Total: </Text>
          <Text style={styles.detailValueEmphasized}>
            ETB {item.totalAmount?.toFixed(2) || "N/A"}
          </Text>
        </View>
      </View>

      {item.cartItems && item.cartItems.length > 0 && (
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>
            Items ({item.cartItems.length})
          </Text>
          {item.cartItems.map((cartItem, index) => (
            <View key={index} style={styles.cartItem}>
              <Image
                source={{
                  uri: cartItem.imageUrl || "https://via.placeholder.com/60",
                }}
                style={styles.cartItemImage}
              />
              <View style={styles.cartItemInfo}>
                <Text style={styles.cartItemName} numberOfLines={1}>
                  {cartItem.name}
                </Text>
                <Text style={styles.cartItemQuantity}>
                  Qty: {cartItem.quantity}
                </Text>
                {cartItem.variantDetails && (
                  <Text style={styles.cartItemVariantDetails} numberOfLines={1}>
                    {Object.entries(cartItem.variantDetails)
                      .filter(([key]) => key !== "variantId")
                      .map(
                        ([key, value]) =>
                          `${
                            key.charAt(0).toUpperCase() + key.slice(1)
                          }: ${value}`
                      )
                      .join(" / ")}
                  </Text>
                )}
              </View>
              <Text style={styles.cartItemPrice}>
                ETB {(cartItem.price * cartItem.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {item.shippingAddress && (
        <View style={styles.addressSection}>
          <Text style={styles.sectionTitle}>Shipping Address</Text>
          <View style={styles.addressTextContainer}>
            <Ionicons
              name="location-outline"
              size={18}
              color="#4B5563"
              style={styles.addressIcon}
            />
            <Text style={styles.addressText}>
              {item.shippingAddress.address}, {item.shippingAddress.apartment},{" "}
              {item.shippingAddress.city}, {item.shippingAddress.country}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.supportButton]}
          onPress={() => handleContactSupport(item)}
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={18}
            color="#1D4ED8"
          />
          <Text style={[styles.actionButtonText, styles.supportButtonText]}>
            Contact Support
          </Text>
        </TouchableOpacity>

        {item.status !== "delivered" ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleAcceptOrder(item.id)}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={18}
              color="#FFFFFF"
            />
            <Text style={[styles.actionButtonText, { color: "#FFFFFF" }]}>
              Accept
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.reviewButton]}
            onPress={() => {
              const firstProduct = {
                ...item.cartItems[0],
                productId: item.cartItems[0].id?.split("_")[0],
              };
              setSelectedOrder(item);
              setSelectedProduct(firstProduct);
              setShowReviewModal(true);
            }}
          >
            <Ionicons name="star-outline" size={18} color="#059669" />
            <Text style={[styles.actionButtonText, styles.reviewButtonText]}>
              Review Order
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderReviewModal = () => (
    <Modal
      visible={showReviewModal}
      animationType="fade"
      transparent={true}
      onRequestClose={() => {
        setShowReviewModal(false);
        setRating(0);
        setReviewText("");
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowReviewModal(false)}
          >
            <Ionicons name="close-circle" size={28} color="#9CA3AF" />
          </TouchableOpacity>

          <Text style={styles.modalTitle}>Rate Product</Text>

          {selectedProduct && (
            <View style={styles.reviewProductInfo}>
              <Image
                source={{
                  uri:
                    selectedProduct.imageUrl ||
                    "https://via.placeholder.com/80",
                }}
                style={styles.reviewProductImage}
              />
              <View style={styles.reviewProductDetails}>
                <Text style={styles.reviewProductName} numberOfLines={2}>
                  {selectedProduct.name}
                </Text>
                {selectedProduct.variantDetails && (
                  <Text style={styles.reviewProductVariant} numberOfLines={1}>
                    {Object.entries(selectedProduct.variantDetails)
                      .filter(([key]) => key !== "variantId")
                      .map(
                        ([key, value]) =>
                          `${
                            key.charAt(0).toUpperCase() + key.slice(1)
                          }: ${value}`
                      )
                      .join(" / ")}
                  </Text>
                )}
              </View>
            </View>
          )}

          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                style={styles.starButton}
              >
                <Ionicons
                  name={star <= rating ? "star" : "star-outline"}
                  size={36}
                  color={star <= rating ? "#FBBF24" : "#D1D5DB"}
                />
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.reviewTextInput}
            placeholder="Share your thoughts (optional)"
            placeholderTextColor="#9CA3AF"
            value={reviewText}
            onChangeText={setReviewText}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={styles.submitReviewButton}
            onPress={handleSubmitReview}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitReviewButtonText}>Submit Review</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading && orders.length === 0) {
    return (
      <View style={{ marginTop: 300 }}>
        <LoadingDots />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredMessageContainer}>
        <MaterialIcons name="error-outline" size={60} color="#EF4444" />
        <Text style={styles.messageTitle}>Oops! Something went wrong.</Text>
        <Text style={styles.messageText}>{error}</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.replace("/user/LoginPage")}
        >
          <Text style={styles.primaryButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (orders.length === 0 && !loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <LinearGradient
          colors={["#1E40AF", "#3B82F6", "#60A5FA"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerBackButton}
          >
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Orders</Text>
          <View style={{ width: 24 }} />
          {/* For balance */}
        </LinearGradient>
        <View style={styles.centeredMessageContainer}>
          <Ionicons
            name="file-tray-stacked-outline"
            size={70}
            color="#94A3B8"
          />
          <Text style={styles.messageTitle}>No Orders Yet</Text>
          <Text style={styles.messageText}>
            Looks like you haven't placed any orders. Time to shop!
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace("/")}
          >
            <Ionicons
              name="cart-outline"
              size={20}
              color="#FFF"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.primaryButtonText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["#1E40AF", "#3B82F6", "#60A5FA"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBackButton}
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={{ width: 24 }} />
        {/* For balance */}
      </LinearGradient>

      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContentContainer}
        showsVerticalScrollIndicator={false}
      />
      {renderReviewModal()}
      <Toast />
    </View>
  );
};

export default Orders;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7FC",
  },
  headerGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "android" ? 45 : 55,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  headerBackButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  loadingScreenGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingScreenText: {
    fontSize: 16,
    color: "#FFFFFF",
    marginTop: 12,
    fontWeight: "500",
  },
  centeredMessageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F4F7FC",
  },
  messageTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#1E293B",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  messageText: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1E40AF",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  listContentContainer: {
    padding: 16,
  },
  orderItemContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  orderIdContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerIcon: {
    marginRight: 6,
  },
  orderIdText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4B5563",
  },
  orderIdValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    flexShrink: 1,
    marginRight: 6,
  },
  copyButton: {
    padding: 4,
  },
  statusBadge: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    minWidth: 80,
    alignItems: "center",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  statusPending: { backgroundColor: "#F59E0B" },
  statusAccepted: { backgroundColor: "#F59E0B" },
  statusShipped: { backgroundColor: "#3B82F6" },
  statusDelivered: { backgroundColor: "#10B981" },
  statusCancelled: { backgroundColor: "#EF4444" },
  statusSuccess: { backgroundColor: "#10B981" },
  statusDefault: { backgroundColor: "#6B7280" },

  orderDetailsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  detailItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  detailItemContainerRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flex: 1,
  },
  detailIcon: {
    marginRight: 5,
  },
  detailLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  detailValue: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
  },
  detailValueEmphasized: {
    fontSize: 14,
    color: "#1E40AF",
    fontWeight: "600",
  },
  itemsSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 10,
  },
  cartItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  cartItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: "#E2E8F0",
  },
  cartItemInfo: {
    flex: 1,
    justifyContent: "center",
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#2D3748",
    marginBottom: 2,
  },
  cartItemQuantity: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 2,
  },
  cartItemVariantDetails: {
    fontSize: 12,
    color: "#6B7280",
  },
  cartItemPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E3A8A",
    marginLeft: 8,
  },
  addressSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  addressTextContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  addressIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  addressText: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
    flex: 1,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 10,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 6,
  },
  supportButton: {
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
  },
  supportButtonText: {
    color: "#1D4ED8",
  },
  acceptButton: {
    borderColor: "#10B981",
    backgroundColor: "#10B981",
  },
  reviewButton: {
    borderColor: "#A7F3D0",
    backgroundColor: "#D1FAE5",
  },
  reviewButtonText: {
    color: "#065F46",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  modalCloseButton: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 5,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 10,
    textAlign: "center",
  },
  reviewProductInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  reviewProductImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  reviewProductDetails: {
    flex: 1,
  },
  reviewProductName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 3,
  },
  reviewProductVariant: {
    fontSize: 12,
    color: "#64748B",
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 15,
  },
  starButton: {
    padding: 5,
  },
  reviewTextInput: {
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: "#1E293B",
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  submitReviewButton: {
    backgroundColor: "#1E40AF",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitReviewButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
