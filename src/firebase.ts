import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Use the specific firestoreDatabaseId provided in firebase-applet-config.json
export const db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);

export default app;
