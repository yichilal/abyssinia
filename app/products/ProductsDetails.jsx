import ReadMore from "@fawazahmed/react-native-read-more"; // For expandable description
import AsyncStorage from "@react-native-async-storage/async-storage";
import { format } from "date-fns";
import { Video } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { EventRegister } from "react-native-event-listeners";
import Toast, { BaseToast } from "react-native-toast-message";
import Ionicons from "react-native-vector-icons/Ionicons";
import LoadingDots from "../../components/LoadingDots"; // Correct path
import { auth, db } from "../config/firebase";

const { width: screenWidth } = Dimensions.get("window");

const toastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: "#10B981",
        backgroundColor: "#F0FDF4",
        height: 60,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 15, fontWeight: "600", color: "#047857" }}
      text2Style={{ fontSize: 13, color: "#065F46" }}
    />
  ),
  error: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: "#EF4444",
        backgroundColor: "#FEF2F2",
        height: 60,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 15, fontWeight: "600", color: "#B91C1C" }}
      text2Style={{ fontSize: 13, color: "#991B1B" }}
    />
  ),
  info: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: "#3B82F6",
        backgroundColor: "#EFF6FF",
        height: 60,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 15, fontWeight: "600", color: "#1D4ED8" }}
      text2Style={{ fontSize: 13, color: "#1E40AF" }}
    />
  ),
};

const ProductDetails = () => {
  const { id: productId } = useLocalSearchParams();
  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const videoRef = useRef(null);
  const flatListRef = useRef(null);
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const DESCRIPTION_PREVIEW_LINES = 3;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, screenWidth * 0.5, screenWidth * 0.75],
    outputRange: [0, 0, 1],
    extrapolate: "clamp",
  });

  useEffect(() => {
    const loadFavoriteStatus = async () => {
      try {
        const favoritesString = await AsyncStorage.getItem("favorites");
        if (favoritesString) {
          const favorites = JSON.parse(favoritesString);
          setIsFavorite(favorites.includes(String(productId)));
        }
      } catch (e) {
        console.error("Failed to load favorite status:", e);
      }
    };
    if (productId) loadFavoriteStatus();
  }, [productId]);

  const toggleFavoriteLocal = async () => {
    if (!product) return;
    const newFavoriteStatus = !isFavorite;
    setIsFavorite(newFavoriteStatus);
    try {
      const favoritesString = await AsyncStorage.getItem("favorites");
      let favorites = favoritesString ? JSON.parse(favoritesString) : [];
      const currentProductIdString = String(product.id);

      if (newFavoriteStatus) {
        if (!favorites.includes(currentProductIdString)) {
          favorites.push(currentProductIdString);
        }
      } else {
        favorites = favorites.filter((id) => id !== currentProductIdString);
      }
      await AsyncStorage.setItem("favorites", JSON.stringify(favorites));
      Toast.show({
        type: "success",
        text1: newFavoriteStatus
          ? "Added to Favorites"
          : "Removed from Favorites",
      });
    } catch (e) {
      console.error("Failed to save favorite status:", e);
      setIsFavorite(!newFavoriteStatus);
      Toast.show({ type: "error", text1: "Error updating favorites" });
    }
  };

  useEffect(() => {
    const fetchProductAndVariants = async () => {
      if (!productId) {
        setError("No product ID provided.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const productRef = doc(db, "products", productId);
        const productSnap = await getDoc(productRef);

        if (!productSnap.exists()) {
          throw new Error("Product not found.");
        }

        const productData = { id: productSnap.id, ...productSnap.data() };

        const variantsRef = collection(db, "products", productId, "variants");
        const variantsSnap = await getDocs(variantsRef);
        const variantsData = variantsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Fetch reviews
        const reviewsQuery = query(
          collection(db, "reviews"),
          where("productId", "==", productId)
        );
        const reviewsSnap = await getDocs(reviewsQuery);
        const reviewsData = reviewsSnap.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
          }))
          .sort((a, b) => b.createdAt - a.createdAt); // Sort by date in memory

        // Calculate average rating
        const totalRating = reviewsData.reduce(
          (sum, review) => sum + review.stars,
          0
        );
        const avgRating =
          reviewsData.length > 0 ? totalRating / reviewsData.length : 0;

        setProduct(productData);
        setVariants(variantsData);
        setReviews(reviewsData);
        setAverageRating(avgRating);

        const initialVariant =
          variantsData.find((v) => v.stock > 0) || variantsData[0] || null;
        setSelectedVariant(initialVariant);

        if (initialVariant) {
          const initialVariantIndex = variantsData.findIndex(
            (v) => v.id === initialVariant.id
          );
          const initialMediaIndex = productData.video
            ? initialVariantIndex + 1
            : initialVariantIndex;
          setCurrentMediaIndex(Math.max(0, initialMediaIndex));
        } else {
          setCurrentMediaIndex(0);
        }
      } catch (err) {
        console.error("Error fetching product details:", err);
        setError(
          err.message || "Failed to load product details. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProductAndVariants();
  }, [productId]);

  const handleQuantityChange = (change) => {
    setQuantity((prevQuantity) => {
      const newQuantity = prevQuantity + change;
      if (newQuantity < 1) return 1;
      if (selectedVariant && newQuantity > selectedVariant.stock) {
        Toast.show({
          type: "info",
          text1: "Stock Limit Reached",
          text2: `Only ${selectedVariant.stock} items available.`,
        });
        return selectedVariant.stock;
      }
      return newQuantity;
    });
  };

  const prepareCartItem = () => {
    if (!product || !selectedVariant) {
      Toast.show({
        type: "error",
        text1: "Selection Error",
        text2: "Please select an available product variant.",
      });
      return null;
    }
    if (selectedVariant.stock <= 0) {
      Toast.show({
        type: "error",
        text1: "Out of Stock",
        text2: "This variant is currently unavailable.",
      });
      return null;
    }
    if (quantity > selectedVariant.stock) {
      Toast.show({
        type: "info",
        text1: "Stock Limit Exceeded",
        text2: `Cannot add ${quantity} items. Only ${selectedVariant.stock} available.`,
      });
      return null;
    }

    const cartItem = {
      id: `${product.id}_${selectedVariant.id}`,
      productId: product.id,
      variantId: selectedVariant.id,
      name: product.name,
      price: selectedVariant.price || 0,
      imageUrl:
        selectedVariant.image ||
        product.images?.[0] ||
        "https://via.placeholder.com/80",
      quantity,
      variantDetails: product.attributes
        ? Object.fromEntries(
            product.attributes.map((attr) => [
              attr,
              selectedVariant[attr] || "N/A",
            ])
          )
        : {},
      stock: selectedVariant.stock || 0,
    };
    return cartItem;
  };

  const handleAddToCart = async () => {
    const cartItem = prepareCartItem();
    if (!cartItem) return;

    try {
      const cartString = await AsyncStorage.getItem("cart");
      let cart = cartString ? JSON.parse(cartString) : [];

      const existingItemIndex = cart.findIndex(
        (item) => item.id === cartItem.id
      );

      if (existingItemIndex !== -1) {
        const newQuantity =
          cart[existingItemIndex].quantity + cartItem.quantity;
        if (newQuantity > cart[existingItemIndex].stock) {
          Toast.show({
            type: "info",
            text1: "Stock Limit Reached",
            text2: `Cannot add more than ${cart[existingItemIndex].stock} units.`,
          });
          return;
        }
        cart[existingItemIndex].quantity = newQuantity;
        Toast.show({
          type: "success",
          text1: "Quantity Updated",
          text2: `${cartItem.name} quantity increased in cart.`,
        });
      } else {
        cart.push(cartItem);
        Toast.show({
          type: "success",
          text1: "Added to Cart",
          text2: `${cartItem.name} added.`,
        });
      }

      await AsyncStorage.setItem("cart", JSON.stringify(cart));

      // Emit event to update cart badge
      EventRegister.emit("cartUpdated", { count: cart.length });
    } catch (error) {
      console.error("Error adding to cart:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to add item to cart.",
      });
    }
  };

  const handleBuyNow = async () => {
    const cartItem = prepareCartItem();
    if (!cartItem) return;

    if (!auth.currentUser) {
      Toast.show({
        type: "info",
        text1: "Login Required",
        text2: "Please log in or register to buy now.",
      });
      router.push("/user/RegisterUser");
      return;
    }

    router.push({
      pathname: "/products/checkout",
      params: {
        cart: JSON.stringify([cartItem]),
        totalAmount: cartItem.price.toFixed(2),
        isBuyNow: "true",
      },
    });
  };

  const handleVariantChange = (attribute, value) => {
    const currentSelection = {};
    if (selectedVariant && product.attributes) {
      product.attributes.forEach((attr) => {
        if (attr !== attribute) {
          currentSelection[attr] = selectedVariant[attr];
        }
      });
    }
    currentSelection[attribute] = value;

    const newSelectedVariant = variants.find((variant) =>
      Object.entries(currentSelection).every(
        ([key, val]) => variant[key] === val
      )
    );

    if (newSelectedVariant && newSelectedVariant.id !== selectedVariant?.id) {
      updateSelectedVariant(newSelectedVariant);
    }
  };

  const updateSelectedVariant = (newVariant) => {
    if (!newVariant) return;

    setSelectedVariant(newVariant);

    const variantIndexInVariantsArray = variants.findIndex(
      (v) => v.id === newVariant.id
    );
    const mediaIndex = product.video
      ? variantIndexInVariantsArray + 1
      : variantIndexInVariantsArray;

    if (mediaIndex >= 0 && mediaIndex < mediaArray.length) {
      setCurrentMediaIndex(mediaIndex);
      if (flatListRef.current) {
        flatListRef.current.scrollToIndex({
          animated: true,
          index: mediaIndex,
          viewPosition: 0.5,
        });
      }
    }
  };

  const handleThumbnailClick = (index) => {
    if (index === currentMediaIndex) return;

    setCurrentMediaIndex(index);

    const variantIndex = product.video ? index - 1 : index;
    if (variantIndex >= 0 && variantIndex < variants.length) {
      const correspondingVariant = variants[variantIndex];
      if (correspondingVariant.id !== selectedVariant?.id) {
        updateSelectedVariant(correspondingVariant);
      }
    } else if (product.video && index === 0 && videoRef.current) {
      videoRef.current.replayAsync();
    }

    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({
        animated: true,
        index: index,
        viewPosition: 0.5,
      });
    }
  };

  const renderStars = (rating) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? "star" : "star-outline"}
            size={16}
            color={star <= rating ? "#F59E0B" : "#D1D5DB"}
            style={styles.starIcon}
          />
        ))}
      </View>
    );
  };

  const renderReviews = () => {
    if (reviews.length === 0) {
      return (
        <View style={styles.noReviewsContainer}>
          <Text style={styles.noReviewsText}>No reviews yet</Text>
        </View>
      );
    }

    return (
      <View style={styles.reviewsContainer}>
        <View style={styles.reviewsHeader}>
          <Text style={styles.reviewsTitle}>Customer Reviews</Text>
          <View style={styles.ratingSummary}>
            <Text style={styles.averageRating}>{averageRating.toFixed(1)}</Text>
            {renderStars(Math.round(averageRating))}
            <Text style={styles.totalReviews}>({reviews.length} reviews)</Text>
          </View>
        </View>
        {reviews.map((review) => (
          <View key={review.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <View style={styles.reviewerInfo}>
                <Text style={styles.reviewerName}>{review.customerName}</Text>
                <Text style={styles.reviewDate}>
                  {format(review.createdAt, "MMM d, yyyy 'at' h:mm a")}
                </Text>
              </View>
              {renderStars(review.stars)}
            </View>
            {review.reviewText && (
              <Text style={styles.reviewText}>{review.reviewText}</Text>
            )}
            <View style={styles.orderInfo}>
              <Text style={styles.orderInfoText}>
                Order ID: {review.orderId}
              </Text>
              <Text style={styles.orderInfoText}>
                Quantity: {review.productData.quantity}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <LoadingDots />
        <Text style={styles.loadingText}>Loading Product...</Text>
      </View>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || "Product not found."}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const mediaArray = [
    ...(product.video ? [{ type: "video", uri: product.video }] : []),
    ...variants.map((v) => ({
      type: "image",
      uri: v.image || "https://via.placeholder.com/300",
      variantId: v.id,
    })),
  ];
  if (mediaArray.length === 0 && product.images && product.images.length > 0) {
    mediaArray.push(
      ...product.images.map((img) => ({ type: "image", uri: img }))
    );
  }
  if (mediaArray.length === 0) {
    mediaArray.push({
      type: "image",
      uri: "https://via.placeholder.com/300?text=No+Image",
    });
  }

  const renderThumbnailItem = ({ item, index }) => {
    const isSelected = currentMediaIndex === index;
    const isVideo = item.type === "video";
    return (
      <TouchableOpacity
        onPress={() => handleThumbnailClick(index)}
        style={[styles.thumbnail, isSelected && styles.selectedThumbnail]}
      >
        {isVideo && (
          <View style={styles.playIconOverlay}>
            <Text style={styles.playIcon}>▶</Text>
          </View>
        )}
        <Image
          source={{ uri: item.uri }}
          style={styles.thumbnailMedia}
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  };

  const renderVariantOption = (attribute) => {
    if (!product || !product.attributes || !variants) return null;

    const attributeValues = [
      ...new Set(variants.map((v) => v[attribute]).filter(Boolean)),
    ];

    if (attributeValues.length === 0) return null;

    return (
      <View key={attribute} style={styles.variantSection}>
        <Text style={styles.variantLabel}>
          {attribute.charAt(0).toUpperCase() + attribute.slice(1)}:
          <Text style={styles.selectedValue}>
            {" "}
            {selectedVariant?.[attribute] || "Select"}
          </Text>
        </Text>
        <View style={styles.variantOptions}>
          {attributeValues.map((value) => {
            const isSelected = selectedVariant?.[attribute] === value;
            const hasStockForValue = variants.some(
              (v) => v[attribute] === value && v.stock > 0
            );

            return (
              <TouchableOpacity
                key={`${attribute}-${value}`}
                style={[
                  styles.variantButton,
                  isSelected && styles.selectedVariantButton,
                  !hasStockForValue && styles.disabledVariantButton,
                ]}
                onPress={() => handleVariantChange(attribute, value)}
                disabled={!hasStockForValue}
              >
                <Text
                  style={[
                    styles.variantButtonText,
                    isSelected && styles.selectedVariantButtonText,
                    !hasStockForValue && styles.disabledVariantButtonText,
                  ]}
                >
                  {value}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const isActionDisabled =
    !selectedVariant ||
    selectedVariant.stock <= 0 ||
    quantity > (selectedVariant?.stock || 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        backgroundColor="transparent"
        barStyle="light-content"
        translucent
      />
      <Animated.View
        style={[styles.stickyHeaderContainer, { opacity: headerOpacity }]}
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.8)", "rgba(0,0,0,0.5)", "transparent"]}
          style={styles.stickyHeaderGradient}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.stickyHeaderButton}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {product && (
            <Text style={styles.stickyHeaderText} numberOfLines={1}>
              {product.name}
            </Text>
          )}
          <View style={styles.stickyHeaderActions}>
            <TouchableOpacity
              onPress={() => {
                /* TODO: Implement Share */
              }}
              style={styles.stickyHeaderButton}
            >
              <Ionicons name="share-social-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={toggleFavoriteLocal}
              style={styles.stickyHeaderButton}
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={22}
                color={isFavorite ? "#EF4444" : "#FFFFFF"}
              />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.ScrollView
        style={styles.container}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        <View style={styles.mediaContainer}>
          <Animated.View
            style={[
              styles.topActionButtonsContainer,
              {
                opacity: headerOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0],
                }),
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => router.back()}
              style={[styles.topActionButton, styles.topActionButtonLeft]}
            >
              <Ionicons name="arrow-back" size={26} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.topActionButtonsRightContainer}>
              <TouchableOpacity
                onPress={() => {
                  /* TODO: Implement Share */
                }}
                style={styles.topActionButton}
              >
                <Ionicons
                  name="share-social-outline"
                  size={24}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={toggleFavoriteLocal}
                style={styles.topActionButton}
              >
                <Ionicons
                  name={isFavorite ? "heart" : "heart-outline"}
                  size={24}
                  color={isFavorite ? "#EF4444" : "#FFFFFF"}
                />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {product.isNew && (
            <View style={styles.newBadgeMedia}>
              <Text style={styles.newBadgeMediaText}>NEW</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={toggleFavoriteLocal}
            style={styles.favoriteIconMedia}
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart"}
              size={26}
              color={isFavorite ? "#EF4444" : "#FFFFFF"}
            />
          </TouchableOpacity>

          {mediaArray[currentMediaIndex] &&
          mediaArray[currentMediaIndex].type === "video" ? (
            <Video
              ref={videoRef}
              source={{ uri: mediaArray[currentMediaIndex].uri }}
              style={styles.media}
              useNativeControls
              resizeMode="contain"
              isLooping={false}
              onError={(e) => console.log("Video Error:", e)}
            />
          ) : (
            <Image
              source={{
                uri:
                  mediaArray[currentMediaIndex]?.uri ||
                  "https://via.placeholder.com/300",
              }}
              style={styles.media}
              resizeMode="contain"
            />
          )}
        </View>

        {mediaArray.length > 1 && (
          <FlatList
            ref={flatListRef}
            horizontal
            data={mediaArray}
            renderItem={renderThumbnailItem}
            keyExtractor={(item, index) => `${item.type}-${item.uri}-${index}`}
            contentContainerStyle={styles.thumbnailContainer}
            showsHorizontalScrollIndicator={false}
            getItemLayout={(data, index) => ({
              length: 60 + 10,
              offset: (60 + 10) * index,
              index,
            })}
          />
        )}

        <View style={styles.infoContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.productName}>{product.name}</Text>
          </View>

          <View style={styles.priceAndRatingRow}>
            <Text style={styles.productPrice}>
              ETB{" "}
              {selectedVariant
                ? selectedVariant.price.toFixed(2)
                : (product.price || 0).toFixed(2)}
            </Text>
            {reviews.length > 0 && (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={14} color="#FFC107" />
                <Text style={styles.ratingBadgeText}>
                  {averageRating.toFixed(1)} ({reviews.length})
                </Text>
              </View>
            )}
          </View>

          <Text
            style={styles.stockStatusText(
              selectedVariant ? selectedVariant.stock : variants[0]?.stock || 0
            )}
          >
            {selectedVariant
              ? selectedVariant.stock > 5
                ? `In Stock (${selectedVariant.stock} available)`
                : selectedVariant.stock > 0
                ? `Low Stock (${selectedVariant.stock} left)`
                : "Out of Stock"
              : variants.length > 0 && (variants[0]?.stock || 0) > 0
              ? "In Stock (Select Variant)"
              : "Out of Stock (Select Variant)"}
          </Text>

          {product.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.sectionTitleText}>Description</Text>
              <ReadMore
                numberOfLines={DESCRIPTION_PREVIEW_LINES}
                style={styles.productDescription}
                seeMoreStyle={styles.readMoreLessText}
                seeLessStyle={styles.readMoreLessText}
              >
                {product.description}
              </ReadMore>
            </View>
          )}
          {selectedVariant && product.attributes && (
            <View style={styles.selectedVariantDetails}>
              <Text style={styles.selectedVariantTitle}>Selected:</Text>
              {product.attributes.map((attr) => (
                <Text key={attr} style={styles.selectedVariantText}>
                  <Text style={{ fontWeight: "bold" }}>
                    {attr.charAt(0).toUpperCase() + attr.slice(1)}:
                  </Text>{" "}
                  {selectedVariant[attr] || "N/A"}
                </Text>
              ))}
            </View>
          )}
        </View>

        {variants.length > 0 && product.attributes && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitleText}>Select Variant</Text>
            {product.attributes.map(renderVariantOption)}
          </View>
        )}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitleText}>Quantity</Text>
          <View style={styles.quantityControlsContainer}>
            <TouchableOpacity
              onPress={() => handleQuantityChange(-1)}
              style={styles.quantityAdjustButton}
              disabled={quantity <= 1}
            >
              <Ionicons
                name="remove-circle-outline"
                size={30}
                color={quantity <= 1 ? "#D1D5DB" : "#1E40AF"}
              />
            </TouchableOpacity>
            <Text style={styles.quantityDisplay}>{quantity}</Text>
            <TouchableOpacity
              onPress={() => handleQuantityChange(1)}
              style={styles.quantityAdjustButton}
              disabled={selectedVariant && quantity >= selectedVariant.stock}
            >
              <Ionicons
                name="add-circle-outline"
                size={30}
                color={
                  selectedVariant && quantity >= selectedVariant.stock
                    ? "#D1D5DB"
                    : "#1E40AF"
                }
              />
            </TouchableOpacity>
          </View>
        </View>

        {product.images && product.images.length > 0 && (
          <View style={styles.primaryImagesContainer}>
            <Text style={styles.primaryImagesTitle}>More Images</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {product.images.map((imgUri, index) => (
                <Image
                  key={index}
                  source={{ uri: imgUri }}
                  style={styles.primaryImage}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          </View>
        )}

        {reviews.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitleText}>
              Customer Reviews ({reviews.length})
            </Text>
            {renderReviews()}
          </View>
        )}

        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.addToCartButton,
              isActionDisabled && styles.disabledButton,
            ]}
            onPress={handleAddToCart}
            disabled={isActionDisabled}
          >
            <Ionicons
              name="cart"
              size={20}
              color="#FFF"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.buttonText}>Add to Cart</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.buyNowButton,
              isActionDisabled && styles.disabledButton,
            ]}
            onPress={handleBuyNow}
            disabled={isActionDisabled}
          >
            <Ionicons
              name="flash"
              size={20}
              color="#FFF"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.buttonText}>Buy Now</Text>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>
      <Toast config={toastConfig} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  stickyHeaderContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: StatusBar.currentHeight || 20,
  },
  stickyHeaderGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    height: 50,
  },
  stickyHeaderText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginHorizontal: 10,
  },
  stickyHeaderButton: {
    padding: 8,
  },
  stickyHeaderActions: {
    flexDirection: "row",
  },
  topActionButtonsContainer: {
    position: "absolute",
    top: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 30,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    zIndex: 5,
  },
  topActionButton: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 20,
    padding: 8,
    marginLeft: 10,
  },
  topActionButtonLeft: {
    marginLeft: 0,
  },
  topActionButtonsRightContainer: {
    flexDirection: "row",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  mediaContainer: {
    width: screenWidth,
    height: screenWidth * 0.9,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  media: {
    width: "100%",
    height: "100%",
  },
  thumbnailContainer: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  thumbnail: {
    width: 70,
    height: 70,
    marginHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  selectedThumbnail: {
    borderColor: "#1E40AF",
    borderWidth: 2.5,
  },
  thumbnailMedia: {
    width: "100%",
    height: "100%",
  },
  playIconOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  playIcon: {
    fontSize: 24,
    color: "#fff",
  },
  infoContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: "#FFFFFF",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  productName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
    flex: 1,
  },
  priceAndRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    flexWrap: "wrap",
  },
  productPrice: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#10B981",
    marginRight: 10,
  },
  originalPrice: {
    fontSize: 16,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
    marginRight: 10,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  ratingBadgeText: {
    marginLeft: 5,
    fontSize: 13,
    color: "#CA8A04",
    fontWeight: "500",
  },
  stockStatusText: (stock) => ({
    fontSize: 15,
    fontWeight: "500",
    color: stock > 5 ? "#059669" : stock > 0 ? "#F59E0B" : "#EF4444",
    marginBottom: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: stock > 5 ? "#D1FAE5" : stock > 0 ? "#FEF3C7" : "#FEE2E2",
    alignSelf: "flex-start",
    borderRadius: 6,
  }),
  descriptionContainer: {
    marginTop: 10,
  },
  productDescription: {
    fontSize: 15,
    color: "#4B5563",
    lineHeight: 22,
  },
  readMoreLessText: {
    color: "#1E40AF",
    fontWeight: "600",
    marginTop: 5,
  },
  selectedVariantDetails: {
    marginTop: 8,
  },
  selectedVariantTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },
  selectedVariantText: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 2,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginHorizontal: 10,
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginBottom: 15,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  sectionTitleText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 12,
  },
  variantContainer: {},
  variantSection: {
    marginBottom: 15,
  },
  variantLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 10,
  },
  selectedValue: {
    color: "#3B82F6",
    fontWeight: "500",
  },
  variantOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  variantButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    marginRight: 10,
    marginBottom: 10,
    backgroundColor: "#F9FAFB",
  },
  selectedVariantButton: {
    borderColor: "#1E40AF",
    backgroundColor: "#DBEAFE",
  },
  variantButtonText: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "500",
  },
  selectedVariantButtonText: {
    color: "#1E40AF",
    fontWeight: "bold",
  },
  disabledVariantButton: {
    borderColor: "#E5E7EB",
    backgroundColor: "#F3F4F6",
    opacity: 0.5,
  },
  disabledVariantButtonText: {
    color: "#6B7280",
  },
  quantityControlsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  quantityAdjustButton: {
    padding: 8,
  },
  quantityDisplay: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1E293B",
    minWidth: 40,
    textAlign: "center",
  },
  primaryImagesContainer: {
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginHorizontal: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryImagesTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 10,
  },
  primaryImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 10,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    paddingVertical: 15,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    justifyContent: "space-around",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 10,
    marginHorizontal: 8,
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  addToCartButton: {
    backgroundColor: "#F97316",
  },
  buyNowButton: {
    backgroundColor: "#10B981",
  },
  disabledButton: {
    backgroundColor: "#D1D5DB",
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#4B5563",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: "#B91C1C",
    textAlign: "center",
    marginBottom: 20,
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#3B82F6",
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  reviewsContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginHorizontal: 10,
    padding: 16,
    marginBottom: 15,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  reviewsHeader: {
    marginBottom: 16,
  },
  reviewsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 8,
  },
  ratingSummary: {
    flexDirection: "row",
    alignItems: "center",
  },
  averageRating: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E293B",
    marginRight: 8,
  },
  totalReviews: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 8,
  },
  starsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  starIcon: {
    marginRight: 2,
  },
  reviewCard: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 16,
    marginTop: 16,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  reviewerInfo: {
    flex: 1,
    marginRight: 16,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: "#6B7280",
  },
  reviewText: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
    marginBottom: 12,
  },
  orderInfo: {
    backgroundColor: "#F3F4F6",
    padding: 8,
    borderRadius: 6,
  },
  orderInfoText: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  noReviewsContainer: {
    padding: 20,
    alignItems: "center",
  },
  noReviewsText: {
    fontSize: 16,
    color: "#6B7280",
    fontStyle: "italic",
  },
  newBadgeMedia: {
    position: "absolute",
    top: StatusBar.currentHeight
      ? StatusBar.currentHeight + 10 + 44 + 10
      : 30 + 44 + 10,
    left: 15,
    backgroundColor: "#10B981",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
    zIndex: 6,
  },
  newBadgeMediaText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "bold",
  },
  favoriteIconMedia: {
    position: "absolute",
    bottom: 15,
    right: 15,
    backgroundColor: "rgba(0,0,0,0.3)",
    padding: 8,
    borderRadius: 20,
    zIndex: 6,
  },
});

export default ProductDetails;
