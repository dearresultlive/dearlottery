import React, { useState, useEffect } from 'react';

export default function PushNotifyBanner() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true);
      if (Notification.permission === 'granted') {
        setIsSubscribed(true);
      }
    }
  }, []);

  const handleSubscribe = async () => {
    if (typeof window !== 'undefined' && (window as any).OneSignal) {
      try {
        await (window as any).OneSignal.Slidedown.promptPush();
        setIsSubscribed(true);
      } catch (e) {
        console.error('OneSignal prompt error:', e);
      }
    } else if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setIsSubscribed(true);
      }
    }
  };

  if (!isSupported) return null;

  return (
    <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
      <div className="flex items-center gap-3">
        <div className="bg-emerald-500/20 text-emerald-400 p-2.5 rounded-xl text-xl flex-shrink-0">
          🔔
        </div>
        <div>
          <h4 className="text-sm font-bold text-white">
            Get Live Result Alerts on Your Phone
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Instant push notification at 1:02 PM, 6:02 PM, and 8:02 PM the second results are out.
          </p>
        </div>
      </div>

      <button
        onClick={handleSubscribe}
        className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
          isSubscribed
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 active:scale-95'
        }`}
      >
        {isSubscribed ? (
          <>
            <span>✓ Alerts Enabled</span>
          </>
        ) : (
          <>
            <span>Enable Draw Alerts</span>
          </>
        )}
      </button>
    </div>
  );
}
