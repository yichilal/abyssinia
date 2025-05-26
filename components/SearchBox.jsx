import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Animated,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const SearchBox = ({ onSearchSubmit }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSearchSubmit = () => {
    // Pass the search query to the parent component
    onSearchSubmit(searchQuery);
  };

  const handleClear = () => {
    setSearchQuery("");
    onSearchSubmit("");
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.searchBox, isFocused && styles.searchBoxFocused]}
      >
        <TouchableOpacity onPress={handleSearchSubmit}>
          <Ionicons
            name="search"
            size={30}
            color={isFocused ? "#3B82F6" : "#94A3B8"}
            style={styles.icon}
          />
        </TouchableOpacity>
        <TextInput
          placeholder="Search products..."
          placeholderTextColor="#94A3B8"
          style={styles.input}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearchSubmit}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 15,
    shadowColor: "#333",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    width: "100%",
    borderWidth: 1,
    borderColor: "#EFF6FF",
  },
  searchBoxFocused: {
    borderColor: "#BFDBFE",
    shadowColor: "#3B82F6",
    shadowOpacity: 0.2,
  },
  icon: {
    padding: -10,
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#334155",
    fontWeight: "500",
  },
  clearButton: {
    padding: 4,
  },
});

export default SearchBox;
