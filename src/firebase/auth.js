// src/firebase/auth.js
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from './config';

// --- User Authentication ---
export const signUpUser = (email, password) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const signInUser = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const signOutUser = () => {
  return signOut(auth);
};

// --- Merchant Authentication (can be the same, but named for clarity) ---
export const signUpMerchant = (email, password) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const signInMerchant = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const signOutMerchant = () => {
  return signOut(auth);
};

// This is the function that AuthContext uses
export { onAuthStateChanged };