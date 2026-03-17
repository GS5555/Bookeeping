import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC39sn0GAD4gvMyHF04aS0jsS59akKwGPs",
  authDomain: "cricket-store-manager.firebaseapp.com",
  projectId: "cricket-store-manager",
  storageBucket: "cricket-store-manager.appspot.com",
  messagingSenderId: "947479096543",
  appId: "1:947479096543:web:96eef05ea1f8bd43bc0d6a"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
