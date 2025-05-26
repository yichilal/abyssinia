import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router, useLocalSearchParams } from "expo-router";
import { collection, doc, increment, runTransaction } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message";
import Ionicons from "react-native-vector-icons/Ionicons";
import LoadingDots from "../../components/LoadingDots";
import { db } from "../config/firebase";

// IMPORTANT: Move this key to a secure backend environment for production apps.
// Exposing it in the frontend is a security risk.
const CHAPA_SECRET_KEY = "CHASECK_TEST-UJpGRPm5cFfLFeCjVOPiS9RGhy5MNZSS";
const VERIFICATION_TIMEOUT = 30000; // 30 seconds timeout for verification

const Verifay = () => {
  const params = useLocalSearchParams();
  const {
    chapa: txRef = "",
    amount = "",
    userId = "",
    userEmail = "",
    cartItemsString = "[]",
    shippingAddressString = "{}",
    customerDetailsString = "{}",
    paymentMethod = "Chapa",
  } = params;

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Verifying Payment...");
  const [showBackButton, setShowBackButton] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState("pending"); // pending, success, failed
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  const handleVerificationError = (error, isRetryable = true) => {
    console.error("Verification Error:", error);
    const errorMsg =
      error.response?.data?.message || error.message || "Verification failed";
    setMessage(`Verification Error: ${errorMsg}`);
    setVerificationStatus("failed");
    setLoading(false);
    setShowBackButton(true);

    Toast.show({
      type: "error",
      text1: "Verification Failed",
      text2: errorMsg,
      position: "bottom",
    });

    if (isRetryable && retryCount < MAX_RETRIES) {
      setRetryCount((prev) => prev + 1);
    }
  };

  const retryVerification = async () => {
    setLoading(true);
    setMessage("Retrying verification...");
    setVerificationStatus("pending");
    await verifyAndCreateOrder();
  };

  const verifyAndCreateOrder = async () => {
    if (!txRef || !userId || !amount || !cartItemsString) {
      handleVerificationError(new Error("Incomplete transaction data"), false);
      return;
    }

    try {
      setMessage("Contacting Chapa for verification...");
      const response = await Promise.race([
        axios.get(`https://api.chapa.co/v1/transaction/verify/${txRef}`, {
          headers: { Authorization: `Bearer ${CHAPA_SECRET_KEY}` },
        }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Verification timeout")),
            VERIFICATION_TIMEOUT
          )
        ),
      ]);

      const paymentData = response.data.data;
      if (
        response.data.status !== "success" ||
        paymentData?.status !== "success"
      ) {
        handleVerificationError(
          new Error(paymentData?.status || "Payment verification failed")
        );
        return;
      }

      setMessage("Payment Successful! Processing order...");
      setVerificationStatus("success");

      // Process order in Firestore
      await processOrder(paymentData);
    } catch (error) {
      handleVerificationError(error);
    }
  };

  const processOrder = async (paymentData) => {
    try {
      const parsedCartItems = JSON.parse(cartItemsString);
      const parsedShippingAddress = JSON.parse(shippingAddressString);
      const parsedCustomerDetails = JSON.parse(customerDetailsString);

      if (!Array.isArray(parsedCartItems) || parsedCartItems.length === 0) {
        throw new Error("Invalid cart data");
      }

      const orderRef = await runTransaction(db, async (transaction) => {
        const uniqueProductIds = new Set();
        const variantRefs = {};
        const stockCheckPromises = [];

        // 1. Prepare refs and gather unique product IDs
        for (const item of parsedCartItems) {
          const ids = item.id?.split("_");
          if (!ids || ids.length !== 2) {
            throw new Error(
              `Invalid item ID format for stock update: ${item.id}`
            );
          }
          const [productId, variantId] = ids;
          if (
            !productId ||
            !variantId ||
            !item.quantity ||
            item.quantity <= 0
          ) {
            throw new Error(`Invalid data for item ${item.name || item.id}`);
          }

          uniqueProductIds.add(productId); // Collect unique product IDs

          const variantRef = doc(
            db,
            "products",
            productId,
            "variants",
            variantId
          );
          variantRefs[item.id] = variantRef;
          stockCheckPromises.push(transaction.get(variantRef)); // Read variant within transaction
        }

        // 2. Prepare promises to fetch product documents for supplier IDs
        const productFetchPromises = Array.from(uniqueProductIds).map(
          (pid) => transaction.get(doc(db, "products", pid)) // Read product within transaction
        );

        // 3. Await all reads (variants and products)
        const [variantSnapshots, productSnapshots] = await Promise.all([
          Promise.all(stockCheckPromises),
          Promise.all(productFetchPromises),
        ]);

        // 4. Create Supplier ID Map
        const supplierIdMap = new Map();
        productSnapshots.forEach((snap) => {
          if (snap.exists()) {
            // --- ADJUST FIELD NAME HERE if necessary ---
            const supplierId = snap.data().supplierId || null;
            supplierIdMap.set(snap.id, supplierId);
            if (!supplierId) {
              console.warn(`Supplier ID missing for product ${snap.id}`);
            }
          } else {
            // Handle case where product document might be missing
            console.error(
              `Product document ${snap.id} not found! Cannot get supplier ID.`
            );
            // Option 1: Throw an error to halt transaction
            // throw new Error(`Required product document ${snap.id} not found.`);
            // Option 2: Set supplierId to null and proceed (as done below)
            supplierIdMap.set(snap.id, null);
          }
        });

        // 5. Check Variant Stock (using fetched snapshots)
        for (let i = 0; i < parsedCartItems.length; i++) {
          const item = parsedCartItems[i];
          const snapshot = variantSnapshots[i];
          const variantDesc = `${item.name} (${
            item.variantDetails
              ? Object.values(item.variantDetails).join(", ")
              : "Variant"
          })`;

          if (!snapshot.exists()) {
            throw new Error(`Product variant ${variantDesc} not found.`);
          }
          const currentStock = snapshot.data().stock;
          if (
            typeof currentStock !== "number" ||
            currentStock < item.quantity
          ) {
            throw new Error(
              `Insufficient stock for ${variantDesc}. Available: ${
                currentStock ?? "N/A"
              }, Requested: ${item.quantity}`
            );
          }
        }

        // 6. Update Variant Stock
        parsedCartItems.forEach((item) => {
          const variantRef = variantRefs[item.id];
          transaction.update(variantRef, {
            stock: increment(-item.quantity), // Decrease stock
          });
        });

        // 7. Prepare Enhanced Cart Items for Order Data
        const cartItemsWithSupplier = parsedCartItems.map((item) => {
          const [productId] = item.id.split("_");
          const supplierId = supplierIdMap.get(productId); // Look up supplier ID
          return {
            ...item,
            supplierId: supplierId, // Add the supplierId field
          };
        });

        // 8. Create the Order Document
        const newOrderRef = doc(collection(db, "orders")); // Generate new order ID
        const orderData = {
          userId: userId,
          userEmail: userEmail,
          cartItems: cartItemsWithSupplier,
          totalAmount: parseFloat(amount),
          paymentMethod: paymentMethod,
          shippingAddress: {
            ...parsedShippingAddress,
            coordinates: parsedShippingAddress.coordinates || {
              latitude: null,
              longitude: null,
              acceptedBy: null,
            },
          },
          customerDetails: parsedCustomerDetails,
          createdAt: new Date().toISOString(),
          status: "processing",
          paymentStatus: "success",
          transactionRef: txRef,
          acceptedBy: null,
          chapaResponse: {
            amount: paymentData.amount,
            currency: paymentData.currency,
            status: paymentData.status,
            email: paymentData.email,
            first_name: paymentData.first_name,
            last_name: paymentData.last_name,
            verified_at: paymentData.updated_at || new Date().toISOString(),
            createdAt: paymentData.created_at || new Date().toISOString(),
          },
        };

        transaction.set(newOrderRef, orderData); // Create the order doc within the transaction

        return newOrderRef; // Return the ref of the newly created order
      }); // End of Firestore Transaction

      console.log(
        "Transaction successful! Order created:",
        orderRef.id, // Log the new order ID
        "and stock updated."
      );
      setMessage("Order Confirmed!");

      // Clear cart after successful order creation
      try {
        await AsyncStorage.removeItem("cart");
        console.log("Cart cleared from AsyncStorage.");
      } catch (clearError) {
        console.error(
          "Failed to clear cart from AsyncStorage (Order still placed):",
          clearError
        );
        // Non-critical error, order is already placed. Maybe log it.
      }

      Toast.show({
        type: "success",
        text1: "Order Confirmed!",
        text2: "Your payment was successful",
        position: "bottom",
      });

      // Navigate to Order Confirmation
      router.replace({
        pathname: "/products/OrderConfirmation",
        params: {
          orderId: orderRef.id, // Pass the new order ID
          txRef: txRef,
          amount: amount,
        },
      });
    } catch (error) {
      handleVerificationError(error);
    }
  };

  useEffect(() => {
    verifyAndCreateOrder();
  }, [
    txRef,
    amount,
    userId,
    userEmail,
    cartItemsString,
    shippingAddressString,
    customerDetailsString,
    paymentMethod,
  ]);

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <LoadingDots />
          <Text style={styles.messageText}>{message}</Text>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          {verificationStatus === "failed" ? (
            <>
              <Ionicons name="alert-circle" size={64} color="#EF4444" />
              <Text style={styles.errorTitle}>Verification Failed</Text>
              <Text style={styles.messageText}>{message}</Text>
              {retryCount < MAX_RETRIES && (
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={retryVerification}
                >
                  <Text style={styles.retryButtonText}>Retry Verification</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <Text style={styles.messageText}>{message}</Text>
          )}

          {showBackButton && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      <Toast />
    </View>
  );
};

// Styles remain the same
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  messageText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#1E293B",
    textAlign: "center",
    marginVertical: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#EF4444",
    marginBottom: 10,
  },
  backButton: {
    backgroundColor: "#4B5563",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 20,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  retryButton: {
    backgroundColor: "#1E40AF",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginTop: 20,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default Verifay;
