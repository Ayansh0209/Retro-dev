// media/utils/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: 'AIzaSyAVZSxeZlP00Lhu5M5m5nRONdTLEyHo0kA',
  authDomain: 'githwhiz.firebaseapp.com',
  projectId: 'githwhiz',
  storageBucket: "githwhiz.firebasestorage.app",
  messagingSenderId: "32453620375",
  appId: "1:32453620375:web:6a9c5b1cece06c61976fd2",
 
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export {  auth, signInWithEmailAndPassword, createUserWithEmailAndPassword };
