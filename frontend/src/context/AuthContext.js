import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { AuthService } from '../services/firestoreService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          let prof = await AuthService.getProfile(firebaseUser.uid);
          if (!prof) {
            // If profile not found, create a minimal one from Firebase user
            console.warn('Profile not found, creating minimal profile');
            prof = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              role: 'student', // default role, can be updated later
              createdAt: new Date(),
            };
            // Optionally save it to Firestore
            await AuthService.updateProfile(firebaseUser.uid, prof);
          }
          setProfile(prof);
        } catch (err) {
          console.warn('Profile fetch failed:', err.message);
          // Fallback: create a temporary profile so navigation works
          setProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || 'User',
            role: 'student',
          });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const register = async (email, password, profileData) => {
    return await AuthService.register(email, password, profileData);
  };

  const login = async (email, password) => {
    return await AuthService.login(email, password);
  };

  const logout = async () => {
    await AuthService.logout();
  };

  const updateProfile = async (data) => {
    if (!user) throw new Error('No user');
    await AuthService.updateProfile(user.uid, data);
    setProfile(prev => ({ ...prev, ...data }));
  };

  const value = {
    user,
    profile,
    loading,
    register,
    login,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}