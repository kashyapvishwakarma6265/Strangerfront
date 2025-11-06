'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createUserProfile } from '@/lib/firebaseUtils';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('🔍 Setting up auth state listener...');
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        console.log('👤 onAuthStateChanged fired:', currentUser?.email || 'null');

        try {
          if (currentUser) {
            console.log('✅ User found:', currentUser.email);

            createUserProfile(currentUser.uid, {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName || currentUser.email.split('@')[0],
              photoURL: currentUser.photoURL,
              lastActive: new Date(),
              status: 'online',
            }).catch(err => console.error('Profile update error:', err));

            if (isMounted) {
              console.log('✅ Setting user state:', currentUser.email);
              setUser(currentUser);
              setError(null);
              setLoading(false);
            }
          } else {
            console.log('❌ No user found');
            if (isMounted) {
              setUser(null);
              setLoading(false);
            }
          }
        } catch (err) {
          console.error('❌ Auth state error:', err);
          if (isMounted) {
            setError(err.message);
            setLoading(false);
          }
        }
      },
      (error) => {
        console.error('❌ Auth listener error:', error);
        if (isMounted) {
          setError(error.message);
          setLoading(false);
        }
      }
    );

    return () => {
      console.log('🧹 Cleaning up auth listener');
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const signup = async (email, password, displayName = '') => {
    try {
      setLoading(true);
      setError(null);
      console.log('📝 Starting signup for:', email);

      const result = await createUserWithEmailAndPassword(auth, email, password);
      console.log('✅ User created in Firebase:', result.user.email);

      if (displayName) {
        await updateProfile(result.user, { displayName });
        console.log('✅ Display name updated');
      }

      await createUserProfile(result.user.uid, {
        uid: result.user.uid,
        email: result.user.email,
        displayName: displayName || email.split('@')[0],
        createdAt: new Date(),
        lastActive: new Date(),
        status: 'online',
      });
      console.log('✅ User profile created');

      return result;
    } catch (error) {
      console.error('❌ Signup error:', error);
      const errorMsg = error.code === 'auth/email-already-in-use'
        ? 'This email is already registered'
        : error.code === 'auth/weak-password'
        ? 'Password should be at least 6 characters'
        : error.message;
      setError(errorMsg);
      setLoading(false);
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      console.log('🔐 Starting login for:', email);

      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ User logged in:', result.user.email);

      createUserProfile(result.user.uid, {
        lastActive: new Date(),
        status: 'online',
      }).catch(err => console.error('Profile update error:', err));

      return result;
    } catch (error) {
      console.error('❌ Login error:', error);
      const errorMsg = error.code === 'auth/invalid-credential'
        ? 'Invalid email or password'
        : error.code === 'auth/user-not-found'
        ? 'User not found'
        : error.message;
      setError(errorMsg);
      setLoading(false);
      throw error;
    }
  };

  const googleLogin = async () => {
    try {
      setError(null);
      setLoading(true);

      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      provider.setCustomParameters({ prompt: 'consent' });

      console.log('🔷 Starting Google login with popup...');

      const result = await signInWithPopup(auth, provider);

      console.log('✅ Google login successful:', result.user.email);

      await createUserProfile(result.user.uid, {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        provider: 'google',
        lastActive: new Date(),
        status: 'online',
      });

      console.log('✅ Google user profile created');

    } catch (error) {
      console.error('❌ Google login error:', error.code, error.message);

      if (error.code === 'auth/popup-blocked-by-browser') {
        setError('❌ Google popup was blocked. Allow popups in browser settings.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        setError('You closed the Google popup. Try again.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        setError('Sign in was cancelled. Try again.');
      } else if (error.code === 'auth/operation-not-supported-in-this-environment') {
        setError('❌ Google sign in not available. Check Firebase config.');
      } else {
        setError(error.message || 'Failed to sign in with Google');
      }

      setLoading(false);
    }
  };

  const resetPassword = async (email) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
      console.log('✅ Password reset email sent');
      return true;
    } catch (error) {
      console.error('❌ Reset password error:', error);
      const errorMsg = error.code === 'auth/user-not-found'
        ? 'No account found with this email'
        : error.message;
      setError(errorMsg);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🚪 Logging out...');
      
      if (user) {
        await createUserProfile(user.uid, { status: 'offline' });
      }
      
      await signOut(auth);
      setLoading(false);
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        signup,
        login,
        googleLogin,
        resetPassword,
        logout,
        loading,
        error,
        setError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
// 'use client';

// import { createContext, useContext, useEffect, useState } from 'react';
// import {
//   onAuthStateChanged,
//   signInWithEmailAndPassword,
//   createUserWithEmailAndPassword,
//   signOut,
//   GoogleAuthProvider,
//   signInWithPopup,
//   updateProfile,
//   sendPasswordResetEmail,
// } from 'firebase/auth';
// import { auth } from '@/lib/firebase';
// import { createUserProfile } from '@/lib/firebaseUtils';

// const AuthContext = createContext();

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (!context) {
//     throw new Error('useAuth must be used within an AuthProvider');
//   }
//   return context;
// };

// export const AuthProvider = ({ children }) => {
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     // ✅ ONLY ON CLIENT
//     if (typeof window === 'undefined') {
//       setLoading(false);
//       return;
//     }

//     console.log('🔍 Setting up auth state listener...');
//     let isMounted = true;

//     try {
//       if (!auth) {
//         console.error('❌ Firebase auth not available');
//         setLoading(false);
//         return;
//       }

//       const unsubscribe = onAuthStateChanged(
//         auth,
//         async (currentUser) => {
//           if (!isMounted) return;

//           console.log('👤 Auth state:', currentUser?.email || 'no user');

//           try {
//             if (currentUser) {
//               console.log('✅ User:', currentUser.email);
//               setUser(currentUser);
//               setError(null);

//               // ✅ UPDATE PROFILE ASYNC
//               try {
//                 await createUserProfile(currentUser.uid, {
//                   uid: currentUser.uid,
//                   email: currentUser.email,
//                   displayName: currentUser.displayName || currentUser.email.split('@')[0],
//                   photoURL: currentUser.photoURL,
//                   lastActive: new Date().toISOString(),
//                   status: 'online',
//                 });
//               } catch (profileErr) {
//                 console.warn('⚠️ Profile warning:', profileErr?.message);
//               }
//             } else {
//               console.log('❌ No user');
//               setUser(null);
//             }
//           } catch (err) {
//             console.error('❌ Auth state error:', err?.message);
//             setError(err?.message || 'Auth state error');
//           } finally {
//             if (isMounted) setLoading(false);
//           }
//         },
//         (error) => {
//           console.error('❌ Auth listener error:', error?.message);
//           if (isMounted) {
//             setError(error?.message || 'Auth listener error');
//             setLoading(false);
//           }
//         }
//       );

//       return () => {
//         console.log('🧹 Cleaning up auth listener');
//         isMounted = false;
//         unsubscribe();
//       };
//     } catch (err) {
//       console.error('❌ Setup error:', err);
//       if (isMounted) {
//         setError(err?.message);
//         setLoading(false);
//       }
//     }
//   }, []);

//   const signup = async (email, password, displayName = '') => {
//     try {
//       setLoading(true);
//       setError(null);
//       console.log('📝 Starting signup for:', email);

//       if (!auth) throw new Error('Firebase not initialized');

//       const result = await createUserWithEmailAndPassword(auth, email, password);
//       console.log('✅ User created');

//       if (displayName) {
//         await updateProfile(result.user, { displayName });
//         console.log('✅ Display name updated');
//       }

//       await createUserProfile(result.user.uid, {
//         uid: result.user.uid,
//         email: result.user.email,
//         displayName: displayName || email.split('@')[0],
//         createdAt: new Date().toISOString(),
//         lastActive: new Date().toISOString(),
//         status: 'online',
//       });

//       setLoading(false);
//       return result;
//     } catch (error) {
//       console.error('❌ Signup error:', error?.message);
//       let errorMsg = 'Signup failed';
      
//       if (error?.code === 'auth/email-already-in-use') {
//         errorMsg = 'This email is already registered';
//       } else if (error?.code === 'auth/weak-password') {
//         errorMsg = 'Password should be at least 6 characters';
//       } else if (error?.code === 'auth/invalid-email') {
//         errorMsg = 'Invalid email address';
//       } else if (error?.message) {
//         errorMsg = error.message;
//       }
      
//       setError(errorMsg);
//       setLoading(false);
//       throw error;
//     }
//   };

//   const login = async (email, password) => {
//     try {
//       setLoading(true);
//       setError(null);
//       console.log('🔐 Starting login for:', email);

//       if (!auth) throw new Error('Firebase not initialized');

//       const result = await signInWithEmailAndPassword(auth, email, password);
//       console.log('✅ User logged in');

//       try {
//         await createUserProfile(result.user.uid, {
//           lastActive: new Date().toISOString(),
//           status: 'online',
//         });
//       } catch (err) {
//         console.warn('⚠️ Profile update warning:', err?.message);
//       }

//       setLoading(false);
//       return result;
//     } catch (error) {
//       console.error('❌ Login error:', error?.message);
//       let errorMsg = 'Login failed';
      
//       if (error?.code === 'auth/invalid-credential') {
//         errorMsg = 'Invalid email or password';
//       } else if (error?.code === 'auth/user-not-found') {
//         errorMsg = 'User not found';
//       } else if (error?.code === 'auth/wrong-password') {
//         errorMsg = 'Wrong password';
//       } else if (error?.code === 'auth/invalid-email') {
//         errorMsg = 'Invalid email address';
//       } else if (error?.code === 'auth/too-many-requests') {
//         errorMsg = 'Too many login attempts. Try again later.';
//       } else if (error?.message) {
//         errorMsg = error.message;
//       }
      
//       setError(errorMsg);
//       setLoading(false);
//       throw error;
//     }
//   };

//   const googleLogin = async () => {
//     try {
//       setError(null);
//       setLoading(true);
//       console.log('🔷 Starting Google login...');

//       if (!auth) throw new Error('Firebase not initialized');

//       const provider = new GoogleAuthProvider();
//       provider.addScope('profile');
//       provider.addScope('email');
//       provider.setCustomParameters({ prompt: 'consent' });

//       const result = await signInWithPopup(auth, provider);
//       console.log('✅ Google login successful:', result.user.email);

//       await createUserProfile(result.user.uid, {
//         uid: result.user.uid,
//         email: result.user.email,
//         displayName: result.user.displayName || 'Google User',
//         photoURL: result.user.photoURL,
//         provider: 'google',
//         lastActive: new Date().toISOString(),
//         status: 'online',
//       });

//       console.log('✅ Google user profile created');
//       setLoading(false);
//     } catch (error) {
//       console.error('❌ Google login error:', error?.code, error?.message);
//       let errorMsg = 'Failed to sign in with Google';
      
//       if (error?.code === 'auth/popup-blocked-by-browser') {
//         errorMsg = 'Google popup was blocked. Allow popups in browser settings.';
//       } else if (error?.code === 'auth/popup-closed-by-user') {
//         errorMsg = 'You closed the Google popup. Try again.';
//       } else if (error?.code === 'auth/cancelled-popup-request') {
//         errorMsg = 'Sign in was cancelled. Try again.';
//       } else if (error?.code === 'auth/operation-not-supported-in-this-environment') {
//         errorMsg = 'Google sign in not available. Check Firebase config.';
//       } else if (error?.code === 'auth/account-exists-with-different-credential') {
//         errorMsg = 'An account with this email already exists.';
//       } else if (error?.message) {
//         errorMsg = error.message;
//       }

//       setError(errorMsg);
//       setLoading(false);
//       throw error;
//     }
//   };

//   const resetPassword = async (email) => {
//     try {
//       setError(null);
//       setLoading(true);
//       console.log('📧 Sending password reset email...');
      
//       if (!auth) throw new Error('Firebase not initialized');

//       await sendPasswordResetEmail(auth, email);
//       console.log('✅ Password reset email sent');
      
//       setLoading(false);
//       return true;
//     } catch (error) {
//       console.error('❌ Reset password error:', error?.message);
//       let errorMsg = 'Password reset failed';
      
//       if (error?.code === 'auth/user-not-found') {
//         errorMsg = 'No account found with this email';
//       } else if (error?.code === 'auth/invalid-email') {
//         errorMsg = 'Invalid email address';
//       } else if (error?.message) {
//         errorMsg = error.message;
//       }
      
//       setError(errorMsg);
//       setLoading(false);
//       throw error;
//     }
//   };

//   const logout = async () => {
//     try {
//       setLoading(true);
//       setError(null);
//       console.log('🚪 Logging out...');

//       if (!auth) throw new Error('Firebase not initialized');

//       if (user) {
//         try {
//           await createUserProfile(user.uid, { 
//             status: 'offline',
//             lastActive: new Date().toISOString(),
//           });
//         } catch (err) {
//           console.warn('⚠️ Status update warning:', err?.message);
//         }
//       }

//       await signOut(auth);
//       setUser(null);
//       setError(null);
//       setLoading(false);
//       console.log('✅ Logout successful');
//     } catch (error) {
//       console.error('❌ Logout error:', error?.message);
//       setError(error?.message || 'Logout failed');
//       setLoading(false);
//       throw error;
//     }
//   };

//   const value = {
//     user,
//     signup,
//     login,
//     googleLogin,
//     resetPassword,
//     logout,
//     loading,
//     error,
//     setError,
//   };

//   return (
//     <AuthContext.Provider value={value}>
//       {children}
//     </AuthContext.Provider>
//   );
// };
