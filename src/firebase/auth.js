// src/firebase/auth.js

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged, // Keep this for the export below
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

// This is the function that AuthContext will now use directly
export { onAuthStateChanged };