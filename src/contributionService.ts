import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  getDocs,
  where,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { Contribution, Disbursement, AppNotification, AppSettings } from './types';

const CONTRIBUTIONS_COLLECTION = 'contributions';
const DISBURSEMENTS_COLLECTION = 'disbursements';
const NOTIFICATIONS_COLLECTION = 'notifications';
const SETTINGS_COLLECTION = 'settings';

export const DEFAULT_CATEGORIES = [
  'Monthly Family Dues',
  'Family Project / Land',
  'Emergency & Welfare Fund',
  'Family Reunion / Get-Together',
  'Education Support',
  'Medical Assistance',
  'Special Contribution',
];

/**
 * Compute quick SHA-256 string hash for duplicate slip prevention
 */
export async function computeReceiptHash(base64OrText: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(base64OrText.slice(0, 15000));
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if a reference number or receipt image hash already exists
 */
export async function checkDuplicatePayment(
  referenceNumber: string,
  receiptHash?: string
): Promise<{ isDuplicate: boolean; reason?: string }> {
  const trimmedRef = referenceNumber.trim();

  // Check Reference ID if provided
  if (trimmedRef && trimmedRef.length > 2) {
    const qRef = query(
      collection(db, CONTRIBUTIONS_COLLECTION),
      where('referenceNumber', '==', trimmedRef),
      limit(1)
    );
    const snap = await getDocs(qRef);
    if (!snap.empty) {
      const existing = snap.docs[0].data();
      return {
        isDuplicate: true,
        reason: `Payment reference '${trimmedRef}' was already recorded for ${existing.contributorName} (${existing.currency} ${existing.amount}) on ${existing.date}.`,
      };
    }
  }

  // Check Receipt Image Hash if provided
  if (receiptHash) {
    const qHash = query(
      collection(db, CONTRIBUTIONS_COLLECTION),
      where('receiptHash', '==', receiptHash),
      limit(1)
    );
    const snap = await getDocs(qHash);
    if (!snap.empty) {
      const existing = snap.docs[0].data();
      return {
        isDuplicate: true,
        reason: `This payment slip/screenshot has already been uploaded previously for ${existing.contributorName} on ${existing.date}. Duplicate slips are blocked for security.`,
      };
    }
  }

  return { isDuplicate: false };
}

/**
 * Real-time listener for contributions
 */
export function subscribeToContributions(
  onData: (contributions: Contribution[]) => void,
  onError?: (error: Error) => void
) {
  const q = query(collection(db, CONTRIBUTIONS_COLLECTION), orderBy('date', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Contribution[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          contributorName: data.contributorName || 'Anonymous',
          amount: Number(data.amount) || 0,
          currency: data.currency || 'NGN',
          date: data.date || '',
          time: data.time || '',
          category: data.category || 'Monthly Family Dues',
          paymentMethod: data.paymentMethod || 'Transfer',
          referenceNumber: data.referenceNumber || '',
          receiptNote: data.receiptNote || '',
          receiptImageUrl: data.receiptImageUrl || '',
          receiptHash: data.receiptHash || '',
          verifiedByAdmin: Boolean(data.verifiedByAdmin),
          createdAt: data.createdAt ? data.createdAt.toString() : new Date().toISOString(),
        });
      });

      items.sort((a, b) => {
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }
        return (b.time || '').localeCompare(a.time || '');
      });

      onData(items);
    },
    (error) => {
      console.error('Firestore contributions subscription error:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Add a new contribution entry and broadcast notification
 */
export async function addContribution(entry: Omit<Contribution, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, CONTRIBUTIONS_COLLECTION), {
    ...entry,
    amount: Number(entry.amount),
    createdAt: serverTimestamp(),
  });

  // Create broadcast notification for all members
  try {
    await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
      title: '🎉 New Contribution Recorded',
      message: `${entry.contributorName} contributed ${entry.currency} ${Number(
        entry.amount
      ).toLocaleString()} (${entry.category || 'General Fund'}). Payment slip verified.`,
      type: 'contribution',
      amount: Number(entry.amount),
      currency: entry.currency,
      contributorOrRecipient: entry.contributorName,
      timestamp: new Date().toISOString(),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Failed to publish notification:', err);
  }

  return docRef.id;
}

/**
 * Delete a contribution
 */
export async function deleteContribution(id: string): Promise<void> {
  const docRef = doc(db, CONTRIBUTIONS_COLLECTION, id);
  await deleteDoc(docRef);
}

/**
 * Update an existing contribution
 */
export async function updateContribution(
  id: string,
  updatedFields: Partial<Contribution>
): Promise<void> {
  const docRef = doc(db, CONTRIBUTIONS_COLLECTION, id);
  await updateDoc(docRef, {
    ...updatedFields,
    ...(updatedFields.amount !== undefined ? { amount: Number(updatedFields.amount) } : {}),
  });
}

/**
 * Real-time listener for Disbursements (Fund Removals)
 */
export function subscribeToDisbursements(
  onData: (disbursements: Disbursement[]) => void,
  onError?: (error: Error) => void
) {
  const q = query(collection(db, DISBURSEMENTS_COLLECTION), orderBy('date', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Disbursement[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          amount: Number(data.amount) || 0,
          currency: data.currency || 'NGN',
          reason: data.reason || 'Family expenditure',
          category: data.category || 'Family Project',
          recipientName: data.recipientName || 'Family Member',
          approvedByAdmin: data.approvedByAdmin || 'Coordinator',
          date: data.date || '',
          time: data.time || '',
          referenceNumber: data.referenceNumber || '',
          createdAt: data.createdAt ? data.createdAt.toString() : new Date().toISOString(),
        });
      });

      items.sort((a, b) => b.date.localeCompare(a.date));
      onData(items);
    },
    (error) => {
      console.error('Firestore disbursements subscription error:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Record a fund removal (disbursement) and immediately broadcast notification to all members
 */
export async function addDisbursement(entry: Omit<Disbursement, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, DISBURSEMENTS_COLLECTION), {
    ...entry,
    amount: Number(entry.amount),
    createdAt: serverTimestamp(),
  });

  try {
    await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
      title: '⚠️ Fund Disbursement Notice',
      message: `${entry.currency} ${Number(entry.amount).toLocaleString()} was released to ${
        entry.recipientName
      }. Purpose: "${entry.reason}".`,
      type: 'disbursement',
      amount: Number(entry.amount),
      currency: entry.currency,
      contributorOrRecipient: entry.recipientName,
      timestamp: new Date().toISOString(),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Failed to publish disbursement notification:', err);
  }

  return docRef.id;
}

/**
 * Delete a disbursement
 */
export async function deleteDisbursement(id: string): Promise<void> {
  const docRef = doc(db, DISBURSEMENTS_COLLECTION, id);
  await deleteDoc(docRef);
}

/**
 * Real-time listener for Member Notifications
 */
export function subscribeToNotifications(
  onData: (notifications: AppNotification[]) => void,
  onError?: (error: Error) => void
) {
  const q = query(collection(db, NOTIFICATIONS_COLLECTION), orderBy('timestamp', 'desc'), limit(30));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: AppNotification[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          title: data.title || 'Notice',
          message: data.message || '',
          type: data.type || 'system',
          amount: data.amount,
          currency: data.currency,
          contributorOrRecipient: data.contributorOrRecipient,
          timestamp: data.timestamp || new Date().toISOString(),
        });
      });
      onData(items);
    },
    (error) => {
      console.error('Firestore notifications subscription error:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * App Settings (Primary currency, custom categories)
 */
export function subscribeToAppSettings(
  onData: (settings: AppSettings) => void
) {
  const docRef = doc(db, SETTINGS_COLLECTION, 'general');

  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      onData({
        primaryCurrency: data.primaryCurrency || 'NGN',
        categories: Array.isArray(data.categories) && data.categories.length > 0
          ? data.categories
          : DEFAULT_CATEGORIES,
      });
    } else {
      onData({
        primaryCurrency: 'NGN',
        categories: DEFAULT_CATEGORIES,
      });
    }
  });
}

export async function updateAppSettings(settings: Partial<AppSettings>): Promise<void> {
  const docRef = doc(db, SETTINGS_COLLECTION, 'general');
  await setDoc(docRef, settings, { merge: true });
}

/**
 * Clean up all demo data across collections so the production app is clean and ready
 */
export async function clearAllDemoData(): Promise<void> {
  // Clear contributions
  const contribSnap = await getDocs(collection(db, CONTRIBUTIONS_COLLECTION));
  const deleteContribPromises = contribSnap.docs.map((d) => deleteDoc(d.ref));

  // Clear disbursements
  const disbSnap = await getDocs(collection(db, DISBURSEMENTS_COLLECTION));
  const deleteDisbPromises = disbSnap.docs.map((d) => deleteDoc(d.ref));

  // Clear notifications
  const notifSnap = await getDocs(collection(db, NOTIFICATIONS_COLLECTION));
  const deleteNotifPromises = notifSnap.docs.map((d) => deleteDoc(d.ref));

  await Promise.all([
    ...deleteContribPromises,
    ...deleteDisbPromises,
    ...deleteNotifPromises,
  ]);
}
