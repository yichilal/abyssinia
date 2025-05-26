import NetInfo from "@react-native-community/netinfo";
import { disableNetwork, enableNetwork } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../config/firebase";

const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(true);

  useEffect(() => {
    let timeout;

    const handleConnectivityChange = async (state) => {
      setIsOnline(state.isConnected);

      if (state.isConnected) {
        // When connection is restored, wait a bit before enabling Firestore
        timeout = setTimeout(async () => {
          try {
            await enableNetwork(db);
            setIsFirebaseConnected(true);
          } catch (error) {
            console.log("Error enabling Firestore:", error);
          }
        }, 1000);
      } else {
        // When connection is lost, disable Firestore immediately
        try {
          await disableNetwork(db);
          setIsFirebaseConnected(false);
        } catch (error) {
          console.log("Error disabling Firestore:", error);
        }
      }
    };

    // Initial check
    NetInfo.fetch().then(handleConnectivityChange);

    // Subscribe to network changes
    const unsubscribe = NetInfo.addEventListener(handleConnectivityChange);

    return () => {
      unsubscribe();
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  return {
    isOnline,
    isFirebaseConnected,
  };
};

export default useNetworkStatus;
