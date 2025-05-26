import AsyncStorage from "@react-native-async-storage/async-storage";
import { formatDistanceToNowStrict } from "date-fns";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { off, onValue, push, ref, serverTimestamp } from "firebase/database";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { db, rtdb } from "../config/firebase";
import LoadingDots from "@/components/LoadingDots";

const { width } = Dimensions.get("window");

const HEADER_GRADIENT_PADDING_TOP = Platform.OS === "android" ? 40 : 50;
const HEADER_GRADIENT_PADDING_BOTTOM = 15;
const HEADER_CONTENT_MARGIN_TOP = 15;
const HEADER_AVATAR_HEIGHT = 42;
const HEADER_SPACING = 20;

const CALCULATED_HEADER_HEIGHT =
  HEADER_GRADIENT_PADDING_TOP +
  HEADER_CONTENT_MARGIN_TOP +
  HEADER_AVATAR_HEIGHT +
  HEADER_GRADIENT_PADDING_BOTTOM;

const encodeEmail = (email) => email.replace(/[.#$[\]]/g, "_");

const isOrderId = (text) => /^[A-Za-z0-9_-]{5,}$/.test(text.trim());

const ChatComponent = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(false);
  const [shouldScrollToEnd, setShouldScrollToEnd] = useState(true);
  const [animationValue] = useState(new Animated.Value(0));
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const params = useLocalSearchParams();
  const router = useRouter();
  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    Animated.timing(animationValue, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const profileJson = await AsyncStorage.getItem("userProfile");
        if (profileJson) {
          const profile = JSON.parse(profileJson);
          if (profile?.email) {
            setUserEmail(profile.email);
            setUserName(profile.name || profile.email.split("@")[0]);
            setupChatListener(profile.email);
          } else {
            console.error("No email found in user profile");
            Toast.show({
              type: "error",
              text1: "Error",
              text2: "Could not identify user. Please log in again.",
            });
            setLoading(false);
          }
        } else {
          console.error("No user profile found in AsyncStorage");
          Toast.show({
            type: "error",
            text1: "Session Expired",
            text2: "Please log in again.",
          });
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
        setLoading(false);
      }
    };

    fetchCurrentUser();

    return () => {
      if (userEmail) {
        const encodedEmail = encodeEmail(userEmail);
        const chatRef = ref(rtdb, `messages/chatId_${encodedEmail}`);
        off(chatRef);
      }
    };
  }, []);

  useEffect(() => {
    if (shouldScrollToEnd && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  useEffect(() => {
    const keyboardDidShow = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardVisible(true);
      if (shouldScrollToEnd) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    });

    const keyboardDidHide = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false);
      if (shouldScrollToEnd) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    });

    return () => {
      keyboardDidShow.remove();
      keyboardDidHide.remove();
    };
  }, [shouldScrollToEnd]);

  const setupChatListener = (email) => {
    const encodedEmail = encodeEmail(email);
    const chatRef = ref(rtdb, `messages/chatId_${encodedEmail}`);
    onValue(chatRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messageList = Object.entries(data).map(([id, message]) => ({
          id,
          ...message,
          timestamp: message.timestamp || Date.now(),
        }));
        setMessages(messageList.sort((a, b) => a.timestamp - b.timestamp));
      } else {
        setMessages([]);
      }
      setLoading(false);
    });
  };

  const fetchOrderDetails = async (orderId) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      const orderSnap = await getDoc(orderRef);

      if (orderSnap.exists()) {
        const orderData = orderSnap.data();
        const formattedDetails = formatOrderDetails(orderData, orderId);
        sendAutomatedResponse(formattedDetails, userEmail);
        return true;
      } else {
        console.log(`No order found with ID: ${orderId}`);
        return false;
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      return false;
    }
  };

  const formatOrderDetails = (order, orderId) => {
    let details = `Order ID: ${orderId}\n`;

    if (order.createdAt) {
      const date = new Date(order.createdAt);
      details += `Date: ${date.toLocaleDateString()}\n`;
    }

    details += `Status: ${order.status || "Processing"}\n`;
    details += `Total Amount: ETB ${
      order.totalAmount?.toFixed(2) || "N/A"
    }\n\n`;

    if (order.cartItems && order.cartItems.length > 0) {
      details += "Items:\n";
      order.cartItems.forEach((item, index) => {
        details += `${index + 1}. ${item.name} (x${item.quantity}) - ETB ${(
          item.price * item.quantity
        ).toFixed(2)}\n`;
      });
    }

    if (order.shippingAddress) {
      details += `\nShipping To: ${order.shippingAddress.address}, ${order.shippingAddress.city}, ${order.shippingAddress.country}\n`;
    }

    return details;
  };

  const sendAutomatedResponse = async (text, email) => {
    if (!text || !email) return;

    try {
      const encodedEmail = encodeEmail(email);
      const chatRef = ref(rtdb, `messages/chatId_${encodedEmail}`);

      await push(chatRef, {
        text: text,
        sender: "service",
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error sending automated response:", error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !userEmail) return;

    const messageText = newMessage.trim();

    try {
      const encodedEmail = encodeEmail(userEmail);
      const chatRef = ref(rtdb, `messages/chatId_${encodedEmail}`);

      await push(chatRef, {
        text: messageText,
        sender: "customer",
        email: userEmail,
        timestamp: serverTimestamp(),
      });

      setNewMessage("");

      if (isOrderId(messageText)) {
        sendAutomatedResponse("Looking up your order details...", userEmail);
        const found = await fetchOrderDetails(messageText);

        if (!found) {
          setTimeout(() => {
            sendAutomatedResponse(
              "Sorry, I couldn't find an order with that ID. Please check and try again.",
              userEmail
            );
          }, 1500);
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to send message. Please try again.",
      });
    }
  };

  const handleInputFocus = () => {
    setTyping(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleInputBlur = () => {
    if (!keyboardVisible) {
      setTyping(false);
    }
  };

  const handleContentSizeChange = () => {
    if (shouldScrollToEnd) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  };

  const handleScroll = (event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isAtBottom =
      contentOffset.y + layoutMeasurement.height >= contentSize.height - 50;
    setShouldScrollToEnd(isAtBottom);
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";

    const date = new Date(timestamp);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return formatDistanceToNowStrict(date, { addSuffix: true });
  };

  const renderMessage = ({ item, index }) => {
    const isCustomer = item.sender === "customer";
    const showAvatar =
      index === 0 || messages[index - 1]?.sender !== item.sender;

    const nextIsSameSender =
      index < messages.length - 1 &&
      messages[index + 1]?.sender === item.sender;

    return (
      <View
        style={[
          styles.messageWrapper,
          isCustomer
            ? styles.customerMessageWrapper
            : styles.serviceMessageWrapper,
          !nextIsSameSender && { marginBottom: 16 },
        ]}
      >
        {!isCustomer && showAvatar && (
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <MaterialIcons name="support-agent" size={16} color="#FFF" />
            </View>
          </View>
        )}

        <View
          style={[
            styles.messageContainer,
            isCustomer ? styles.customerMessage : styles.serviceMessage,
            showAvatar
              ? isCustomer
                ? styles.messageWithoutAvatar
                : styles.messageWithAvatar
              : isCustomer
              ? styles.messageChainRight
              : styles.messageChainLeft,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isCustomer
                ? styles.customerMessageText
                : styles.serviceMessageText,
            ]}
          >
            {item.text}
          </Text>
          <View style={styles.messageFooter}>
            <Text
              style={[
                styles.timestamp,
                isCustomer ? styles.customerTimestamp : styles.serviceTimestamp,
              ]}
            >
              {formatTimestamp(item.timestamp)}
            </Text>
            {isCustomer && (
              <Ionicons
                name="checkmark-done"
                size={16}
                color="rgba(255,255,255,0.8)"
                style={styles.readIndicator}
              />
            )}
          </View>
        </View>

        {isCustomer && showAvatar && (
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, styles.customerAvatar]}>
              <Text style={styles.avatarText}>
                {userName ? userName.charAt(0).toUpperCase() : "U"}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const headerTranslateY = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 0],
  });

  const headerOpacity = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  if (loading) {
    return (
      <View style={{ marginTop: 300 }}>
        <LoadingDots />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#1E40AF" />

      <Animated.View
        style={[
          styles.header,
          {
            transform: [{ translateY: headerTranslateY }],
            opacity: headerOpacity,
          },
        ]}
      >
        <LinearGradient
          colors={["#1E40AF", "#3B82F6", "#60A5FA"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          
          <View style={styles.headerContent}>
            <View style={styles.supportAvatar}>
              <MaterialIcons name="support-agent" size={24} color="#FFF" />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Customer Support</Text>
              {/* <Text style={styles.headerSubtitle}>
                {messages.length > 0 ? "Online" : "Start a conversation"}
              </Text> */}
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={
          Platform.OS === "ios" ? CALCULATED_HEADER_HEIGHT + insets.top : 0
        }
        enabled={true}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color="#CBD5E0" />
            </View>
            <Text style={styles.emptyTitle}>No Messages Yet</Text>
            <Text style={styles.emptyText}>
              Send an order ID to get detailed information about your order, or
              start a conversation with our customer service team. We're here to
              help!
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={handleContentSizeChange}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          />
        )}

        <TouchableOpacity
          activeOpacity={1}
          style={[
            styles.inputContainer,
            typing && styles.inputContainerFocused,
            { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 },
          ]}
          onPress={() => inputRef.current?.focus()}
        >
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type your order ID or message..."
            placeholderTextColor="#94A3B8"
            multiline
            maxHeight={100}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onContentSizeChange={() => {
              if (shouldScrollToEnd) {
                flatListRef.current?.scrollToEnd({ animated: true });
              }
            }}
          />
          <View style={styles.inputActions}>
            <TouchableOpacity
              style={[
                styles.sendButton,
                !newMessage.trim() && styles.sendButtonDisabled,
              ]}
              onPress={sendMessage}
              disabled={!newMessage.trim()}
            >
              <Ionicons
                name="send"
                size={20}
                color={newMessage.trim() ? "#FFFFFF" : "#94A3B8"}
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </KeyboardAvoidingView>

      <Toast />
    </View>
  );
};

// Wrap the chat component with SafeAreaProvider to ensure insets are available
const Chat = () => {
  return (
    <SafeAreaProvider>
      <ChatComponent />
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F8FF",
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F8FF",
  },
  loadingGradient: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  header: {
    width: "100%",
    zIndex: 10,
  },
  headerGradient: {
    paddingTop: Platform.OS === "android" ? 40 : 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: HEADER_CONTENT_MARGIN_TOP,
    justifyContent: "space-between",
    paddingRight: HEADER_SPACING,
  },
  supportAvatar: {
    width: HEADER_AVATAR_HEIGHT,
    height: HEADER_AVATAR_HEIGHT,
    borderRadius: HEADER_AVATAR_HEIGHT / 2,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: HEADER_SPACING,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#EDF2F7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#2D3748",
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: "#718096",
    textAlign: "center",
    lineHeight: 22,
  },
  messagesList: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  messageWrapper: {
    flexDirection: "row",
    marginVertical: 2,
    maxWidth: "100%",
  },
  customerMessageWrapper: {
    justifyContent: "flex-end",
  },
  serviceMessageWrapper: {
    justifyContent: "flex-start",
  },
  avatarContainer: {
    width: 28,
    marginHorizontal: 8,
    alignItems: "center",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
  },
  customerAvatar: {
    backgroundColor: "#1E40AF",
  },
  avatarText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  messageContainer: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: "75%",
  },
  messageWithAvatar: {
    borderTopLeftRadius: 4,
  },
  messageWithoutAvatar: {
    borderTopRightRadius: 4,
  },
  messageChainLeft: {
    borderTopLeftRadius: 16,
    marginLeft: 44,
  },
  messageChainRight: {
    borderTopRightRadius: 16,
    marginRight: 44,
  },
  customerMessage: {
    backgroundColor: "#1E40AF",
    borderBottomRightRadius: 4,
  },
  serviceMessage: {
    backgroundColor: "#E2E8F0",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  customerMessageText: {
    color: "#FFFFFF",
  },
  serviceMessageText: {
    color: "#1E293B",
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  timestamp: {
    fontSize: 11,
    marginRight: 4,
  },
  customerTimestamp: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  serviceTimestamp: {
    color: "#64748B",
  },
  readIndicator: {
    marginLeft: 2,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    width: "100%",
  },
  inputContainerFocused: {
    borderTopColor: "#1E40AF",
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  input: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 16,
    color: "#1E293B",
    maxHeight: 100,
    minHeight: 40,
  },
  inputActions: {
    marginLeft: 12,
    justifyContent: "flex-end",
  },
  sendButton: {
    backgroundColor: "#1E40AF",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#CBD5E0",
  },
});

export default Chat;
