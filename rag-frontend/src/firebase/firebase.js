import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC_0gsL5LVVfuUPCToWP0jPeSX3ysZ6Adk",
  authDomain: "localai-e15cb.firebaseapp.com",
  projectId: "localai-e15cb",
  storageBucket: "localai-e15cb.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);