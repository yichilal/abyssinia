import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import Toast from "react-native-toast-message";
import { app, auth } from "../config/firebase";

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = "dcrso99w7";
const CLOUDINARY_UPLOAD_PRESET = "product";
const VARIANT_CLOUDINARY_UPLOAD_PRESET = "variant_product";
const CLOUDINARY_API_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`;

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

// Predefined categories with related attributes
const CATEGORIES = [
  {
    label: "Electronics",
    value: "electronics",
    attributes: ["Color", "Size", "Storage", "RAM"],
  },
  {
    label: "Fashion",
    value: "fashion",
    attributes: ["Color", "Size", "Material", "Style"],
  },
  {
    label: "Home & Kitchen",
    value: "home",
    attributes: ["Color", "Size", "Material", "Finish"],
  },
  {
    label: "Toys & Games",
    value: "toys",
    attributes: ["Age Group", "Material", "Color"],
  },
  {
    label: "Beauty & Personal Care",
    value: "beauty",
    attributes: ["Size", "Scent", "Skin Type"],
  },
  {
    label: "Sports & Outdoors",
    value: "sports",
    attributes: ["Size", "Color", "Material"],
  },
  {
    label: "Books",
    value: "books",
    attributes: ["Format", "Language", "Edition"],
  },
  {
    label: "Automotive",
    value: "automotive",
    attributes: ["Model", "Year", "Color"],
  },
];

// Common attribute values
const COMMON_ATTRIBUTE_VALUES = {
  Color: [
    "Black",
    "White",
    "Red",
    "Blue",
    "Green",
    "Silver",
    "Gold",
    "Purple",
    "Pink",
    "Yellow",
  ],
  Size: [
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XXL",
    "32",
    "34",
    "36",
    "38",
    "40",
    "42",
    "44",
  ],
  Storage: ["16GB", "32GB", "64GB", "128GB", "256GB", "512GB", "1TB"],
  RAM: ["2GB", "4GB", "8GB", "16GB", "32GB"],
  Material: [
    "Cotton",
    "Polyester",
    "Leather",
    "Metal",
    "Plastic",
    "Wood",
    "Glass",
    "Ceramic",
  ],
  Format: ["Hardcover", "Paperback", "eBook", "Audiobook"],
};

const ProductAndVariantForm = () => {
  const [productName, setProductName] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [productImages, setProductImages] = useState([]);
  const [productVideo, setProductVideo] = useState(null);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [supplierLocation, setSupplierLocation] = useState("");
  const [attributes, setAttributes] = useState([]);
  const [newAttribute, setNewAttribute] = useState("");
  const [variants, setVariants] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [categoryAttributes, setCategoryAttributes] = useState([]);
  const [attributeValuesModal, setAttributeValuesModal] = useState(false);
  const [selectedAttribute, setSelectedAttribute] = useState("");
  const [attributeValues, setAttributeValues] = useState({});
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false);

  const animatedScale = useRef(new Animated.Value(1)).current;
  const db = getFirestore(app);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const user = auth.currentUser;
      if (!user) {
        Toast.show({
          type: "error",
          text1: "Authentication Error",
          text2: "Please log in to add products.",
        });
        setLoadingProfile(false);
        return;
      }

      try {
        const userDocRef = doc(db, "userprofile", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          setSupplierId(data.uid || user.uid);
          setSupplierLocation(data.supplierLocation || data.address || "");
        } else {
          Toast.show({
            type: "error",
            text1: "Profile Not Found",
            text2: "Please complete your supplier profile.",
          });
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to load supplier details.",
        });
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchUserProfile();
  }, [db]);

  const handleCategoryChange = (item) => {
    if (!item || !item.value) return;
    if (item.value === "custom") {
      setShowCustomCategoryInput(true);
      setCategory("");
    } else {
      setShowCustomCategoryInput(false);
      setCategory(item.value);
      const selectedCategory = CATEGORIES.find(
        (cat) => cat.value === item.value
      );
      if (selectedCategory) {
        setCategoryAttributes(selectedCategory.attributes || []);
        setAttributes([]);
        setVariants([]);
        const initialAttributeValues = {};
        (selectedCategory.attributes || []).forEach((attr) => {
          initialAttributeValues[attr] = COMMON_ATTRIBUTE_VALUES[attr] || [];
        });
        setAttributeValues(initialAttributeValues);
      }
    }
  };

  const handleCustomCategorySubmit = () => {
    if (customCategory.trim()) {
      const newCategory = customCategory.trim();
      setCategory(newCategory);
      setShowCustomCategoryInput(false);
      setCategoryAttributes([]);
      setAttributes([]);
      setVariants([]);
      Toast.show({
        type: "success",
        text1: "Custom Category Added",
        text2: `${newCategory} added successfully.`,
      });
    }
  };

  const addCategoryAttribute = (attr) => {
    if (!attr || attributes.includes(attr)) return;
    setAttributes([...attributes, attr]);
    Toast.show({
      type: "success",
      text1: "Attribute Added",
      text2: `${attr} added successfully.`,
    });
  };

  const addVariant = () => {
    const newVariant = attributes.reduce(
      (acc, attr) => ({ ...acc, [attr]: "" }),
      { price: "", stock: "", image: null, isSelected: false }
    );
    setVariants([...variants, newVariant]);
    setActiveVariantIndex(variants.length);
  };

  const removeVariant = (index) => {
    setVariants(variants.filter((_, i) => i !== index));
    if (activeVariantIndex === index) setActiveVariantIndex(0);
    else if (activeVariantIndex > index)
      setActiveVariantIndex(activeVariantIndex - 1);
  };

  const handleVariantChange = (index, field, value) => {
    if (index < 0 || index >= variants.length) return;
    const newVariants = [...variants];
    newVariants[index][field] = value;
    setVariants(newVariants);
  };

  const toggleSelectVariant = (index) => {
    if (index < 0 || index >= variants.length) return;
    const newVariants = variants.map((v, i) => ({
      ...v,
      isSelected: i === index,
    }));
    setVariants(newVariants);
    setActiveVariantIndex(index);

    Animated.sequence([
      Animated.timing(animatedScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(animatedScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const addAttribute = () => {
    if (!newAttribute || attributes.includes(newAttribute)) return;
    setAttributes([...attributes, newAttribute.trim()]);
    setNewAttribute("");
    Toast.show({
      type: "success",
      text1: "Attribute Added",
      text2: `${newAttribute} added successfully.`,
    });
  };

  const removeAttribute = (attr) => {
    setAttributes(attributes.filter((a) => a !== attr));
    setVariants(
      variants.map((variant) => {
        const newVariant = { ...variant };
        delete newVariant[attr];
        return newVariant;
      })
    );
  };

  const openAttributeValuesModal = (attr) => {
    if (!attr) return;
    setSelectedAttribute(attr);
    setAttributeValuesModal(true);
  };

  const selectAttributeValue = (value) => {
    if (activeVariantIndex < variants.length && selectedAttribute) {
      handleVariantChange(activeVariantIndex, selectedAttribute, value);
      setAttributeValuesModal(false);
    }
  };

  const pickMedia = async (mediaType, variantIndex = null) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "We need access to your media library to upload files."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        mediaType === "video"
          ? ImagePicker.MediaTypeOptions.Videos
          : ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);

      if (mediaType === "image" && fileInfo.size > MAX_IMAGE_SIZE) {
        Alert.alert(
          "File Too Large",
          `Image must be less than ${MAX_IMAGE_SIZE / 1024 / 1024}MB`
        );
        return;
      }

      if (mediaType === "video" && fileInfo.size > MAX_VIDEO_SIZE) {
        Alert.alert(
          "File Too Large",
          `Video must be less than ${MAX_VIDEO_SIZE / 1024 / 1024}MB`
        );
        return;
      }

      if (
        variantIndex !== null &&
        variantIndex >= 0 &&
        variantIndex < variants.length
      ) {
        const newVariants = [...variants];
        newVariants[variantIndex].image = { ...asset, size: fileInfo.size };
        setVariants(newVariants);
      } else if (mediaType === "image") {
        setProductImages([...productImages, { ...asset, size: fileInfo.size }]);
      } else {
        setProductVideo({ ...asset, size: fileInfo.size });
      }
    }
  };

  const removeImage = (index) => {
    setProductImages(productImages.filter((_, i) => i !== index));
  };

  const uploadFileToCloudinary = async (
    file,
    fileType = "unknown",
    isVariant = false
  ) => {
    if (!file || !file.uri)
      throw new Error(`No valid ${fileType} file provided`);
    const preset = isVariant
      ? VARIANT_CLOUDINARY_UPLOAD_PRESET
      : CLOUDINARY_UPLOAD_PRESET;
    const fileUri = file.uri;
    const fileInfo = await FileSystem.getInfoAsync(fileUri);

    if (!fileInfo.exists) throw new Error("File does not exist");

    const formData = new FormData();
    formData.append("file", {
      uri: fileUri,
      name: `upload_${Date.now()}.${fileUri.split(".").pop()}`,
      type: fileType.includes("video") ? "video/mp4" : "image/jpeg",
    });
    formData.append("upload_preset", preset);
    formData.append("cloud_name", CLOUDINARY_CLOUD_NAME);

    if (file.size > 5 * 1024 * 1024) formData.append("chunk_size", "6000000");

    const response = await fetch(CLOUDINARY_API_URL, {
      method: "POST",
      body: formData,
      headers: { "Content-Type": "multipart/form-data" },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Upload failed");

    return data.secure_url;
  };

  const confirmSubmission = () => {
    Alert.alert(
      "Confirm Submission",
      "Are you sure you want to submit this product with all its variants?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Submit", onPress: handleSubmit, style: "default" },
      ]
    );
  };

  const handleSubmit = async () => {
    if (isSubmitting || loadingProfile) return;

    if (!productName || !supplierId || !category || !brand) {
      Alert.alert(
        "Missing Fields",
        "Please fill all required product fields (Name, Category, Brand)."
      );
      return;
    }

    if (attributes.length === 0) {
      Alert.alert(
        "Attributes Required",
        "Add at least one attribute (e.g., color, size)."
      );
      return;
    }

    if (variants.length === 0) {
      Alert.alert(
        "Variants Required",
        "Add at least one variant for your product."
      );
      return;
    }

    for (const [index, variant] of variants.entries()) {
      if (
        !variant.price ||
        !variant.stock ||
        !variant.image ||
        !variant.image.uri ||
        attributes.some((attr) => !variant[attr])
      ) {
        Alert.alert(
          "Incomplete Variant",
          `Please fill all fields for variant ${index + 1} including image.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const productRef = doc(collection(db, "products"));
      const productId = productRef.id;

      const productImageUrls = await Promise.all(
        productImages.map(async (image, i) => {
          const url = await uploadFileToCloudinary(
            image,
            `product_image_${i + 1}`
          );
          setUploadProgress(
            ((i + 1) / (productImages.length + (productVideo ? 2 : 1))) * 50
          );
          return url;
        })
      );

      let productVideoUrl = null;
      if (productVideo) {
        productVideoUrl = await uploadFileToCloudinary(
          productVideo,
          "product_video"
        );
        setUploadProgress(75);
      }

      const productData = {
        id: productId,
        supplierId,
        name: productName,
        description,
        images: productImageUrls,
        category: category,
        isCustomCategory: showCustomCategoryInput,
        brand,
        supplierLocation,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: "unverified",
        rating: 0,
        video: productVideoUrl,
        attributes,
        price: variants.length > 0 ? parseFloat(variants[0].price) : 0,
      };

      await setDoc(productRef, productData);
      setUploadProgress(80);

      const variantsCollectionRef = collection(
        db,
        "products",
        productId,
        "variants"
      );
      await Promise.all(
        variants.map(async (variant, i) => {
          const variantImageUrl = await uploadFileToCloudinary(
            variant.image,
            `variant_${i + 1}_image`,
            true
          );
          const { isSelected, ...variantToSave } = variant;

          await addDoc(variantsCollectionRef, {
            ...variantToSave,
            price: parseFloat(variant.price),
            stock: parseInt(variant.stock),
            image: variantImageUrl,
            createdAt: serverTimestamp(),
          });

          setUploadProgress(80 + ((i + 1) / variants.length) * 20);
        })
      );

      Alert.alert("Success", "Product and variants added successfully!", [
        {
          text: "OK",
          onPress: () => {
            setProductName("");
            setProductImages([]);
            setProductVideo(null);
            setDescription("");
            setCategory("");
            setBrand("");
            setAttributes([]);
            setNewAttribute("");
            setVariants([]);
            setActiveVariantIndex(0);
          },
        },
      ]);
    } catch (error) {
      console.error("Submission error:", error);
      Alert.alert(
        "Submission Failed",
        error.message || "An error occurred while saving the product."
      );
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  if (loadingProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading supplier profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={styles.header}>Add New Product</Text>

      {isSubmitting && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Uploading: {Math.round(uploadProgress)}%
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${uploadProgress}%` }]}
            />
          </View>
        </View>
      )}

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Basic Information</Text>

        <Text style={styles.label}>Product Name *</Text>
        <TextInput
          style={[styles.input, isFocused === "name" && styles.inputFocused]}
          value={productName}
          onChangeText={setProductName}
          placeholder="Enter product name"
          placeholderTextColor="#64748b"
          onFocus={() => setIsFocused("name")}
          onBlur={() => setIsFocused(false)}
        />

        <Text style={styles.label}>Category *</Text>
        {showCustomCategoryInput ? (
          <View style={styles.customCategoryContainer}>
            <Text style={styles.label}>Custom Category Name</Text>
            <View style={styles.customCategoryInputContainer}>
              <TextInput
                style={[styles.input, styles.customCategoryInput]}
                value={customCategory}
                onChangeText={setCustomCategory}
                placeholder="Enter custom category"
                placeholderTextColor="#64748b"
                onFocus={() => setIsFocused("customCategory")}
                onBlur={() => setIsFocused(false)}
              />
              <Ionicons
                name="create-outline"
                size={24}
                color="#3b82f6"
                style={styles.editIcon}
              />
            </View>
            <View style={styles.customCategoryButtons}>
              <TouchableOpacity
                style={[styles.customCategoryButton, styles.submitButton]}
                onPress={handleCustomCategorySubmit}
              >
                <Text style={styles.buttonText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.customCategoryButton, styles.cancelButton]}
                onPress={() => {
                  setShowCustomCategoryInput(false);
                  setCustomCategory("");
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Dropdown
            style={[
              styles.dropdown,
              isFocused === "category" && styles.dropdownFocused,
            ]}
            placeholderStyle={styles.placeholderStyle}
            selectedTextStyle={styles.selectedTextStyle}
            inputSearchStyle={styles.inputSearchStyle}
            iconStyle={styles.iconStyle}
            data={[
              ...CATEGORIES,
              { label: "Custom Category", value: "custom" },
              ...(category && !CATEGORIES.find((cat) => cat.value === category)
                ? [{ label: category, value: category }]
                : []),
            ]}
            search
            maxHeight={300}
            labelField="label"
            valueField="value"
            placeholder="Select a category"
            searchPlaceholder="Search..."
            value={category}
            onFocus={() => setIsFocused("category")}
            onBlur={() => setIsFocused(false)}
            onChange={handleCategoryChange}
            renderLeftIcon={() => (
              <Ionicons
                name="list-outline"
                size={24}
                color="#3b82f6"
                style={{ marginRight: 12 }}
              />
            )}
          />
        )}

        <Text style={styles.label}>Brand *</Text>
        <TextInput
          style={[styles.input, isFocused === "brand" && styles.inputFocused]}
          value={brand}
          onChangeText={setBrand}
          placeholder="Enter brand name"
          placeholderTextColor="#64748b"
          onFocus={() => setIsFocused("brand")}
          onBlur={() => setIsFocused(false)}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            isFocused === "description" && styles.inputFocused,
          ]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe your product"
          placeholderTextColor="#64748b"
          multiline
          onFocus={() => setIsFocused("description")}
          onBlur={() => setIsFocused(false)}
        />
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Product Media</Text>

        <Text style={styles.label}>Product Images</Text>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={() => pickMedia("image")}
          disabled={isSubmitting}
        >
          <Ionicons name="image-outline" size={24} color="#fff" />
          <Text style={styles.uploadText}>Add Image</Text>
        </TouchableOpacity>
        {productImages.length > 0 && (
          <View style={styles.imageList}>
            {productImages.map((img, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri: img.uri }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                  disabled={isSubmitting}
                >
                  <Ionicons name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.label}>Product Video</Text>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={() => pickMedia("video")}
          disabled={isSubmitting}
        >
          <Ionicons name="videocam-outline" size={24} color="#fff" />
          <Text style={styles.uploadText}>
            {productVideo ? "Video Selected" : "Add Video"}
          </Text>
        </TouchableOpacity>
        {productVideo && (
          <View style={styles.videoInfoContainer}>
            <Text style={styles.videoInfoText}>
              Video selected: {Math.round(productVideo.size / 1024 / 1024)}MB
            </Text>
          </View>
        )}
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Product Attributes</Text>

        {category && (
          <View style={styles.categoryAttributesContainer}>
            <Text style={styles.label}>
              Suggested Attributes for{" "}
              {CATEGORIES.find((c) => c.value === category)?.label || ""}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.attributeTagsScroll}
            >
              {categoryAttributes.map((attr, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.attributeTag,
                    attributes.includes(attr) && styles.attributeTagSelected,
                  ]}
                  onPress={() => addCategoryAttribute(attr)}
                >
                  <Text
                    style={[
                      styles.attributeTagText,
                      attributes.includes(attr) &&
                        styles.attributeTagTextSelected,
                    ]}
                  >
                    {attr}
                  </Text>
                  {attributes.includes(attr) && (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color="#fff"
                      style={styles.tagIcon}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <Text style={styles.label}>Custom Attribute</Text>
        <View style={styles.attributeContainer}>
          <TextInput
            style={[
              styles.input,
              styles.attributeInput,
              isFocused === "attribute" && styles.inputFocused,
            ]}
            value={newAttribute}
            onChangeText={setNewAttribute}
            placeholder="e.g., material"
            placeholderTextColor="#64748b"
            onSubmitEditing={addAttribute}
            onFocus={() => setIsFocused("attribute")}
            onBlur={() => setIsFocused(false)}
          />
          <TouchableOpacity
            style={styles.addAttributeButton}
            onPress={addAttribute}
            disabled={isSubmitting}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {attributes.length > 0 && (
          <View style={styles.selectedAttributesContainer}>
            <Text style={styles.subLabel}>Selected Attributes</Text>
            <View style={styles.attributesList}>
              {attributes.map((attr, index) => (
                <View key={index} style={styles.attributeItem}>
                  <Text style={styles.attributeText}>{attr}</Text>
                  <TouchableOpacity
                    onPress={() => removeAttribute(attr)}
                    disabled={isSubmitting}
                  >
                    <Ionicons name="close" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {attributes.length > 0 && (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Product Variants</Text>

          <TouchableOpacity
            style={styles.addVariantButton}
            onPress={addVariant}
            disabled={isSubmitting || attributes.length === 0}
          >
            <Ionicons name="add-circle-outline" size={24} color="#fff" />
            <Text style={styles.addVariantText}>Add New Variant</Text>
          </TouchableOpacity>

          {variants.length > 0 && (
            <View style={styles.variantsListContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.variantsHorizontalScroll}
              >
                {variants.map((variant, index) => (
                  <Animated.View
                    key={index}
                    style={[
                      styles.variantCard,
                      activeVariantIndex === index && {
                        transform: [{ scale: animatedScale }],
                      },
                    ]}
                  >
                    <TouchableOpacity
                      style={[
                        styles.variantCardInner,
                        activeVariantIndex === index &&
                          styles.variantCardSelected,
                      ]}
                      onPress={() => toggleSelectVariant(index)}
                      disabled={isSubmitting}
                    >
                      {variant.image ? (
                        <Image
                          source={{ uri: variant.image.uri }}
                          style={styles.variantCardImage}
                        />
                      ) : (
                        <View style={styles.variantCardImagePlaceholder}>
                          <Ionicons
                            name="image-outline"
                            size={24}
                            color="#9ca3af"
                          />
                        </View>
                      )}
                      <View style={styles.variantCardContent}>
                        <Text style={styles.variantCardTitle}>
                          Variant {index + 1}
                        </Text>
                        {attributes.map((attr) => (
                          <Text key={attr} style={styles.variantCardAttribute}>
                            {attr}: {variant[attr] || "Not set"}
                          </Text>
                        ))}
                        <Text style={styles.variantCardPrice}>
                          ${variant.price || "0"}
                        </Text>
                      </View>
                      {activeVariantIndex === index && (
                        <View style={styles.selectedCheckmark}>
                          <Ionicons
                            name="checkmark-circle"
                            size={24}
                            color="#22c55e"
                          />
                        </View>
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </ScrollView>
            </View>
          )}

          {variants.length > 0 && (
            <View style={styles.activeVariantContainer}>
              <View style={styles.activeVariantHeader}>
                <Text style={styles.activeVariantTitle}>
                  Editing Variant {activeVariantIndex + 1}
                </Text>
                <TouchableOpacity
                  onPress={() => removeVariant(activeVariantIndex)}
                  disabled={isSubmitting}
                  style={styles.deleteVariantButton}
                >
                  <Ionicons name="trash-outline" size={20} color="#fff" />
                  <Text style={styles.deleteVariantText}>Delete</Text>
                </TouchableOpacity>
              </View>

              {attributes.map((attr) => (
                <View key={attr}>
                  <Text style={styles.label}>
                    {attr.charAt(0).toUpperCase() + attr.slice(1)} *
                  </Text>
                  <TouchableOpacity
                    style={styles.attributeValueSelector}
                    onPress={() => openAttributeValuesModal(attr)}
                  >
                    <Text style={styles.attributeValueText}>
                      {variants[activeVariantIndex]?.[attr] || `Select ${attr}`}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#3b82f6" />
                  </TouchableOpacity>
                </View>
              ))}

              <Text style={styles.label}>Price ($) *</Text>
              <TextInput
                style={[
                  styles.input,
                  isFocused === "price" && styles.inputFocused,
                ]}
                value={variants[activeVariantIndex]?.price || ""}
                onChangeText={(value) =>
                  handleVariantChange(activeVariantIndex, "price", value)
                }
                keyboardType="numeric"
                placeholder="Enter price"
                placeholderTextColor="#64748b"
                onFocus={() => setIsFocused("price")}
                onBlur={() => setIsFocused(false)}
              />

              <Text style={styles.label}>Stock (Qty) *</Text>
              <TextInput
                style={[
                  styles.input,
                  isFocused === "stock" && styles.inputFocused,
                ]}
                value={variants[activeVariantIndex]?.stock || ""}
                onChangeText={(value) =>
                  handleVariantChange(activeVariantIndex, "stock", value)
                }
                keyboardType="numeric"
                placeholder="Enter quantity"
                placeholderTextColor="#64748b"
                onFocus={() => setIsFocused("stock")}
                onBlur={() => setIsFocused(false)}
              />

              <Text style={styles.label}>Variant Image *</Text>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => pickMedia("image", activeVariantIndex)}
                disabled={isSubmitting}
              >
                <Ionicons name="image-outline" size={24} color="#fff" />
                <Text style={styles.uploadText}>
                  {variants[activeVariantIndex]?.image
                    ? "Change Image"
                    : "Add Image"}
                </Text>
              </TouchableOpacity>
              {variants[activeVariantIndex]?.image && (
                <Image
                  source={{ uri: variants[activeVariantIndex].image.uri }}
                  style={styles.previewImage}
                />
              )}
            </View>
          )}
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.submitButton,
          isSubmitting && styles.submitButtonDisabled,
        ]}
        onPress={confirmSubmission}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons
              name="cloud-upload-outline"
              size={28}
              color="#fff"
              style={{ marginRight: 12 }}
            />
            <Text style={styles.submitText}>Add Product</Text>
          </>
        )}
      </TouchableOpacity>

      <Modal
        visible={attributeValuesModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAttributeValuesModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select {selectedAttribute}</Text>
              <TouchableOpacity onPress={() => setAttributeValuesModal(false)}>
                <Ionicons name="close" size={24} color="#1e293b" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={attributeValues[selectedAttribute] || []}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.attributeValueItem}
                  onPress={() => selectAttributeValue(item)}
                >
                  <Text style={styles.attributeValueItemText}>{item}</Text>
                  {variants[activeVariantIndex]?.[selectedAttribute] ===
                    item && (
                    <Ionicons name="checkmark" size={20} color="#3b82f6" />
                  )}
                </TouchableOpacity>
              )}
              keyExtractor={(item, index) => `${item}-${index}`}
              ListHeaderComponent={
                <View style={styles.customValueContainer}>
                  <TextInput
                    style={styles.customValueInput}
                    placeholder="Enter custom value"
                    placeholderTextColor="#64748b"
                    value={
                      variants[activeVariantIndex]?.[selectedAttribute] || ""
                    }
                    onChangeText={(value) =>
                      handleVariantChange(
                        activeVariantIndex,
                        selectedAttribute,
                        value
                      )
                    }
                  />
                  <TouchableOpacity
                    style={styles.customValueButton}
                    onPress={() => setAttributeValuesModal(false)}
                  >
                    <Text style={styles.customValueButtonText}>Custom</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      <View style={styles.bottomSpacer} />
      <Toast />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  scrollContent: { padding: 24, paddingBottom: 40 },
  header: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 28,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  sectionContainer: {
    marginBottom: 28,
    padding: 20,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  progressContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  progressText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 10,
    textAlign: "center",
  },
  progressBar: {
    height: 12,
    backgroundColor: "#e5e7eb",
    borderRadius: 6,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#3b82f6" },
  label: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 10,
  },
  subLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#64748b",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    padding: 16,
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    fontSize: 16,
    color: "#1e293b",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputFocused: {
    borderColor: "#3b82f6",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  textArea: { height: 140, textAlignVertical: "top" },
  dropdown: {
    height: 56,
    borderColor: "#d1d5db",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dropdownFocused: {
    borderColor: "#3b82f6",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  placeholderStyle: { fontSize: 16, color: "#64748b" },
  selectedTextStyle: { fontSize: 16, color: "#1e293b" },
  inputSearchStyle: {
    height: 40,
    fontSize: 16,
    borderColor: "#d1d5db",
    borderRadius: 8,
  },
  iconStyle: { width: 24, height: 24 },
  uploadButton: {
    flexDirection: "row",
    backgroundColor: "#10b981",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  uploadText: {
    marginLeft: 12,
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  videoInfoContainer: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  videoInfoText: { fontSize: 14, color: "#1e40af", fontWeight: "500" },
  imageList: { flexDirection: "row", flexWrap: "wrap", marginBottom: 20 },
  imageContainer: { position: "relative", marginRight: 12, marginBottom: 12 },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(239, 68, 68, 0.9)",
    borderRadius: 12,
    padding: 4,
    height: 28,
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  attributeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  attributeInput: { flex: 1, marginBottom: 0, marginRight: 12 },
  addAttributeButton: {
    backgroundColor: "#22c55e",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    width: 56,
    height: 56,
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  attributesList: { marginBottom: 12 },
  attributeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  attributeText: { fontSize: 16, color: "#1e293b", fontWeight: "500" },
  categoryAttributesContainer: { marginBottom: 20 },
  attributeTagsScroll: { marginBottom: 20 },
  attributeTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  attributeTagSelected: { backgroundColor: "#3b82f6", borderColor: "#1e40af" },
  attributeTagText: { fontSize: 14, color: "#4b5563", fontWeight: "600" },
  attributeTagTextSelected: { color: "#fff" },
  tagIcon: { marginLeft: 8 },
  selectedAttributesContainer: { marginTop: 12 },
  variantsListContainer: { marginBottom: 24 },
  variantsHorizontalScroll: { marginBottom: 12 },
  variantCard: { width: 180, marginRight: 12, marginBottom: 12 },
  variantCardInner: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 16,
    backgroundColor: "#ffffff",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  variantCardSelected: {
    borderColor: "#3b82f6",
    borderWidth: 2,
    shadowColor: "#3b82f6",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  variantCardImage: { width: "100%", height: 100, backgroundColor: "#f3f4f6" },
  variantCardImagePlaceholder: {
    width: "100%",
    height: 100,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  variantCardContent: { padding: 12 },
  variantCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 6,
  },
  variantCardAttribute: { fontSize: 14, color: "#4b5563", marginBottom: 4 },
  variantCardPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3b82f6",
    marginTop: 6,
  },
  selectedCheckmark: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 2,
  },
  activeVariantContainer: {
    marginTop: 20,
    padding: 20,
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  activeVariantHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  activeVariantTitle: { fontSize: 20, fontWeight: "700", color: "#1e293b" },
  deleteVariantButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ef4444",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  deleteVariantText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  attributeValueSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    padding: 16,
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  attributeValueText: { fontSize: 16, color: "#1e293b" },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#1e293b" },
  attributeValueItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  attributeValueItemText: { fontSize: 16, color: "#1e293b" },
  customValueContainer: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  customValueInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    padding: 12,
    borderRadius: 10,
    marginRight: 12,
    fontSize: 16,
    color: "#1e293b",
  },
  customValueButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  customValueButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  addVariantButton: {
    flexDirection: "row",
    backgroundColor: "#22c55e",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  addVariantText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 12,
  },
  submitButton: {
    flexDirection: "row",
    backgroundColor: "#3b82f6",
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: { backgroundColor: "#93c5fd", shadowOpacity: 0.1 },
  submitText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  bottomSpacer: { height: 40 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 18,
    color: "#64748b",
    fontWeight: "500",
  },
  customCategoryContainer: {
    marginBottom: 20,
  },
  customCategoryInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  customCategoryInput: {
    marginBottom: 10,
  },
  customCategoryButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  customCategoryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  editIcon: {
    position: "absolute",
    right: 16,
    top: "50%",
    transform: [{ translateY: -12 }],
  },
});

export default ProductAndVariantForm;
