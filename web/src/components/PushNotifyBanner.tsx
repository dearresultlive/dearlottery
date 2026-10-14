import React, { useState, useEffect } from 'react';

export default function PushNotifyBanner() {
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true);
      
      if (Notification.permission === 'granted') {
        setIsSubscribed(true);
      }

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
      className="bg-white border border-blue-200 rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden transition-all duration-300"
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Left Side: Bilingual Microcopy & Icon */}
        <div className="flex items-start sm:items-center gap-3.5 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center text-xl flex-shrink-0 shadow-2xs">
            🔔
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex flex-wrap items-center gap-1.5">
              <span>প্রতিদিন ড্র হওয়ার সাথে সাথে রেজাল্ট নোটিফিকেশন পেতে চান?</span>
              <span className="text-xs font-semibold text-blue-700">(Get instant alerts)</span>
            </h4>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              ১:০০ PM দুপুর, ৬:০০ PM সন্ধ্যা ও ৮:০০ PM রাত — রেজাল্ট ঘোষণা মাত্রই আপনার ফোনে সরাসরি নোটিফিকেশন পেয়ে যাবেন।
            </p>
          </div>
        </div>

        {/* Right Side: Action Triggers */}
        <div className="flex items-center gap-2.5 self-end sm:self-center flex-shrink-0">
          {isSubscribed ? (
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 px-3.5 py-1.5 rounded-xl text-xs font-bold">
              <span>✓</span>
              <span>নোটিফিকেশন সক্রিয় আছে (Active)</span>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-xs text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-xl transition-colors font-semibold"
              >
                পরে (Not Now)
              </button>
              
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={isLoading}
                className="bg-blue-700 hover:bg-blue-800 text-white font-black text-xs sm:text-sm px-4 sm:px-5 py-2 rounded-xl shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
              >
                <span>🔔</span>
                <span>{isLoading ? 'সংযুক্ত হচ্ছে...' : 'চালু করুন (Enable)'}</span>
              </button>
            </>
          )}
        </div>

      </div>
    </aside>
  );
}
