import React, { useState, useEffect } from 'react';
import { useLanguage } from '../lib/i18n';

export default function PushNotifyBanner() {
  const { lang } = useLanguage();
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

  // If already subscribed, not supported, or dismissed, hide completely to keep mobile clean!
  if (!isSupported || isDismissed || isSubscribed) return null;

  return (
    <aside
      aria-label="Result Notifications"
      className="bg-white border border-blue-200 rounded-2xl p-3.5 sm:p-5 shadow-sm relative overflow-hidden transition-all duration-300"
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3.5">
        
        {/* Left Side: Microcopy & Icon */}
        <div className="flex items-start sm:items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center text-xl flex-shrink-0 shadow-2xs">
            🔔
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
              {lang === 'bn' 
                ? 'প্রতিদিন ড্র ঘোষণার সাথে সাথে রেজাল্ট অ্যালার্ট পেতে চান?'
                : lang === 'hi'
                ? 'प्रतिदिन ड्रॉ घोषित होते ही रिजल्ट अलर्ट पाना चाहते हैं?'
                : 'Get Instant Result Alerts When Draws Are Declared?'}
            </h4>
            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
              {lang === 'bn'
                ? '১:০০ দুপুর, ৬:০০ সন্ধ্যা ও ৮:০০ রাত — অফিশিয়াল রেজাল্ট তৎক্ষণাৎ আপনার ফোনে পৌঁছাবে।'
                : lang === 'hi'
                ? '1:00 दोपहर, 6:00 शाम और 8:00 रात — आधिकारिक रिजल्ट तुरंत आपके फोन पर मिलेंगे।'
                : '1:00 PM, 6:00 PM, and 8:00 PM — official gazette winning numbers delivered instantly.'}
            </p>
          </div>
        </div>

        {/* Right Side: Action Triggers */}
        <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
          <button
            type="button"
            onClick={handleDismiss}
            className="text-xs text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-xl transition-colors font-semibold"
          >
            {lang === 'bn' ? 'পরে' : lang === 'hi' ? 'बाद में' : 'Later'}
          </button>
          
          <button
            type="button"
            onClick={handleSubscribe}
            disabled={isLoading}
            className="bg-blue-700 hover:bg-blue-800 text-white font-black text-xs sm:text-sm px-4 py-2 rounded-xl shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
          >
            <span>🔔</span>
            <span>
              {isLoading 
                ? (lang === 'bn' ? 'সংযুক্ত হচ্ছে...' : lang === 'hi' ? 'जोड़ रहे हैं...' : 'Enabling...') 
                : (lang === 'bn' ? 'চালু করুন' : lang === 'hi' ? 'चालू करें' : 'Enable Alerts')}
            </span>
          </button>
        </div>

      </div>
    </aside>
  );
}
