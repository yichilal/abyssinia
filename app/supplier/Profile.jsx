import { MaterialIcons } from "@expo/vector-icons"; // Icons
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker"; // Image upload
import { collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { auth, db } from "../config/firebase";

const Profile = () => {
  const user = auth.currentUser;
  const [supplierData, setSupplierData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [updatedName, setUpdatedName] = useState("");
  const [updatedProfilePicture, setUpdatedProfilePicture] = useState(null);
  const navigation = useNavigation();

  // Fetch supplier data from Firestore
  useEffect(() => {
    const fetchSupplierData = async () => {
      if (user?.email) {
        const suppliersRef = collection(db, "suppliers");
        const q = query(suppliersRef, where("email", "==", user.email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const data = querySnapshot.docs[0].data();
          setSupplierData(data);
          setUpdatedName(`${data.fName} ${data.lName}`);
          setUpdatedProfilePicture(data.profilePicture);
        }
      }
    };

    fetchSupplierData();
  }, [user]);

  // Handle profile picture update
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setUpdatedProfilePicture(result.assets[0].uri);
    }
  };

  // Update profile details in Firestore
  const updateProfile = async () => {
    if (!supplierData) return;

    try {
      const supplierRef = doc(db, "suppliers", supplierData.uid);
      await updateDoc(supplierRef, {
        fName: updatedName.split(" ")[0] || supplierData.fName,
        lName: updatedName.split(" ")[1] || supplierData.lName,
        profilePicture: updatedProfilePicture || supplierData.profilePicture,
      });

      Alert.alert("Success", "Profile updated successfully!");
      setIsEditing(false);
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", "Failed to update profile.");
      console.error("Update Error:", error);
    }
  };

  if (!supplierData) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
        {updatedProfilePicture ? (
          <Image source={{ uri: updatedProfilePicture }} style={styles.profileImage} />
        ) : (
          <MaterialIcons name="person" size={80} color="#ccc" />
        )}
      </TouchableOpacity>

      {isEditing ? (
        <TextInput
          value={updatedName}
          onChangeText={setUpdatedName}
          style={styles.input}
          placeholder="Full Name"
        />
      ) : (
        <Text style={styles.text}>{`${supplierData.fName} ${supplierData.lName}`}</Text>
      )}

      <Text style={styles.text}>Email: {supplierData.email}</Text>
      <Text style={styles.text}>Phone: {supplierData.phoneNumber}</Text>
      <Text style={styles.text}>Trade Type: {supplierData.tradeType}</Text>
      <Text style={styles.text}>Address: {supplierData.address}</Text>

      {isEditing ? (
        <TouchableOpacity style={styles.button} onPress={updateProfile}>
          <Text style={styles.buttonText}>Save Changes</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.button} onPress={() => setIsEditing(true)}>
          <Text style={styles.buttonText}>Edit Profile</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={() => auth.signOut()}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, alignItems: "center", backgroundColor: "#fff" },
  imageContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: "#eee", justifyContent: "center", alignItems: "center", marginBottom: 20 },
  profileImage: { width: 120, height: 120, borderRadius: 60 },
  text: { fontSize: 18, marginBottom: 10, color: "#333" },
  input: { width: "100%", padding: 10, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, marginBottom: 10 },
  button: { backgroundColor: "#007bff", padding: 15, borderRadius: 8, marginTop: 10, width: "80%", alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  logoutButton: { marginTop: 20, padding: 10, borderRadius: 5, backgroundColor: "#dc3545", width: "80%", alignItems: "center" },
  logoutText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});

export default Profile;
