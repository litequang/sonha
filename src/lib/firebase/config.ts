import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  memoryLocalCache, 
  Firestore, 
  getFirestore,
  clearIndexedDbPersistence,
  doc,
  getDocFromServer
} from 'firebase/firestore';

// 1. Priority 1: Environment variables (.env.local, .env, or system env)
// Supports both VITE_ and FIREBASE_ prefixes
const envApiKey = (
  import.meta.env.VITE_FIREBASE_API_KEY ||
  import.meta.env.FIREBASE_API_KEY ||
  import.meta.env.VITE_API_KEY
)?.trim();

const envAuthDomain = (
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
  import.meta.env.FIREBASE_AUTH_DOMAIN
)?.trim();

const envProjectId = (
  import.meta.env.VITE_FIREBASE_PROJECT_ID ||
  import.meta.env.FIREBASE_PROJECT_ID ||
  import.meta.env.VITE_PROJECT_ID
)?.trim();

const envStorageBucket = (
  import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
  import.meta.env.FIREBASE_STORAGE_BUCKET
)?.trim();

const envMessagingSenderId = (
  import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
  import.meta.env.FIREBASE_MESSAGING_SENDER_ID
)?.trim();

const envAppId = (
  import.meta.env.VITE_FIREBASE_APP_ID ||
  import.meta.env.FIREBASE_APP_ID
)?.trim();

const envDatabaseId = (
  import.meta.env.VITE_FIREBASE_DATABASE_ID ||
  import.meta.env.FIREBASE_DATABASE_ID ||
  import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID
)?.trim();

// 2. Priority 2: Safely read AI Studio applet config as fallback ONLY if no custom env is set
let fallbackConfig: Record<string, string> = {};
try {
  const configs = import.meta.glob('@/firebase-applet-config.json', { eager: true });
  const appletFile = configs['@/firebase-applet-config.json'] || Object.values(configs)[0];
  if (appletFile && typeof appletFile === 'object') {
    fallbackConfig = ((appletFile as any).default || appletFile) as Record<string, string>;
  }
} catch {
  fallbackConfig = {};
}

// Check if user configured their own project in .env.local or .env
const hasCustomEnv = Boolean(envApiKey || envProjectId);

// CRITICAL: When the user specifies custom project credentials in .env.local,
// we MUST NOT mix in fields from fallbackConfig (AI Studio's disco-sum-zvr20 sandbox),
// because mixing keys from different Firebase projects leads to credential mismatch,
// authentication failure, and login loops.
const effectiveProjectId = envProjectId || (!hasCustomEnv ? fallbackConfig.projectId : '') || '';

const firebaseConfig = {
  apiKey: envApiKey || (!hasCustomEnv ? fallbackConfig.apiKey : '') || '',
  authDomain: envAuthDomain || (effectiveProjectId ? `${effectiveProjectId}.firebaseapp.com` : (!hasCustomEnv ? fallbackConfig.authDomain : '')) || '',
  projectId: effectiveProjectId,
  storageBucket: envStorageBucket || (effectiveProjectId ? `${effectiveProjectId}.firebasestorage.app` : (!hasCustomEnv ? fallbackConfig.storageBucket : '')) || '',
  messagingSenderId: envMessagingSenderId || (!hasCustomEnv ? fallbackConfig.messagingSenderId : '') || '',
  appId: envAppId || (!hasCustomEnv ? fallbackConfig.appId : '') || '',
  // Priority for Firestore Database ID:
  // 1) Explicit VITE_FIREBASE_DATABASE_ID from .env.local
  // 2) If using custom project from .env.local, default to standard '(default)'
  // 3) Only if running in AI Studio sandbox without .env.local, use the sandbox database ID
  firestoreDatabaseId: envDatabaseId 
    ? envDatabaseId 
    : (hasCustomEnv ? '(default)' : (fallbackConfig.firestoreDatabaseId || '(default)')),
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Determine device trust preference: 'personal' (default, enables persistent cache) vs 'shared' (memory cache)
export function getDeviceTrustPreference(): 'personal' | 'shared' | null {
  const saved = localStorage.getItem('sonha_device_trust');
  if (saved === 'personal' || saved === 'shared') return saved;
  return null;
}

export function setDeviceTrustPreference(pref: 'personal' | 'shared'): void {
  localStorage.setItem('sonha_device_trust', pref);
}

// Initialize Firestore with offline persistence
let firestoreInstance: Firestore;

try {
  const pref = getDeviceTrustPreference();
  const databaseId = firebaseConfig.firestoreDatabaseId;

  if (pref === 'shared') {
    // Shared device: no persistent offline caching
    firestoreInstance = initializeFirestore(app, {
      localCache: memoryLocalCache(),
    }, databaseId);
  } else {
    // Personal device: robust multi-tab persistent cache
    firestoreInstance = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    }, databaseId);
  }
} catch {
  // If already initialized or persistent cache not supported in environment, fallback
  try {
    firestoreInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  } catch {
    firestoreInstance = getFirestore(app);
  }
}

export const db = firestoreInstance;

// Asynchronous connection check on boot
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is running in offline-first mode.');
      return false;
    }
    return false;
  }
}

// Trigger connection check in background
testConnection().catch(() => {});

// Clear local persistence for logout on shared machines
export async function clearOfflineData(): Promise<void> {
  try {
    await clearIndexedDbPersistence(db);
    localStorage.removeItem('sonha_device_trust');
    localStorage.removeItem('sonha_active_household');
  } catch (err) {
    console.warn('Could not clear persistence while DB active. Clearing localStorage:', err);
    localStorage.removeItem('sonha_device_trust');
    localStorage.removeItem('sonha_active_household');
  }
}

/**
 * Recursively strips undefined values from objects so Firestore setDoc/updateDoc does not throw
 * "Function setDoc() called with invalid data. Unsupported field value: undefined"
 */
export function stripUndefined<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(stripUndefined) as unknown as T;
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj as Record<string, any>)) {
    if (value !== undefined) {
      clean[key] = stripUndefined(value);
    }
  }
  return clean as T;
}
