// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, remove, query, orderByKey, startAt, endAt } from 'firebase/database';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// Firebase configuration
// TODO: Replace with your Firebase project credentials
const firebaseConfig = {
  apiKey: "AIzaSyCGCqZFMMIRiicol2_QbyHT3pn7xy_ALSo",
  authDomain: "argumentor-ff17a.firebaseapp.com",
  databaseURL: "https://argumentor-ff17a-default-rtdb.firebaseio.com",
  projectId: "argumentor-ff17a",
  storageBucket: "argumentor-ff17a.firebasestorage.app",
  messagingSenderId: "347151341699",
  appId: "1:347151341699:web:ff8c814095b0c7a7ae63b6",
  measurementId: "G-WKW6WBZKYJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// Auto sign-in anonymously
let currentUser = null;
signInAnonymously(auth).catch(error => {
  console.error('Anonymous auth error:', error);
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    console.log('✅ Firebase authenticated:', user.uid);
  }
});

// Storage API compatible with Claude's storage interface
export const storage = {
  async get(key, shared = false) {
    try {
      const dbRef = ref(database, key);
      const snapshot = await get(dbRef);
      
      if (snapshot.exists()) {
        return snapshot.val();
      }
      return null;
    } catch (error) {
      console.error('Storage get error:', error);
      throw error;
    }
  },
  
  async set(key, value, shared = false) {
    try {
      const dbRef = ref(database, key);
      await set(dbRef, value);
      return { key, value, shared };
    } catch (error) {
      console.error('Storage set error:', error);
      throw error;
    }
  },
  
  async delete(key, shared = false) {
    try {
      const dbRef = ref(database, key);
      await remove(dbRef);
      return { key, deleted: true, shared };
    } catch (error) {
      console.error('Storage delete error:', error);
      throw error;
    }
  },
  
  async list(prefix = '', shared = false) {
    try {
      const dbRef = ref(database);
      const snapshot = await get(query(
        dbRef,
        orderByKey(),
        startAt(prefix),
        endAt(prefix + '\uf8ff')
      ));
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        return { keys: Object.keys(data), prefix, shared };
      }
      return { keys: [], prefix, shared };
    } catch (error) {
      console.error('Storage list error:', error);
      throw error;
    }
  }
};

export { auth, database };
