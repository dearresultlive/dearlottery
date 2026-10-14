import React, { useState, useEffect } from 'react';

export default function PushNotifyBanner() {
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true);
      
      // Check current permission
      if (Notification.permission === 'granted') {
        setIsSubscribed(true);
      }

      // Check if user dismissed prompt in the last 24 hours
      const dismissedAt = localStorage.getItem('dear_push_prompt_dismissed');
      if (dismissedAt) {
        const timeDiff = Date.now() - parseInt(dismissedAt, 10);
        if (timeDiff < 24 * 60 * 60 * 1000) {
          setIsDismissed(true);
        }
      }
    }
  }, []);

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      if (typeof window !== 'undefined' && (window as any).OneSignal) {
        const oneSignal = (window as any).OneSignal;
        if (oneSignal.Notifications?.requestPermission) {
          await oneSignal.Notifications.requestPermission();
        } else if (oneSignal.Slidedown?.promptPush) {
          await oneSignal.Slidedown.promptPush();
        }
      } else if (typeof window !== 'undefined' && 'Notification' in window) {
        await Notification.requestPermission();
      }

      if (Notification.permission === 'granted') {
        setIsSubscribed(true);
        localStorage.removeItem('dear_push_prompt_dismissed');
      }
    } catch (err) {
      console.error('Push subscription error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dear_push_prompt_dismissed', Date.now().toString());
    }
  };

  if (!isSupported || (isDismissed && !isSubscribed)) return null;

  return (
    <aside
      aria-label="Result Notifications"
      className="bg-gradient-to-r from-amber-500/15 via-slate-900 to-emerald-500/15 border-2 border-amber-400/40 rounded-3xl p-4 sm:p-5 shadow-2xl relative overflow-hidden transition-all duration-300"
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Left Side: Bilingual Microcopy & Icon */}
        <div className="flex items-start sm:items-center gap-3.5 w-full sm:w-auto">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center text-xl flex-shrink-0 shadow-lg shadow-amber-500/20">
            🔔
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-black text-white tracking-tight flex flex-wrap items-center gap-2">
              <span>🔔 প্রতিদিন ড্র হওয়ার সাথে সাথে রেজাল্ট নোটিফিকেশন পেতে চান?</span>
              <span className="text-xs font-semibold text-amber-300">(Get instant draw alerts)</span>
            </h4>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              ১:০০ PM দুপুর, ৬:০০ PM সন্ধ্যা ও ৮:০০ PM রাত — রেজাল্ট ঘোষণা মাত্রই আপনার ফোনে সরাসরি নোটিফিকেশন পেয়ে যাবেন।
            </p>
          </div>
        </div>

        {/* Right Side: Action Triggers */}
        <div className="flex items-center gap-2.5 self-end sm:self-center flex-shrink-0">
          {isSubscribed ? (
            <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-4 py-2 rounded-xl text-xs font-bold">
              <span>✓</span>
              <span>নোটিফিকেশন সক্রিয় আছে (Alerts Active)</span>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-xs text-slate-400 hover:text-white px-3 py-2 rounded-xl transition-colors font-medium"
              >
                পরে (Not Now)
              </button>
              
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={isLoading}
                className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm px-4 sm:px-5 py-2.5 rounded-xl shadow-lg shadow-amber-500/25 transition-all active:scale-95 flex items-center gap-2"
              >
                <span>🔔</span>
                <span>{isLoading ? 'সংযুক্ত হচ্ছে...' : 'হ্যাঁ, চালু করুন (Enable)'}</span>
              </button>
            </>
          )}
        </div>

      </div>
    </aside>
  );
}
