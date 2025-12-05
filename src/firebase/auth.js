// src/firebase/auth.js
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, db } from './config';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// --- Helper function to get user role data ---
export const getUserData = async (uid) => {
  if (!uid) return null;
  const userDocRef = doc(db, "users", uid);
  const userDocSnap = await getDoc(userDocRef);
  return userDocSnap.exists() ? userDocSnap.data() : null;
};

// --- User Authentication ---
export const signUpUser = async (email, password) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  // After signup, create a role document for them in Firestore
  await setDoc(doc(db, "users", userCredential.user.uid), {
    email: userCredential.user.email,
    role: "user"
  });
  return userCredential;
};

export const signInUser = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

// --- Merchant Authentication ---
export const signUpMerchant = async (email, password) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  // After signup, create a role document for them in Firestore
  await setDoc(doc(db, "users", userCredential.user.uid), {
    email: userCredential.user.email,
    role: "merchant"
  });
  return userCredential;
};

export const signInMerchant = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

// --- General Sign Out ---
export const signOutUser = () => {
  return signOut(auth);
};

export { onAuthStateChanged };

/**
 * Sign up a new user with email and password
 */
export const signUpWithEmail = (email, password) => {
  return createUserWithEmailAndPassword(auth, email, password);
};