import {
  collection,
  doc,
  setDoc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

export const createUserProfile = async (userId, userData) => {
  if (!userId) {
    console.warn('⚠️ No userId provided to createUserProfile');
    return false;
  }

  try {
    const userRef = doc(db, 'users', userId);

    await setDoc(userRef, {
      ...userData,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    console.log(`✅ Profile saved for user: ${userId}`);
    return true;
  } catch (error) {
    console.error('❌ Error creating user profile:', error);
    return false;
  }
};

export const storeMessage = async (roomId, messageData) => {
  if (!roomId) {
    console.error('❌ No roomId provided to storeMessage');
    return null;
  }

  try {
    const messagesRef = collection(db, 'chatRooms', roomId, 'messages');
    const docRef = await addDoc(messagesRef, {
      ...messageData,
      timestamp: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('❌ Error storing message:', error);
    return null;
  }
};
