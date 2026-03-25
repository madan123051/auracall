import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { onAuthStateChanged, signInWithGoogle, signOutUser } from "../lib/auth";
import { setupPresence } from "../lib/presence";

const AuthContext = createContext({
  currentUser: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const presenceCleanupRef = useRef(null);

  useEffect(() => {
    console.log("[AuthProvider] Setting up auth listener");
    const unsubscribe = onAuthStateChanged((user) => {
      setCurrentUser(user);
      setLoading(false);

      // Cleanup previous presence
      if (presenceCleanupRef.current) {
        presenceCleanupRef.current();
        presenceCleanupRef.current = null;
      }

      // Setup presence for logged-in user
      if (user) {
        console.log("[AuthProvider] Setting up presence for:", user.displayName);
        presenceCleanupRef.current = setupPresence(user.uid);
      }
    });

    return () => {
      console.log("[AuthProvider] Cleaning up auth listener");
      unsubscribe();
      if (presenceCleanupRef.current) {
        presenceCleanupRef.current();
      }
    };
  }, []);

  async function login() {
    try {
      const user = await signInWithGoogle();
      return user;
    } catch (error) {
      console.error("[AuthProvider] Login error:", error);
      throw error;
    }
  }

  async function logout() {
    try {
      // Cleanup presence before signing out
      if (presenceCleanupRef.current) {
        presenceCleanupRef.current();
        presenceCleanupRef.current = null;
      }
      await signOutUser();
    } catch (error) {
      console.error("[AuthProvider] Logout error:", error);
      throw error;
    }
  }

  const value = {
    currentUser,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
