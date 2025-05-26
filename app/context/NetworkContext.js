import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const NetworkContext = createContext({
  isOnline: true,
  lastChecked: Date.now(),
});

export const useNetwork = () => useContext(NetworkContext);

export const NetworkProvider = ({ children }) => {
  const [networkState, setNetworkState] = useState({
    isOnline: true,
    lastChecked: Date.now(),
  });
  const lastCheckRef = useRef(Date.now());
  const checkTimeoutRef = useRef(null);

  const checkConnection = async () => {
    try {
      // Prevent checks that are too close together (minimum 2 seconds apart)
      const now = Date.now();
      if (now - lastCheckRef.current < 2000) {
        return;
      }
      lastCheckRef.current = now;

      const response = await fetch("https://www.google.com", {
        method: "HEAD",
        timeout: 3000, // Reduced timeout for faster response
      });

      const isOnline = response.status === 200;

      // Only update state if connection status has changed
      if (isOnline !== networkState.isOnline) {
        setNetworkState({
          isOnline,
          lastChecked: now,
        });
      }
    } catch (error) {
      if (networkState.isOnline) {
        // Only update if currently showing as online
        setNetworkState({
          isOnline: false,
          lastChecked: Date.now(),
        });
      }
    }

    // Schedule next check
    checkTimeoutRef.current = setTimeout(
      checkConnection,
      networkState.isOnline ? 8000 : 3000
    );
  };

  useEffect(() => {
    checkConnection();

    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, []);

  return (
    <NetworkContext.Provider value={networkState}>
      {children}
    </NetworkContext.Provider>
  );
};

export default NetworkContext;
