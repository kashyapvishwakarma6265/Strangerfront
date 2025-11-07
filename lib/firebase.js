// import { initializeApp } from 'firebase/app';
// import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
// import { getFirestore } from 'firebase/firestore';

// console.log('🔥 Initializing Firebase...');

// const firebaseConfig = {
//   apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
//   authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
//   projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
//   storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
//   appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
// };

// console.log('📝 Firebase Config:', {
//   projectId: firebaseConfig.projectId || '❌ MISSING',
//   authDomain: firebaseConfig.authDomain || '❌ MISSING',
//   apiKey: firebaseConfig.apiKey ? '✅ SET' : '❌ MISSING',
// });

// let app;
// try {
//   app = initializeApp(firebaseConfig);
//   console.log('✅ Firebase app initialized');
// } catch (error) {
//   console.error('❌ Firebase initialization error:', error);
// }

// export const auth = getAuth(app);
// export const db = getFirestore(app);

// // Enable persistence so user stays logged in
// setPersistence(auth, browserLocalPersistence)
//   .then(() => console.log('✅ Persistence enabled'))
//   .catch(error => console.error('❌ Persistence error:', error));

// export default app;
// 'use client';

// import { initializeApp } from 'firebase/app';
// import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
// import { getFirestore } from 'firebase/firestore';

// let app = null;
// let auth = null;
// let db = null;
// let initPromise = null;

// // ✅ ONLY INITIALIZE ON CLIENT
// const initializeFirebase = async () => {
//   // ✅ PREVENT MULTIPLE INITIALIZATIONS
//   if (initPromise) {
//     return initPromise;
//   }

//   if (app) {
//     return { app, auth, db };
//   }

//   // ✅ ONLY ON BROWSER
//   if (typeof window === 'undefined') {
//     console.warn('⚠️ Firebase: Skipping init on server');
//     return { app: null, auth: null, db: null };
//   }

//   initPromise = (async () => {
//     try {
//       const firebaseConfig = {
//         apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
//         authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
//         projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
//         storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
//         messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
//         appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
//       };

//       // ✅ VALIDATE CONFIG
//       if (!firebaseConfig.apiKey) {
//         console.error('❌ Firebase API key missing');
//         return { app: null, auth: null, db: null };
//       }

//       console.log('🔥 Initializing Firebase...');
//       app = initializeApp(firebaseConfig);
//       auth = getAuth(app);
//       db = getFirestore(app);

//       // ✅ ENABLE PERSISTENCE
//       try {
//         await setPersistence(auth, browserLocalPersistence);
//         console.log('✅ Firebase persistence enabled');
//       } catch (persistError) {
//         console.warn('⚠️ Persistence warning:', persistError?.message || 'Unknown error');
//       }

//       console.log('✅ Firebase initialized successfully');
//       return { app, auth, db };
//     } catch (error) {
//       console.error('❌ Firebase initialization error:', error?.message || 'Unknown error');
//       return { app: null, auth: null, db: null };
//     }
//   })();

//   return initPromise;
// };

// // ✅ GET AUTH INSTANCE
// export const getAuthInstance = async () => {
//   const { auth: firebaseAuth } = await initializeFirebase();
//   return firebaseAuth;
// };

// // ✅ GET DB INSTANCE
// export const getDbInstance = async () => {
//   const { db: firebaseDb } = await initializeFirebase();
//   return firebaseDb;
// };

// // ✅ LEGACY EXPORTS (SYNC - for backward compatibility)
// export let authInstance = null;
// export let dbInstance = null;

// // ✅ INITIALIZE WHEN ACCESSED
// if (typeof window !== 'undefined') {
//   initializeFirebase().then(({ auth: firebaseAuth, db: firebaseDb }) => {
//     authInstance = firebaseAuth;
//     dbInstance = firebaseDb;
//   });
// }

// export default app;
'use client';

import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ✅ VALIDATE ENVIRONMENT
var firebaseConfig = {
  apiKey: "AIzaSyBoP9F82lZNJ_bIkkAWAhJwuOgYlS4JaFg",
  authDomain: "stranger-chat-74b46.firebaseapp.com",
  projectId: "stranger-chat-74b46",
  storageBucket: "stranger-chat-74b46.appspot.com",
  messagingSenderId: "75423958257",
  appId: "1:75423958257:web:c266a6120883cdaf69d550",
  measurementId: "G-00ZL9X1NHH",
};

console.log('🔥 Firebase Config Check:');
console.log('  ✅ apiKey:', firebaseConfig.apiKey ? '✅ SET' : '❌ MISSING');
console.log('  ✅ authDomain:', firebaseConfig.authDomain ? '✅ SET' : '❌ MISSING');
console.log('  ✅ projectId:', firebaseConfig.projectId ? '✅ SET' : '❌ MISSING');
console.log('  ✅ storageBucket:', firebaseConfig.storageBucket ? '✅ SET' : '❌ MISSING');
console.log('  ✅ messagingSenderId:', firebaseConfig.messagingSenderId ? '✅ SET' : '❌ MISSING');
console.log('  ✅ appId:', firebaseConfig.appId ? '✅ SET' : '❌ MISSING');

// ✅ VALIDATE ALL REQUIRED FIELDS
const isConfigValid = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

if (!isConfigValid) {
  console.error('❌ Firebase config incomplete! Check environment variables.');
}

// ✅ INITIALIZE FIREBASE
let app = null;
let auth = null;
let db = null;

try {
  console.log('🚀 Initializing Firebase...');
  app = initializeApp(firebaseConfig);
  console.log('✅ Firebase app initialized');

  // ✅ GET AUTH INSTANCE
  auth = getAuth(app);
  console.log('✅ Firebase Auth initialized');

  // ✅ GET FIRESTORE INSTANCE
  db = getFirestore(app);
  console.log('✅ Firebase Firestore initialized');

  // ✅ ENABLE PERSISTENCE
  setPersistence(auth, browserLocalPersistence)
    .then(() => {
      console.log('✅ Firebase persistence enabled - users stay logged in');
    })
    .catch((err) => {
      console.warn('⚠️ Persistence warning:', err.message);
    });

  console.log('✅ Firebase fully initialized and ready to use!');
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
  console.error('Error details:', error);
}

// ✅ EXPORT INSTANCES
export { auth, db, app };

// ✅ EXPORT GETTER FUNCTIONS (for firebaseUtils.js compatibility)
export const getAuthInstance = () => {
  if (!auth) {
    console.warn('⚠️ Auth not initialized');
  }
  return auth;
};

export const getDbInstance = () => {
  if (!db) {
    console.warn('⚠️ Firestore not initialized');
  }
  return db;
};

// ✅ CHECK IF INITIALIZED
export const isFirebaseReady = () => {
  return !!(app && auth && db);
};
