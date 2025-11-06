import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

console.log('🔥 Initializing Firebase...');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log('📝 Firebase Config:', {
  projectId: firebaseConfig.projectId || '❌ MISSING',
  authDomain: firebaseConfig.authDomain || '❌ MISSING',
  apiKey: firebaseConfig.apiKey ? '✅ SET' : '❌ MISSING',
});

let app;
try {
  app = initializeApp(firebaseConfig);
  console.log('✅ Firebase app initialized');
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
}

export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable persistence so user stays logged in
setPersistence(auth, browserLocalPersistence)
  .then(() => console.log('✅ Persistence enabled'))
  .catch(error => console.error('❌ Persistence error:', error));

export default app;
