// src/firebase.js
// Replace these values with your Firebase project config
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDymahr1CYeQnCNhFRPqGm-pexD0stg_fE",
  authDomain: "jcommerce-64ff7.firebaseapp.com",
  projectId: "jcommerce-64ff7",
  storageBucket: "jcommerce-64ff7.firebasestorage.app",
  messagingSenderId: "125201304945",
  appId: "1:125201304945:web:caa4d52448a32ab8e83ad0"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
