import { FontAwesome, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

const Layout = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const router = useRouter(); // Navigation hook

  return (
    <>
      {/* Modal for Login & Register */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Pressable onPress={() => setModalVisible(false)}>
              <Text style={styles.closeButton}>X</Text>
            </Pressable>
            <Pressable onPress={() => { setModalVisible(false); router.push("/supplier/Login"); }}>
              <Text style={styles.option}>Login</Text>
            </Pressable>
            <Pressable onPress={() => { setModalVisible(false); router.push("/supplier/Register"); }}>
              <Text style={styles.option}>Register as a Supplier</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Tabs Navigation */}
      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen
          name="index"
          options={{
            tabBarLabel: "Home",
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="CartScreen"
          options={{
            tabBarLabel: "Cart",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cart" size={size} color={color} />
            ),
          }}
        />
        {/* Updated "+" Button with tabBarButton */}
        <Tabs.Screen
          name="plus"
          options={{
            tabBarLabel: "",
            tabBarButton: (props) => (
              <Pressable {...props} onPress={() => setModalVisible(true)} style={styles.plusButton}>
                <Ionicons name="add-circle" size={40} color="blue" />
              </Pressable>
            ),
          }}
        />
        <Tabs.Screen
          name="category"
          options={{
            tabBarLabel: "Categories",
            tabBarIcon: ({ color, size }) => (
              <FontAwesome name="th-list" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="ProfileScreen"
          options={{
            tabBarLabel: "Profile",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-circle" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </>
  );
};

export default Layout;

// Styles
const styles = StyleSheet.create({
  plusButton: {
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    bottom: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: 300,
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  closeButton: {
    fontSize: 20,
    color: "red",
    alignSelf: "flex-end",
    marginBottom: 20,
  },
  option: {
    fontSize: 18,
    marginVertical: 10,
    color: "blue",
  },
});