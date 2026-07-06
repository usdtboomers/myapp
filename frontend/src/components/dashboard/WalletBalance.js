import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";

const WalletBalance = () => {
  const { user } = useAuth();
  const [timeLeft, setTimeLeft] = useState(null);

  const format = (val) => `$${Number(val || 0).toFixed(2)}`;

  // ✅ Timer Logic for $10 ID Users
  useEffect(() => {
    if (!user || user.topUpAmount !== 10) return;

    // Default base date: July 6, 2026 (for old users)
    const baseCutoffDate = new Date("2026-07-06T00:00:00Z").getTime();
    
    const userDateString = user.topUpDate || user.createdAt || new Date();
    const userTopUpTime = new Date(userDateString).getTime();

    let deadline;
    if (userTopUpTime < baseCutoffDate) {
      deadline = baseCutoffDate + (7 * 24 * 60 * 60 * 1000);
    } else {
      deadline = userTopUpTime + (7 * 24 * 60 * 60 * 1000);
    }

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = deadline - now;

      if (distance < 0) {
        clearInterval(timer);
        setTimeLeft({ expired: true });
      } else {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [user]);

  return (
    <div className="flex flex-col gap-3">
      {/* Original Wallet Balance */}
      <p className="text-white text-xl font-bold">
        Wallet Balance: {format(user?.walletBalance)}
      </p>

      {/* Timer UI (Only shows if topUpAmount is exactly 10) */}
      {user?.topUpAmount === 10 && (
        <div className="bg-red-950/40 border border-red-500/50 rounded-lg p-3 max-w-sm">
          <p className="text-red-400 text-sm font-semibold mb-2">
            ⚠️ Upgrade to $30 before ID deactivation:
          </p>
          
          {timeLeft && !timeLeft.expired ? (
            <div className="flex gap-2">
              <div className="bg-red-500/20 border border-red-500/30 rounded px-3 py-1 text-center min-w-[60px]">
                <span className="text-white text-lg font-bold block">{timeLeft.days}</span>
                <span className="text-[10px] text-red-300 uppercase font-bold tracking-wider">Days</span>
              </div>
              <div className="bg-red-500/20 border border-red-500/30 rounded px-3 py-1 text-center min-w-[60px]">
                <span className="text-white text-lg font-bold block">{String(timeLeft.hours).padStart(2, '0')}</span>
                <span className="text-[10px] text-red-300 uppercase font-bold tracking-wider">Hrs</span>
              </div>
              <div className="bg-red-500/20 border border-red-500/30 rounded px-3 py-1 text-center min-w-[60px]">
                <span className="text-white text-lg font-bold block">{String(timeLeft.minutes).padStart(2, '0')}</span>
                <span className="text-[10px] text-red-300 uppercase font-bold tracking-wider">Mins</span>
              </div>
              <div className="bg-red-500/20 border border-red-500/30 rounded px-3 py-1 text-center min-w-[60px]">
                <span className="text-white text-lg font-bold block">{String(timeLeft.seconds).padStart(2, '0')}</span>
                <span className="text-[10px] text-red-300 uppercase font-bold tracking-wider">Secs</span>
              </div>
            </div>
          ) : timeLeft && timeLeft.expired ? (
            <div className="text-red-500 font-bold text-sm">
              ⏳ TIME EXPIRED! PLEASE TOP UP IMMEDIATELY.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default WalletBalance;