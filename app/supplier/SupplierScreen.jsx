import { Ionicons, MaterialIcons } from '@expo/vector-icons'; // For icons
import { useNavigation } from '@react-navigation/native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../config/firebase';

const SupplierScreen = () => {
  const user = auth.currentUser;
  const [supplierData, setSupplierData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  // Fetch supplier data from Firestore
  useEffect(() => {
    const fetchSupplierData = async () => {
      if (user?.email) {
        setLoading(true);
        const suppliersRef = collection(db, 'suppliers');
        const q = query(suppliersRef, where('email', '==', user.email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const data = querySnapshot.docs[0].data();
          setSupplierData(data);
        }
        setLoading(false);
      }
    };

    fetchSupplierData();
  }, [user]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Profile and Navigation Icons in a Horizontal Line */}
      <View style={styles.horizontalContainer}>
        {/* Profile Section */}
        <TouchableOpacity style={styles.profileSection} onPress={() => navigation.navigate('supplier/Profile')}>
          <View style={styles.profileCircle}>
            {loading ? (
              <ActivityIndicator size="small" color="#007bff" />
            ) : supplierData?.profilePicture ? (
              <Image source={{ uri: supplierData.profilePicture }} style={styles.profileImage} />
            ) : (
              <Ionicons name="person" size={28} color="#888" />
            )}
          </View>
          <Text style={styles.profileName}>
            {supplierData ? `${supplierData.fName} ${supplierData.lName}` : "Supplier Name"}
          </Text>
        </TouchableOpacity>

        {/* Navigation Icons */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('supplier/Posts')}>
            <Ionicons name="newspaper" size={20} color="#007bff" />
            <Text style={styles.navText}>Posts</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('supplier/AddProduct')}>
            <MaterialIcons name="add-box" size={20} color="#28a745" />
            <Text style={styles.navText}>Add Product</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('supplier/Notifications')}>
            <Ionicons name="notifications" size={20} color="#ffc107" />
            <Text style={styles.navText}>Notifications</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Additional Content */}
      <View style={styles.contentSection}>
        <Text style={styles.sectionTitle}>Supplier Dashboard</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#007bff" />
        ) : (
          <Text style={styles.sectionText}>
            {supplierData
              ? "Welcome to your supplier dashboard. Manage your products, posts, and notifications here."
              : "No supplier data found."}
          </Text>
        )}
      </View>
    </ScrollView>
  );
};

export default SupplierScreen;

// Styles
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  horizontalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  profileSection: {
    alignItems: 'center',
  },
  profileCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profileName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center',
    marginHorizontal: 6,
    padding: 6,
  },
  navText: {
    marginTop: 4,
    fontSize: 12,
    color: '#333',
  },
  contentSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 16,
    color: '#555',
  },
});
