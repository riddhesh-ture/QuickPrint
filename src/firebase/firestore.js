// src/firebase/firestore.js
import { db } from './config.js';
import { getFirestore, collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';

/**
 * Creates a new print job document in Firestore.
 * @param {object} jobData The data for the print job.
 * @returns {Promise<DocumentReference>} A promise that resolves with the new document's reference.
 */
export const createPrintJob = (jobData) => {
  const jobsCollection = collection(db, 'printJobs');
  return addDoc(jobsCollection, {
    ...jobData,
    // Status is now set in the component for more control, but you can default it here
    createdAt: serverTimestamp(),
  });
};

/**
 * Updates a print job with new data.
 * @param {string} jobId The ID of the job to update.
 * @param {object} data The data object with fields to update (e.g., { status: 'completed', cost: 15.50 }).
 * @returns {Promise<void>}
 */
export const updatePrintJob = (jobId, data) => {
  const jobRef = doc(db, 'printJobs', jobId);
  return updateDoc(jobRef, data);
};

/**
 * Deletes a print job from Firestore.
 * @param {string} jobId The ID of the job to delete.
 * @returns {Promise<void>}
 */
export const deletePrintJob = (jobId) => {
  const jobRef = doc(db, 'printJobs', jobId);
  // Note: This does not delete the file from Storage. You'd need a separate function for that.
  return deleteDoc(jobRef);
};

export { db };