import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAy8R6zibVCkuxBMjfCiSTF15fkKUU1b4g",
    authDomain: "math-master-p2.firebaseapp.com",
    projectId: "math-master-p2",
    storageBucket: "math-master-p2.firebasestorage.app",
    messagingSenderId: "1025712699946",
    appId: "1:1025712699946:web:afa0559d8963a67daf6153"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Enable Persistent Caching
enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn("Firestore persistence: Multiple tabs open, persistence enabled in only one.");
    } else if (err.code == 'unimplemented') {
        console.warn("Firestore persistence: Browser doesn't support persistence.");
    }
});

export { collection, addDoc, getDoc, setDoc, doc, getDocs, query, orderBy, limit, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
