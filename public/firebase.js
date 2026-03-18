import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

/* 🔹 CONFIG FIREBASE */
const firebaseConfig = {
  apiKey: "AIzaSyCwBuxmHQgaqJAac_WiMZkpZUMFVzONFkA",
  authDomain: "zero-x-siento-stock.firebaseapp.com",
  projectId: "zero-x-siento-stock",
  storageBucket: "zero-x-siento-stock.firebasestorage.app",
  messagingSenderId: "764048708615",
  appId: "1:764048708615:web:1287e135d38a3588b806a2"
};

const app     = initializeApp(firebaseConfig);
const auth    = getAuth(app);
const db      = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
