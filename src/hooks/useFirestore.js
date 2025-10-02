// src/hooks/useFirestore.js
import { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase/firestore';
import { collection, query, where, onSnapshot, orderBy, doc } from 'firebase/firestore';

/**
 * Hook to listen to a collection in real-time.
 * @param {string} collectionName The name of the collection.
 * @param {object} condition An object with { fieldName, operator, value } for the where clause.
 */
export const useCollection = (collectionName, condition) => {
  const [documents, setDocuments] = useState(null);
  const [error, setError] = useState(null);

  const conditionMemo = useMemo(() => (condition ? [condition.fieldName, condition.operator, condition.value] : []), [condition]);

  useEffect(() => {
    let q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));

    if (conditionMemo.length === 3) {
      // --- CRITICAL FIX HERE ---
      // Do not run the query if the value to filter by is null or undefined.
      // This prevents the "400 Bad Request" error when the merchantId is still loading.
      if (!conditionMemo[2]) {
        setDocuments([]); // Return an empty array to prevent errors, not null
        return;
      }
      q = query(q, where(conditionMemo[0], conditionMemo[1], conditionMemo[2]));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setDocuments(results);
      setError(null);
    }, (err) => {
      console.error("Error in snapshot listener:", err);
      setError('Could not fetch data from the collection.');
    });

    return () => unsubscribe();

  }, [collectionName, conditionMemo]);

  return { documents, error };
};

/**
 * Hook to listen to a single document in real-time.
 * @param {string} collectionName The name of the collection.
 * @param {string} id The ID of the document to listen to.
 */
export const useDocument = (collectionName, id) => {
    const [document, setDocument] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!id) {
            setDocument(null);
            return;
        }

        const docRef = doc(db, collectionName, id);

        const unsubscribe = onSnapshot(docRef, (doc) => {
            if (doc.exists()) {
                setDocument({ ...doc.data(), id: doc.id });
                setError(null);
            } else {
                setError('Document does not exist.');
            }
        }, (err) => {
            console.error("Error in document snapshot listener:", err);
            setError('Failed to fetch the document.');
        });

        return () => unsubscribe();

    }, [collectionName, id]);

    return { document, error };
};