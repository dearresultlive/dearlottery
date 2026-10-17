import React, { useState, useEffect } from 'react';
import { useLanguage } from '../lib/i18n';

export default function PwaInstallBanner() {
  const { lang } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if already running as installed PWA standalone app
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    if (isStandalone) return;

    // Check 2-day dismissal
    const dismissedAt = localStorage.getItem('dear_pwa_install_dismissed');
    if (dismissedAt) {
      const timeDiff = Date.now() - parseInt(dismissedAt, 10);
      if (timeDiff < 2 * 24 * 60 * 60 * 1000) {
        setIsDismissed(true);
        return;
      }
    }

    // Detect iOS Safari
    const ua = window.navigator.userAgent;
    const isIosDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    if (isIosDevice) {
      setIsIOS(true);
    }

    // Android/Chrome beforeinstallprompt event
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', () => {
      setIsVisible(false);
      setDeferredPrompt(null);
    });

    // Make visible after a small 1s delay on initial visit
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1200);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowGuide(prev => !prev);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    } else {
      // If browser hasn't fired beforeinstallprompt yet, toggle instructions
      setShowGuide(prev => !prev);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dear_pwa_install_dismissed', Date.now().toString());
    }
  };

  if (!isVisible || isDismissed) return null;

  return (
    <div className="fixed bottom-[64px] md:bottom-4 left-3 right-3 sm:left-auto sm:right-4 z-50 max-w-[440px] mx-auto sm:mx-0 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 text-white rounded-2xl p-3 sm:p-3.5 shadow-2xl border border-amber-300/40 relative overflow-hidden backdrop-blur-md">
        
        {/* Subtle top glow */}
        <div className="absolute -top-8 -right-8 w-24 h-24 bg-amber-400/15 rounded-full blur-xl pointer-events-none"></div>

        <div className="flex items-center justify-between gap-2.5 relative z-10">
          
          {/* Left: App Logo & Text */}
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/favicon.svg"
              alt="Dear Result App"
              className="w-10 h-10 rounded-xl shadow-md border border-white/20 flex-shrink-0 bg-slate-900 p-0.5"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs sm:text-sm tracking-tight text-white truncate">
                  {lang === 'bn' ? 'ডিয়ার রেজাল্ট লাইভ অ্যাপ' : lang === 'hi' ? 'डियर रिजल्ट लाइव ऐप' : 'Dear Result Live App'}
                </span>
                <span className="bg-amber-400 text-slate-950 font-black text-[8px] px-1.5 py-0.2 rounded-full uppercase tracking-wider flex-shrink-0">
                  FAST
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-blue-200 mt-0.5 leading-tight line-clamp-1">
                {lang === 'bn'
                  ? '১-ক্লিকে রেজাল্ট পেতে অ্যাপ ইনস্টল করুন'
                  : lang === 'hi'
                  ? '1-क्लिक में रिजल्ट पाने के लिए इंस्टॉल करें'
                  : 'Install Web App for 1-tap instant results'}
              </p>
            </div>
          </div>

          {/* Right: Install & Dismiss Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs px-3 py-1.5 sm:py-2 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1 whitespace-nowrap"
            >
              <span>📥</span>
              <span>{lang === 'bn' ? 'ইনস্টল' : lang === 'hi' ? 'इंस्टॉल' : 'Install'}</span>
            </button>
            
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss app install banner"
              className="text-white/60 hover:text-white p-1 rounded-lg transition-colors text-xs font-bold leading-none"
            >
              ✕
            </button>
          </div>

        </div>

        {/* Browser Installation Guide (if native prompt is deferred or iOS) */}
        {showGuide && (
          <div className="mt-2.5 pt-2.5 border-t border-white/10 text-xs text-blue-100 space-y-1 animate-in fade-in duration-200">
            {isIOS ? (
              <>
                <p className="font-bold text-amber-300 text-[11px]">
                  🍏 iPhone/iPad: Safari ব্রাউজারে ইনস্টল করার নিয়ম:
                </p>
                <ol className="list-decimal list-inside text-[10px] text-blue-200 space-y-0.5 pl-1 leading-relaxed">
                  <li>Safari-র নিচে থাকা <strong>Share (⎋)</strong> বাটনে ট্যাপ করুন।</li>
                  <li>মেনু থেকে <strong>"Add to Home Screen" (+)</strong> সিলেক্ট করুন।</li>
                  <li>উপরে <strong>"Add"</strong> চাপলেই হোম স্ক্রিনে অ্যাপ যুক্ত হয়ে যাবে।</li>
                </ol>
              </>
            ) : (
              <>
                <p className="font-bold text-amber-300 text-[11px]">
                  📲 Android / Chrome-এ ইনস্টল করার নিয়ম:
                </p>
                <p className="text-[10px] text-blue-200 leading-relaxed">
                  ব্রাউজারের উপরের ডানদিকের ৩-ডট মেনুতে (⋮) ট্যাপ করে <strong>"Install app"</strong> অথবা <strong>"Add to Home screen"</strong> চাপুন।
                </p>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
