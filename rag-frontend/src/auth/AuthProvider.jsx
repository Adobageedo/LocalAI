import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { auth } from "../firebase/firebase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sign in with email and password
  const login = async (email, password) => {
    try {
      setError(null);
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  // Sign in with Google
  const loginWithGoogle = async () => {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  // Sign up with email and password
  const register = async (email, password) => {
    try {
      setError(null);
      await createUserWithEmailAndPassword(auth, email, password);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  // Sign out
  const logout = async () => {
    try {
      await signOut(auth);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  // Get Firebase token for backend API calls
  const getIdToken = async () => {
    if (user) {
      return await user.getIdToken();
    }
    return null;
  };

  // Check if user has a specific role
  const hasRole = (role) => {
    return user?.customClaims?.roles?.includes(role) || false;
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      login,
      loginWithGoogle,
      register,
      logout,
      getIdToken,
      hasRole,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}