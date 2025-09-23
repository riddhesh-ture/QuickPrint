import React, { createContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth'; // Import directly from firebase
import { auth } from '../firebase/config'; // Import your auth instance

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Pass the auth instance to onAuthStateChanged
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const value = { user, isAuthenticated: !!user, merchantId: user?.uid, loading };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};