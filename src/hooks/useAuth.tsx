import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  updateProfile 
} from 'firebase/auth';
import { doc, getDoc, setDoc, arrayUnion } from 'firebase/firestore';
import { auth, db, googleProvider, stripUndefined } from '../lib/firebase/config';
import { UserProfile } from '../types';
import { getFriendlyErrorMessage } from '../lib/firebase/errors';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateCurrentHouseholdId: (householdId: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync user profile document in Firestore
  const syncUserProfile = async (firebaseUser: User) => {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        setUserProfile(data);
        const resolvedHh = data.currentHouseholdId || (data.householdIds && data.householdIds[0]);
        if (resolvedHh) {
          localStorage.setItem('sonha_active_household', resolvedHh);
        }
      } else {
        const localActive = localStorage.getItem('sonha_active_household') || undefined;
        const newProfile: UserProfile = stripUndefined({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Thành viên',
          photoURL: firebaseUser.photoURL || null,
          currentHouseholdId: localActive || null,
          householdIds: localActive ? [localActive] : [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        await setDoc(userRef, newProfile);
        setUserProfile(newProfile);
      }
    } catch (err) {
      console.warn('Could not sync user profile to cloud (possibly offline):', err);
      // Fallback local profile for offline experience
      setUserProfile({
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || 'Thành viên',
        createdAt: new Date().toISOString(),
        currentHouseholdId: localStorage.getItem('sonha_active_household') || undefined,
      });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await syncUserProfile(currentUser);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
      throw err;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
      throw err;
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      if (cred.user) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
      throw err;
    }
  };

  const logout = async () => {
    try {
      await fbSignOut(auth);
      setUser(null);
      setUserProfile(null);
      localStorage.removeItem('sonha_active_household');
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    }
  };

  const updateCurrentHouseholdId = async (householdId: string) => {
    localStorage.setItem('sonha_active_household', householdId);
    setUserProfile(prev => {
      if (!prev) return null;
      const currentList = prev.householdIds || [];
      const updatedList = currentList.includes(householdId) ? currentList : [...currentList, householdId];
      return { ...prev, currentHouseholdId: householdId, householdIds: updatedList };
    });

    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, { 
          uid: user.uid,
          currentHouseholdId: householdId, 
          householdIds: arrayUnion(householdId),
          updatedAt: new Date().toISOString() 
        }, { merge: true });
      } catch (err) {
        console.warn('Saved household ID locally (offline):', err);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        error,
        signInWithGoogle,
        loginWithEmail,
        registerWithEmail,
        logout,
        updateCurrentHouseholdId,
        clearError: () => setError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
