import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import LottieView from "lottie-react-native";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { EventRegister } from "react-native-event-listeners";
import Toast, { BaseToast } from "react-native-toast-message";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import emptyCartAnimation from "../../assets/empty-cart.json"; // Import Lottie JSON
import LoadingDots from "../../components/LoadingDots";
import { auth } from "../config/firebase";

const { width } = Dimensions.get("window");

// Constants
const TOAST_VISIBILITY_TIME = 3000;

// Toast configuration
const toastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: "#10B981",
        backgroundColor: "#F0FDF4",
        height: 60,
        borderRadius: 8,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 15, fontWeight: "600", color: "#047857" }}
      text2Style={{ fontSize: 13, color: "#065F46" }}
    />
  ),
  error: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: "#EF4444",
        backgroundColor: "#FEF2F2",
        height: 60,
        borderRadius: 8,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 15, fontWeight: "600", color: "#B91C1C" }}
      text2Style={{ fontSize: 13, color: "#991B1B" }}
    />
  ),
  info: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: "#3B82F6",
        backgroundColor: "#EFF6FF",
        height: 60,
        borderRadius: 8,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 15, fontWeight: "600", color: "#1D4ED8" }}
      text2Style={{ fontSize: 13, color: "#1E40AF" }}
    />
  ),
};

// Type for cart item (for better type safety in JavaScript)
const CartItem = {
  id: String,
  name: String,
  price: Number,
  quantity: Number,
  stock: Number || null,
  imageUrl: String || null,
  variantDetails: Object || null,
};

const CartScreen = () => {
  const [cart, setCart] = useState([]);
  const [loadingCart, setLoadingCart] = useState(true);
  const lottieRef = useRef(null);

  // Debounce function for quantity updates
  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadData = async () => {
        setLoadingCart(true);

        // Simulate slight delay to prevent flickering
        await new Promise((resolve) => setTimeout(resolve, 300));

        try {
          const cartString = await AsyncStorage.getItem("cart");
          if (isActive && cartString) {
            try {
              const parsedCart = JSON.parse(cartString);
              if (Array.isArray(parsedCart)) {
                setCart(parsedCart);
              } else {
                throw new Error("Invalid cart data format");
              }
            } catch (error) {
              throw new Error("Failed to parse cart data");
            }
          } else {
            setCart([]);
          }
        } catch (error) {
          console.error("Error loading cart:", error);
          if (isActive) {
            Toast.show({
              type: "error",
              text1: "Error",
              text2: "Failed to load cart. Please try again.",
              visibilityTime: TOAST_VISIBILITY_TIME,
            });
          }
        } finally {
          if (isActive) setLoadingCart(false);
        }
      };

      loadData();
      lottieRef.current?.play();

      return () => {
        isActive = false;
        lottieRef.current?.pause();
      };
    }, [])
  );

  const updateQuantity = useCallback(
    debounce(async (itemId, newQuantity) => {
      let stockLimitReached = false;
      const updatedCart = cart.map((item) => {
        if (item.id === itemId) {
          const maxQuantity =
            item.stock != null && item.stock >= 0 ? item.stock : Infinity;
          const clampedQuantity = Math.max(
            1,
            Math.min(newQuantity, maxQuantity)
          );
          if (newQuantity > maxQuantity && maxQuantity !== Infinity) {
            stockLimitReached = true;
          }
          return { ...item, quantity: clampedQuantity };
        }
        return item;
      });

      setCart(updatedCart);
      try {
        await AsyncStorage.setItem("cart", JSON.stringify(updatedCart));

        // Emit event to update cart badge count
        EventRegister.emit("cartUpdated", { count: updatedCart.length });

        if (stockLimitReached) {
          Toast.show({
            type: "info",
            text1: "Stock Limit",
            text2: "Quantity adjusted to available stock.",
            visibilityTime: TOAST_VISIBILITY_TIME,
          });
        }
      } catch (error) {
        console.error("Error updating cart:", error);
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to update cart. Please try again.",
          visibilityTime: TOAST_VISIBILITY_TIME,
        });
      }
    }, 300),
    [cart]
  );

  const removeFromCart = useCallback(
    async (itemId) => {
      const updatedCart = cart.filter((item) => item.id !== itemId);
      setCart(updatedCart);
      try {
        await AsyncStorage.setItem("cart", JSON.stringify(updatedCart));

        // Emit event to update cart badge count
        EventRegister.emit("cartUpdated", { count: updatedCart.length });

        Toast.show({
          type: "success",
          text1: "Item Removed",
          text2: "Item removed from cart successfully.",
          visibilityTime: TOAST_VISIBILITY_TIME,
        });
      } catch (error) {
        console.error("Error removing from cart:", error);
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to remove item. Please try again.",
          visibilityTime: TOAST_VISIBILITY_TIME,
        });
      }
    },
    [cart]
  );

  const handleCheckout = useCallback(() => {
    if (!auth.currentUser) {
      Toast.show({
        type: "error",
        text1: "Login Required",
        text2: "Please log in or register to proceed.",
        visibilityTime: TOAST_VISIBILITY_TIME,
      });
      router.push("/user/RegisterUser");
      return;
    }

    if (cart.length === 0) {
      Toast.show({
        type: "error",
        text1: "Empty Cart",
        text2: "Add items to your cart before checking out.",
        visibilityTime: TOAST_VISIBILITY_TIME,
      });
      return;
    }

    const outOfStockItem = cart.find(
      (item) => item.stock != null && item.quantity > item.stock
    );
    if (outOfStockItem) {
      Toast.show({
        type: "error",
        text1: "Stock Issue",
        text2: `${outOfStockItem.name} quantity exceeds available stock (${
          outOfStockItem.stock ?? 0
        }). Please adjust.`,
        visibilityTime: TOAST_VISIBILITY_TIME,
      });
      return;
    }

    router.push({
      pathname: "/products/checkout",
      params: {
        cart: JSON.stringify(cart),
        totalAmount: total.toFixed(2),
      },
    });
  }, [cart, total]);

  const renderCartItem = useCallback(
    ({ item }) => (
      <View style={styles.cartItem}>
        <View style={styles.itemImageContainer}>
          <Image
            source={{ uri: item.imageUrl || "https://via.placeholder.com/80" }}
            style={styles.itemImage}
            resizeMode="cover"
            accessibilityLabel={`Image of ${item.name}`}
          />
          {item.stock <= 3 && item.stock > 0 && (
            <View style={styles.limitedStockBadge}>
              <Text style={styles.limitedStockText}>Limited Stock</Text>
            </View>
          )}
        </View>

        <View style={styles.itemDetails}>
          <View style={styles.nameRow}>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.name || "Unknown Item"}
            </Text>
            <TouchableOpacity
              style={styles.removeIconButton}
              onPress={() => removeFromCart(item.id)}
              accessibilityLabel={`Remove ${item.name} from cart`}
            >
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {item.variantDetails &&
            Object.keys(item.variantDetails).length > 0 && (
              <View style={styles.variantContainer}>
                {Object.entries(item.variantDetails).map(
                  ([key, value], index) => (
                    <View key={index} style={styles.variantPill}>
                      <Text style={styles.variantText}>{value}</Text>
                    </View>
                  )
                )}
              </View>
            )}

          <View style={styles.priceStockRow}>
            <Text style={styles.itemPrice}>
              ${(item.price || 0).toFixed(2)}
            </Text>
            <Text
              style={[
                styles.itemStock,
                item.stock <= 3 && item.stock > 0 ? styles.limitedStock : null,
                item.stock <= 0 ? styles.outOfStock : null,
              ]}
            >
              {item.stock > 10
                ? "In Stock"
                : item.stock > 0
                ? `${item.stock} left`
                : "Out of Stock"}
            </Text>
          </View>

          <View style={styles.quantityRow}>
            <View style={styles.quantityContainer}>
              <TouchableOpacity
                style={[
                  styles.quantityButton,
                  item.quantity <= 1 && styles.disabledButton,
                ]}
                onPress={() => updateQuantity(item.id, item.quantity - 1)}
                disabled={item.quantity <= 1}
                accessibilityLabel="Decrease quantity"
              >
                <Ionicons
                  name="remove"
                  size={16}
                  color={item.quantity <= 1 ? "#CBD5E1" : "#1E293B"}
                />
              </TouchableOpacity>

              <View style={styles.quantityTextContainer}>
                <Text style={styles.quantityText}>{item.quantity || 1}</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.quantityButton,
                  item.stock != null &&
                    item.quantity >= item.stock &&
                    styles.disabledButton,
                ]}
                onPress={() => updateQuantity(item.id, item.quantity + 1)}
                disabled={item.stock != null && item.quantity >= item.stock}
                accessibilityLabel="Increase quantity"
              >
                <Ionicons
                  name="add"
                  size={16}
                  color={
                    item.stock != null && item.quantity >= item.stock
                      ? "#CBD5E1"
                      : "#1E293B"
                  }
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.itemSubtotal}>
              Subtotal: ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
    ),
    [updateQuantity, removeFromCart]
  );

  const total = useMemo(
    () =>
      cart.reduce(
        (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
        0
      ),
    [cart]
  );

  if (loadingCart) {
    return (
      <View style={styles.loaderContainer}>
        <LoadingDots text="Loading Your Cart" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#1E40AF" barStyle="light-content" />
      <View style={styles.container}>
        <LinearGradient
          colors={["#1E40AF", "#2563EB"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              accessibilityLabel="Go back"
            >
              <View style={styles.backButtonContainer}>
                <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.headerText}>Shopping Cart</Text>
              <View style={styles.headerSubtitle}>
                <Ionicons name="cart-outline" size={16} color="#E0E7FF" />
                <Text style={styles.headerSubtitleText}>
                  {cart.length} {cart.length === 1 ? "item" : "items"}
                </Text>
              </View>
            </View>

            <View style={styles.cartCountContainer}>
              <View style={styles.cartCount}>
                <Text style={styles.cartCountText}>{cart.length}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {cart.length === 0 ? (
          <View style={styles.emptyContainer}>
            <LottieView
              ref={lottieRef}
              source={emptyCartAnimation}
              autoPlay
              loop
              style={styles.lottieAnimation}
              accessibilityLabel="Empty cart animation"
            />
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptyText}>
              Looks like you haven't added any items to your cart yet.
            </Text>
            <TouchableOpacity
              style={styles.shopButton}
              onPress={() => router.push("/index")}
              accessibilityLabel="Start shopping"
            >
              <MaterialIcons name="shopping-bag" size={18} color="#FFFFFF" />
              <Text style={styles.shopButtonText}>Start Shopping</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <FlatList
              data={cart}
              renderItem={renderCartItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.cartList}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={() => (
                <View style={styles.listHeader}>
                  <View style={styles.cartSummary}>
                    <View style={styles.cartInfoItem}>
                      <Ionicons name="cart" size={16} color="#3B82F6" />
                      <Text style={styles.cartInfoText}>
                        {cart.length} {cart.length === 1 ? "item" : "items"}
                      </Text>
                    </View>
                    <View style={styles.cartInfoItem}>
                      <Ionicons name="time-outline" size={16} color="#3B82F6" />
                      <Text style={styles.cartInfoText}>Fast Delivery</Text>
                    </View>
                  </View>
                </View>
              )}
            />

            <View style={styles.footer}>
              <View style={styles.priceBreakdown}>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Subtotal</Text>
                  <Text style={styles.priceValue}>${total.toFixed(2)}</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Delivery Fee</Text>
                  <Text style={styles.priceValue}>$0.00</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.checkoutButton}
                onPress={handleCheckout}
                accessibilityLabel="Proceed to checkout"
              >
                <Text style={styles.checkoutButtonText}>
                  Proceed to Checkout
                </Text>
                <View style={styles.checkoutArrow}>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
      <Toast config={toastConfig} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    marginRight: 16,
  },
  backButtonContainer: {
    width: 40,
    height: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
    textAlign: "center",
  },
  headerSubtitle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  headerSubtitleText: {
    color: "#E0E7FF",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 6,
  },
  cartCountContainer: {
    marginLeft: 16,
  },
  cartCount: {
    width: 40,
    height: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  cartCountText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  listHeader: {
    paddingBottom: 12,
  },
  cartSummary: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cartInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  cartInfoText: {
    color: "#1E293B",
    fontSize: 13,
    fontWeight: "500",
    marginLeft: 6,
  },
  cartList: {
    padding: 16,
  },
  cartItem: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  itemImageContainer: {
    position: "relative",
    marginRight: 12,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  limitedStockBadge: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(245, 158, 11, 0.9)",
    paddingVertical: 3,
    alignItems: "center",
  },
  limitedStockText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "600",
  },
  itemDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
    flex: 1,
    paddingRight: 8,
  },
  removeIconButton: {
    padding: 2,
  },
  variantContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 6,
  },
  variantPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  variantText: {
    fontSize: 11,
    color: "#475569",
  },
  priceStockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E40AF",
  },
  itemStock: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "500",
  },
  limitedStock: {
    color: "#F59E0B",
  },
  outOfStock: {
    color: "#EF4444",
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    overflow: "hidden",
  },
  quantityButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    backgroundColor: "#F1F5F9",
  },
  quantityTextContainer: {
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
  },
  quantityText: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "600",
  },
  itemSubtotal: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  footer: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 5,
  },
  priceBreakdown: {
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: "#64748B",
  },
  priceValue: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "500",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E40AF",
  },
  checkoutButton: {
    backgroundColor: "#1E40AF",
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  checkoutArrow: {
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  lottieAnimation: {
    width: 250,
    height: 250,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1E293B",
    marginTop: 8,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 15,
    color: "#64748B",
    marginBottom: 24,
    textAlign: "center",
    maxWidth: width * 0.8,
  },
  shopButton: {
    backgroundColor: "#1E40AF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  shopButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 8,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
});

export default CartScreen;
