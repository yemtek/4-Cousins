import React, { useState } from 'react';
import { Lock, KeyRound, ShieldAlert, X } from 'lucide-react';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validCodes = ['4cousins', 'cousins4', 'admin', '2026', 'family'];
    if (validCodes.includes(passcode.trim().toLowerCase())) {
      setError('');
      setPasscode('');
      onSuccess();
    } else {
      setError('Incorrect passcode. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 p-1 rounded-lg transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-stone-900 font-serif-display">
              Admin Portal Access
            </h3>
            <p className="text-xs text-stone-500">
              Authorized treasurer & family coordinators
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Enter Admin Password
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="password"
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Enter password"
                autoFocus
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-stone-900 placeholder:text-stone-400 text-sm"
              />
            </div>
            {error && (
              <p className="text-xs text-red-600 mt-2 flex items-center gap-1.5 font-medium">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                {error}
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-stone-200 text-stone-700 text-sm font-semibold hover:bg-stone-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-sm font-semibold shadow-xs transition cursor-pointer"
            >
              Unlock Admin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
