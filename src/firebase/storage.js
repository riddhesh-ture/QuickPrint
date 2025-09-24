import { storage } from './config.js';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Uploads a file to Firebase Storage.
 * @param {File} file The file to upload.
 * @param {string} path The path where the file should be stored.
 * @returns {Promise<string>} A promise that resolves with the download URL of the file.
 */
export const uploadFile = async (file, path) => {
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  return downloadURL;
};