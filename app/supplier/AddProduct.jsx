import * as ImagePicker from "expo-image-picker";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { auth, db } from "../config/firebase";

const CLOUDINARY_UPLOAD_PRESET = "product"; // Replace with your actual upload preset
const CLOUDINARY_CLOUD_NAME = "dcrso99w7"; // Your Cloudinary cloud name
const CLOUDINARY_FOLDER = "samples/ecommerce"; // Folder path

const AddProduct = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [category, setCategory] = useState("");
  const [images, setImages] = useState([]);
  const [video, setVideo] = useState(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [loadingVideo, setLoadingVideo] = useState(false);

  const user = auth.currentUser;

  useEffect(() => {
    (async () => {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Sorry, we need media library permissions to upload images and videos."
        );
      }
    })();
  }, []);

  // Upload Image/Video to Cloudinary
  const uploadToCloudinary = async (fileUri, type) => {
    try {
      let formData = new FormData();
      formData.append("file", {
        uri: fileUri,
        type: type === "image" ? "image/jpeg" : "video/mp4",
        name: type === "image" ? "product.jpg" : "product_video.mp4",
      });
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      formData.append("folder", CLOUDINARY_FOLDER);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${type}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const responseJson = await response.json();

      if (responseJson.secure_url) {
        return responseJson.secure_url;
      } else {
        throw new Error("Failed to upload file");
      }
    } catch (error) {
      Alert.alert("Upload Error", "Failed to upload. Try again.");
      console.error("Cloudinary Upload Error:", error);
      return null;
    }
  };

  // Pick Image from Gallery
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
      allowsMultipleSelection: true, // Allow multiple image selection
    });

    if (!result.canceled && result.assets?.length > 0) {
      setLoadingImage(true);
      const uploadPromises = result.assets.map(async (asset) => {
        const uploadUrl = await uploadToCloudinary(asset.uri, "image");
        return uploadUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setLoadingImage(false);

      if (uploadedUrls.every((url) => url)) {
        setImages([...images, ...uploadedUrls]);
        Toast.show({
          type: "success",
          text1: "Images Uploaded",
          text2: "Your images have been uploaded successfully.",
        });
      }
    }
  };

  // Pick Video from Gallery
  const pickVideo = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setLoadingVideo(true);
      const uploadUrl = await uploadToCloudinary(result.assets[0].uri, "video");
      setLoadingVideo(false);

      if (uploadUrl) {
        setVideo(uploadUrl);
        Toast.show({
          type: "success",
          text1: "Video Uploaded",
          text2: "Your video has been uploaded successfully.",
        });
      }
    }
  };

  // Store Product in Firestore
  const addProduct = async () => {
    if (
      !name ||
      !description ||
      !price ||
      !stockQuantity ||
      !category ||
      images.length < 5 // Ensure at least 5 images are uploaded
    ) {
      Alert.alert(
        "Error",
        "Please fill in all fields and upload at least 5 images."
      );
      return;
    }

    try {
      await addDoc(collection(db, "products"), {
        supplierId: user.uid,
        supplierEmail: user.email,
        name,
        description,
        price: parseFloat(price),
        stockQuantity: parseInt(stockQuantity),
        category,
        images,
        video: video || "", // Store video URL if uploaded
        status: "verified", // Default status
        rate: 0, // Default rating
        favorite: false, // Default favorite status
        cart: [], // Initialize the cart field as an empty array
        createdAt: serverTimestamp(),
      });

      Toast.show({
        type: "success",
        text1: "Product Added",
        text2: "Your product has been added successfully!",
      });

      // Reset Fields
      setName("");
      setDescription("");
      setPrice("");
      setStockQuantity("");
      setCategory("");
      setImages([]);
      setVideo(null);
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Could not add product. Please try again.",
      });
      console.error("Add product error:", error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <TextInput
        placeholder="Product Name"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />
      <TextInput
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        style={[styles.input, styles.textArea]}
        multiline
      />
      <TextInput
        placeholder="Price"
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
        style={styles.input}
      />
      <TextInput
        placeholder="Stock Quantity"
        value={stockQuantity}
        onChangeText={setStockQuantity}
        keyboardType="numeric"
        style={styles.input}
      />
      <TextInput
        placeholder="Category"
        value={category}
        onChangeText={setCategory}
        style={styles.input}
      />

      <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
        <Text style={styles.uploadText}>
          {loadingImage
            ? "Uploading Images..."
            : "Upload Product Images (Min 5)"}
        </Text>
      </TouchableOpacity>

      <View style={styles.imagePreview}>
        {images.map((img, index) => (
          <Image key={index} source={{ uri: img }} style={styles.image} />
        ))}
      </View>

      <TouchableOpacity style={styles.uploadButton} onPress={pickVideo}>
        <Text style={styles.uploadText}>
          {loadingVideo ? "Uploading Video..." : "Upload Product Video"}
        </Text>
      </TouchableOpacity>

      {video && (
        <Text style={styles.videoText}>Video uploaded successfully</Text>
      )}

      <TouchableOpacity style={styles.submitButton} onPress={addProduct}>
        <Text style={styles.submitText}>Add Product</Text>
      </TouchableOpacity>

      <Toast />
    </ScrollView>
  );
};

export default AddProduct;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f7f8fa" },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  textArea: { height: 100, textAlignVertical: "top" },
  uploadButton: {
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  uploadText: { color: "#fff", fontWeight: "600" },
  image: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 10,
    marginBottom: 10,
  },
  imagePreview: { flexDirection: "row", flexWrap: "wrap", marginBottom: 16 },
  videoText: { textAlign: "center", marginTop: 10, color: "#28a745" },
  submitButton: {
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontWeight: "bold" },
});
