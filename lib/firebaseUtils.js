// import {
//   collection,
//   doc,
//   setDoc,
//   addDoc,
//   serverTimestamp
// } from 'firebase/firestore';
// import { db } from './firebase';

// export const createUserProfile = async (userId, userData) => {
//   if (!userId) {
//     console.warn('⚠️ No userId provided to createUserProfile');
//     return false;
//   }

//   try {
//     const userRef = doc(db, 'users', userId);

//     await setDoc(userRef, {
//       ...userData,
//       updatedAt: serverTimestamp(),
//     }, { merge: true });

//     console.log(`✅ Profile saved for user: ${userId}`);
//     return true;
//   } catch (error) {
//     console.error('❌ Error creating user profile:', error);
//     return false;
//   }
// };

// export const storeMessage = async (roomId, messageData) => {
//   if (!roomId) {
//     console.error('❌ No roomId provided to storeMessage');
//     return null;
//   }

//   try {
//     const messagesRef = collection(db, 'chatRooms', roomId, 'messages');
//     const docRef = await addDoc(messagesRef, {
//       ...messageData,
//       timestamp: serverTimestamp(),
//     });
//     return docRef.id;
//   } catch (error) {
//     console.error('❌ Error storing message:', error);
//     return null;
//   }
// };
'use client';

import { getDbInstance } from './firebase';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

// ✅ CREATE OR UPDATE USER PROFILE
export const createUserProfile = async (userId, data) => {
  try {
    if (!userId) {
      console.warn('⚠️ No userId provided');
      return;
    }

    const db = getDbInstance();
    
    if (!db) {
      console.warn('⚠️ Firestore not initialized');
      return;
    }

    const userRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
      // ✅ UPDATE EXISTING
      await updateDoc(userRef, {
        ...data,
        updatedAt: new Date().toISOString(),
      });
      console.log('✅ Profile updated');
    } else {
      // ✅ CREATE NEW
      await setDoc(userRef, {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      console.log('✅ Profile created');
    }
  } catch (error) {
    console.error('❌ Profile operation error:', error?.message || 'Unknown error');
    throw error;
  }
};

// ✅ GET USER PROFILE
export const getUserProfile = async (userId) => {
  try {
    if (!userId) {
      console.warn('⚠️ No userId provided');
      return null;
    }

    const db = getDbInstance();
    
    if (!db) {
      console.warn('⚠️ Firestore not initialized');
      return null;
    }

    const userRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    console.error('❌ Get profile error:', error?.message || 'Unknown error');
    throw error;
  }
};
