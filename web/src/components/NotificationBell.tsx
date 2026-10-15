import React, { useState, useEffect } from 'react';

export default function NotificationBell() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        setIsSubscribed(true);
      }
    }
  }, []);

  const handleClick = async () => {
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
        setToastMsg('ড্র হওয়ার সাথে সাথে ফলাফল নোটিফিকেশন চালু হয়েছে! ✓');
      } else if (Notification.permission === 'denied') {
        setToastMsg('নোটিফিকেশন অনুমতি ব্লক করা আছে। ব্রাউজার সেটিংসে গিয়ে অনুমতি দিন।');
      } else {
        setToastMsg('নোটিফিকেশন পারমিশন চাওয়া হয়েছে।');
      }
    } catch (e) {
      setToastMsg('নোটিফিকেশন শুরু করা যায়নি।');
    }

    setShowToast(true);
    setTimeout(() => setShowToast(false), 3500);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        title={isSubscribed ? 'নোটিফিকেশন চালু আছে' : 'ফলাফলের নোটিফিকেশন পেতে ক্লিক করুন'}
        aria-label="Result Notification Alert"
        className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl border flex items-center justify-center transition-all ${
          isSubscribed
            ? 'bg-amber-50 border-amber-300 text-amber-800'
            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-blue-700'
        }`}
      >
        <span className="text-sm sm:text-base">🔔</span>
        {isSubscribed ? (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-600 ring-2 ring-white"></span>
        ) : (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-pulse ring-2 ring-white"></span>
        )}
      </button>

      {/* Lightweight Popover Toast */}
      {showToast && (
        <div className="absolute right-0 top-11 z-50 w-64 bg-slate-900 text-white text-[11px] p-2.5 rounded-xl shadow-xl border border-slate-700 leading-snug animate-in fade-in duration-200">
          <div className="flex items-start gap-2">
            <span>📢</span>
            <p className="flex-1 font-medium">{toastMsg}</p>
          </div>
        </div>
      )}
    </div>
  );
}
