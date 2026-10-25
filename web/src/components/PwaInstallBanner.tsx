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

    // 1. Check if already running as installed standalone PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    if (isStandalone) return;

    // 2. Strict 7-Day Dismissal Check: if user cancelled, do NOT show for 7 full days
    const dismissedAt = localStorage.getItem('dear_pwa_install_dismissed');
    if (dismissedAt) {
      const timeDiff = Date.now() - parseInt(dismissedAt, 10);
      if (timeDiff < 7 * 24 * 60 * 60 * 1000) {
        setIsDismissed(true);
        return;
      }
    }

    // 3. Detect iOS Safari
    const ua = window.navigator.userAgent;
    const isIosDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    if (isIosDevice) {
      setIsIOS(true);
    }

    // 4. Capture beforeinstallprompt
    if ((window as any).deferredPwaPrompt) {
      setDeferredPrompt((window as any).deferredPwaPrompt);
    }

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      (window as any).deferredPwaPrompt = e;
      setDeferredPrompt(e);
    };

    const handlePwaReady = () => {
      if ((window as any).deferredPwaPrompt) {
        setDeferredPrompt((window as any).deferredPwaPrompt);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('dearlottery:pwa_ready', handlePwaReady);
    window.addEventListener('appinstalled', () => {
      (window as any).deferredPwaPrompt = null;
      setIsVisible(false);
      setDeferredPrompt(null);
    });

    // 5. Gentle 5-Second Delay: allows user to view winning results first before showing floating capsule
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 5000);

    // Manual reopen trigger from menu drawer or footer
    const handleManualOpen = () => {
      try {
        localStorage.removeItem('dear_pwa_install_dismissed');
      } catch (e) {}
      setIsDismissed(false);
      setIsVisible(true);
      setShowGuide(true);
      const activePrompt = deferredPrompt || (window as any).deferredPwaPrompt;
      if (activePrompt) {
        activePrompt.prompt();
      }
    };

    window.addEventListener('dearlottery:open_install_pwa', handleManualOpen);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('dearlottery:pwa_ready', handlePwaReady);
      window.removeEventListener('dearlottery:open_install_pwa', handleManualOpen);
    };
  }, [deferredPrompt]);

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
      setShowGuide(prev => !prev);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
    if (typeof window !== 'undefined') {
      // Record dismissal timestamp to lock out banner for 7 full days
      localStorage.setItem('dear_pwa_install_dismissed', Date.now().toString());
    }
  };

  if (!isVisible || isDismissed) return null;

  return (
    <div className="fixed bottom-[68px] md:bottom-4 left-3 right-3 sm:left-auto sm:right-4 z-50 max-w-[380px] mx-auto sm:mx-0 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div className="bg-white/95 backdrop-blur-md text-slate-900 rounded-2xl p-2.5 sm:p-3 shadow-xl border border-amber-300/90 relative overflow-hidden transition-all">
        <div className="flex items-center justify-between gap-2.5 relative z-10">
          
          {/* Left: App Logo + Title */}
          <div className="flex items-center gap-2 min-w-0">
            <img
              src="/favicon.svg"
              alt="Dear Result App"
              className="w-8 h-8 rounded-xl shadow-xs flex-shrink-0 bg-white p-0.5 border border-slate-200"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs text-slate-900 truncate">
                  {lang === 'bn' ? 'ডিয়ার রেজাল্ট অ্যাপ' : lang === 'hi' ? 'डियर रिजल्ट ऐप' : 'Dear Result Live App'}
                </span>
                <span className="bg-amber-400 text-slate-950 font-black text-[8px] px-1.5 py-0.2 rounded-full uppercase flex-shrink-0">
                  FAST
                </span>
              </div>
              <p className="text-[10px] text-slate-600 truncate leading-tight mt-0.5">
                {lang === 'bn'
                  ? '১-ক্লিকে হোমস্ক্রিনে রেজাল্ট'
                  : lang === 'hi'
                  ? '1-क्लिक में होमस्क्रीन पर रिजल्ट'
                  : '1-tap instant draws on screen'}
              </p>
            </div>
          </div>

          {/* Right: Install & Dismiss Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <span>📥</span>
              <span>{lang === 'bn' ? 'ইনস্টল' : lang === 'hi' ? 'इंस्टॉल' : 'Install'}</span>
            </button>
            
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss app install banner for 7 days"
              title="Don't show for 7 days"
              className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors text-xs font-bold leading-none cursor-pointer"
            >
              ✕
            </button>
          </div>

        </div>

        {/* Browser Installation Guide (if native prompt is deferred or iOS) */}
        {showGuide && (
          <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-slate-700 space-y-1 animate-in fade-in duration-200">
            {isIOS ? (
              <>
                <p className="font-bold text-slate-900 text-[11px]">
                  🍏 iPhone/iPad Safari:
                </p>
                <ol className="list-decimal list-inside text-[10px] text-slate-600 space-y-0.5 pl-1 leading-relaxed">
                  <li>Safari-র নিচে <strong>Share (⎋)</strong> বাটনে ট্যাপ করুন।</li>
                  <li>মেনু থেকে <strong>"Add to Home Screen" (+)</strong> সিলেক্ট করুন।</li>
                  <li>উপরে <strong>"Add"</strong> চাপলেই হোম স্ক্রিনে অ্যাপ পেয়ে যাবেন।</li>
                </ol>
              </>
            ) : (
              <>
                <p className="font-bold text-slate-900 text-[11px]">
                  📲 Android / Chrome:
                </p>
                <p className="text-[10px] text-slate-600 leading-relaxed">
                  ব্রাউজারের ৩-ডট মেনুতে (⋮) ট্যাপ করে <strong>"Install app"</strong> অথবা <strong>"Add to Home screen"</strong> চাপুন।
                </p>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
