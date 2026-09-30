import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  Auth,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  Firestore,
} from 'firebase/firestore';
import {
  Ticket,
  DailyRolloverChallenge,
  DailyRolloverDay,
  PredictionSnapshot,
} from '../../shared/types/index.ts';

export interface FirebaseConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

// Read configuration from Vite environment variables
export const getEnvFirebaseConfig = (): FirebaseConfig => {
  return {
    apiKey: typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_API_KEY : undefined,
    authDomain: typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_AUTH_DOMAIN : undefined,
    projectId: typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_PROJECT_ID : undefined,
    storageBucket: typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_STORAGE_BUCKET : undefined,
    messagingSenderId: typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID : undefined,
    appId: typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_APP_ID : undefined,
  };
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let initError: string | null = null;

export const initFirebase = (customConfig?: FirebaseConfig): { isReady: boolean; error: string | null } => {
  const config = customConfig || getEnvFirebaseConfig();

  if (!config.projectId || !config.apiKey) {
    initError = 'Firebase credentials not configured. Running in offline localStorage mode.';
    return { isReady: false, error: initError };
  }

  try {
    app = getApps().length === 0 ? initializeApp(config as Record<string, string>) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
    initError = null;
    return { isReady: true, error: null };
  } catch (err: any) {
    initError = err?.message || 'Failed to initialize Firebase';
    console.warn('Firebase initialization skipped/failed:', initError);
    return { isReady: false, error: initError };
  }
};

// Auto-initialize on module load if environment variables are present
initFirebase();

export const isFirebaseConfigured = (): boolean => {
  return db !== null && auth !== null;
};

export const getFirebaseError = (): string | null => {
  return initError;
};

/**
 * Authentication Services
 */
export const authService = {
  getAuthInstance(): Auth | null {
    return auth;
  },

  getCurrentUser(): User | null {
    return auth ? auth.currentUser : null;
  },

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    if (!auth) {
      callback(null);
      return () => {};
    }
    return onAuthStateChanged(auth, callback);
  },

  async signUp(email: string, pass: string): Promise<{ user: User | null; error?: string }> {
    if (!auth) {
      return { user: null, error: 'Firebase Auth is not configured. Running offline.' };
    }
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      return { user: res.user };
    } catch (e: any) {
      return { user: null, error: e?.message || 'Failed to sign up' };
    }
  },

  async signIn(email: string, pass: string): Promise<{ user: User | null; error?: string }> {
    if (!auth) {
      return { user: null, error: 'Firebase Auth is not configured. Running offline.' };
    }
    try {
      const res = await signInWithEmailAndPassword(auth, email, pass);
      return { user: res.user };
    } catch (e: any) {
      return { user: null, error: e?.message || 'Invalid email or password' };
    }
  },

  async signInWithGoogle(): Promise<{ user: User | null; error?: string }> {
    if (!auth) {
      return { user: null, error: 'Firebase Auth is not configured. Running offline.' };
    }
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      return { user: res.user };
    } catch (e: any) {
      return { user: null, error: e?.message || 'Google sign-in canceled or unavailable' };
    }
  },

  async signOut(): Promise<{ success: boolean; error?: string }> {
    if (!auth) return { success: true };
    try {
      await fbSignOut(auth);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Sign out failed' };
    }
  },
};

/**
 * Firestore Persistence Services (Isolated by user UID)
 */
export const firestoreService = {
  // --- TICKETS ---
  async saveTicket(userId: string, ticket: Ticket): Promise<boolean> {
    if (!db || !userId) return false;
    try {
      const ticketRef = doc(db, 'users', userId, 'tickets', ticket.id);
      await setDoc(ticketRef, ticket, { merge: true });
      return true;
    } catch (e) {
      console.warn('Firestore ticket sync failed:', e);
      return false;
    }
  },

  async loadTickets(userId: string): Promise<Ticket[]> {
    if (!db || !userId) return [];
    try {
      const colRef = collection(db, 'users', userId, 'tickets');
      const snap = await getDocs(colRef);
      return snap.docs.map((d) => d.data() as Ticket);
    } catch (e) {
      console.warn('Firestore tickets load failed:', e);
      return [];
    }
  },

  async deleteTicket(userId: string, ticketId: string): Promise<boolean> {
    if (!db || !userId) return false;
    try {
      const ticketRef = doc(db, 'users', userId, 'tickets', ticketId);
      await deleteDoc(ticketRef);
      return true;
    } catch (e) {
      console.warn('Firestore ticket deletion failed:', e);
      return false;
    }
  },

  // --- PREDICTIONS & CALIBRATION SNAPSHOTS ---
  async savePrediction(userId: string, prediction: PredictionSnapshot): Promise<boolean> {
    if (!db || !userId) return false;
    try {
      const predRef = doc(db, 'users', userId, 'predictions', prediction.id);
      await setDoc(predRef, prediction, { merge: true });
      return true;
    } catch (e) {
      console.warn('Firestore prediction sync failed:', e);
      return false;
    }
  },

  async loadPredictions(userId: string): Promise<PredictionSnapshot[]> {
    if (!db || !userId) return [];
    try {
      const colRef = collection(db, 'users', userId, 'predictions');
      const snap = await getDocs(colRef);
      return snap.docs.map((d) => d.data() as PredictionSnapshot);
    } catch (e) {
      console.warn('Firestore predictions load failed:', e);
      return [];
    }
  },

  // --- ROLLOVER CHALLENGE & PROGRESSION ---
  async saveRolloverChallenge(userId: string, challenge: DailyRolloverChallenge): Promise<boolean> {
    if (!db || !userId) return false;
    try {
      const docRef = doc(db, 'users', userId, 'rollovers', challenge.id);
      await setDoc(docRef, challenge, { merge: true });
      return true;
    } catch (e) {
      console.warn('Firestore rollover sync failed:', e);
      return false;
    }
  },

  async loadRolloverChallenge(userId: string, challengeId: string): Promise<DailyRolloverChallenge | null> {
    if (!db || !userId) return null;
    try {
      const docRef = doc(db, 'users', userId, 'rollovers', challengeId);
      const snap = await getDoc(docRef);
      return snap.exists() ? (snap.data() as DailyRolloverChallenge) : null;
    } catch (e) {
      console.warn('Firestore rollover load failed:', e);
      return null;
    }
  },

  async saveRolloverDay(userId: string, challengeId: string, day: DailyRolloverDay): Promise<boolean> {
    if (!db || !userId) return false;
    try {
      const dayRef = doc(db, 'users', userId, 'rollovers', challengeId, 'days', String(day.dayNumber));
      await setDoc(dayRef, day, { merge: true });
      return true;
    } catch (e) {
      console.warn('Firestore rollover day sync failed:', e);
      return false;
    }
  },

  /**
   * Safe migration & sync from local workspace to Firestore:
   * Merges local records with existing cloud records, eliminating duplicates.
   */
  async syncAndMigrateLocalData(
    userId: string,
    localTickets: Ticket[],
    localRollover?: DailyRolloverChallenge
  ): Promise<{ syncedTickets: Ticket[]; syncedCount: number; error?: string }> {
    if (!db || !userId) {
      return { syncedTickets: localTickets, syncedCount: 0 };
    }

    try {
      // 1. Fetch existing Firestore tickets
      const cloudTickets = await this.loadTickets(userId);
      const cloudTicketMap = new Map<string, Ticket>();
      cloudTickets.forEach((t) => cloudTicketMap.set(t.id, t));

      let migratedCount = 0;

      // 2. Upload any local ticket that does not exist in cloud, or update if newer
      for (const localT of localTickets) {
        const cloudT = cloudTicketMap.get(localT.id);
        if (!cloudT) {
          await this.saveTicket(userId, localT);
          cloudTicketMap.set(localT.id, localT);
          migratedCount++;
        } else {
          // If local has newer updated timestamp, sync to cloud
          const localTime = new Date(localT.updatedAt || localT.createdAt).getTime();
          const cloudTime = new Date(cloudT.updatedAt || cloudT.createdAt).getTime();
          if (localTime > cloudTime) {
            await this.saveTicket(userId, localT);
            cloudTicketMap.set(localT.id, localT);
            migratedCount++;
          }
        }
      }

      // 3. Migrate rollover challenge if present
      if (localRollover) {
        const existingCloudRollover = await this.loadRolloverChallenge(userId, localRollover.id);
        if (!existingCloudRollover) {
          await this.saveRolloverChallenge(userId, localRollover);
        }
      }

      const mergedTickets = Array.from(cloudTicketMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return {
        syncedTickets: mergedTickets,
        syncedCount: migratedCount,
      };
    } catch (err: any) {
      console.warn('Sync and migration encountered non-fatal error:', err);
      return {
        syncedTickets: localTickets,
        syncedCount: 0,
        error: 'Cloud sync is temporarily unavailable. Your local workspace is still active.',
      };
    }
  },
};

// Aliases for backwards compatibility
export const firebaseService = firestoreService;
