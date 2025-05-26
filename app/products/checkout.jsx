import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import Toast, { BaseToast, ErrorToast } from "react-native-toast-message";
import arifpayLogo from "../../assets/images/arifpay.png";
import chapaLogo from "../../assets/images/chapa.png";
import paypalLogo from "../../assets/images/paypal.png";
import LoadingDots from "../../components/LoadingDots";
import { auth } from "../config/firebase";

const gebetaApiKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb21wYW55bmFtZSI6ImFieXNpbmlhZ2ViZXlhIiwiZGVzY3JpcHRpb24iOiJjYzZhOTg2Mi00ZDUxLTRkOWUtYWQxYy1iODQzZmExZjViMjkiLCJpZCI6IjY2NDJkNjNkLTRhYjItNDNmOC1iYjk4LWQ2N2NhNTMwODNmZCIsInVzZXJuYW1lIjoieWljaGlsYWwifQ.w4x_rU-o5v2h-Wd2pQx7XV8A1RWyvE-kdCugAeeaTKU";

const { width } = Dimensions.get("window");

const toastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: "#1E40AF",
        backgroundColor: "#EFF6FF",
        height: 60,
        width: "90%",
        position: "absolute",
        top: 50,
        zIndex: 9999,
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      }}
      contentContainerStyle={{
        paddingHorizontal: 15,
      }}
      text1Style={{
        fontSize: 16,
        fontWeight: "600",
        color: "#1E40AF",
      }}
      text2Style={{
        fontSize: 14,
        color: "#4B5563",
      }}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: "#DC2626",
        backgroundColor: "#FEF2F2",
        height: 60,
        width: "90%",
        position: "absolute",
        top: 50,
        zIndex: 9999,
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      }}
      contentContainerStyle={{
        paddingHorizontal: 15,
      }}
      text1Style={{
        fontSize: 16,
        fontWeight: "600",
        color: "#DC2626",
      }}
      text2Style={{
        fontSize: 14,
        color: "#4B5563",
      }}
    />
  ),
};

const CheckoutScreen = () => {
  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    defaultValues: {
      country: "Ethiopia",
      firstName: "",
      lastName: "",
      address: "",
      apartment: "",
      city: "",
      postalCode: "",
      phone: "",
      latitude: null,
      longitude: null,
    },
  });
  const [useSameAddress, setUseSameAddress] = useState(true);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [isSaveChecked, setIsSaveChecked] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const mapRef = useRef(null);
  const params = useLocalSearchParams();
  const cartFromParams = params.cart ? JSON.parse(params.cart) : [];
  const initialLatitude = params.latitude ? parseFloat(params.latitude) : null;
  const initialLongitude = params.longitude
    ? parseFloat(params.longitude)
    : null;
  const [user, setUser] = useState(null);
  const [cartWithDetails, setCartWithDetails] = useState([]);
  const [isRefundPolicyChecked, setIsRefundPolicyChecked] = useState(false);

  const initialRegion = {
    latitude: 9.03,
    longitude: 38.74,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  useEffect(() => {
    const fetchCartWithDetails = async () => {
      try {
        const storedCart = await AsyncStorage.getItem("cart");
        const storedCartItems = storedCart ? JSON.parse(storedCart) : [];
        const enrichedCart = cartFromParams.map((paramItem) => {
          const storedItem = storedCartItems.find(
            (item) => item.id === paramItem.id
          );
          return {
            ...paramItem,
            imageUrl:
              storedItem?.imageUrl ||
              paramItem.imageUrl ||
              "https://via.placeholder.com/80",
            name: storedItem?.name || paramItem.name || "Unnamed Product",
            price: storedItem?.price ?? paramItem.price ?? 0,
            quantity: storedItem?.quantity || paramItem.quantity || 1,
            stock: storedItem?.stock ?? paramItem.stock ?? Infinity,
            variantDetails:
              storedItem?.variantDetails || paramItem.variantDetails || {},
          };
        });
        setCartWithDetails(enrichedCart);
      } catch (error) {
        console.error("Error processing cart details:", error);
        setCartWithDetails(
          cartFromParams.map((item) => ({
            ...item,
            imageUrl: item.imageUrl || "https://via.placeholder.com/80",
          }))
        );
      }
    };
    fetchCartWithDetails();
  }, [params.cart]);

  useEffect(() => {
    const initializeCheckout = async () => {
      setLoading(true);
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Toast.show({
          type: "error",
          text1: "Authentication Required",
          text2: "Please log in to proceed.",
        });
        router.replace("/user/LoginPage");
        return;
      }
      setUser(currentUser);

      let loadedSavedAddress = false;
      try {
        const savedAddress = await AsyncStorage.getItem("savedShippingAddress");
        if (savedAddress) {
          const parsedAddress = JSON.parse(savedAddress);
          Object.keys(parsedAddress).forEach((key) =>
            setValue(key, parsedAddress[key])
          );
          setIsSaveChecked(true);
          setUseSameAddress(false);
          loadedSavedAddress = true;
        }
      } catch (error) {
        console.error("Error loading saved address:", error);
      }

      if (!watch("firstName") && currentUser.displayName)
        setValue("firstName", currentUser.displayName.split(" ")[0] || "");
      if (!watch("lastName") && currentUser.displayName)
        setValue(
          "lastName",
          currentUser.displayName.split(" ").slice(1).join(" ") || ""
        );

      setLoading(false);
    };

    initializeCheckout();
  }, [setValue, watch]);

  useFocusEffect(
    useCallback(() => {
      console.log("CheckoutScreen focused, resetting payment loading state.");
      setPaymentLoading(false);
      return () => {};
    }, [])
  );

  const saveAddressToStorage = async (data) => {
    try {
      const addressData = {
        country: data.country || "Ethiopia",
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        address: data.address || "",
        apartment: data.apartment || "",
        city: data.city || "",
        postalCode: data.postalCode || "",
        phone: data.phone || "",
      };
      await AsyncStorage.setItem(
        "savedShippingAddress",
        JSON.stringify(addressData)
      );
      Toast.show({
        type: "success",
        text1: "Address Saved",
        text2: "Shipping address saved.",
      });
    } catch (error) {
      console.error("Error saving address:", error);
      Toast.show({
        type: "error",
        text1: "Save Error",
        text2: "Failed to save address.",
      });
    }
  };

  const onSubmit = async (data) => {
    if (!isRefundPolicyChecked) {
      Toast.show({
        type: "error",
        text1: "Refund Policy Agreement Required",
        text2: "Please read and agree to our refund policy before proceeding",
        position: "top",
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 50,
        bottomOffset: 40,
      });
      return;
    }

    if (!selectedLocation) {
      Toast.show({
        type: "error",
        text1: "Location Required",
        text2: "Please select a delivery location on the map",
        position: "top",
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 50,
        bottomOffset: 40,
      });
      return;
    }

    if (!selectedPaymentMethod) {
      Toast.show({
        type: "error",
        text1: "Payment Method Required",
        text2: "Please select a payment method",
        position: "top",
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 50,
        bottomOffset: 40,
      });
      return;
    }

    if (!user) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "User not identified. Please log in again.",
        position: "top",
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 50,
        bottomOffset: 40,
      });
      router.replace("/user/LoginPage");
      return;
    }

    if (cartWithDetails.length === 0) {
      Toast.show({
        type: "error",
        text1: "Empty Cart",
        text2: "Your cart is empty.",
        position: "top",
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 50,
        bottomOffset: 40,
      });
      return;
    }

    setPaymentLoading(true);

    try {
      const totalAmount = cartWithDetails
        .reduce((sum, item) => sum + item.price * item.quantity, 0)
        .toFixed(2);
      const txRef = `TX-${Date.now()}-${user.uid.substring(0, 5)}`;

      const shippingAddress = {
        address: data.address || "",
        city: data.city || "",
        country: data.country || "Ethiopia",
        postalCode: data.postalCode || "",
        apartment: data.apartment || "",
        coordinates: {
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
        },
      };

      const customerDetails = {
        firstName: data.firstName || user.displayName?.split(" ")[0] || "",
        lastName: data.lastName || user.displayName?.split(" ")[1] || "",
        phone: data.phone || "",
      };

      if (isSaveChecked) {
        await saveAddressToStorage(data);
      }

      const paramsForPayScreen = {
        firstName: customerDetails.firstName,
        lastName: customerDetails.lastName,
        email: user.email,
        amount: totalAmount,
        txRef: txRef,
        title: "Abyssinia Gebeya Order",
        userId: user.uid,
        userEmail: user.email,
        cartItemsString: JSON.stringify(cartWithDetails),
        shippingAddressString: JSON.stringify(shippingAddress),
        customerDetailsString: JSON.stringify(customerDetails),
        paymentMethod: selectedPaymentMethod,
      };

      // Validate all required fields before proceeding
      if (
        !paramsForPayScreen.firstName ||
        !paramsForPayScreen.lastName ||
        !paramsForPayScreen.email ||
        !paramsForPayScreen.amount ||
        !paramsForPayScreen.txRef ||
        !paramsForPayScreen.userId ||
        !paramsForPayScreen.userEmail
      ) {
        throw new Error("Missing required payment information");
      }

      switch (selectedPaymentMethod) {
        case "Chapa":
          console.log(
            "Navigating to Pay screen with params:",
            paramsForPayScreen
          );
          router.push({
            pathname: "/products/pay",
            params: paramsForPayScreen,
          });
          break;
        case "COD":
          Toast.show({
            type: "info",
            text1: "Order Placed",
            text2: "Your Cash on Delivery order is placed.",
            position: "top",
            visibilityTime: 3000,
            autoHide: true,
            topOffset: 50,
            bottomOffset: 40,
          });
          setPaymentLoading(false);
          router.push("/");
          break;
        default:
          Toast.show({
            type: "info",
            text1: "Coming Soon",
            text2: `${selectedPaymentMethod} is not yet implemented.`,
            position: "top",
            visibilityTime: 3000,
            autoHide: true,
            topOffset: 50,
            bottomOffset: 40,
          });
          setPaymentLoading(false);
          break;
      }
    } catch (error) {
      console.error("Checkout initiation error:", error);
      Toast.show({
        type: "error",
        text1: "Checkout Error",
        text2: error.message || "Something went wrong. Please try again.",
        position: "top",
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 50,
        bottomOffset: 40,
      });
      setPaymentLoading(false);
    }
  };

  const handleMapPress = async (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
    setValue("latitude", latitude);
    setValue("longitude", longitude);
  };

  const confirmLocation = () => {
    if (selectedLocation) {
      setShowMap(false);
      Toast.show({
        type: "success",
        text1: "Location Confirmed",
        text2: "Delivery location has been set",
        position: "top",
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 50,
        bottomOffset: 40,
      });
    } else {
      Toast.show({
        type: "error",
        text1: "Location Required",
        text2: "Please select a location on the map.",
        position: "top",
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 50,
        bottomOffset: 40,
      });
    }
  };

  const renderPaymentMethods = () => {
    const paymentOptions = [
      {
        name: "Chapa",
        id: "Chapa",
        logo: chapaLogo,
        subtext: "Secure online payment",
        iconName: "card-outline",
      },
      {
        name: "ArifPay",
        id: "ArifPay",
        logo: arifpayLogo,
        subtext: "Mobile & Bank Transfer",
        iconName: "phone-portrait-outline",
      },
      {
        name: "PayPal",
        id: "PayPal",
        logo: paypalLogo,
        subtext: "International Payments (Soon)",
        iconName: "logo-paypal",
        disabled: true,
      },
    ];

    return (
      <View style={styles.paymentMethodsList}>
        {paymentOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.paymentOptionListItem,
              selectedPaymentMethod === option.id &&
                styles.selectedPaymentOptionListItem,
              option.disabled && styles.disabledPaymentOptionListItem,
            ]}
            onPress={() =>
              !option.disabled && setSelectedPaymentMethod(option.id)
            }
            disabled={option.disabled}
          >
            <View style={styles.paymentLogoContainerList}>
              <Image source={option.logo} style={styles.paymentImageLogoList} />
            </View>
            <View style={styles.paymentTextContainerList}>
              <Text style={styles.paymentOptionNameList}>{option.name}</Text>
              <Text style={styles.paymentOptionSubtextList}>
                {option.subtext}
              </Text>
            </View>
            <View style={styles.selectionIndicatorContainer}>
              {selectedPaymentMethod === option.id ? (
                <Ionicons name="checkmark-circle" size={24} color="#1E40AF" />
              ) : (
                <Ionicons name="ellipse-outline" size={24} color="#D1D5DB" />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingDots />
        <Text style={styles.loadingText}>Loading checkout...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Checkout</Text>
        </View>

        <Text style={styles.sectionTitle}>Shipping Address</Text>
        <View style={styles.formContainer}>
          <View style={styles.mapButtonContainer}>
            <TouchableOpacity
              style={styles.mapButton}
              onPress={() => setShowMap(true)}
            >
              <Ionicons name="map-outline" size={24} color="#1E40AF" />
              <Text style={styles.mapButtonText}>
                {selectedLocation
                  ? "Change Location"
                  : "Select Location on Map"}
              </Text>
            </TouchableOpacity>
            {selectedLocation ? (
              <Text style={styles.successPrompt}>
                You selected your address successfully
              </Text>
            ) : (
              <Text style={styles.mandatoryPrompt}>
                Location selection is mandatory!
              </Text>
            )}
          </View>

          {selectedLocation && (
            <View style={styles.coordinatesContainer}>
              <Text style={styles.coordinatesText}>
                Latitude: {selectedLocation.latitude.toFixed(6)}
              </Text>
              <Text style={styles.coordinatesText}>
                Longitude: {selectedLocation.longitude.toFixed(6)}
              </Text>
            </View>
          )}
          {!selectedLocation && (
            <Text style={styles.mandatoryPrompt}>
              Please select a delivery location
            </Text>
          )}

          <Text style={styles.label}>Country/Region</Text>
          <Controller
            name="country"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, styles.disabledInput]}
                placeholder="Ethiopia"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                editable={false}
              />
            )}
          />

          <View style={styles.nameRow}>
            <View style={styles.nameInputContainer}>
              <Text style={styles.label}>First Name</Text>
              <Controller
                name="firstName"
                control={control}
                rules={{ required: "First name is required" }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.input}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholder="Enter first name"
                  />
                )}
              />
              {errors.firstName && (
                <Text style={styles.errorText}>{errors.firstName.message}</Text>
              )}
            </View>
            <View style={styles.nameInputContainer}>
              <Text style={styles.label}>Last Name</Text>
              <Controller
                name="lastName"
                control={control}
                rules={{ required: "Last name is required" }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.input}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholder="Enter last name"
                  />
                )}
              />
              {errors.lastName && (
                <Text style={styles.errorText}>{errors.lastName.message}</Text>
              )}
            </View>
          </View>

          <Text style={styles.label}>Street Address</Text>
          <Controller
            name="address"
            control={control}
            rules={{ required: "Street address is required" }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.input}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="Enter your street address"
                multiline={true}
                numberOfLines={2}
              />
            )}
          />
          {errors.address && (
            <Text style={styles.errorText}>{errors.address.message}</Text>
          )}

          <Text style={styles.label}>Apartment, Suite, etc. (optional)</Text>
          <Controller
            name="apartment"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.input}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="Apartment, suite, unit, building, etc."
              />
            )}
          />

          <View style={styles.nameRow}>
            <View style={styles.nameInputContainer}>
              <Text style={styles.label}>City</Text>
              <Controller
                name="city"
                control={control}
                rules={{ required: "City is required" }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.input}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholder="Enter your city"
                  />
                )}
              />
              {errors.city && (
                <Text style={styles.errorText}>{errors.city.message}</Text>
              )}
            </View>
            <View style={styles.nameInputContainer}>
              <Text style={styles.label}>Postal Code</Text>
              <Controller
                name="postalCode"
                control={control}
                rules={{
                  pattern: {
                    value: /^\d{4}$/,
                    message: "Enter a valid 4-digit postal code",
                  },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.input}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholder="e.g. 1000"
                    keyboardType="numeric"
                    maxLength={4}
                  />
                )}
              />
              {errors.postalCode && (
                <Text style={styles.errorText}>
                  {errors.postalCode.message}
                </Text>
              )}
            </View>
          </View>

          <Text style={styles.label}>Phone</Text>
          <Controller
            name="phone"
            control={control}
            rules={{
              required: "Phone number is required",
              pattern: {
                value: /^[0-9\+]{9,15}$/,
                message: "Invalid phone number",
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.input}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                keyboardType="phone-pad"
                placeholder="e.g., 0911123456"
              />
            )}
          />
          {errors.phone && (
            <Text style={styles.errorText}>{errors.phone.message}</Text>
          )}
          <View style={styles.checkboxContainer}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setIsSaveChecked(!isSaveChecked)}
            >
              <View
                style={[
                  styles.checkboxInner,
                  isSaveChecked && styles.checkboxChecked,
                ]}
              >
                {isSaveChecked && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxText}>
                Save this information for next time
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          {cartWithDetails.map((item, index) => (
            <View key={`${item.id}-${index}`} style={styles.summaryItem}>
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.summaryImage}
                resizeMode="cover"
              />
              <View style={styles.summaryItemDetails}>
                <Text style={styles.summaryItemText} numberOfLines={1}>
                  {item.name}{" "}
                  {item.variantDetails &&
                  Object.values(item.variantDetails).length > 0
                    ? `(${Object.values(item.variantDetails).join(", ")})`
                    : ""}
                </Text>
                <Text style={styles.summaryItemPrice}>
                  ETB {(item.price * item.quantity).toFixed(2)}
                </Text>
                <View style={styles.quantityContainer}>
                  <Text style={styles.quantityLabel}>Qty: </Text>
                  <Text style={styles.quantityText}>{item.quantity}</Text>
                </View>
              </View>
            </View>
          ))}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>Subtotal</Text>
            <Text style={styles.summaryText}>
              ETB{" "}
              {cartWithDetails
                .reduce((sum, item) => sum + item.price * item.quantity, 0)
                .toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>Shipping</Text>
            <Text style={styles.summaryText}>FREE</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalText}>Total</Text>
            <Text style={styles.totalText}>
              ETB{" "}
              {cartWithDetails
                .reduce((sum, item) => sum + item.price * item.quantity, 0)
                .toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.paymentContainer}>
          <Text style={styles.paymentTitle}>Payment Method</Text>
          {renderPaymentMethods()}
        </View>

        <View style={styles.policyContainer}>
          <View style={styles.refundPolicyCheckbox}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setIsRefundPolicyChecked(!isRefundPolicyChecked)}
            >
              <View
                style={[
                  styles.checkboxInner,
                  isRefundPolicyChecked && styles.checkboxChecked,
                ]}
              >
                {isRefundPolicyChecked && (
                  <Ionicons name="checkmark" size={18} color="#FFF" />
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.refundPolicyLink}
              onPress={() => router.push("/customerservice/refundpolicy")}
            >
              <Text
                style={[
                  styles.refundPolicyText,
                  isRefundPolicyChecked
                    ? styles.refundPolicyTextChecked
                    : styles.refundPolicyTextUnchecked,
                ]}
              >
                I have read and agree to the Refund Policy
              </Text>
            </TouchableOpacity>
          </View>
          {!isRefundPolicyChecked && (
            <Text style={styles.refundPolicyPrompt}>
              Please read and agree to our refund policy
            </Text>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={paymentLoading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              paymentLoading && styles.disabledButton,
            ]}
            onPress={handleSubmit(onSubmit)}
            disabled={paymentLoading}
          >
            {paymentLoading ? (
              <LoadingDots />
            ) : (
              <Text style={styles.confirmButtonText}>Confirm Order</Text>
            )}
          </TouchableOpacity>
        </View>

        <Modal
          visible={showMap}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowMap(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.mapHeader}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowMap(false)}
              >
                <Ionicons name="close" size={24} color="#1E40AF" />
              </TouchableOpacity>
              <Text style={styles.mapTitle}>Select Delivery Location</Text>
            </View>

            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={initialRegion}
              onPress={handleMapPress}
            >
              {selectedLocation && (
                <Marker
                  coordinate={selectedLocation}
                  title="Selected Location"
                  pinColor="#1E40AF"
                />
              )}
            </MapView>

            <View style={styles.mapFooter}>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  !selectedLocation && styles.disabledButton,
                ]}
                onPress={confirmLocation}
                disabled={!selectedLocation}
              >
                <Text style={styles.confirmButtonText}>Confirm Location</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
      <Toast config={toastConfig} />
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  contentContainer: {
    paddingBottom: 20,
  },
  headerContainer: {
    padding: 20,
    backgroundColor: "#1E40AF",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1E293B",
    marginTop: 20,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  formContainer: {
    backgroundColor: "#fff",
    padding: 20,
    marginHorizontal: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapButtonContainer: {
    marginBottom: 16,
  },
  mandatoryPrompt: {
    fontSize: 14,
    color: "#F97316",
    fontWeight: "600",
    marginTop: 4,
    marginLeft: 8,
  },
  successPrompt: {
    fontSize: 14,
    color: "#22C55E", // Green color for success
    fontWeight: "600",
    marginTop: 4,
    marginLeft: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1E293B",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1E293B",
    marginBottom: 12,
  },
  disabledInput: {
    backgroundColor: "#E5E7EB",
    color: "#6B7280",
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  nameInputContainer: {
    flex: 1,
  },
  errorText: {
    fontSize: 14,
    color: "#B91C1C",
    marginTop: -8,
    marginBottom: 12,
    marginLeft: 4,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  checkbox: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#1E40AF",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: "#1E40AF",
  },
  checkmark: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  checkboxText: {
    fontSize: 16,
    color: "#1E293B",
  },
  summaryContainer: {
    backgroundColor: "#fff",
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 10,
  },
  summaryItem: {
    flexDirection: "row",
    marginBottom: 10,
  },
  summaryImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 10,
  },
  summaryItemDetails: {
    flex: 1,
    justifyContent: "center",
  },
  summaryItemText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1E293B",
  },
  summaryItemPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E40AF",
    marginTop: 4,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  quantityLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  quantityText: {
    fontSize: 14,
    color: "#1E293B",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  summaryText: {
    fontSize: 16,
    color: "#1E293B",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  totalText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  paymentContainer: {
    backgroundColor: "#fff",
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 10,
  },
  paymentMethodsList: {
    marginTop: 10,
  },
  paymentOptionListItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    marginBottom: 16,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  selectedPaymentOptionListItem: {
    borderColor: "#1E40AF",
    backgroundColor: "#EFF6FF",
  },
  disabledPaymentOptionListItem: {
    opacity: 0.6,
    backgroundColor: "#F8FAFC",
  },
  paymentLogoContainerList: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 20,
  },
  paymentImageLogoList: {
    width: 64,
    height: 64,
    resizeMode: "contain",
  },
  paymentTextContainerList: {
    flex: 1,
    justifyContent: "center",
  },
  paymentOptionNameList: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },
  paymentOptionSubtextList: {
    fontSize: 14,
    color: "#64748B",
  },
  selectionIndicatorContainer: {
    marginLeft: 12,
    padding: 5,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#6B7280",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginRight: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  confirmButton: {
    flex: 1,
    backgroundColor: "#1E40AF",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  disabledButton: {
    backgroundColor: "#D1D5DB",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  policyContainer: {
    backgroundColor: "#fff",
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  refundPolicyCheckbox: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  checkbox: {
    marginRight: 12,
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#1E40AF",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#1E40AF",
  },
  refundPolicyLink: {
    flex: 1,
  },
  refundPolicyText: {
    fontSize: 16,
    fontWeight: "500",
  },
  refundPolicyTextChecked: {
    color: "#1E40AF",
  },
  refundPolicyTextUnchecked: {
    color: "rgba(30, 64, 175, 0.6)", // Invisible blue
  },
  refundPolicyPrompt: {
    fontSize: 14,
    color: "#F97316",
    marginTop: 4,
    marginLeft: 36,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "500",
    color: "#1E293B",
  },
  mapContainer: {
    height: 200,
    marginBottom: 20,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  currentLocationButton: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "white",
    padding: 10,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  mapHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
  },
  closeButton: {
    padding: 8,
  },
  mapFooter: {
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 0,
  },
  mapButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: "#1E40AF",
    fontWeight: "500",
  },
  coordinatesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  coordinatesText: {
    fontSize: 14,
    color: "#6B7280",
  },
});

export default CheckoutScreen;
