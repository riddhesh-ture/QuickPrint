import { initializeApp } from "firebase/app";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBJrAsrM9uG-IASLrhWURMaz5d4gEF44dA",
  authDomain: "quickprint-official.firebaseapp.com",
  projectId: "quickprint-official",
  storageBucket: "quickprint-official.firebasestorage.app",
  messagingSenderId: "876471482977",
  appId: "1:876471482977:web:f65d816bbd8c8ab5a88820",
  measurementId: "G-VT7W8B76G3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export default app;