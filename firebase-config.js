import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import { getAuth } from
  "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import { getFirestore } from
  "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { getStorage } from
  "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";


const firebaseConfig = {
  apiKey: "AIzaSyDNEAuCOWSbjtCXp00nN_8CnNCH0uBRH1g",
  authDomain: "eb-marketiza.firebaseapp.com",
  projectId: "eb-marketiza",
  storageBucket: "eb-marketiza.firebasestorage.app",
  messagingSenderId: "1081828417462",
  appId: "1:1081828417462:web:1447a6f0b6fb4ed1b0eb17",
  measurementId: "G-YH1VY3Y8VQ"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

const storage = getStorage(app);


export {
  app,
  auth,
  db,
  storage
};
