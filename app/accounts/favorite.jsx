import { collection, onSnapshot, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import { db } from "../config/firebase";
const Favorites = () => {
  const [favoriteProducts, setFavoriteProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "products"), where("favorite", "==", true));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const products = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setFavoriteProducts(products);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>Favorite Products</Text>
      {favoriteProducts.length === 0 ? (
        <Text style={styles.noFavoritesText}>No favorite products found.</Text>
      ) : (
        <FlatList
          data={favoriteProducts}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          numColumns={2}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.productCard}>
              {item.images && item.images.length > 0 ? (
                <Image source={{ uri: item.images[0] }} style={styles.productImage} />
              ) : (
                <Text style={styles.noImageText}>No Image Available</Text>
              )}
              <Text style={styles.productName}>{item.name}</Text>
              <View style={styles.productInfo}>
                <Text style={styles.productPrice}>${item.price}</Text>
                <View style={styles.productStatusContainer}>
                  <Icon name="check-circle" size={16} color="#007BFF" />
                  <Text style={styles.productStatus}>{item.status}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#A9B7BE",
    padding: 16,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
    color: "#333",
  },
  noFavoritesText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 20,
  },
  productCard: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    padding: 10,
    borderRadius: 10,
    margin: 5,
    alignItems: "center",
    width: "48%",
  },
  productImage: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    resizeMode: "cover",
  },
  noImageText: {
    fontSize: 12,
    color: "red",
    textAlign: "center",
    marginTop: 20,
  },
  productName: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 5,
    color: "#333",
  },
  productInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10,
  },
  productPrice: {
    fontSize: 14,
    color: "#007BFF",
    fontWeight: "bold",
  },
  productStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  productStatus: {
    fontSize: 12,
    color: "#28A745",
    marginLeft: 5,
  },
});

export default Favorites;