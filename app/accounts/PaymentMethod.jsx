import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import Ionicons from "react-native-vector-icons/Ionicons";
import chapaLogo from "../../assets/images/chapa.png";
import { db } from "../config/firebase";

const PaymentMethod = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      setError(null);
      try {
        const profileJson = await AsyncStorage.getItem("userProfile");
        if (profileJson) {
          const profile = JSON.parse(profileJson);
          if (profile && profile.email) {
            // Fetch orders for this user
            const ordersRef = collection(db, "orders");
            const q = query(ordersRef, where("userEmail", "==", profile.email));
            const querySnapshot = await getDocs(q);

            const fetchedPayments = [];
            querySnapshot.forEach((doc) => {
              const orderData = doc.data();
              if (orderData.transactionRef && orderData.paymentMethod) {
                fetchedPayments.push({
                  id: doc.id,
                  transactionRef: orderData.transactionRef,
                  paymentMethod: orderData.paymentMethod,
                  paymentStatus:
                    orderData.paymentStatus || orderData.chapaResponse?.status,
                  amount: orderData.totalAmount,
                  date: orderData.createdAt,
                  currency: orderData.chapaResponse?.currency || "ETB",
                });
              }
            });
            setPayments(fetchedPayments);
          } else {
            setError(
              "Could not find user email in profile. Please log in again."
            );
          }
        } else {
          setError("User profile not found. Please log in again.");
        }
      } catch (err) {
        console.error("Error fetching payments: ", err);
        setError(
          err.message || "An error occurred while fetching payment history."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  const handleClearPayment = (paymentId) => {
    Alert.alert(
      "Clear Payment History",
      "Are you sure you want to remove this payment from your history?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "orders", paymentId));
              setPayments((prevPayments) =>
                prevPayments.filter((payment) => payment.id !== paymentId)
              );
              Toast.show({
                type: "success",
                text1: "Success",
                text2: "Payment history cleared successfully",
              });
            } catch (error) {
              console.error("Error clearing payment:", error);
              Toast.show({
                type: "error",
                text1: "Error",
                text2: "Failed to clear payment history",
              });
            }
          },
        },
      ]
    );
  };

  const renderPaymentItem = ({ item }) => (
    <View style={styles.paymentItemContainer}>
      <View style={styles.paymentHeader}>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionRef}>
            Transaction: {item.transactionRef}
          </Text>
          <Text style={styles.paymentDate}>
            {item.date ? new Date(item.date).toLocaleDateString() : "N/A"}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <View
            style={[
              styles.statusBadge,
              styles[`status_${item.paymentStatus?.toLowerCase()}`],
            ]}
          >
            <Text style={styles.statusText}>
              {item.paymentStatus?.toUpperCase() || "PENDING"}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => handleClearPayment(item.id)}
          >
            <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.paymentDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Payment Method:</Text>
          <View style={styles.paymentMethodRow}>
            <Text style={styles.detailValue}>{item.paymentMethod}</Text>
            {item.paymentMethod?.toLowerCase() === "chapa" && (
              <Image
                source={chapaLogo}
                style={styles.chapaLogo}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Amount:</Text>
          <Text style={styles.amountValue}>
            {item.amount?.toFixed(2)} {item.currency}
          </Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1E40AF" />
        <Text>Loading payment history...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={50} color="red" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace("/user/LoginPage")}
        >
          <Text style={styles.buttonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (payments.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="card-outline" size={50} color="#6B7280" />
        <Text style={styles.emptyText}>No payment history found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.screenHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back-outline" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Payment History</Text>
      </View>
      <FlatList
        data={payments}
        renderItem={renderPaymentItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContentContainer}
      />
      <Toast />
    </View>
  );
};

export default PaymentMethod;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  screenHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E40AF",
    paddingTop: Platform.OS === "android" ? 40 : 50,
    paddingBottom: 15,
    paddingHorizontal: 15,
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFF",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F9FAFB",
  },
  errorText: {
    fontSize: 16,
    color: "red",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    color: "#4B5563",
    marginTop: 10,
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#1E40AF",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  listContentContainer: {
    padding: 10,
  },
  paymentItemContainer: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  transactionInfo: {
    flex: 1,
    marginRight: 10,
  },
  transactionRef: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  paymentDate: {
    fontSize: 12,
    color: "#6B7280",
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    overflow: "hidden",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFF",
  },
  status_success: {
    backgroundColor: "#10B981",
  },
  status_pending: {
    backgroundColor: "#F59E0B",
  },
  status_failed: {
    backgroundColor: "#EF4444",
  },
  paymentDetails: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: "#4B5563",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "600",
  },
  amountValue: {
    fontSize: 16,
    color: "#1E40AF",
    fontWeight: "bold",
  },
  paymentMethodRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  clearButton: {
    padding: 4,
  },
  chapaLogo: {
    width: 40,
    height: 24,
    marginLeft: 8,
  },
});
