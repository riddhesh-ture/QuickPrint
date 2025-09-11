import { useState, useEffect } from 'react';
import { db } from '../firebase/firestore';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

export const useCollection = (collectionName, condition) => {
  const [documents, setDocuments] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));

    if (condition) {
      q = query(q, where(condition.fieldName, condition.operator, condition.value));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = [];
      snapshot.forEach(doc => {
        results.push({ ...doc.data(), id: doc.id });
      });
      setDocuments(results);
      setError(null);
    }, (err) => {
      console.error(err);
      setError('Could not fetch data');
    });

    // Cleanup function
    return () => unsubscribe();

  }, [collectionName, condition]);

  return { documents, error };
};