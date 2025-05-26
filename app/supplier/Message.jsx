import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker"; // For file selection
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { off, onValue, push, ref, update } from "firebase/database";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { auth, rtdb } from "../config/firebase"; // Adjust path as needed

// Cloudinary Constants
const CLOUDINARY_UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_OFFICE || "office";
const CLOUDINARY_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dcrso99w7";
const CLOUDINARY_FOLDER = "samples/ecommerce/staff_agreements";

// --- Helper Functions ---

// Safely creates a Date object from various timestamp formats
const safeNewDate = (timestamp) => {
  try {
    if (
      typeof timestamp === "number" ||
      (typeof timestamp === "string" && /^\d+$/.test(timestamp))
    ) {
      const numericTimestamp =
        typeof timestamp === "string" ? parseInt(timestamp, 10) : timestamp;
      if (numericTimestamp > 946684800000) {
        const date = new Date(numericTimestamp);
        if (!isNaN(date.getTime())) return date;
      }
    }
    if (
      typeof timestamp === "string" &&
      timestamp.includes("T") &&
      timestamp.endsWith("Z")
    ) {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) return date;
    }
    console.warn(
      "[App] Invalid or unparseable timestamp encountered:",
      timestamp
    );
    return null;
  } catch (e) {
    console.error("[App] Error creating date:", e, "Timestamp:", timestamp);
    return null;
  }
};

// Formats a Date object to EAT (Africa/Addis_Ababa) time string
const formatToEATTimeString = (date) => {
  if (!date || isNaN(date.getTime())) return "Invalid Time";
  try {
    return date.toLocaleTimeString("en-US", {
      timeZone: "Africa/Addis_Ababa",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch (e) {
    console.error("[App] Error formatting time:", e, "Date:", date);
    return "Error Time";
  }
};

// Generates date header labels (TODAY, YESTERDAY, or specific date)
const getDateHeaderLabel = (date) => {
  if (!date || isNaN(date.getTime())) return "";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  today.setHours(0, 0, 0, 0);
  yesterday.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);

  if (compareDate.getTime() === today.getTime()) return "TODAY";
  if (compareDate.getTime() === yesterday.getTime()) return "YESTERDAY";
  return date
    .toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase();
};

// Add helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// --- Component ---
const MessageScreen = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const navigation = useNavigation();
  const user = auth.currentUser;
  const chatId = user ? `admin_${user.uid}` : null;
  const flatListRef = useRef(null);
  const appState = useRef(AppState.currentState);
  const listenerRef = useRef(null); // Store listener cleanup function

  // Function to setup Firebase listener
  const setupListener = useCallback(() => {
    if (!user || !chatId) {
      setLoading(false);
      return;
    }

    console.log("[App] Setting up Firebase listener for chatId:", chatId);
    setLoading(true);
    const messagesRef = ref(rtdb, `chats/${chatId}/messages`);

    const handleData = (snapshot) => {
      const data = snapshot.val();
      console.log("[App] Received data snapshot");
      const messageList = data
        ? Object.entries(data)
            .map(([key, msg]) => {
              const primaryTimestamp = msg.timestamp;
              const localDate = safeNewDate(primaryTimestamp);
              const localTimeString = localDate
                ? formatToEATTimeString(localDate)
                : "Invalid Time";
              const numericTimestamp =
                typeof primaryTimestamp === "number" ? primaryTimestamp : 0;

              return {
                id: key,
                ...msg,
                timestamp: numericTimestamp,
                localDate,
                localTimeString,
                sender: msg.sender || "unknown",
                senderId: msg.senderId || msg.uid || "unknown",
              };
            })
            .sort((a, b) => a.timestamp - b.timestamp)
        : [];

      setMessages(messageList);
      setLoading(false);
      console.log("[App] Messages updated, count:", messageList.length);
    };

    const onError = (error) => {
      console.error("[App] Firebase listener error:", error);
      setMessages([]);
      setLoading(false);
      Alert.alert(
        "Connection Error",
        "Failed to load messages. Please check your connection."
      );
    };

    onValue(messagesRef, handleData, onError);

    // Store cleanup function
    listenerRef.current = () => {
      console.log("[App] Detaching Firebase listener for chatId:", chatId);
      off(messagesRef, "value", handleData);
    };
  }, [user, chatId]);

  // Function to fetch messages from Firebase Realtime Database
  const fetchMessages = async () => {
    if (!user) {
      console.error("[App] User is not authenticated.");
      Alert.alert("Authentication Required", "Please login to view messages.");
      return;
    }

    try {
      const response = await fetch(
        `https://abyssiniagebeyapro-default-rtdb.firebaseio.com/chats/${chatId}.json?auth=${user.stsTokenManager.accessToken}` // Include auth token
      );
      if (!response.ok) {
        const errorData = await response.json();
        console.error("[App] Firebase fetch error:", errorData);
        throw new Error("Failed to fetch messages from Firebase.");
      }
      const data = await response.json();
      if (!data) {
        console.warn("[App] No data found in Firebase.");
        setMessages([]);
        return;
      }
      const messages = Object.entries(data).map(([key, value]) => ({
        id: key,
        ...value,
      }));
      setMessages(
        messages.sort((a, b) => a.timestamp - b.timestamp) // Sort messages by timestamp
      );
      console.log(
        "[App] Messages fetched successfully, count:",
        messages.length
      );
    } catch (error) {
      console.error("[App] Error fetching messages:", error);
      Alert.alert("Error", "Failed to fetch messages. Please try again.");
    }
  };

  // Function to upload a file to Cloudinary
  const uploadToCloudinary = async (file) => {
    try {
      // Create form data
      const formData = new FormData();

      // Handle PDF files differently from images
      const isPDF = file.type === "application/pdf";

      // Prepare the file object for upload
      const fileToUpload = {
        uri: file.uri,
        type: isPDF ? "application/pdf" : file.type || "image/jpeg",
        name: file.name || (isPDF ? "document.pdf" : "image.jpg"),
      };

      // Append the file to form data
      formData.append("file", fileToUpload);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      formData.append("resource_type", isPDF ? "raw" : "auto");

      // Use different URL for PDFs vs images
      const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${
        isPDF ? "raw" : "image"
      }/upload`;

      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Upload failed");
      }

      return data.secure_url;
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      throw error;
    }
  };

  // Function to handle image selection
  const handleImagePick = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Toast.show({
          type: "error",
          text1: "Permission Required",
          text2: "Please allow access to your photos to select images.",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        const selectedImage = result.assets[0];
        setSelectedFile({
          uri: selectedImage.uri,
          type: "image/jpeg",
          name: "photo.jpg",
          mimeType: "image/jpeg",
        });
        setMessage("Image selected");
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to pick image. Please try again.",
      });
    }
  };

  // Function to handle document selection
  const handleDocumentPick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf"],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.assets && result.assets[0]) {
        const file = result.assets[0];

        // Get the file info including size
        const fileInfo = await FileSystem.getInfoAsync(file.uri);
        const fileSize = fileInfo.exists ? formatFileSize(fileInfo.size) : null;

        // Create the file object
        const fileToUpload = {
          uri: file.uri,
          type: "application/pdf",
          name: file.name || "document.pdf",
          size: fileSize,
        };

        setSelectedFile(fileToUpload);
        setMessage(`File selected: ${fileToUpload.name}`);

        Toast.show({
          type: "success",
          text1: "PDF selected",
          text2: fileToUpload.name,
        });
      }
    } catch (error) {
      console.error("Error picking PDF:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to pick PDF. Please try again.",
      });
    }
  };

  // Function to show file picker options
  const handleFilePick = () => {
    Alert.alert(
      "Select File Type",
      "Choose what type of file you want to upload",
      [
        {
          text: "Image",
          onPress: handleImagePick,
        },
        {
          text: "Document (PDF)",
          onPress: handleDocumentPick,
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  // Add new function to mark messages as read
  const markMessagesAsRead = useCallback(() => {
    if (!user || !chatId) return;

    const messagesRef = ref(rtdb, `chats/${chatId}/messages`);
    onValue(
      messagesRef,
      (snapshot) => {
        if (!snapshot.exists()) return;

        const updates = {};
        snapshot.forEach((childSnapshot) => {
          const message = childSnapshot.val();
          if (message.sender === "admin" && !message.isRead) {
            updates[`${childSnapshot.key}/isRead`] = true;
          }
        });

        // If there are unread messages, update them
        if (Object.keys(updates).length > 0) {
          const updateRef = ref(rtdb, `chats/${chatId}/messages`);
          update(updateRef, updates).catch((error) => {
            console.error("Error marking messages as read:", error);
          });
        }
      },
      {
        onlyOnce: true,
      }
    );
  }, [user, chatId]);

  // Call markMessagesAsRead when the component mounts and when it becomes active
  useEffect(() => {
    if (!user || !chatId) return;

    markMessagesAsRead();

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        markMessagesAsRead();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [user, chatId, markMessagesAsRead]);

  // Function to handle file upload and sending
  const handleFileSend = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      const fileUrl = await uploadToCloudinary(selectedFile);
      if (!fileUrl) {
        throw new Error("Failed to upload file");
      }

      const timestamp = Date.now();
      const localDate = new Date(timestamp);
      const isImage =
        selectedFile.mimeType?.startsWith("image/") ||
        fileUrl.match(/\.(jpg|jpeg|png|gif)$/i);

      const messageData = {
        text: selectedFile.name,
        fileUrl,
        fileType: selectedFile.mimeType || "application/octet-stream",
        fileName: selectedFile.name,
        sender: "supplier",
        senderId: user.uid,
        senderName: user.displayName || "Supplier",
        timestamp,
        localTimestamp: localDate.toISOString(),
        isRead: false, // Add isRead field
      };

      if (isImage) {
        messageData.imageUrl = fileUrl;
      }

      const messagesRef = ref(rtdb, `chats/${chatId}/messages`);
      await push(messagesRef, messageData);

      Toast.show({
        type: "success",
        text1: "Success",
        text2: "File sent successfully!",
      });

      // Clear the selected file and message
      setSelectedFile(null);
      setMessage("");
    } catch (error) {
      console.error("[App] Error sending file:", error);
      Alert.alert("Error", "Failed to send file. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  // Modify the sendMessage function to include isRead field
  const sendMessage = async () => {
    const trimmedMessage = message.trim();
    if (
      (!trimmedMessage && !selectedFile) ||
      !user ||
      !chatId ||
      isSending ||
      isUploading
    ) {
      return;
    }

    setIsSending(true);
    try {
      let messageData = {
        text: trimmedMessage,
        sender: "supplier",
        senderId: user.uid,
        senderName: user.displayName || "Supplier",
        timestamp: Date.now(),
        isRead: false,
      };

      if (selectedFile) {
        setIsUploading(true);
        try {
          const fileUrl = await uploadToCloudinary(selectedFile);
          const isPDF = selectedFile.type === "application/pdf";

          messageData = {
            ...messageData,
            fileUrl,
            fileName: selectedFile.name,
            fileType: selectedFile.type,
            fileSize: selectedFile.size,
            isImage: !isPDF,
            isPDF: isPDF,
          };

          Toast.show({
            type: "success",
            text1: `${isPDF ? "PDF" : "File"} uploaded successfully`,
          });
        } catch (error) {
          console.error("Upload error:", error);
          Toast.show({
            type: "error",
            text1: "File upload failed",
            text2:
              error.message || "Could not upload the file. Please try again.",
          });
          setIsSending(false);
          setIsUploading(false);
          return;
        }
        setIsUploading(false);
      }

      const messagesRef = ref(rtdb, `chats/${chatId}/messages`);
      await push(messagesRef, messageData);

      setMessage("");
      setSelectedFile(null);
      Toast.show({
        type: "success",
        text1: "Message sent successfully",
      });
    } catch (error) {
      console.error("Error sending message:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to send message. Please try again.",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Effect for Authentication Check
  useEffect(() => {
    if (!user) {
      Alert.alert("Authentication Required", "Please login to view messages.", [
        { text: "OK", onPress: () => navigation.navigate("Login") },
      ]);
      setLoading(false);
      setMessages([]);
    }
  }, [user, navigation]);

  // Effect for Managing Listener based on App State and User/ChatId
  useEffect(() => {
    if (!user || !chatId) {
      return () => {};
    }

    // Setup listener initially
    setupListener();

    const handleAppStateChange = (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        console.log("[App] State changed to Active: Re-attaching listener.");
        // Cleanup existing listener before re-attaching
        if (listenerRef.current) {
          listenerRef.current();
        }
        setupListener();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    // Cleanup on unmount
    return () => {
      console.log("[App] Cleaning up MessageScreen effect");
      if (listenerRef.current) {
        listenerRef.current();
        listenerRef.current = null;
      }
      subscription.remove();
    };
  }, [user, chatId, setupListener]); // Removed isListenerActive

  // Fetch messages on component mount
  useEffect(() => {
    fetchMessages();
  }, []);

  // Scroll to end when messages change
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      const timer = setTimeout(() => {
        try {
          flatListRef.current?.scrollToEnd({ animated: true });
        } catch (error) {
          console.warn("[App] Error scrolling to end:", error);
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  // Function to handle image upload and sending
  const handleImageSend = async () => {
    try {
      const image = await handleImagePick();
      if (!image) return;
      setIsSending(true);
      const fileUrl = await uploadToCloudinary(image);
      if (!fileUrl) return;
      const timestamp = Date.now();
      const localDate = new Date(timestamp);
      const messageData = {
        text: `Image: ${image.name}`,
        fileUrl,
        imageUrl: fileUrl,
        sender: "supplier",
        senderId: user.uid,
        senderName: user.displayName || "Supplier",
        timestamp,
        localTimestamp: localDate.toISOString(),
      };
      const messagesRef = ref(rtdb, `chats/${chatId}/messages`);
      await push(messagesRef, messageData);
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Image sent successfully!",
      });
      setMessage("");
    } catch (error) {
      console.error("[App] Error sending image:", error);
      Alert.alert("Error", "Failed to send image. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  // Render Item function for FlatList
  const renderMessage = useCallback(
    ({ item: msg, index }) => {
      if (!msg || !msg.sender) return null;

      const isSupplier = msg.sender === "supplier";
      const prevMessage = messages[index - 1];
      const nextMessage = messages[index + 1];
      const showDateHeader =
        index === 0 ||
        (prevMessage &&
          prevMessage.localDate?.toDateString() !==
            msg.localDate?.toDateString());
      const isGroupedWithPrevious =
        prevMessage &&
        prevMessage.sender === msg.sender &&
        msg.timestamp - prevMessage.timestamp < 5 * 60 * 1000 &&
        prevMessage.localDate?.toDateString() === msg.localDate?.toDateString();
      const isGroupedWithNext =
        nextMessage &&
        nextMessage.sender === msg.sender &&
        nextMessage.timestamp - msg.timestamp < 5 * 60 * 1000 &&
        nextMessage.localDate?.toDateString() === msg.localDate?.toDateString();
      const showSenderName = !isSupplier && !isGroupedWithPrevious;
      const showTimestamp = !isGroupedWithNext;
      const fileOrImageUrl = msg.fileUrl;
      const isPDF = msg.isPDF || msg.fileType === "application/pdf";
      const isImage =
        msg.isImage ||
        (!isPDF && fileOrImageUrl?.match(/\.(jpg|jpeg|png|gif)$/i));
      const fileType = msg.fileType?.split("/")[1]?.toUpperCase() || "DOCUMENT";

      return (
        <React.Fragment>
          {showDateHeader && msg.localDate && (
            <View style={styles.dateHeader}>
              <Text style={styles.dateHeaderText}>
                {getDateHeaderLabel(msg.localDate)}
              </Text>
            </View>
          )}
          <View
            style={[
              styles.messageRow,
              isSupplier ? styles.supplierRow : styles.adminRow,
              { marginTop: isGroupedWithPrevious ? 2 : 8 },
            ]}
          >
            <View
              style={[
                styles.messageBubble,
                isSupplier ? styles.supplierBubble : styles.adminBubble,
                isSupplier
                  ? {
                      borderTopRightRadius: isGroupedWithPrevious ? 4 : 16,
                      borderBottomRightRadius: isGroupedWithNext ? 4 : 16,
                    }
                  : {
                      borderTopLeftRadius: isGroupedWithPrevious ? 4 : 16,
                      borderBottomLeftRadius: isGroupedWithNext ? 4 : 16,
                    },
              ]}
            >
              {showSenderName && <Text style={styles.senderName}>Admin</Text>}
              {fileOrImageUrl ? (
                <TouchableOpacity
                  onPress={() => {
                    if (fileOrImageUrl) {
                      if (isPDF) {
                        // For PDFs, open in browser or PDF viewer
                        Linking.openURL(fileOrImageUrl);
                      } else {
                        // For images, could show in full screen or open in browser
                        Linking.openURL(fileOrImageUrl);
                      }
                    }
                  }}
                  style={styles.attachmentContainer}
                >
                  {isImage ? (
                    <View style={styles.imageAttachmentContainer}>
                      <Image
                        source={{ uri: fileOrImageUrl }}
                        style={styles.imagePreview}
                        resizeMode="contain"
                      />
                      <View style={styles.imageOverlay}>
                        <Text
                          style={[
                            styles.attachmentName,
                            isSupplier
                              ? styles.supplierFileText
                              : styles.adminFileText,
                          ]}
                        >
                          {msg.fileName || "Image"}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.fileAttachment,
                        isSupplier
                          ? styles.supplierFileAttachment
                          : styles.adminFileAttachment,
                      ]}
                    >
                      <View
                        style={[
                          styles.fileIconContainer,
                          isSupplier && {
                            backgroundColor: "rgba(255, 255, 255, 0.1)",
                          },
                        ]}
                      >
                        <Ionicons
                          name={isPDF ? "document-text" : "document"}
                          size={32}
                          color={isSupplier ? "#FFFFFF" : "#2563EB"}
                        />
                      </View>
                      <View style={styles.fileAttachmentInfo}>
                        <Text
                          style={[
                            styles.attachmentName,
                            isSupplier
                              ? styles.supplierFileText
                              : styles.adminFileText,
                          ]}
                        >
                          {msg.fileName || "Document"}
                        </Text>
                        {msg.fileSize && (
                          <Text
                            style={[
                              styles.fileSize,
                              isSupplier
                                ? styles.supplierFileText
                                : styles.adminFileText,
                            ]}
                          >
                            {msg.fileSize}
                          </Text>
                        )}
                        <View
                          style={[
                            styles.fileTypeTag,
                            isSupplier && {
                              backgroundColor: "rgba(255, 255, 255, 0.1)",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.fileTypeText,
                              isSupplier && { color: "#FFFFFF" },
                            ]}
                          >
                            {isPDF ? "PDF" : "DOCUMENT"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              ) : (
                <Text
                  style={[
                    isSupplier ? styles.supplierText : styles.adminText,
                    showTimestamp ? { paddingRight: 55 } : {},
                  ]}
                >
                  {msg.text || ""}
                </Text>
              )}
              {showTimestamp && (
                <Text
                  style={[
                    styles.timestamp,
                    isSupplier
                      ? styles.supplierTimestamp
                      : styles.adminTimestamp,
                  ]}
                >
                  {msg.localTimeString || ""}
                </Text>
              )}
            </View>
          </View>
        </React.Fragment>
      );
    },
    [messages]
  );

  // Main Component Return
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {loading && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : messages.length === 0 && !loading ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={70} color="#cccccc" />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubText}>
              Send a message to start chatting with Admin.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesListContent}
          />
        )}
        <View style={styles.inputContainer}>
          <TouchableOpacity
            onPress={handleFilePick}
            style={styles.fileButton}
            disabled={isSending || isUploading}
          >
            <Ionicons
              name={selectedFile ? "checkmark-circle" : "attach"}
              size={24}
              color={selectedFile ? "#4CAF50" : "#2563EB"}
            />
          </TouchableOpacity>

          <View style={styles.inputWrapper}>
            {selectedFile && (
              <View style={styles.selectedFilePreview}>
                {selectedFile.type?.startsWith("image/") ? (
                  <View style={styles.imagePreviewWrapper}>
                    <Image
                      source={{ uri: selectedFile.uri }}
                      style={styles.selectedFileImage}
                      resizeMode="contain"
                    />
                    <View style={styles.imageOverlay}>
                      <Text style={styles.imageFileName} numberOfLines={1}>
                        {selectedFile.name}
                      </Text>
                      {selectedFile.size && (
                        <Text style={styles.imageFileSize}>
                          {selectedFile.size}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.removeFileButton}
                      onPress={() => {
                        setSelectedFile(null);
                        setMessage("");
                      }}
                    >
                      <Ionicons name="close-circle" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.filePreviewWrapper}>
                    <View style={styles.filePreviewContent}>
                      <View style={styles.fileIconContainer}>
                        <Ionicons
                          name={
                            selectedFile.type?.includes("pdf")
                              ? "document-text"
                              : "document"
                          }
                          size={32}
                          color="#2563EB"
                        />
                      </View>
                      <View style={styles.fileInfoContainer}>
                        <Text style={styles.selectedFileName} numberOfLines={2}>
                          {selectedFile.name}
                        </Text>
                        {selectedFile.size && (
                          <Text style={styles.fileSize}>
                            {selectedFile.size}
                          </Text>
                        )}
                        <View style={styles.fileTypeTag}>
                          <Text style={styles.fileTypeText}>
                            {selectedFile.type?.split("/")[1]?.toUpperCase() ||
                              "DOCUMENT"}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.removeFileButton}
                        onPress={() => {
                          setSelectedFile(null);
                          setMessage("");
                        }}
                      >
                        <Ionicons
                          name="close-circle"
                          size={24}
                          color="#FF3B30"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}
            <TextInput
              style={[styles.input, selectedFile && styles.inputWithFile]}
              value={message}
              onChangeText={setMessage}
              placeholder={
                selectedFile ? "Add a message..." : "Type a message..."
              }
              placeholderTextColor="#94A3B8"
              multiline
              editable={!isSending && !isUploading && !!user}
              selectionColor="#2563EB"
            />
          </View>

          <TouchableOpacity
            onPress={sendMessage}
            style={[
              styles.sendButton,
              !message.trim() && !selectedFile && styles.sendButtonDisabled,
            ]}
            disabled={
              (!message.trim() && !selectedFile) || isSending || isUploading
            }
          >
            {isSending || isUploading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons
                name="send"
                size={20}
                color="#FFFFFF"
                style={styles.sendIcon}
              />
            )}
          </TouchableOpacity>
        </View>
        <Toast />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6", // Lighter, modern background
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#F3F4F6",
  },
  emptyText: {
    fontSize: 18,
    color: "#4B5563",
    marginTop: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  emptySubText: {
    fontSize: 15,
    color: "#6B7280",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 22,
  },
  messagesList: {
    flex: 1,
  },
  messagesListContent: {
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  dateHeader: {
    alignItems: "center",
    marginVertical: 16,
  },
  dateHeaderText: {
    fontSize: 13,
    color: "#6B7280",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    fontWeight: "600",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  messageRow: {
    flexDirection: "row",
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  supplierRow: {
    justifyContent: "flex-end",
    paddingLeft: "15%",
  },
  adminRow: {
    justifyContent: "flex-start",
    paddingRight: "15%",
  },
  messageBubble: {
    maxWidth: "100%",
    minWidth: 160,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
  },
  supplierBubble: {
    backgroundColor: "#2563EB",
    borderBottomRightRadius: 4,
  },
  adminBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
  },
  supplierText: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 22,
  },
  adminText: {
    color: "#1F2937",
    fontSize: 16,
    lineHeight: 22,
  },
  senderName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#DC2626",
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 11,
    position: "absolute",
    bottom: 8,
    right: 12,
    fontWeight: "500",
  },
  supplierTimestamp: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  adminTimestamp: {
    color: "rgba(0, 0, 0, 0.5)",
  },
  inputContainer: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    alignItems: "flex-end",
  },
  inputWrapper: {
    flex: 1,
    marginHorizontal: 12,
  },
  selectedFilePreview: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  imagePreviewWrapper: {
    position: "relative",
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 12,
    overflow: "hidden",
  },
  selectedFileImage: {
    width: "100%",
    aspectRatio: 4 / 3,
    backgroundColor: "#F3F4F6",
  },
  imageOverlay: {
    padding: 12,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  imageFileName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  imageFileSize: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 13,
    marginTop: 2,
  },
  filePreviewWrapper: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
  },
  filePreviewContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  fileIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  fileInfoContainer: {
    flex: 1,
    marginRight: 8,
  },
  selectedFileName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
    lineHeight: 20,
  },
  fileSize: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 6,
  },
  fileTypeTag: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  fileTypeText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  removeFileButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 4,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    zIndex: 1,
  },
  inputWithFile: {
    marginTop: 0,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "ios" ? 12 : 10,
    paddingBottom: Platform.OS === "ios" ? 12 : 10,
    fontSize: 16,
    maxHeight: 100,
    color: "#1F2937",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  sendButtonDisabled: {
    backgroundColor: "#E5E7EB",
  },
  sendIcon: {
    marginLeft: 2,
  },
  fileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  imagePreview: {
    width: "100%",
    aspectRatio: 4 / 3,
    backgroundColor: "#F3F4F6",
  },
  fileContainer: {
    marginVertical: 6,
    backgroundColor: "#F9FAFB",
    padding: 10,
    borderRadius: 8,
    width: "100%",
  },
  fileText: {
    color: "#2563EB",
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
    fontWeight: "500",
  },
  // New styles for better visual hierarchy
  messageGroup: {
    marginBottom: 8,
  },
  messageTime: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 4,
  },
  attachmentContainer: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    marginVertical: 4,
  },
  imageAttachmentContainer: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F8FAFC",
  },
  imageOverlay: {
    padding: 12,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  fileAttachment: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
  },
  supplierFileAttachment: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  fileIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  fileAttachmentInfo: {
    flex: 1,
    marginRight: 8,
  },
  attachmentName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
    lineHeight: 20,
  },
  fileSize: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 6,
  },
  fileTypeTag: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  fileTypeText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  supplierFileText: {
    color: "#FFFFFF",
    opacity: 0.95,
  },
  adminFileText: {
    color: "#1E293B",
  },
});

export default MessageScreen;
