import React, { useState } from 'react';
import {
  UploadCloud,
  FileCheck,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  DollarSign,
  Tag,
  CreditCard,
  Hash,
  RefreshCw,
  X,
  ShieldAlert,
  Key,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ParseReceiptResult, Contribution, AppSettings } from '../types';
import { addContribution, checkDuplicatePayment, computeReceiptHash } from '../contributionService';
import { parseReceiptWithClientGemini } from '../geminiClient';

// Primary live backend URL where the Gemini AI model is deployed
const LIVE_BACKEND_URL = 'https://ais-pre-zbwn4ayxntjmy4zfl3cbej-802933229190.europe-west2.run.app';

// Sample receipts helper to allow rapid testing with realistic Nigerian / International receipts
const SAMPLE_RECEIPTS = [
  {
    name: 'Sample 1: OPAY / Bank Transfer (₦50,000)',
    url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
    mockData: {
      contributorName: 'Cousin Babatunde Adeleke',
      amount: 50000,
      currency: 'NGN',
      date: '2026-09-25',
      time: '14:22',
      paymentMethod: 'OPAY / Bank Transfer',
      referenceNumber: 'OPAY-9823411',
      confidenceNotes: 'Identified Babatunde Adeleke paying ₦50,000.00 to Togetherness Fund.',
    },
  },
  {
    name: 'Sample 2: GTBank / Access Mobile Slip (₦120,000)',
    url: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=600&q=80',
    mockData: {
      contributorName: 'Dr. Chioma Nnamdi',
      amount: 120000,
      currency: 'NGN',
      date: '2026-09-26',
      time: '09:45',
      paymentMethod: 'GTBank Instant Transfer',
      referenceNumber: 'GTB-QI78KMN882',
      confidenceNotes: 'Verified bank confirmation for ₦120,000 to family welfare reserve.',
    },
  },
  {
    name: 'Sample 3: Wire / Diaspora Support ($300)',
    url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80',
    mockData: {
      contributorName: 'Cousin Emeka in London',
      amount: 300,
      currency: 'USD',
      date: '2026-09-27',
      time: '11:10',
      paymentMethod: 'Wire / Diaspora Transfer',
      referenceNumber: 'WIRE-889021',
      confidenceNotes: 'Diaspora wire receipt verified for $300.00.',
    },
  },
];

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  settings: AppSettings;
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  settings,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [imageHash, setImageHash] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [aiAnalysisNotes, setAiAnalysisNotes] = useState('');
  const [customApiKey, setCustomApiKey] = useState(() => localStorage.getItem('4cousins_gemini_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);

  // Form Fields
  const [contributorName, setContributorName] = useState('');
  const [amount, setAmount] = useState<number | string>('');
  const [currency, setCurrency] = useState(settings.primaryCurrency || 'NGN');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [category, setCategory] = useState(settings.categories[0] || 'Monthly Family Dues');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [receiptNote, setReceiptNote] = useState('');

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result as string;
      setSelectedImage(result);
      setMimeType(file.type || 'image/jpeg');
      setErrorMessage('');
      setDuplicateWarning('');

      // Security check: generate receipt hash & check if already in Firestore
      const hash = await computeReceiptHash(result);
      setImageHash(hash);

      const dupCheck = await checkDuplicatePayment('', hash);
      if (dupCheck.isDuplicate) {
        setDuplicateWarning(dupCheck.reason || 'This receipt image was already uploaded previously.');
        return;
      }

      // Auto analyze immediately after selection
      triggerGeminiAnalysis(result, file.type || 'image/jpeg');
    };
    reader.readAsDataURL(file);
  };

  const triggerGeminiAnalysis = async (imgData: string, type: string) => {
    setIsAnalyzing(true);
    setErrorMessage('');
    let parsed: ParseReceiptResult | null = null;
    let lastError = '';

    // Step 1: Try relative path /api/parse-receipt (works on main host & Netlify proxy)
    try {
      const response = await fetch('/api/parse-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imgData,
          mimeType: type,
        }),
      });

      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          parsed = json.data;
        }
      }
    } catch (e: any) {
      console.warn('Relative /api/parse-receipt fetch notice:', e);
    }

    // Step 2: If relative path failed (e.g. Netlify without proxy reload), call Cloud Run backend directly with CORS
    if (!parsed) {
      try {
        const response = await fetch(`${LIVE_BACKEND_URL}/api/parse-receipt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: imgData,
            mimeType: type,
          }),
        });

        if (response.ok) {
          const json = await response.json();
          if (json.success && json.data) {
            parsed = json.data;
          }
        }
      } catch (e: any) {
        console.warn('Direct live backend fetch notice:', e);
      }
    }

    // Step 3: Fallback to direct client-side Gemini if provided
    if (!parsed) {
      try {
        parsed = await parseReceiptWithClientGemini(imgData, type, customApiKey);
      } catch (clientErr: any) {
        lastError = clientErr?.message || '';
        console.warn('Gemini client parse fallback:', clientErr);
        if (lastError.includes('API key') || lastError.includes('configured')) {
          setShowKeyInput(true);
        }
      }
    }

    try {
      if (!parsed) {
        throw new Error('Could not auto-extract fields from this image. You can enter or confirm the details below manually.');
      }

      // Populate verification form
      if (parsed.contributorName) setContributorName(parsed.contributorName);
      if (parsed.amount) setAmount(parsed.amount);
      if (parsed.currency) {
        let curr = parsed.currency.toUpperCase();
        if (curr === 'NAIRA' || curr === '₦') curr = 'NGN';
        setCurrency(curr);
      }
      if (parsed.date) setDate(parsed.date);
      if (parsed.time) setTime(parsed.time);
      if (parsed.paymentMethod) setPaymentMethod(parsed.paymentMethod);
      if (parsed.referenceNumber) {
        setReferenceNumber(parsed.referenceNumber);
        // Verify payment ID duplicates
        const dupCheck = await checkDuplicatePayment(parsed.referenceNumber, imageHash);
        if (dupCheck.isDuplicate) {
          setDuplicateWarning(dupCheck.reason || 'Duplicate payment reference detected.');
        }
      }
      if (parsed.confidenceNotes) setAiAnalysisNotes(parsed.confidenceNotes);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Gemini extraction encountered an error. You can fill or edit the fields below manually.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadSampleReceipt = async (sample: (typeof SAMPLE_RECEIPTS)[0]) => {
    setSelectedImage(sample.url);
    const hash = await computeReceiptHash(sample.url);
    setImageHash(hash);
    setMimeType('image/jpeg');
    setContributorName(sample.mockData.contributorName);
    setAmount(sample.mockData.amount);
    setCurrency(sample.mockData.currency);
    setDate(sample.mockData.date);
    setTime(sample.mockData.time);
    setPaymentMethod(sample.mockData.paymentMethod);
    setReferenceNumber(sample.mockData.referenceNumber);
    setAiAnalysisNotes(sample.mockData.confidenceNotes);
    setErrorMessage('');
    setDuplicateWarning('');
  };

  const handleSaveVerifiedEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributorName.trim()) {
      setErrorMessage('Please provide the contributor name.');
      return;
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please enter a valid contribution amount.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // Security Check: Strict duplicate check before committing
      const dupCheck = await checkDuplicatePayment(referenceNumber, imageHash);
      if (dupCheck.isDuplicate) {
        setDuplicateWarning(dupCheck.reason || 'Duplicate payment reference or slip detected.');
        setIsSubmitting(false);
        return;
      }

      await addContribution({
        contributorName: contributorName.trim(),
        amount: numAmount,
        currency,
        date,
        time,
        category,
        paymentMethod,
        referenceNumber: referenceNumber.trim(),
        receiptNote: receiptNote.trim(),
        receiptImageUrl: selectedImage || '',
        receiptHash: imageHash,
        verifiedByAdmin: true,
      });

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to commit contribution:', err);
      setErrorMessage(
        err?.message || 'Failed to save entry to database. Please check your internet connection.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col p-5 sm:p-7 shadow-2xl border border-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-200">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-amber-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold font-serif-display text-stone-900">
                  Scan & Verify Payment Receipt
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase tracking-wider">
                  Gemini OCR
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Security-hardened: prevents duplicate uploads & notifies all family members in real-time.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-2 rounded-xl hover:bg-stone-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto pr-1 py-4 space-y-5 flex-1">
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs sm:text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {duplicateWarning && (
            <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-xl flex items-start gap-3 text-xs sm:text-sm text-amber-900 font-medium">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold text-amber-950 mb-0.5">
                  Security Block: Duplicate Payment Detected
                </strong>
                <span>{duplicateWarning}</span>
              </div>
            </div>
          )}

          {/* Optional Netlify Gemini API Key input for static deployments */}
          {showKeyInput && (
            <div className="p-3.5 bg-amber-50/80 border border-amber-300 rounded-xl space-y-2 text-xs text-stone-700">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <Key className="w-4 h-4 text-amber-700" />
                <span>Netlify Static Hosting Gemini Key</span>
              </div>
              <p className="text-[11px] text-stone-600">
                Since Netlify serves static client files without a Node server backend, enter your Gemini API key once to power client-side OCR:
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="Paste AI Studio / Gemini API Key..."
                  value={customApiKey}
                  onChange={(e) => {
                    setCustomApiKey(e.target.value);
                    localStorage.setItem('4cousins_gemini_key', e.target.value);
                  }}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-xs font-mono"
                />
                {selectedImage && (
                  <button
                    type="button"
                    onClick={() => triggerGeminiAnalysis(selectedImage, mimeType)}
                    className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    Retry Scan
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Upload Area */}
            <div className="md:col-span-5 flex flex-col space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-500">
                1. Select Receipt Screenshot / Slip
              </label>

              <label
                htmlFor="receipt-file-input"
                className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition ${
                  selectedImage
                    ? 'border-amber-400 bg-amber-50/20'
                    : 'border-stone-300 hover:border-amber-500 bg-stone-50/50'
                }`}
              >
                {selectedImage ? (
                  <div className="space-y-3 text-center">
                    <img
                      src={selectedImage}
                      alt="Uploaded Receipt"
                      className="max-h-56 mx-auto rounded-xl shadow-xs object-contain"
                    />
                    <div className="text-xs font-semibold text-amber-800 flex items-center justify-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      <span>Click to choose different image</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-2 py-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <span className="block text-sm font-semibold text-stone-800">
                      Tap or drop payment receipt
                    </span>
                    <span className="block text-[11px] text-stone-400">
                      Supports OPAY, GTBank, Kuda, Moniepoint, Zenith, Mobile Money
                    </span>
                  </div>
                )}
                <input
                  id="receipt-file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {/* Sample test receipts */}
              <div className="pt-2">
                <span className="text-[11px] font-semibold text-stone-500 block mb-1.5">
                  Or test with sample bank slips:
                </span>
                <div className="space-y-1.5">
                  {SAMPLE_RECEIPTS.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => loadSampleReceipt(s)}
                      className="w-full text-left text-xs p-2 rounded-xl border border-stone-200 hover:border-amber-400 bg-white hover:bg-amber-50/30 transition text-stone-700 flex items-center justify-between cursor-pointer"
                    >
                      <span className="truncate">{s.name}</span>
                      <span className="text-[10px] text-amber-700 font-bold ml-1 shrink-0">
                        Load
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Scan button */}
              {selectedImage && (
                <button
                  type="button"
                  onClick={() => triggerGeminiAnalysis(selectedImage, mimeType)}
                  disabled={isAnalyzing}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  <span>{isAnalyzing ? 'Scanning with Gemini OCR...' : 'Re-scan with Gemini AI'}</span>
                </button>
              )}
            </div>

            {/* Verification Form */}
            <div className="md:col-span-7 bg-stone-50/60 rounded-2xl p-4 sm:p-5 border border-stone-200">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  2. Review & Confirm Contribution
                </label>
                {aiAnalysisNotes && (
                  <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>AI auto-extracted</span>
                  </span>
                )}
              </div>

              {aiAnalysisNotes && (
                <div className="p-2.5 mb-3 bg-white rounded-xl border border-emerald-200 text-xs text-stone-700 flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{aiAnalysisNotes}</span>
                </div>
              )}

              <form onSubmit={handleSaveVerifiedEntry} className="space-y-3.5">
                {/* Contributor Name */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-stone-400" />
                    <span>Contributor / Cousin Name *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Benard Ayodele Gbadebo"
                    value={contributorName}
                    onChange={(e) => setContributorName(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                </div>

                {/* Amount & Currency */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-stone-400" />
                      <span>Amount *</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      placeholder="e.g. 15000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Currency
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    >
                      <option value="NGN">NGN (₦ - Nigerian Naira)</option>
                      <option value="USD">USD ($ - US Dollar)</option>
                      <option value="GBP">GBP (£ - British Pound)</option>
                      <option value="EUR">EUR (€ - Euro)</option>
                      <option value="KES">KES (KSh - Kenyan Shilling)</option>
                      <option value="CAD">CAD (C$ - Canadian Dollar)</option>
                    </select>
                  </div>
                </div>

                {/* Category & Payment Method */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-stone-400" />
                      <span>Category</span>
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    >
                      {settings.categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-stone-400" />
                      <span>Payment Method</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. OPAY, GTBank, Transfer"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                  </div>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-stone-400" />
                      <span>Date</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      <span>Time</span>
                    </label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                  </div>
                </div>

                {/* Reference Number */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-stone-400" />
                    <span>Transaction Reference / Session ID</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 100004260927181050172558991689"
                    value={referenceNumber}
                    onChange={(e) => {
                      setReferenceNumber(e.target.value);
                      setDuplicateWarning('');
                    }}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white font-mono"
                  />
                </div>

                {/* Receipt Note */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Optional Note / Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. September dues contribution"
                    value={receiptNote}
                    onChange={(e) => setReceiptNote(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                </div>

                {/* Commit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !!duplicateWarning}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSubmitting ? 'Recording & Broadcasting...' : 'Verify & Add to Ledger'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
