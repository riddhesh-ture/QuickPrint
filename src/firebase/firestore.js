import app from './config.js';
import { getFirestore, collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';

const db = getFirestore(app);

/**
 * Creates a new print job document in Firestore.
 * @param {object} jobData The data for the print job.
 * @returns {Promise<void>}
 */
export const createPrintJob = (jobData) => {
  const jobsCollection = collection(db, 'printJobs');
  return addDoc(jobsCollection, {
    ...jobData,
    status: 'pending', // Initial status
    createdAt: serverTimestamp(),
  });
};

/**
 * Updates the status of a print job.
 * @param {string} jobId The ID of the job to update.
 * @param {string} status The new status (e.g., 'completed', 'cancelled').
 * @returns {Promise<void>}
 */
export const updateJobStatus = (jobId, status) => {
  const jobRef = doc(db, 'printJobs', jobId);
  return updateDoc(jobRef, { status });
};

/**
 * Deletes a print job from Firestore.
 * @param {string} jobId The ID of the job to delete.
 * @returns {Promise<void>}
 */
export const deletePrintJob = (jobId) => {
  const jobRef = doc(db, 'printJobs', jobId);
  return deleteDoc(jobRef);
};

export { db };