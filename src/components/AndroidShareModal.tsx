import React, { useState } from 'react';
import {
  Smartphone,
  Share2,
  Copy,
  CheckCircle,
  MessageCircle,
  Download,
  X,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Bell,
  Layers,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface AndroidShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidShareModal: React.FC<AndroidShareModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, install } = usePWAInstall();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const appUrl = 'https://ais-pre-zbwn4ayxntjmy4zfl3cbej-802933229190.europe-west2.run.app';

  const shareText = `*4 Cousins Togetherness - Official Family Fund App* 🇳🇬✨

Join our real-time family contribution tracker:
✅ Upload bank transfer slips (OPAY, GTBank, Zenith, Access, Kuda, Wire)
✅ Instant Gemini AI verification & duplicate protection
✅ Real-time contribution and disbursement alerts
✅ Install directly on Android phone as standalone App (no PlayStore login needed)

📲 *Open & Install on your Phone:*
${appUrl}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-stone-200 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-100 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-amber-700 to-amber-500 text-white flex items-center justify-center font-serif-display font-bold text-xl shadow-md shrink-0">
            ₦4C
          </div>
          <div>
            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3 text-emerald-700" /> WhatsApp Ready • Android PWA
            </div>
            <h3 className="text-xl font-bold text-stone-900 font-serif-display leading-tight">
              Share 4 Cousins App on WhatsApp
            </h3>
            <p className="text-xs text-stone-500">
              Instant 1-tap installation on Android & iPhone for all family members
            </p>
          </div>
        </div>

        {/* Informative Step Box */}
        <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80 mb-5 space-y-3">
          <div className="flex items-start gap-2.5 text-xs text-stone-700">
            <Smartphone className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-stone-900">Direct Android & iPhone Installation:</strong>
              <p className="text-stone-600 mt-0.5">
                Modern mobile apps are distributed directly via Progressive Web App (PWA) links.
                Family members do not need to download an untrusted external APK file or bypass security warnings.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-stone-700">
            <Bell className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-stone-900">Real-Time Sync & Notifications:</strong>
              <p className="text-stone-600 mt-0.5">
                Once added to the home screen, it launches in full-screen standalone mode with real-time Firebase cloud updates whenever anyone makes a contribution or removes funds.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleShareWhatsApp}
            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <MessageCircle className="w-5 h-5 fill-white text-emerald-600" />
            <span>Share to WhatsApp Group</span>
          </button>

          <div className="flex gap-2.5">
            <button
              onClick={handleCopyLink}
              className="flex-1 py-2.5 px-4 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-stone-500" />
                  <span>Copy App Link</span>
                </>
              )}
            </button>

            {isInstallable && (
              <button
                onClick={async () => {
                  await install();
                  onClose();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Install on this Phone</span>
              </button>
            )}
          </div>
        </div>

        {/* Preview Link */}
        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
          <span className="truncate pr-2 font-mono">{appUrl}</span>
          <a
            href={appUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-700 hover:underline font-semibold shrink-0 flex items-center gap-1"
          >
            Open <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
