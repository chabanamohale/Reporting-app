import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAVt7usHXdqH7jD2vElTYpji-a_YVhk_GI",
  authDomain: "luct-repoting-system.firebaseapp.com",
  projectId: "luct-repoting-system",
  storageBucket: "luct-repoting-system.firebasestorage.app",
  messagingSenderId: "13143656466",
  appId: "1:13143656466:web:d6bed4f4f00619168ab0cb",
  measurementId: "G-N8Y36ZR495"
};

const app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();
export const auth = firebase.auth();
export const db = firebase.firestore();

// authReady – resolves when Firebase Auth is fully initialised
export const authReady = new Promise((resolve) => {
  const unsubscribe = auth.onAuthStateChanged((user) => {
    unsubscribe();
    resolve(user);
  });
});

export default app;