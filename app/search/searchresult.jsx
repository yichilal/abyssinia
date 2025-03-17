// app/search/searchresult.jsx
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
import { db } from "../config/firebase";

const SearchResults = () => {
  const { query: searchQueryParam } = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchQueryParam || "");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch products based on the search query
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
        source={{ uri: item.images[0] }}
        style={styles.resultImage}
        resizeMode="cover"
      />
      <View style={styles.resultDetails}>
        <Text style={styles.resultName}>{item.name}</Text>
        <Text style={styles.resultPrice}>${item.price}</Text>
        <Text style={styles.resultCategory}>{item.category}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Status Bar */}
      <StatusBar
        backgroundColor="#8C81F3" // Set the status bar background color
        barStyle="light-content" // Set the text color to light (white)
      />

      {/* Search Bar in a Card */}
      <View style={styles.searchCard}>
        <View style={styles.searchBar}>
          <Ionicons
            name="search"
            size={20}
            color="gray"
            style={styles.searchIcon}
            onPress={router.replace("index")}
          />
          <TextInput
            placeholder="Search products..."
            placeholderTextColor="#888"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onPress={router.replace("index")}
            autoFocus
          />
        </View>
      </View>

      {/* Search Results */}
      {loading ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : searchResults.length > 0 ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={renderSearchResultItem}
          contentContainerStyle={styles.resultsContainer}
        />
      ) : (
        <Text style={styles.noResultsText}>No results found.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 0,
  },
  searchCard: {
    backgroundColor: "#8C81F3", // Same as status bar background color
    borderTopLeftRadius: 0, // No border radius on the top-left
    borderTopRightRadius: 0, // No border radius on the top-right
    borderBottomLeftRadius: 10, // Border radius on the bottom-left
    borderBottomRightRadius: 10, // Border radius on the bottom-right
    padding: 40,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10, // Rounded corners for the search bar
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  resultsContainer: {
    paddingBottom: 20,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  resultImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 10,
  },
  resultDetails: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  resultPrice: {
    fontSize: 14,
    color: "#007BFF",
    marginTop: 4,
  },
  resultCategory: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  loadingText: {
    textAlign: "center",
    fontSize: 16,
    color: "#888",
    marginTop: 20,
  },
  noResultsText: {
    textAlign: "center",
    fontSize: 16,
    color: "#888",
    marginTop: 20,
  },
});

export default SearchResults;
