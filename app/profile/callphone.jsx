import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import Ionicons from "react-native-vector-icons/Ionicons";

const CallPhone = () => {
  const router = useRouter();

  // Phone numbers to call
  const phoneNumbers = [
    {
      name: "Customer Service",
      number: "+251912345678",
      icon: "headset-outline",
    },
    {
      name: "Technical Support",
      number: "+251987654321",
      icon: "construct-outline",
    },
    { name: "Sales Department", number: "+251911223344", icon: "cart-outline" },
    {
      name: "Emergency Contact",
      number: "+251955667788",
      icon: "warning-outline",
    },
  ];

  // Social media accounts
  const socialMediaAccounts = [
    {
      platform: "Telegram",
      username: "@AbyssiniaGebeya",
      icon: "telegram",
      iconProvider: "FontAwesome",
      color: "#0088cc",
      url: "https://t.me/AbyssiniaGebeya",
    },
    {
      platform: "Twitter/X",
      username: "@AbyssiniaGebeya",
      icon: "twitter",
      iconProvider: "FontAwesome",
      color: "#1DA1F2",
      url: "https://twitter.com/AbyssiniaGebeya",
    },
    {
      platform: "Facebook",
      username: "Abyssinia Gebeya",
      icon: "facebook",
      iconProvider: "FontAwesome",
      color: "#4267B2",
      url: "https://facebook.com/AbyssiniaGebeya",
    },
  ];

  // Function to make a phone call
  const makePhoneCall = (phoneNumber, name) => {
    Alert.alert(
      "Call " + name,
      "Do you want to call " + phoneNumber + "?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Call",
          onPress: () => {
            const phoneUrl = `tel:${phoneNumber.replace(/\s/g, "")}`;
            Linking.canOpenURL(phoneUrl)
              .then((supported) => {
                if (supported) {
                  return Linking.openURL(phoneUrl);
                } else {
                  Alert.alert(
                    "Phone call not supported",
                    "Your device does not support phone calls"
                  );
                }
              })
              .catch((error) =>
                console.error("Error making phone call:", error)
              );
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Function to open social media
  const openSocialMedia = (platform, url) => {
    Alert.alert(
      "Open " + platform,
      "Do you want to open " + platform + "?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open",
          onPress: () => {
            Linking.canOpenURL(url)
              .then((supported) => {
                if (supported) {
                  return Linking.openURL(url);
                } else {
                  Alert.alert(
                    "Cannot open link",
                    "Your device cannot open this link."
                  );
                }
              })
              .catch((error) =>
                console.error("Error opening social media:", error)
              );
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Render social media icon based on provider
  const renderSocialIcon = (item) => {
    switch (item.iconProvider) {
      case "FontAwesome":
        return <FontAwesome name={item.icon} size={24} color="#FFF" />;
      default:
        return <Ionicons name={item.icon} size={24} color="#FFF" />;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient colors={["#1E40AF", "#3B82F6"]} style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Us</Text>
      </LinearGradient>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Phone Call Section */}
        <Text style={styles.sectionTitle}>Call Us</Text>
        <Text style={styles.subtitle}>Select a department to call</Text>

        {/* Phone number list */}
        {phoneNumbers.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.phoneItem}
            onPress={() => makePhoneCall(item.number, item.name)}
          >
            <View style={styles.iconContainer}>
              <Ionicons name={item.icon} size={24} color="#1E40AF" />
            </View>
            <View style={styles.phoneInfo}>
              <Text style={styles.phoneName}>{item.name}</Text>
              <Text style={styles.phoneNumber}>{item.number}</Text>
            </View>
            <View style={styles.callButton}>
              <Ionicons name="call" size={22} color="#FFF" />
            </View>
          </TouchableOpacity>
        ))}

        <Text style={styles.note}>
          Our customer service is available Monday to Saturday, 9:00 AM to 6:00
          PM.
        </Text>

        {/* Social Media Section */}
        <Text style={[styles.sectionTitle, { marginTop: 30 }]}>
          Social Media
        </Text>
        <Text style={styles.subtitle}>Connect with us on social platforms</Text>

        {/* Social Media Accounts */}
        <View style={styles.socialMediaContainer}>
          {socialMediaAccounts.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.socialButton, { backgroundColor: item.color }]}
              onPress={() => openSocialMedia(item.platform, item.url)}
            >
              {renderSocialIcon(item)}
              <Text style={styles.socialText}>{item.platform}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.socialMediaList}>
          {socialMediaAccounts.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.socialMediaItem}
              onPress={() => openSocialMedia(item.platform, item.url)}
            >
              <View
                style={[
                  styles.socialIconContainer,
                  { backgroundColor: item.color },
                ]}
              >
                {renderSocialIcon(item)}
              </View>
              <View style={styles.socialInfo}>
                <Text style={styles.platformName}>{item.platform}</Text>
                <Text style={styles.username}>{item.username}</Text>
              </View>
              <View
                style={[styles.visitButton, { backgroundColor: item.color }]}
              >
                <Ionicons name="open-outline" size={20} color="#FFF" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer spacing */}
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F8FF",
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginLeft: 20,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    color: "#4B5563",
    fontWeight: "500",
  },
  phoneItem: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  phoneInfo: {
    flex: 1,
  },
  phoneName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },
  phoneNumber: {
    fontSize: 14,
    color: "#64748B",
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1E40AF",
    justifyContent: "center",
    alignItems: "center",
  },
  note: {
    marginTop: 5,
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    paddingHorizontal: 30,
    lineHeight: 20,
  },
  socialMediaContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 25,
    marginTop: 5,
  },
  socialButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  socialText: {
    color: "white",
    marginTop: 5,
    fontSize: 12,
    fontWeight: "600",
  },
  socialMediaList: {
    marginTop: 10,
  },
  socialMediaItem: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  socialIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  socialInfo: {
    flex: 1,
  },
  platformName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    color: "#64748B",
  },
  visitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default CallPhone;
