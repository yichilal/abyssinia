import { useNavigation } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { WebView } from "react-native-webview";

const CHAPA_RETURN_URL_BASE = "https://payment-xxbp.onrender.com";

const Pay = () => {
  const params = useLocalSearchParams();
  const {
    firstName = "",
    lastName = "",
    email = "",
    amount = "0",
    txRef = "",
    title = "Order Payment",
    userId = "",
    userEmail = "",
    cartItemsString = "[]",
    shippingAddressString = "{}",
    customerDetailsString = "{}",
    paymentMethod = "",
  } = params;

  const navigation = useNavigation();
  const webViewRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [sessionTimeout, setSessionTimeout] = useState(null);
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  const htmlContent = `
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
         body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f0f2f5; flex-direction: column; text-align: center; }
         .loader { border: 8px solid #f3f3f3; border-top: 8px solid #3498db; border-radius: 50%; width: 60px; height: 60px; animation: spin 1s linear infinite; margin-bottom: 20px; }
         @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
         p { color: #555; font-size: 1.1em; }
      </style>
    </head>
    <body onload="document.forms[0].submit()">
      <form method="POST" action="https://api.chapa.co/v1/hosted/pay">
        <input type="hidden" name="public_key" value="CHAPUBK_TEST-K28WfdcaNEvwbhlD3R41S7T6axqayHM5" />
        <input type="hidden" name="tx_ref" value="${txRef}" />
        <input type="hidden" name="amount" value="${amount}" />
        <input type="hidden" name="currency" value="ETB" />
        <input type="hidden" name="email" value="${email}" />
        <input type="hidden" name="first_name" value="${firstName}" />
        <input type="hidden" name="last_name" value="${lastName}" />
        <input type="hidden" name="title" value="${title}" />
        <input type="hidden" name="description" value="Payment for Abyssinia Gebeya Order" />
        <input type="hidden" name="logo" value="https://chapa.link/asset/images/chapa_swirl.svg" />
        <input type="hidden" name="callback_url" value="https://your-backend.com/chapa-webhook" />
        <input type="hidden" name="return_url" value="${CHAPA_RETURN_URL_BASE}" />
      </form>
      <div class="loader"></div>
      <p>Redirecting to Chapa payment gateway...</p>
    </body>
    </html>
  `;

  const handleCancelPayment = () => {
    Alert.alert(
      "Cancel Payment",
      "Are you sure you want to cancel this payment attempt and return to checkout?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          onPress: () => router.back(),
          style: "destructive",
        },
      ]
    );
  };

  const onAndroidBackPress = () => {
    if (canGoBack && webViewRef.current) {
      webViewRef.current.goBack();
      return true;
    }
    handleCancelPayment();
    return true;
  };

  useEffect(() => {
    if (Platform.OS === "android") {
      BackHandler.addEventListener("hardwareBackPress", onAndroidBackPress);
      return () =>
        BackHandler.removeEventListener(
          "hardwareBackPress",
          onAndroidBackPress
        );
    }
  }, [canGoBack]);

  useEffect(() => {
    // Set a timeout for 15 minutes (Chapa's typical session duration)
    const timeout = setTimeout(() => {
      setIsSessionExpired(true);
      Alert.alert(
        "Session Expired",
        "Your payment session has expired. Please try again.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    }, 15 * 60 * 1000); // 15 minutes

    setSessionTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  const handleNavigationStateChange = (navState) => {
    const { url, loading, canGoBack: webViewCanGoBack } = navState;
    setCanGoBack(webViewCanGoBack);

    if (!loading) {
      setIsLoading(false);
      // Reset session timeout when page loads successfully
      if (sessionTimeout) {
        clearTimeout(sessionTimeout);
      }
      const newTimeout = setTimeout(() => {
        setIsSessionExpired(true);
        Alert.alert(
          "Session Expired",
          "Your payment session has expired. Please try again.",
          [
            {
              text: "OK",
              onPress: () => router.back(),
            },
          ]
        );
      }, 15 * 60 * 1000);
      setSessionTimeout(newTimeout);
    }

    if (
      url &&
      url.startsWith(CHAPA_RETURN_URL_BASE) &&
      paymentStatus === "pending"
    ) {
      // Clear session timeout when payment is completed
      if (sessionTimeout) {
        clearTimeout(sessionTimeout);
      }
      webViewRef.current?.stopLoading();
      setPaymentStatus("processing_redirect");

      const urlParams = new URLSearchParams(url.split("?")[1] || "");
      const statusFromUrl = urlParams.get("status");
      const returnedTxRef = urlParams.get("tx_ref");

      if (returnedTxRef && returnedTxRef !== txRef) {
        console.warn("txRef mismatch! Expected:", txRef, "Got:", returnedTxRef);
        Alert.alert("Error", "Payment reference mismatch.", [
          { text: "OK", onPress: () => router.back() },
        ]);
        return;
      }

      router.replace({
        pathname: "/products/Verifay",
        params: {
          chapa: txRef,
          amount: amount,
          userId: userId,
          userEmail: userEmail,
          cartItemsString: cartItemsString,
          shippingAddressString: shippingAddressString,
          customerDetailsString: customerDetailsString,
          paymentMethod: paymentMethod,
        },
      });
    }
  };

  // Add session expired UI
  if (isSessionExpired) {
    return (
      <View style={styles.container}>
        <View style={styles.expiredContainer}>
          <Ionicons name="time-outline" size={64} color="#EF4444" />
          <Text style={styles.expiredTitle}>Session Expired</Text>
          <Text style={styles.expiredText}>
            Your payment session has expired. Please try again.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handleCancelPayment}
        style={styles.cancelButton}
      >
        <Ionicons name="close-circle-outline" size={20} color="#FFF" />
        <Text style={styles.cancelButtonText}>Cancel Payment</Text>
      </TouchableOpacity>

      <WebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html: htmlContent }}
        style={styles.webView}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn("WebView error: ", nativeEvent);
          setIsLoading(false);
          Alert.alert(
            "Loading Error",
            `Failed to load payment page: ${nativeEvent.description}. Please check connection and try again.`,
            [{ text: "Go Back", onPress: () => router.back() }]
          );
        }}
        onNavigationStateChange={handleNavigationStateChange}
      />
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text style={styles.loadingText}>Loading Payment Page...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f8fa" },
  webView: { flex: 1, width: "100%", height: "100%" },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#333",
  },
  cancelButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 20,
    right: 15,
    zIndex: 10,
    backgroundColor: "rgba(239, 68, 68, 0.8)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 14,
    marginLeft: 5,
  },
  expiredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FEF2F2",
  },
  expiredTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#B91C1C",
    marginTop: 16,
    marginBottom: 8,
  },
  expiredText: {
    fontSize: 16,
    color: "#7F1D1D",
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#B91C1C",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default Pay;
