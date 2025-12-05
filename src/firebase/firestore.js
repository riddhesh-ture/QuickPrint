// src/firebase/firestore.js
import { db } from './config.js';
import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';

export { db };

/**
 * Creates a new print job document in Firestore.
 */
export const createPrintJob = (jobData) => {
  const jobsCollection = collection(db, 'printJobs');
  return addDoc(jobsCollection, {
    ...jobData,
    createdAt: serverTimestamp(),
  });
};

/**
 * Updates a print job with new data.
 */
export const updatePrintJob = (jobId, data) => {
  const jobRef = doc(db, 'printJobs', jobId);
  return updateDoc(jobRef, data);
};

/**
 * Deletes a print job from Firestore.
 */
export const deletePrintJob = (jobId) => {
  const jobRef = doc(db, 'printJobs', jobId);
  return deleteDoc(jobRef);
};