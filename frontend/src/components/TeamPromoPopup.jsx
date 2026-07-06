import React, { useState, useEffect } from "react";
import { useAuth } from '../context/AuthContext';

// Telegram Icon
const TelegramIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.287 5.906c-.778.324-2.334.994-4.666 2.01-.378.15-.577.298-.595.442-.03.243.275.339.69.47l.175.055c.408.133.958.288 1.243.292.26.004.545-.106.855-.332 2.07-1.419 3.123-2.14 3.158-2.163.021-.013.048-.024.08-.024.043 0 .083.023.083.064 0 .025-.015.05-.084.126-.068.075-1.503 1.405-1.637 1.543-.109.112-.224.22-.116.327.105.106 1.48 1.002 1.944 1.32.193.133.35.242.49.336.195.132.368.248.583.226.13-.013.256-.129.324-.447.214-1.002.684-3.418.9-4.57.022-.12.008-.22-.038-.282-.047-.063-.128-.088-.236-.06z"/>
  </svg>
);

const TeamPromoPopup = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false); 
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);

  // ✅ LOGIC 1: Only shows to users with exactly $10 top-up
  useEffect(() => {
    if (user && user.topUpAmount === 10 && !window.isTopupInProgress) {
      setIsOpen(true);
    }
  }, [user]);

  // ✅ LOGIC 2: Event Listener trigger
  useEffect(() => {
    const handleTrigger = () => {
      if (user && user.topUpAmount === 10) {
        setTimeout(() => {
          setIsOpen(true);
        }, 400); 
      }
    };
    window.addEventListener('showTeamPromo', handleTrigger);
    return () => window.removeEventListener('showTeamPromo', handleTrigger);
  }, [user]);

  // ✅ LOGIC 3: Countdown Timer Logic
  useEffect(() => {
    if (!user || user.topUpAmount !== 10) return;

    // Default base date: July 6, 2026 (for old users)
    const baseCutoffDate = new Date("2026-07-06T00:00:00Z").getTime();
    
    // Get user's topup date. Fallback to current date to prevent crashes.
    const userDateString = user.topUpDate || user.createdAt || new Date();
    const userTopUpTime = new Date(userDateString).getTime();

    let deadline;
    if (userTopUpTime < baseCutoffDate) {
      // For old users: July 6 + 7 Days
      deadline = baseCutoffDate + (7 * 24 * 60 * 60 * 1000);
    } else {
      // For new users: Topup Date + 7 Days
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

  const closePopup = () => {
    setIsOpen(false);
  };

  if (!isOpen || !user) return null;

  const referralLink = `${window.location.origin}/register?ref=${user.userId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); 
  };

  return (
    <>
      <style>{`
        .tp-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          z-index: 99998; display: flex; align-items: center; justify-content: center;
          background-color: rgba(0, 0, 0, 0.85); backdrop-filter: blur(8px);
          padding: 16px; font-family: system-ui, -apple-system, sans-serif;
        }
        
        .tp-box {
          position: relative; width: 100%; max-width: 420px;
          background-color: #0f172a; border: 2px solid rgba(239, 68, 68, 0.6); 
          border-radius: 20px; box-shadow: 0 0 40px rgba(239, 68, 68, 0.3); 
          overflow: hidden; animation: tp-popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        @keyframes tp-popIn {
          0% { opacity: 0; transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1); }
        }

        .tp-header {
          background: linear-gradient(135deg, #450a0a 0%, #0f172a 100%);
          padding: 30px 24px 20px; text-align: center; position: relative;
          border-bottom: 1px solid rgba(239, 68, 68, 0.3);
        }
        
        .tp-close-btn {
          position: absolute; top: 12px; right: 12px;
          width: 32px; height: 32px; border-radius: 50%; border: none;
          background: rgba(255,255,255,0.1); color: #fff; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s; font-size: 16px; font-weight: bold;
        }
        .tp-close-btn:hover { background: rgba(239, 68, 68, 0.8); color: white; }
        
        .tp-title { color: #fca5a5; font-size: 22px; font-weight: bold; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
        .tp-body { padding: 24px; text-align: center; }
        
        .tp-free-tag {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.5); border-radius: 8px; padding: 10px 16px; 
          display: block; margin-bottom: 15px; color: #ef4444; font-size: 16px; font-weight: 900; 
          letter-spacing: 0.5px;
        }

        /* TIMER CSS */
        .tp-timer-container {
          display: flex; justify-content: center; gap: 10px; margin: 15px 0 20px 0;
        }
        .tp-timer-box {
          background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-radius: 8px;
          padding: 8px; min-width: 65px; color: #fca5a5;
        }
        .tp-timer-value { font-size: 22px; font-weight: bold; display: block; color: #fff; }
        .tp-timer-label { font-size: 11px; text-transform: uppercase; font-weight: bold; }
        
        .tp-warning-text { color: #f87171; font-size: 14px; margin-bottom: 20px; font-weight: 600; line-height: 1.5; }
        .tp-text { color: #e2e8f0; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }
        
        .tp-btn {
          width: 100%; padding: 14px; border-radius: 12px; border: none;
          font-weight: bold; font-size: 15px; cursor: pointer;
          transition: all 0.2s; display: flex; align-items: center; justify-content: center;
          gap: 8px; text-decoration: none; margin-bottom: 12px;
        }
        
        .tp-btn-copy { background: linear-gradient(to right, #facc15, #eab308); color: #000; box-shadow: 0 4px 15px rgba(234, 179, 8, 0.3); }
        .tp-btn-copy:hover { background: linear-gradient(to right, #eab308, #ca8a04); transform: translateY(-2px); }
        .tp-btn-success { background-color: #22c55e; color: white; box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3); pointer-events: none; }
        
        .tp-btn-dismiss {
          width: 100%; padding: 8px; border: none; background: transparent;
          color: #94a3b8; cursor: pointer; transition: color 0.2s; font-size: 14px; font-weight: 500;
        }
        .tp-btn-dismiss:hover { color: #ffffff; text-decoration: underline; }
      `}</style>

      <div className="tp-overlay">
        <div className="tp-box">
          <div className="tp-header">
            <button onClick={closePopup} className="tp-close-btn">✕</button>
            <h2 className="tp-title">⚠️ ID DEACTIVATION WARNING</h2>
          </div>

          <div className="tp-body">
            <div className="tp-free-tag">
              ACTION REQUIRED WITHIN 7 DAYS
            </div>

            {/* COUNTDOWN TIMER UI */}
            {timeLeft && !timeLeft.expired ? (
              <div className="tp-timer-container">
                <div className="tp-timer-box">
                  <span className="tp-timer-value">{timeLeft.days}</span>
                  <span className="tp-timer-label">Days</span>
                </div>
                <div className="tp-timer-box">
                  <span className="tp-timer-value">{String(timeLeft.hours).padStart(2, '0')}</span>
                  <span className="tp-timer-label">Hours</span>
                </div>
                <div className="tp-timer-box">
                  <span className="tp-timer-value">{String(timeLeft.minutes).padStart(2, '0')}</span>
                  <span className="tp-timer-label">Mins</span>
                </div>
                <div className="tp-timer-box">
                  <span className="tp-timer-value">{String(timeLeft.seconds).padStart(2, '0')}</span>
                  <span className="tp-timer-label">Secs</span>
                </div>
              </div>
            ) : timeLeft && timeLeft.expired ? (
              <div className="tp-warning-text" style={{ fontSize: "18px", color: "#dc2626" }}>
                ⏳ TIME EXPIRED! PLEASE TOP UP IMMEDIATELY.
              </div>
            ) : null}

            <p className="tp-warning-text">
              If you do not upgrade with a <strong style={{ color: '#eab308' }}>$30 Top-Up</strong> within the given time, your Free $10 ID will be <strong style={{ color: 'white' }}>deactivated</strong> and you will have to top-up again from scratch.
            </p>

            <p className="tp-text" style={{ fontSize: '13px' }}>
              Build your team and upgrade immediately to unlock your withdrawals.
            </p>

            <div>
              <button onClick={handleCopyLink} className={`tp-btn ${copied ? 'tp-btn-success' : 'tp-btn-copy'}`}>
                {copied ? "✅ LINK COPIED!" : "📋 COPY REFERRAL LINK"}
              </button>

              <button onClick={closePopup} className="tp-btn-dismiss">I'll upgrade later</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TeamPromoPopup;