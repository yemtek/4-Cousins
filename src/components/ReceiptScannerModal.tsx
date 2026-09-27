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
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ParseReceiptResult, Contribution, AppSettings } from '../types';
import { addContribution, checkDuplicatePayment, computeReceiptHash } from '../contributionService';
import { parseReceiptWithClientGemini } from '../geminiClient';

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
      time: '11:15',
      paymentMethod: 'Sendwave / Wire Transfer',
      referenceNumber: 'SW-0044919',
      confidenceNotes: 'Diaspora family contribution from Cousin Emeka.',
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
  const [imageHash, setImageHash] = useState<string>('');
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiAnalysisNotes, setAiAnalysisNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [duplicateWarning, setDuplicateWarning] = useState<string>('');

  // Editable Form State
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
    } catch {
      // Continue to fallback
    }

    // If server route is not available (e.g., pure static Netlify hosting), use direct client Gemini
    if (!parsed) {
      try {
        parsed = await parseReceiptWithClientGemini(imgData, type);
      } catch (clientErr: any) {
        console.warn('Gemini client parse fallback:', clientErr);
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
        // Normalize currency
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
      console.warn('AI Parsing notice:', err);
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

      const newEntry: Omit<Contribution, 'id'> = {
        contributorName: contributorName.trim(),
        amount: numAmount,
        currency: currency.trim() || settings.primaryCurrency || 'NGN',
        date: date || new Date().toISOString().split('T')[0],
        time: time || '12:00',
        category: category.trim(),
        paymentMethod: paymentMethod.trim(),
        referenceNumber: referenceNumber.trim(),
        receiptNote: receiptNote.trim(),
        receiptImageUrl: selectedImage || '',
        receiptHash: imageHash,
        verifiedByAdmin: true,
      };

      await addContribution(newEntry);

      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#047857', '#F59E0B', '#10B981', '#B45309'],
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Save contribution error:', err);
      setErrorMessage('Failed to save to Firestore database. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl border border-stone-200 relative my-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-stone-900 font-serif-display">
                Upload & AI Parse Payment Slip
              </h2>
              <p className="text-xs sm:text-sm text-stone-500">
                Security-hardened: prevents duplicate uploads & notifies all family members in real-time.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-2 rounded-xl hover:bg-stone-100 transition"
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

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Upload Area */}
            <div className="md:col-span-5 flex flex-col space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-500">
                1. Select Receipt Screenshot / Slip
              </label>

              <label
                className={`relative border-2 border-dashed rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                  selectedImage
                    ? 'border-amber-400 bg-amber-50/30'
                    : 'border-stone-300 hover:border-amber-500 bg-stone-50/50 hover:bg-stone-50'
                }`}
              >
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />

                {selectedImage ? (
                  <div className="w-full flex flex-col items-center">
                    <img
                      src={selectedImage}
                      alt="Receipt preview"
                      className="max-h-52 w-auto object-contain rounded-lg shadow-sm border border-stone-200"
                    />
                    <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
                      <FileCheck className="w-3.5 h-3.5" /> Slip Loaded & Hashed
                    </div>
                    <p className="text-[11px] text-stone-400 mt-1">Tap to select another</p>
                  </div>
                ) : (
                  <div className="py-6 flex flex-col items-center">
                    <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                      <UploadCloud className="w-7 h-7" />
                    </div>
                    <p className="text-sm font-semibold text-stone-800">
                      Tap or Drop Receipt Slip
                    </p>
                    <p className="text-xs text-stone-500 mt-1">
                      OPAY, GTBank, Zenith, Access, Kuda, Wire, or Transfer receipt
                    </p>
                    <span className="mt-3 inline-flex items-center text-xs font-medium text-amber-700 bg-amber-50 px-3 py-1 rounded-md border border-amber-200">
                      Browse Photos / Slips
                    </span>
                  </div>
                )}
              </label>

              {/* Sample receipts */}
              <div className="pt-1">
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">
                  Or test with sample receipt:
                </span>
                <div className="flex flex-col gap-1.5">
                  {SAMPLE_RECEIPTS.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => loadSampleReceipt(s)}
                      className="text-left text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 hover:border-amber-400 bg-white hover:bg-amber-50/50 text-stone-700 font-medium flex items-center justify-between transition"
                    >
                      <span className="truncate">{s.name}</span>
                      <span className="text-amber-700 font-bold ml-1 shrink-0">Try →</span>
                    </button>
                  ))}
                </div>
              </div>

              {selectedImage && (
                <button
                  type="button"
                  onClick={() => triggerGeminiAnalysis(selectedImage, mimeType)}
                  disabled={isAnalyzing}
                  className="w-full mt-2 py-2 px-3 text-xs font-semibold rounded-xl bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 flex items-center justify-center gap-1.5 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  Re-analyze Slip with Gemini
                </button>
              )}
            </div>

            {/* Verification Form */}
            <div className="md:col-span-7 flex flex-col bg-stone-50/70 p-4 sm:p-5 rounded-2xl border border-stone-200/80">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  2. Verify Extracted Details Before Saving
                </label>
                {isAnalyzing && (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md font-semibold animate-pulse">
                    <Sparkles className="w-3.5 h-3.5" /> AI Parsing...
                  </span>
                )}
              </div>

              {aiAnalysisNotes && (
                <div className="mb-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-xl flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold">AI Detection Summary:</strong>{' '}
                    <span>{aiAnalysisNotes}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveVerifiedEntry} className="space-y-3.5 flex-1">
                {/* Contributor Name */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Contributor's Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Babatunde Adeleke"
                      value={contributorName}
                      onChange={(e) => setContributorName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-stone-900"
                    />
                  </div>
                </div>

                {/* Amount & Currency */}
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-7">
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Contribution Amount *
                    </label>
                    <div className="relative">
                      <DollarSign className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="number"
                        step="any"
                        required
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-stone-900"
                      />
                    </div>
                  </div>

                  <div className="col-span-5">
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Currency
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full py-2 px-3 bg-white text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-stone-900"
                    >
                      <option value="NGN">NGN (₦ Naira)</option>
                      <option value="USD">USD ($ Dollar)</option>
                      <option value="GBP">GBP (£ Pound)</option>
                      <option value="EUR">EUR (€ Euro)</option>
                      <option value="KES">KES (KSh)</option>
                      <option value="CAD">CAD (C$)</option>
                      <option value="GHS">GHS (GH₵)</option>
                    </select>
                  </div>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Transaction Date *
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full pl-9 pr-2 py-2 bg-white text-xs sm:text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-stone-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Transaction Time
                    </label>
                    <div className="relative">
                      <Clock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="w-full pl-9 pr-2 py-2 bg-white text-xs sm:text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-stone-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Category & Payment Method */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Contribution Category
                    </label>
                    <div className="relative">
                      <Tag className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full pl-9 pr-2 py-2 bg-white text-xs sm:text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-stone-800"
                      >
                        {settings.categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Payment Channel
                    </label>
                    <div className="relative">
                      <CreditCard className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="OPAY, GTBank, Transfer"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full pl-9 pr-2 py-2 bg-white text-xs sm:text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-stone-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Reference Number & Security duplicate check */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Reference / Session ID
                    </label>
                    <div className="relative">
                      <Hash className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="e.g. 090264188219"
                        value={referenceNumber}
                        onChange={async (e) => {
                          const val = e.target.value;
                          setReferenceNumber(val);
                          if (val.length > 3) {
                            const chk = await checkDuplicatePayment(val, imageHash);
                            if (chk.isDuplicate) {
                              setDuplicateWarning(chk.reason || 'Duplicate payment reference found');
                            } else {
                              setDuplicateWarning('');
                            }
                          }
                        }}
                        className="w-full pl-9 pr-2 py-2 bg-white text-xs sm:text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-stone-800 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Note / Memo
                    </label>
                    <input
                      type="text"
                      placeholder="Optional memo"
                      value={receiptNote}
                      onChange={(e) => setReceiptNote(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-xs sm:text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-stone-800"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || isAnalyzing || Boolean(duplicateWarning)}
                    className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Saving & Broadcasting Notice...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Verify & Commit Contribution to Live Ledger
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-center text-stone-400 mt-2">
                    Security-enforced: payment slip and reference number verified. All members receive instant notification.
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
