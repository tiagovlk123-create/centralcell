import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDrGjTuwoHLXLl5-82jfz8VIOBarXdP4Og",
  authDomain: "centralcell.firebaseapp.com",
  projectId: "centralcell",
  storageBucket: "centralcell.firebasestorage.app",
  messagingSenderId: "1063906083961",
  appId: "1:1063906083961:web:4101808e3c998fe62240a8"
};

const app = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();

export const db = getFirestore(app);