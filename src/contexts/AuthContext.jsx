import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut, 
  sendPasswordResetEmail,
  updatePassword 
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        // Fetch role from Firestore with multiple fallbacks
        try {
          // 1. Check primary 'users' collection
          let userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role || 'student');
          } else {
            // 2. Fallback: Check 'lecturers' collection
            const lecturerDoc = await getDoc(doc(db, 'lecturers', user.uid));
            if (lecturerDoc.exists()) {
              setUserRole('staff');
            } else {
              // 3. Fallback: Check 'students' collection
              const studentDoc = await getDoc(doc(db, 'students', user.uid));
              if (studentDoc.exists()) {
                setUserRole('student');
              } else {
                console.warn(`User ${user.uid} not found in any role collection. Defaulting to student.`);
                setUserRole('student');
              }
            }
          }
        } catch (err) {
          console.error('Error fetching user role:', err);
          setUserRole('student');
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const changePassword = (newPassword) => {
    if (currentUser) {
      return updatePassword(currentUser, newPassword);
    }
    return Promise.reject(new Error("No user logged in"));
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setCurrentUser(null);
    setUserRole(null);
  };

  /**
   * Sends a password reset email via Firebase.
   */
  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  /**
   * Initializes or updates a user's record in the 'users' collection.
   * Useful for setting roles (student, staff, admin) or names.
   */
  const setUserData = async (uid, data) => {
    try {
      await setDoc(doc(db, 'users', uid), {
        ...data,
        updatedAt: serverTimestamp()
      }, { merge: true });
      if (uid === currentUser?.uid && data.role) {
        setUserRole(data.role);
      }
    } catch (err) {
      console.error('Error saving user data:', err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, userRole, loading, signOut, resetPassword, setUserData, changePassword }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
