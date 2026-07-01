import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "adk-crash-cou-codelab.firebaseapp.com",
  projectId: "adk-crash-cou-codelab",
  storageBucket: "adk-crash-cou-codelab.firebasestorage.app",
  messagingSenderId: "768397641893",
  appId: "1:768397641893:web:42c6955819241019ec654c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID if specified in config
const db = getFirestore(app, "ai-studio-b6768522-2913-43de-8877-d5b9de7929c4");

const auth = getAuth(app);

export { app, auth, db };
