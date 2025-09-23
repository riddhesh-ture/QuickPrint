// src/firebase/auth.js

// Simulate a successful login
export const signInMerchant = async (email, password) => {
  return new Promise((resolve, reject) => {
    // In a real app: call Firebase signInWithEmailAndPassword
    if (email && password) { // Basic validation
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('merchantId', 'merchant-abc'); // Store a mock merchant ID
      resolve({ user: { uid: 'mock-merchant-uid', email: email } });
    } else {
      reject(new Error('Invalid credentials.'));
    }
  });
};

// Simulate a successful signup
export const signUpMerchant = async (email, password) => {
  return new Promise((resolve, reject) => {
    // In a real app: call Firebase createUserWithEmailAndPassword
    if (email && password && password.length >= 6) { // Basic validation
      // You might also want to store the new merchant ID here.
      resolve({ user: { uid: 'new-mock-merchant-uid', email: email } });
    } else {
      reject(new Error('Email and password are required, and password must be at least 6 characters.'));
    }
  });
};

// Simulate logging out
export const signOutMerchant = async () => {
  return new Promise((resolve) => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('merchantId');
    resolve();
  });
};

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
    };

    // Add event listener for storage changes (e.g., login/logout in other tabs)
    window.addEventListener('storage', checkAuth);

    // Initial check
    checkAuth();

    return () => {
      window.removeEventListener('storage', checkAuth);
    };
  }, []);

  return { isAuthenticated, merchantId };
};