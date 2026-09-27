export interface Contribution {
  id?: string;
  contributorName: string;
  amount: number;
  currency: string;
  date: string; // YYYY-MM-DD format
  time: string; // HH:mm (24h or 12h with AM/PM)
  category?: string; // e.g. "Monthly Dues", "Family Project", "Emergency Fund", "Celebration"
  paymentMethod?: string; // e.g. "Bank Transfer", "OPAY", "Mobile Money", "Cash", "Zelle", "Card"
  referenceNumber?: string;
  receiptNote?: string;
  receiptImageUrl?: string;
  receiptHash?: string; // SHA-256 fingerprint of the uploaded receipt to prevent duplicate slip upload
  verifiedByAdmin?: boolean;
  createdAt?: string; // ISO date string
}

export interface ParseReceiptResult {
  contributorName: string;
  amount: number;
  currency: string;
  date: string;
  time: string;
  paymentMethod?: string;
  referenceNumber?: string;
  confidenceNotes?: string;
}

export interface Disbursement {
  id?: string;
  amount: number;
  currency: string;
  reason: string;
  category: string;
  recipientName: string;
  approvedByAdmin: string;
  date: string;
  time: string;
  referenceNumber?: string;
  createdAt?: string;
}

export interface AppNotification {
  id?: string;
  title: string;
  message: string;
  type: 'contribution' | 'disbursement' | 'system';
  amount?: number;
  currency?: string;
  contributorOrRecipient?: string;
  timestamp: string; // ISO string
  read?: boolean;
}

export interface AppSettings {
  primaryCurrency: string; // e.g. "NGN", "USD", "KES", "GBP"
  categories: string[];
}
