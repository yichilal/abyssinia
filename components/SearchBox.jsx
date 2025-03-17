import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

const SearchBox = ({ onSearchSubmit }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = () => {
    // Pass the search query to the parent component
    onSearchSubmit(searchQuery);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <TouchableOpacity onPress={handleSearchSubmit}>
          <Ionicons name="search" size={20} color="gray" style={styles.icon} />
        </TouchableOpacity>
        <TextInput
          placeholder="Search..."
          placeholderTextColor="#888"
          style={styles.input}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearchSubmit}
        />
      </View>
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
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 15,
    shadowColor: "#001",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: "100%", // Full width of the container
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
});

export default SearchBox;
