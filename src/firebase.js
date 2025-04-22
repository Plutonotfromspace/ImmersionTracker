// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  getFirestore, 
  enableIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED 
} from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAOTamzK8OKB-MrugqjS3BNLS-EGZGB4t8",
  authDomain: "immersiontracker-d7565.firebaseapp.com",
  projectId: "immersiontracker-d7565",
  storageBucket: "immersiontracker-d7565.appspot.com", // Fixed storage bucket URL
  messagingSenderId: "154293994114",
  appId: "1:154293994114:web:cd8a075283f602e33cea9b",
  measurementId: "G-VLCNTBNEZE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics (only if not in localhost)
let analytics = null;
if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
  analytics = getAnalytics(app);
}

// Export auth and database objects
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline persistence if in a browser environment
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db)
    .then(() => {
      console.log("Firestore persistence enabled successfully");
    })
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn("Multiple tabs open, persistence can only be enabled in one tab at a time");
      } else if (err.code === 'unimplemented') {
        console.warn("The current browser does not support all of the features required for Firestore persistence");
      } else {
        console.error("Error enabling persistence:", err);
      }
    });
}

export default app;