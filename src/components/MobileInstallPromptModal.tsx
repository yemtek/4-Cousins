import React, { useState, useEffect } from 'react';
import { Smartphone, Download, Share, PlusSquare, X, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface MobileInstallPromptModalProps {
  forceOpen?: boolean;
  onManualClose?: () => void;
}

export const MobileInstallPromptModal: React.FC<MobileInstallPromptModalProps> = ({
  forceOpen = false,
  onManualClose,
}) => {
  const { isInstalled, isInstallable, isIOS, isMobile, install } = usePWAInstall();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }

    // Only prompt on mobile if not already installed as standalone app
    if (isInstalled) return;

    // Check if user dismissed it in this session to prevent spamming
    const dismissed = sessionStorage.getItem('4cousins_install_prompt_dismissed');
    if (dismissed) return;

    // Trigger after a friendly brief delay (1.5 seconds)
    const timer = setTimeout(() => {
      if (isMobile) {
        setIsOpen(true);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [isInstalled, isMobile, forceOpen]);

  if (!isOpen || isInstalled) return null;

  const handleDismiss = () => {
    setIsOpen(false);
    sessionStorage.setItem('4cousins_install_prompt_dismissed', 'true');
    if (onManualClose) onManualClose();
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
      setIsOpen(false);
      if (onManualClose) onManualClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-stone-200 relative animate-in slide-in-from-bottom duration-300">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-100 transition cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-amber-700 to-amber-500 text-white flex items-center justify-center font-serif-display font-bold text-xl shadow-md shrink-0">
            ₦4C
          </div>
          <div>
            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3" /> Recommended
            </div>
            <h3 className="text-lg font-bold text-stone-900 font-serif-display leading-tight">
              Install 4 Cousins App
            </h3>
            <p className="text-xs text-stone-500">
              For instant mobile receipt uploads & real-time alerts
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-stone-600 mb-5 leading-relaxed bg-amber-50/50 p-3 rounded-xl border border-amber-100">
          Install the <strong>4 Cousins Togetherness</strong> app directly on your phone home screen.
          Enjoy instant access, fast offline loading, and automatic contribution alerts.
        </p>

        {isIOS ? (
          <div className="space-y-3 mb-4">
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-xs text-stone-700 space-y-2">
              <p className="font-bold text-stone-900 flex items-center gap-1.5">
                <Share className="w-4 h-4 text-amber-600" />
                How to install on iPhone / iPad:
              </p>
              <ol className="list-decimal pl-4 space-y-1 text-stone-600">
                <li>
                  Tap the <strong className="text-stone-900">Share</strong> icon at the bottom of Safari.
                </li>
                <li>
                  Scroll down and tap <strong className="text-stone-900">Add to Home Screen</strong>.
                </li>
                <li>
                  Tap <strong className="text-amber-700 font-bold">Add</strong> at top right to complete.
                </li>
              </ol>
            </div>
            <button
              onClick={handleDismiss}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              Got it, thanks!
            </button>
          </div>
        ) : isInstallable ? (
          <div className="flex gap-2.5">
            <button
              onClick={handleDismiss}
              className="flex-1 py-2.5 px-4 rounded-xl border border-stone-200 text-stone-600 text-xs font-semibold hover:bg-stone-50 transition cursor-pointer"
            >
              Not Now
            </button>
            <button
              onClick={handleInstallClick}
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Install App
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-600">
              Tap browser menu (<strong>⋮</strong> or <strong>Share</strong>) and select <strong className="text-stone-800">"Install app"</strong> or <strong className="text-stone-800">"Add to Home Screen"</strong>.
            </div>
            <button
              onClick={handleDismiss}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              Continue to Web App
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
