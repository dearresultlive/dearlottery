import React, { useState, useEffect } from 'react';
import { useLanguage } from '../lib/i18n';

export default function PwaInstallBanner() {
  const { lang } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showIosGuide, setShowIosGuide] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if already running as installed PWA standalone app
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    if (isStandalone) return;

    // Check 7-day dismissal
    const dismissedAt = localStorage.getItem('dear_pwa_install_dismissed');
    if (dismissedAt) {
      const timeDiff = Date.now() - parseInt(dismissedAt, 10);
      if (timeDiff < 7 * 24 * 60 * 60 * 1000) {
        setIsDismissed(true);
        return;
      }
    }

    // Detect iOS Safari
    const ua = window.navigator.userAgent;
    const isIosDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    if (isIosDevice) {
      setIsIOS(true);
      setIsInstallable(true);
    }

    // Android/Chrome beforeinstallprompt event
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIosGuide(prev => !prev);
      return;
    }

    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dear_pwa_install_dismissed', Date.now().toString());
    }
  };

  if (!isInstallable || isDismissed) return null;

  return (
    <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-3.5 sm:p-4 shadow-lg border border-blue-700/50 relative overflow-hidden transition-all duration-300">
      
      {/* Decorative gradient glow */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none"></div>

      <div className="flex items-center justify-between gap-3 relative z-10">
        
        {/* Left: App Logo & Text */}
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/favicon.svg"
            alt="Dear Result App"
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl shadow-md border border-white/20 flex-shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-xs sm:text-sm tracking-tight text-white truncate">
                {lang === 'bn' ? 'ডিয়ার রেজাল্ট লাইভ অ্যাপ' : lang === 'hi' ? 'डियर रिजल्ट लाइव ऐप' : 'Dear Result Live App'}
              </span>
              <span className="bg-amber-400 text-slate-950 font-black text-[9px] px-1.5 py-0.2 rounded-full uppercase tracking-wider flex-shrink-0">
                PWA
              </span>
            </div>
            <p className="text-[11px] text-blue-200 mt-0.5 leading-snug line-clamp-1">
              {lang === 'bn'
                ? '১-ক্লিকে রেজাল্ট পেতে হোম স্ক্রিনে ইনস্টল করুন'
                : lang === 'hi'
                ? '1-क्लिक में रिजल्ट पाने के लिए होम स्क्रीन पर जोड़ें'
                : 'Install on Home Screen for 1-tap instant results'}
            </p>
          </div>
        </div>

        {/* Right: Install & Dismiss Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-3 py-2 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1"
          >
            <span>📥</span>
            <span>{lang === 'bn' ? 'ইনস্টল' : lang === 'hi' ? 'इंस्टॉल' : 'Install'}</span>
          </button>
          
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss app install banner"
            className="text-white/60 hover:text-white p-1.5 rounded-lg transition-colors text-xs font-bold"
          >
            ✕
          </button>
        </div>

      </div>

      {/* iOS Safari Instruction Helper */}
      {showIosGuide && (
        <div className="mt-3 pt-3 border-t border-white/10 text-xs text-blue-100 space-y-1.5 animate-in fade-in duration-200">
          <p className="font-bold flex items-center gap-1.5 text-amber-300">
            <span>🍏 iPhone/iPad Install Instructions:</span>
          </p>
          <ol className="list-decimal list-inside text-[11px] text-blue-200 space-y-1 pl-1">
            <li>Safari ব্রাউজারের নিচে বা উপরে থাকা শেয়ার আইকনে (Share ⎋) ট্যাপ করুন।</li>
            <li>মেনু থেকে <strong>"Add to Home Screen" (+)</strong> সিলেক্ট করুন।</li>
            <li>উপরে <strong>"Add"</strong> চাপলেই আপনার হোম স্ক্রিনে অ্যাপ যুক্ত হয়ে যাবে।</li>
          </ol>
        </div>
      )}

    </div>
  );
}
