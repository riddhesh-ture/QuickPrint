// src/firebase/auth.js

// Simulate a successful login
export const signInMerchant = async (email, password) => {
  return new Promise((resolve, reject) => {
    console.log('signInMerchant called with:', { email, password });
    if (email && password) { // Basic validation: ensures fields are not empty
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('merchantId', 'merchant-abc'); // Store a mock merchant ID for now
      console.log('Login successful! isAuthenticated set, merchantId set to "merchant-abc"');
      resolve({ user: { uid: 'mock-merchant-uid-1', email: email } });
    } else {
      console.error('Login failed: Invalid credentials (empty email/password)');
      reject(new Error('Invalid credentials. Please enter both email and password.'));
    }
  });
};

// Simulate a successful signup
export const signUpMerchant = async (email, password) => {
  return new Promise((resolve, reject) => {
    console.log('signUpMerchant called with:', { email, password });
    if (email && password && password.length >= 6) { // Basic validation
      // In a real app, you'd save this user to Firebase Auth and potentially Firestore.
      // For simulation, we just resolve success.
      console.log('Signup successful for:', email);
      resolve({ user: { uid: 'new-mock-merchant-uid-2', email: email } });
    } else {
      console.error('Signup failed: Invalid email or password (must be >= 6 chars)');
      reject(new Error('Email and password are required, and password must be at least 6 characters.'));
    }
  });
};

// Simulate logging out
export const signOutMerchant = async () => {
  return new Promise((resolve) => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('merchantId');
    console.log('User logged out. localStorage cleared.');
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