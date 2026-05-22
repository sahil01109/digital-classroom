
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";


const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyApLRzH-BMiRKC6PEy1ubhXK6fnFlaNLZw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "digitalsmartclassroom.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "digitalsmartclassroom",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "digitalsmartclassroom.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "994000199653",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:994000199653:web:953bf711351826f544d90c",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-KB2WJ46CGT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);