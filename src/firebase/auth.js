// src/firebase/auth.js
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from './config';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './config'; // Import db for Firestore operations

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

export { onAuthStateChanged };```

---

### **3. `context/AuthContext.jsx` (Updated)**

This is now the heart of the role system. It will fetch the user's role from Firestore after they log in and provide it to the rest of the application.

```javascript
// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null); // Will hold role data from Firestore
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in, now fetch their role from Firestore.
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setUserData(userDocSnap.data()); // e.g., { email: '...', role: 'merchant' }
        }
        setUser(firebaseUser);
      } else {
        // User is signed out
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // The value now includes both the firebase user and their role data
  const value = { user, userData, loading };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};