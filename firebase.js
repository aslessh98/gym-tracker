// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// YOUR FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyAJ5asDzJczWNgtwK75hvEIeVDL0RC-HM8",
  authDomain: "gym-tracker-3584f.firebaseapp.com",
  projectId: "gym-tracker-3584f",
  storageBucket: "gym-tracker-3584f.firebasestorage.app",
  messagingSenderId: "1028526681982",
  appId: "1:1028526681982:web:fa82ebc92005591b060d2f",
  measurementId: "G-L8PHNYBX84"
};

// Initialize Firebase 
const app = initializeApp(firebaseConfig); 

// Create service instances 
const db = getFirestore(app); 
const auth = getAuth(app); 

// Expose globally so app.js can use them 
window.firebaseApp = app; 
window.db = db; /window.auth = auth; 

console.log("Firebase initialized — window.db and window.auth ready"); 

// Notify app.js that Firebase is ready 
window.dispatchEvent(new Event("firebase-ready"));
