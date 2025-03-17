import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="accounts/favorite" />
      <Stack.Screen name="accounts/orders" />
      <Stack.Screen name="delivery/DeliveryScreen" />
      <Stack.Screen name="products/ProductsDetails" />
      <Stack.Screen name="supplier/AddProduct" />
      <Stack.Screen name="supplier/Notifications" />
      <Stack.Screen name="supplier/Posts" />
      <Stack.Screen name="supplier/Profile" />
      <Stack.Screen name="supplier/Register" />
      <Stack.Screen name="supplier/SupplierScreen" />
      <Stack.Screen name="user/SignIn" />
      <Stack.Screen name="user/Register" />
       <Stack.Screen name="search/searchresult"/>
      <Stack.Screen name="user/LoginUser" /> {/* Corrected from <stack.Screen> to <Stack.Screen> */}
    </Stack>
  );
}