import {
  initializeApp,
  getApps,
  getApp,
  cert,
  type App,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function createApp(): App {
  const projectId = requireEnv("FIREBASE_PROJECT_ID");
  const clientEmail = requireEnv("FIREBASE_CLIENT_EMAIL");
  // Private keys in env vars commonly have escaped newlines; restore them.
  const privateKey = requireEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n");

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

/**
 * Lazily initializes and returns the shared Firebase Admin app, used for both
 * Firestore access and verifying client ID tokens sent by signed-in users.
 */
export function getAdminApp(): App {
  return getApps().length ? getApp() : createApp();
}

let firestore: Firestore | null = null;

/**
 * Lazily initializes and returns the Firestore instance. Deferring init until
 * first use keeps credentials out of build-time page-data collection, so the
 * app builds without env vars present.
 */
export function getDb(): Firestore {
  if (firestore) return firestore;
  firestore = getFirestore(getAdminApp());
  return firestore;
}

export const QUESTIONS_COLLECTION = "questions";
export const QUIZZES_COLLECTION = "quizzes";
