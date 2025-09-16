// src/hooks/useFirestore.js (Renamed from UseFireStore.js for convention)
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

  // Memoize the condition values to prevent useEffect from re-running unnecessarily
  const conditionMemo = useMemo(() => condition ? [condition.fieldName, condition.operator, condition.value] : [], [condition]);

  useEffect(() => {
    let q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));

    // Apply the where clause if the condition is valid
    if (conditionMemo.length === 3) {
      q = query(q, where(conditionMemo[0], conditionMemo[1], conditionMemo[2]));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setDocuments(results);
      setError(null);
    }, (err) => {
      console.error(err);
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
        // Only proceed if we have an ID
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
            console.error(err);
            setError('Failed to fetch the document.');
        });

        return () => unsubscribe();

    }, [collectionName, id]);

    return { document, error };
};