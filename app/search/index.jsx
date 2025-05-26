import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { collection, getDocs, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import PromotionsCarousel from "../../components/PromotionsCarousel";
import { db } from "../config/firebase";

const SearchResults = () => {
  const { query: searchQueryParam } = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchQueryParam || "");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSearchResults = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);

    try {
      const productsRef = collection(db, "products");
      const q = query(
        productsRef,
        where("name", ">=", searchQuery),
        where("name", "<=", searchQuery + "\uf8ff")
      );

      const querySnapshot = await getDocs(q);
      const results = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setSearchResults(results);
    } catch (error) {
      console.error("Error fetching search results:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSearchResults();
  }, [searchQuery]);

  const handleProductPress = (id) => {
    router.push({
      pathname: "/products/ProductsDetails",
      params: { id },
    });
  };

  const renderSearchResultItem = ({ item }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleProductPress(item.id)}
    >
      <Image
        source={{
          uri:
            item.images && item.images[0]
              ? item.images[0]
              : "https://via.placeholder.com/80",
        }}
        style={styles.resultImage}
        resizeMode="cover"
      />
      <View style={styles.resultDetails}>
        <Text style={styles.resultName} numberOfLines={1}>
          {item.name || "Unnamed Product"}
        </Text>
        <Text style={styles.resultPrice}>${item.price || "0.00"}</Text>
        <Text style={styles.resultCategory}>
          {item.category || "Uncategorized"}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#1E40AF" barStyle="light-content" />
      <PromotionsCarousel />
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons
            name="search"
            size={20}
            color="#6B7280"
            style={styles.searchIcon}
          />
          <TextInput
            placeholder="Search products..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          <TouchableOpacity onPress={() => router.replace("index")}>
            <Ionicons name="arrow-back" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : searchResults.length > 0 ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={renderSearchResultItem}
          contentContainerStyle={styles.resultsContainer}
        />
      ) : (
        <View style={styles.noResultsContainer}>
          <Text style={styles.noResultsText}>No results found.</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB", // Matches LoginPage background
  },
  header: {
    backgroundColor: "#1E40AF", // Deep blue from LoginPage
    paddingTop: 20, // Reduced padding to better position promotion
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12, // Matches LoginPage inputs
    borderWidth: 1,
    borderColor: "#D1D5DB", // Light gray border from LoginPage
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1F2937", // Dark gray from LoginPage
  },
  resultsContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12, // Matches LoginPage inputs
    padding: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  resultImage: {
    width: 80,
    height: 80,
    borderRadius: 8, // Slightly smaller than card radius
    marginRight: 12,
  },
  resultDetails: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937", // Dark gray from LoginPage
    marginBottom: 4,
  },
  resultPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#10B981", // Green from RegisterSupplier
    marginBottom: 4,
  },
  resultCategory: {
    fontSize: 12,
    color: "#6B7280", // Medium gray from LoginPage
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280", // Medium gray from LoginPage
    fontWeight: "500",
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noResultsText: {
    fontSize: 16,
    color: "#6B7280", // Medium gray from LoginPage
    fontWeight: "500",
  },
});

export default SearchResults;
