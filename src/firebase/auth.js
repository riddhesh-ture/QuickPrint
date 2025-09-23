// src/firebase/auth.js

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from './config'; // Import the auth instance from your config

export const signUpMerchant = (email, password) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const signInMerchant = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const signOutMerchant = () => {
  return signOut(auth);
};

export { onAuthStateChanged };

// Hook to get current auth state (for protected routes)
import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [merchantId, setMerchantId] = useState(null);

  useEffect(() => {
    const checkAuth = () => {
      const authStatus = localStorage.getItem('isAuthenticated') === 'true';
      const storedMerchantId = localStorage.getItem('merchantId');
      setIsAuthenticated(authStatus);
      setMerchantId(storedMerchantId);
      // console.log('Auth check:', { isAuthenticated: authStatus, merchantId: storedMerchantId });
    };

    // Add event listener for storage changes (e.g., login/logout in other tabs)
    window.addEventListener('storage', checkAuth);

    // Initial check
    checkAuth();

    return () => {
      window.removeEventListener('storage', checkAuth);
    };
  }, []); // Empty dependency array means this runs once on mount

  return { isAuthenticated, merchantId };
};