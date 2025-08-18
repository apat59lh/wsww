// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore  } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDN-RbBWHpDZXRAlyB4JYIDYmyEgSZEr2g",
  authDomain: "wsww-cb738.firebaseapp.com",
  projectId: "wsww-cb738",
  storageBucket: "wsww-cb738.firebasestorage.app",
  messagingSenderId: "90649895767",
  appId: "1:90649895767:web:95cb1f3807e32937a35412"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);