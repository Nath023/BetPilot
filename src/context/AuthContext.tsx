import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { UserProfile, UserPreferences, Currency } from '../../shared/types/index.ts';
import { storage } from '../services/storage.ts';
import {
  authService,
  firestoreService,
  isFirebaseConfigured,
  getFirebaseError,
} from '../services/firebase.ts';

export type CloudSyncStatus = 'connected' | 'offline_fallback' | 'syncing' | 'error';

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: User | null;
  isCloudSyncActive: boolean;
  cloudSyncStatus: CloudSyncStatus;
  cloudSyncMessage: string | null;
  preferences: UserPreferences;
  updatePreferences: (newPrefs: Partial<UserPreferences>) => void;
  currency: Currency;
  currencySymbol: string;
  formatMoney: (amount: number) => string;
  sessionMinutes: number;
  signInWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshCloudSync: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(() => storage.getUserProfile());
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>(() => storage.getUserPreferences());
  const [sessionMinutes, setSessionMinutes] = useState<number>(0);

  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>(() =>
    isFirebaseConfigured() ? 'offline_fallback' : 'offline_fallback'
  );
  const [cloudSyncMessage, setCloudSyncMessage] = useState<string | null>(() =>
    isFirebaseConfigured() ? null : 'Running in offline localStorage mode'
  );

  // Session timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionMinutes((prev) => prev + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setCloudSyncStatus('offline_fallback');
      setCloudSyncMessage('Firebase not configured. Running in offline localStorage mode.');
      return;
    }

    const unsubscribe = authService.onAuthStateChanged(async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        setCloudSyncStatus('syncing');
        setCloudSyncMessage('Synchronizing workspace with Cloud Firestore...');

        // Update local user profile identity with Firebase info
        const updatedProfile: UserProfile = {
          ...user,
          id: fbUser.uid,
          email: fbUser.email || user.email,
          displayName: fbUser.displayName || user.displayName || fbUser.email?.split('@')[0] || 'User',
        };
        setUser(updatedProfile);
        storage.saveUserProfile(updatedProfile);

        // Run safe cloud migration and duplicate-preventing merge
        try {
          const localTickets = storage.getTickets();
          const { syncedTickets, error } = await firestoreService.syncAndMigrateLocalData(
            fbUser.uid,
            localTickets
          );

          if (error) {
            setCloudSyncStatus('error');
            setCloudSyncMessage(error);
          } else {
            storage.saveTickets(syncedTickets);
            setCloudSyncStatus('connected');
            setCloudSyncMessage('Cloud sync active');
          }
        } catch (e: any) {
          setCloudSyncStatus('error');
          setCloudSyncMessage('Cloud sync is temporarily unavailable. Your local workspace is still active.');
        }
      } else {
        setCloudSyncStatus('offline_fallback');
        setCloudSyncMessage('Signed out. Local workspace active.');
      }
    });

    return () => unsubscribe();
  }, []);

  const refreshCloudSync = async () => {
    if (!firebaseUser) return;
    setCloudSyncStatus('syncing');
    try {
      const localTickets = storage.getTickets();
      const { syncedTickets, error } = await firestoreService.syncAndMigrateLocalData(
        firebaseUser.uid,
        localTickets
      );
      if (error) {
        setCloudSyncStatus('error');
        setCloudSyncMessage(error);
      } else {
        storage.saveTickets(syncedTickets);
        setCloudSyncStatus('connected');
        setCloudSyncMessage('Cloud sync active');
      }
    } catch (e: any) {
      setCloudSyncStatus('error');
      setCloudSyncMessage('Cloud sync is temporarily unavailable. Your local workspace is still active.');
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    const res = await authService.signIn(email, pass);
    if (res.user) {
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    const res = await authService.signUp(email, pass);
    if (res.user) {
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const signInWithGoogle = async () => {
    const res = await authService.signInWithGoogle();
    if (res.user) {
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const signOut = async () => {
    await authService.signOut();
    setFirebaseUser(null);
    setCloudSyncStatus('offline_fallback');
    setCloudSyncMessage('Signed out. Local workspace active.');
  };

  const updatePreferences = (newPrefs: Partial<UserPreferences>) => {
    const updated = { ...preferences, ...newPrefs };
    setPreferences(updated);
    storage.saveUserPreferences(updated);
    if (user) {
      const updatedUser = { ...user, preferences: updated };
      setUser(updatedUser);
      storage.saveUserProfile(updatedUser);
    }
  };

  const currencySymbol =
    preferences.currency === 'USD'
      ? '$'
      : preferences.currency === 'GBP'
      ? '£'
      : preferences.currency === 'EUR'
      ? '€'
      : '₦';

  const formatMoney = (amount: number): string => {
    const safe = isNaN(amount) ? 0 : amount;
    return `${currencySymbol}${safe.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isCloudSyncActive: cloudSyncStatus === 'connected',
        cloudSyncStatus,
        cloudSyncMessage,
        preferences,
        updatePreferences,
        currency: preferences.currency,
        currencySymbol,
        formatMoney,
        sessionMinutes,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
        refreshCloudSync,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
