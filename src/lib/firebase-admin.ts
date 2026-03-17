
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// IMPORTANT: This file is intended for server-side use only (e.g., in API routes or server actions
// where you need admin privileges). Do NOT import this into client-side components.

let adminApp: App;

// Check if the service account JSON is available in the environment variables
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
  : null;

if (!getApps().some(app => app.name === 'admin')) {
  if (serviceAccount) {
    adminApp = initializeApp({
      credential: cert(serviceAccount),
    }, 'admin');
  } else {
    // If no service account is available, we initialize without credentials.
    // This will have limited permissions but might be useful in some environments.
    // It's recommended to provide a service account for full functionality.
    console.warn("Firebase Admin SDK initialized without credentials. Functionality will be limited.");
    adminApp = initializeApp({}, 'admin');
  }
} else {
  adminApp = getApps().find(app => app.name === 'admin')!;
}

export const adminDb = getFirestore(adminApp);
// Alias for consistency with client-side db export if needed
export const db = adminDb;
