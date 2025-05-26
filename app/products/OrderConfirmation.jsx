import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import LottieView from "lottie-react-native";
import React from "react";
import {
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import Ionicons from "react-native-vector-icons/Ionicons";

import SuccessAnimation from "../../assets/success-animation.json";

const OrderConfirmation = () => {
  const params = useLocalSearchParams();
  const { txRef, amount, orderId, paymentMethod } = params;

  const handleShareOrder = async () => {
    try {
      await Share.share({
        message: `My Abyssinia Gebeya Order #${orderId} has been confirmed! Total: ETB ${amount}. Transaction Ref: ${txRef}`,
        title: "Share My Order",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Sharing Error",
        text2: "Could not share order details.",
      });
    }
  };

  const handleDownloadReceipt = () => {
    Toast.show({
      type: "info",
      text1: "Feature Coming Soon",
      text2: "Receipt download will be available shortly.",
    });
  };

  return (
    <>
      <StatusBar backgroundColor="#10B981" barStyle="light-content" />
      <LinearGradient
        colors={["#F0FDF4", "#E6FFFA"]}
        style={styles.gradientContainer}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.animationContainer}>
            <LottieView
              source={SuccessAnimation}
              autoPlay
              loop={false}
              style={styles.lottieAnimation}
            />
          </View>

          <Text style={styles.header}>Order Confirmed!</Text>
          <Text style={styles.message}>
            Thank you for your purchase. Your order is being processed.
          </Text>

          <View style={styles.detailsCard}>
            <Text style={styles.cardTitle}>Order Summary</Text>
            {orderId && (
              <View style={styles.detailRow}>
                <Ionicons
                  name="receipt-outline"
                  size={22}
                  color="#065F46"
                  style={styles.detailIcon}
                />
                <Text style={styles.detailLabel}>Order ID:</Text>
                <Text style={styles.detailValue}>{orderId}</Text>
              </View>
            )}
            {txRef && (
              <View style={styles.detailRow}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={22}
                  color="#065F46"
                  style={styles.detailIcon}
                />
                <Text style={styles.detailLabel}>Transaction Ref:</Text>
                <Text style={styles.detailValue}>{txRef}</Text>
              </View>
            )}
            {paymentMethod && (
              <View style={styles.detailRow}>
                <Ionicons
                  name="card-outline"
                  size={22}
                  color="#065F46"
                  style={styles.detailIcon}
                />
                <Text style={styles.detailLabel}>Payment Method:</Text>
                <Text style={styles.detailValue}>{paymentMethod}</Text>
              </View>
            )}
            {amount && (
              <View style={styles.detailRow}>
                <Ionicons
                  name="cash-outline"
                  size={22}
                  color="#065F46"
                  style={styles.detailIcon}
                />
                <Text style={styles.detailLabel}>Total Amount:</Text>
                <Text style={styles.detailValue}>ETB {amount}</Text>
              </View>
            )}
          </View>

          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={() => router.replace("/")}
            >
              <Ionicons name="home-outline" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>Back to Home</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => router.replace("/accounts/Orders")}
            >
              <Ionicons name="list-outline" size={20} color="#059669" />
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                View My Orders
              </Text>
            </TouchableOpacity>

            <View style={styles.tertiaryActionsRow}>
              <TouchableOpacity
                style={[styles.button, styles.tertiaryButton]}
                onPress={handleShareOrder}
              >
                <Ionicons
                  name="share-social-outline"
                  size={20}
                  color="#1E40AF"
                />
                <Text style={[styles.buttonText, styles.tertiaryButtonText]}>
                  Share
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.tertiaryButton]}
                onPress={handleDownloadReceipt}
              >
                <Ionicons name="download-outline" size={20} color="#1E40AF" />
                <Text style={[styles.buttonText, styles.tertiaryButtonText]}>
                  Receipt
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
      <Toast />
    </>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 30,
    alignItems: "center",
  },
  animationContainer: {
    width: 180,
    height: 180,
    marginBottom: 5,
  },
  lottieAnimation: {
    width: "100%",
    height: "100%",
  },
  header: {
    fontSize: 28,
    fontWeight: "700",
    color: "#065F46",
    marginBottom: 10,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    color: "#047857",
    marginBottom: 25,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  detailsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    width: "100%",
    shadowColor: "#059669",
    shadowOffset: { width: 0, hreight: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#065F46",
    marginBottom: 18,
    textAlign: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#A7F3D0",
    paddingBottom: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  detailIcon: {
    marginRight: 12,
  },
  detailLabel: {
    fontSize: 15,
    color: "#064E3B",
    fontWeight: "500",
    marginRight: 6,
  },
  detailValue: {
    fontSize: 15,
    color: "#059669",
    fontWeight: "500",
    flexShrink: 1,
  },
  actionButtonsContainer: {
    width: "100%",
    gap: 15,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  primaryButton: {
    backgroundColor: "#10B981",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "#10B981",
  },
  tertiaryActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
  },
  tertiaryButton: {
    backgroundColor: "#E0F2FE",
    flex: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
    color: "#FFFFFF",
  },
  secondaryButtonText: {
    color: "#059669",
  },
  tertiaryButtonText: {
    color: "#1E40AF",
  },
});

export default OrderConfirmation;
