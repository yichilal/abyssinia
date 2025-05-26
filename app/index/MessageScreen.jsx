import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { off, onValue, push, ref, update } from "firebase/database";
import React, { useEffect, useRef, useState } from "react";
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
import { auth, rtdb } from "../config/firebase";

// Helper function to format time
const formatTime = (date) => {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const MessageScreen = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const router = useRouter();
  const user = auth.currentUser;
  const chatId = user ? `user_${user.uid}` : null;
  const flatListRef = useRef(null);
  const appState = useRef(AppState.currentState);

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
        });
        setFilePreview({
          uri: selectedImage.uri,
          type: "image/jpeg",
          name: "photo.jpg",
          isImage: true,
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
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (result.type === "success") {
        setSelectedFile({
          uri: result.uri,
          type: result.mimeType,
          name: result.name,
        });
        setFilePreview({
          uri: result.uri,
          type: result.mimeType,
          name: result.name,
          isImage: false,
        });
        setMessage(`File selected: ${result.name}`);
      }
    } catch (error) {
      console.error("Error picking document:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to pick document. Please try again.",
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

  // Function to remove selected file
  const removeSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setMessage("");
  };

  // Function to upload file to Cloudinary
  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", {
      uri: file.uri,
      type: file.type,
      name: file.name,
    });
    formData.append("upload_preset", "dcrso99w7");

    try {
      const response = await fetch(
        "https://api.cloudinary.com/v1_1/dcrso99w7/auto/upload",
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message);
      }
      return data.secure_url;
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      throw new Error("Failed to upload file");
    }
  };

  // Function to send message
  const sendMessage = async () => {
    if ((!message.trim() && !selectedFile) || !user || isSending) return;

    setIsSending(true);
    try {
      let messageData = {
        text: message.trim(),
        sender: "user",
        senderId: user.uid,
        senderName: user.displayName || "User",
        timestamp: Date.now(),
        isRead: false,
      };

      if (selectedFile) {
        try {
          const fileUrl = await uploadToCloudinary(selectedFile);
          messageData = {
            ...messageData,
            fileUrl,
            fileName: selectedFile.name,
            fileType: selectedFile.type,
            isImage: selectedFile.type?.startsWith("image/"),
          };
          Toast.show({
            type: "success",
            text1: "File uploaded successfully",
          });
        } catch (error) {
          Toast.show({
            type: "error",
            text1: "File upload failed",
            text2: "Could not upload the file. Please try again.",
          });
          setIsSending(false);
          return;
        }
      }

      const messagesRef = ref(rtdb, `chats/${chatId}/messages`);
      await push(messagesRef, messageData);

      setMessage("");
      setSelectedFile(null);
      setFilePreview(null);
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

  // Setup message listener
  useEffect(() => {
    if (!user || !chatId) return;

    const messagesRef = ref(rtdb, `chats/${chatId}/messages`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messageList = Object.entries(data)
          .map(([id, msg]) => ({
            id,
            ...msg,
            timestamp: new Date(msg.timestamp),
          }))
          .sort((a, b) => a.timestamp - b.timestamp);
        setMessages(messageList);
      } else {
        setMessages([]);
      }
      setLoading(false);
    });

    return () => {
      off(messagesRef);
    };
  }, [user, chatId]);

  // Mark messages as read
  useEffect(() => {
    if (!user || !chatId) return;

    const markMessagesAsRead = () => {
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

          if (Object.keys(updates).length > 0) {
            update(ref(rtdb, `chats/${chatId}/messages`), updates);
          }
        },
        { onlyOnce: true }
      );
    };

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
  }, [user, chatId]);

  const renderMessage = ({ item }) => {
    const isUser = item.sender === "user";
    const isImage =
      item.isImage ||
      (item.fileUrl && item.fileUrl.match(/\.(jpg|jpeg|png|gif)$/i));

    return (
      <View
        style={[styles.messageRow, isUser ? styles.userRow : styles.adminRow]}
      >
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.adminBubble,
          ]}
        >
          {item.fileUrl ? (
            <TouchableOpacity onPress={() => Linking.openURL(item.fileUrl)}>
              {isImage ? (
                <Image
                  source={{ uri: item.fileUrl }}
                  style={styles.imagePreview}
                />
              ) : (
                <View style={styles.fileContainer}>
                  <Ionicons name="document-outline" size={24} color="#007AFF" />
                  <Text style={styles.fileText}>{item.fileName}</Text>
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <Text
              style={[
                styles.messageText,
                isUser ? styles.userText : styles.adminText,
              ]}
            >
              {item.text}
            </Text>
          )}
          <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
        </View>
      </View>
    );
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Please login to access messages</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.push("/user/RegisterUser")}
        >
          <Text style={styles.loginButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          />
        )}

        {filePreview && (
          <View style={styles.previewContainer}>
            {filePreview.isImage ? (
              <View style={styles.imagePreviewWrapper}>
                <Image
                  source={{ uri: filePreview.uri }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.removePreviewButton}
                  onPress={removeSelectedFile}
                >
                  <Ionicons name="close-circle" size={24} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.filePreviewWrapper}>
                <View style={styles.previewFile}>
                  <Ionicons name="document-outline" size={24} color="#1E40AF" />
                  <Text style={styles.previewFileName} numberOfLines={1}>
                    {filePreview.name}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.removePreviewButton}
                  onPress={removeSelectedFile}
                >
                  <Ionicons name="close-circle" size={24} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <View style={styles.inputContainer}>
          <TouchableOpacity
            onPress={handleFilePick}
            style={styles.attachButton}
            disabled={isSending}
          >
            <Ionicons
              name={filePreview ? "checkmark-circle" : "attach"}
              size={24}
              color={filePreview ? "#4CAF50" : "#1E40AF"}
            />
          </TouchableOpacity>

          <TextInput
            style={[styles.input, filePreview && styles.inputWithPreview]}
            value={message}
            onChangeText={setMessage}
            placeholder="Type a message..."
            multiline
            editable={!isSending}
          />

          <TouchableOpacity
            onPress={sendMessage}
            style={[
              styles.sendButton,
              !message.trim() && !selectedFile && styles.sendButtonDisabled,
            ]}
            disabled={(!message.trim() && !selectedFile) || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={24} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <Toast />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messagesList: {
    padding: 10,
  },
  messageRow: {
    flexDirection: "row",
    marginVertical: 4,
  },
  userRow: {
    justifyContent: "flex-end",
  },
  adminRow: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 20,
    marginHorizontal: 8,
  },
  userBubble: {
    backgroundColor: "#1E40AF",
    borderBottomRightRadius: 4,
  },
  adminBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    marginRight: 40,
  },
  userText: {
    color: "#FFFFFF",
  },
  adminText: {
    color: "#000000",
  },
  timestamp: {
    fontSize: 12,
    color: "#8E8E93",
    position: "absolute",
    right: 8,
    bottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
  },
  attachButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    marginHorizontal: 8,
    padding: 8,
    maxHeight: 100,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1E40AF",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#B0B0B0",
  },
  imagePreview: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 20,
  },
  fileContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    padding: 8,
    borderRadius: 8,
    marginBottom: 20,
  },
  fileText: {
    marginLeft: 8,
    color: "#007AFF",
    fontSize: 14,
  },
  errorText: {
    fontSize: 16,
    color: "#FF3B30",
    textAlign: "center",
    marginTop: 20,
  },
  loginButton: {
    backgroundColor: "#1E40AF",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    marginHorizontal: 40,
  },
  loginButtonText: {
    color: "#FFFFFF",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    backgroundColor: "#1E40AF",
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingTop: Platform.OS === "ios" ? 50 : 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  headerRight: {
    width: 40,
  },
  previewContainer: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
  },
  imagePreviewWrapper: {
    position: "relative",
    marginBottom: 8,
  },
  previewImage: {
    width: 150,
    height: 150,
    borderRadius: 8,
  },
  filePreviewWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F0F0",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  previewFile: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  previewFileName: {
    marginLeft: 8,
    color: "#1E40AF",
    fontSize: 14,
    flex: 1,
  },
  removePreviewButton: {
    position: "absolute",
    top: -10,
    right: -10,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 2,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  inputWithPreview: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
});

export default MessageScreen;
