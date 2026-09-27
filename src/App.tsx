import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Upload,
  Receipt,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Heart,
  TrendingUp,
  Lock,
  Download,
  Smartphone,
  Share2,
  MessageCircle,
} from 'lucide-react';
import { Contribution, Disbursement, AppNotification, AppSettings } from './types';
import {
  subscribeToContributions,
  subscribeToDisbursements,
  subscribeToNotifications,
  subscribeToAppSettings,
  clearAllDemoData,
  DEFAULT_CATEGORIES,
} from './contributionService';
import { PublicDashboard } from './components/PublicDashboard';
import { AdminPortalView } from './components/AdminPortalView';
import { AdminAuthModal } from './components/AdminAuthModal';
import { ReceiptScannerModal } from './components/ReceiptScannerModal';
import { MobileInstallPromptModal } from './components/MobileInstallPromptModal';
import { NotificationBell } from './components/NotificationBell';
import { AndroidShareModal } from './components/AndroidShareModal';
import { usePWAInstall } from './hooks/usePWAInstall';

export default function App() {
  const [activeTab, setActiveTab] = useState<'public' | 'admin'>('public');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('4cousins_admin_authed') === 'true';
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showMobileInstallModal, setShowMobileInstallModal] = useState(false);
  const [showAndroidShareModal, setShowAndroidShareModal] = useState(false);

  // Live state
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    primaryCurrency: 'NGN',
    categories: DEFAULT_CATEGORIES,
  });
  const [isLoading, setIsLoading] = useState(true);

  const { isInstallable, isInstalled, install, isIOS } = usePWAInstall();

  // One-time auto-wipe of demo data as requested by the user
  useEffect(() => {
    const hasCleanedDemo = localStorage.getItem('4cousins_demo_cleaned_v1');
    if (!hasCleanedDemo) {
      clearAllDemoData()
        .then(() => {
          localStorage.setItem('4cousins_demo_cleaned_v1', 'true');
        })
        .catch((err) => {
          console.warn('Wiping demo data handled:', err);
        });
    }
  }, []);

  // Listen to Firestore real-time collections
  useEffect(() => {
    // 1. Contributions
    const unsubContributions = subscribeToContributions(
      (items) => {
        setContributions(items);
        setIsLoading(false);
      },
      (err) => {
        console.error('Subscription failure:', err);
        setIsLoading(false);
      }
    );

    // 2. Disbursements
    const unsubDisbursements = subscribeToDisbursements((items) => {
      setDisbursements(items);
    });

    // 3. Notifications
    const unsubNotifications = subscribeToNotifications((items) => {
      setNotifications(items);
    });

    // 4. Settings
    const unsubSettings = subscribeToAppSettings((st) => {
      setSettings(st);
    });

    return () => {
      unsubContributions();
      unsubDisbursements();
      unsubNotifications();
      unsubSettings();
    };
  }, []);

  const handleAdminTabClick = () => {
    if (isAdminAuthenticated) {
      setActiveTab('admin');
    } else {
      setShowAuthModal(true);
    }
  };

  const handleAuthSuccess = () => {
    setIsAdminAuthenticated(true);
    localStorage.setItem('4cousins_admin_authed', 'true');
    setShowAuthModal(false);
    setActiveTab('admin');
  };

  const handleLogout = () => {
    setIsAdminAuthenticated(false);
    localStorage.removeItem('4cousins_admin_authed');
    setActiveTab('public');
  };

  const handleDownloadAppClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowMobileInstallModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-800 flex flex-col selection:bg-amber-100 selection:text-amber-900">
      {/* Top Banner: Prominent Download Mobile App Bar */}
      <div className="bg-gradient-to-r from-amber-800 via-amber-700 to-stone-900 text-white px-3 py-2 text-xs font-semibold shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="truncate">
              📱 <strong>4 Cousins Android & Mobile App</strong>: Instant receipt uploads & real-time fund alerts.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowAndroidShareModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-1 rounded-lg text-xs transition flex items-center gap-1 shadow-xs cursor-pointer"
              title="Share on WhatsApp Group"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-white text-emerald-600" />
              <span>Share WhatsApp</span>
            </button>
            <button
              onClick={handleDownloadAppClick}
              className="bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold px-3 py-1 rounded-lg text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-stone-950" />
              <span>Download App</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo / Brand */}
          <div
            onClick={() => setActiveTab('public')}
            className="flex items-center gap-3 cursor-pointer select-none"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-700 to-amber-500 text-white flex items-center justify-center font-serif-display font-bold text-lg shadow-sm">
              ₦4C
            </div>
            <div>
              <span className="text-base sm:text-lg font-bold font-serif-display text-stone-900 tracking-tight leading-none block">
                4 Cousins Togetherness
              </span>
              <span className="text-[11px] font-medium text-amber-700 tracking-wide uppercase">
                Family Fund Ledger
              </span>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            {/* Share to WhatsApp Button */}
            <button
              onClick={() => setShowAndroidShareModal(true)}
              className="hidden md:inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 transition shadow-xs cursor-pointer"
              title="Share on WhatsApp Group"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Share WhatsApp</span>
            </button>

            {/* Download Mobile App Header Button */}
            {!isInstalled && (
              <button
                onClick={handleDownloadAppClick}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 transition shadow-xs cursor-pointer"
                title="Install / Download 4 Cousins Mobile App"
              >
                <Smartphone className="w-3.5 h-3.5 text-amber-700" />
                <span>Download App</span>
              </button>
            )}

            {/* Real-time Notification Bell for Web & Mobile */}
            <NotificationBell notifications={notifications} />

            {/* View Switcher */}
            <div className="bg-stone-100 p-1 rounded-xl flex items-center text-xs font-semibold">
              <button
                onClick={() => setActiveTab('public')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'public'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Public Ledger
              </button>

              <button
                onClick={handleAdminTabClick}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {isAdminAuthenticated ? (
                  <Shield className="w-3.5 h-3.5" />
                ) : (
                  <Lock className="w-3.5 h-3.5" />
                )}
                <span>Admin</span>
              </button>
            </div>

            {/* Quick Upload CTA (Opens scanner) */}
            <button
              onClick={() => {
                if (isAdminAuthenticated) {
                  setShowScannerModal(true);
                } else {
                  setShowAuthModal(true);
                }
              }}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Scan Slip</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'public' ? (
          <PublicDashboard
            contributions={contributions}
            disbursements={disbursements}
            settings={settings}
            isLoading={isLoading}
            onOpenAdmin={() => {
              if (isAdminAuthenticated) {
                setActiveTab('admin');
              } else {
                setShowAuthModal(true);
              }
            }}
          />
        ) : (
          <AdminPortalView
            contributions={contributions}
            disbursements={disbursements}
            settings={settings}
            onOpenReceiptScanner={() => setShowScannerModal(true)}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-stone-100 border-t border-stone-200 mt-12 py-6 text-stone-500 text-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-amber-600 fill-amber-600" />
            <span>4 Cousins Togetherness • Transparent Family Stewardship</span>
          </div>
          <div className="flex items-center gap-4 text-stone-400">
            <span>Currency: <strong className="text-stone-700">{settings.primaryCurrency}</strong></span>
            <span>•</span>
            <span>Duplicate Slip Protection Active</span>
            <span>•</span>
            <button
              onClick={() => setShowAndroidShareModal(true)}
              className="text-emerald-700 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <MessageCircle className="w-3 h-3" />
              <span>WhatsApp Group Invite</span>
            </button>
            <span>•</span>
            <button
              onClick={handleAdminTabClick}
              className="text-stone-600 hover:text-amber-800 font-medium underline cursor-pointer"
            >
              {isAdminAuthenticated ? 'Admin Panel' : 'Admin Login'}
            </button>
          </div>
        </div>
      </footer>

      {/* Dialog Modals */}
      <AdminAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />

      <ReceiptScannerModal
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onSuccess={() => {}}
        settings={settings}
      />

      {/* Mobile Install App Popup */}
      <MobileInstallPromptModal
        forceOpen={showMobileInstallModal}
        onManualClose={() => setShowMobileInstallModal(false)}
      />

      {/* WhatsApp / Android Share Modal */}
      <AndroidShareModal
        isOpen={showAndroidShareModal}
        onClose={() => setShowAndroidShareModal(false)}
      />
    </div>
  );
}
