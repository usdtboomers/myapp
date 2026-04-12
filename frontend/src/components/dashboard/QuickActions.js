import React from "react";
import { 
  Wallet, 
  ArrowUpCircle, 
  Send, 
  Download, 
  CreditCard, 
} from "lucide-react";

// Custom Telegram Icon
const TelegramIcon = ({ size = 18 }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    fill="currentColor" 
    viewBox="0 0 16 16"
  >
    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.287 5.906c-.778.324-2.334.994-4.666 2.01-.378.15-.577.298-.595.442-.03.243.275.339.69.47l.175.055c.408.133.958.288 1.243.292.26.004.545-.106.855-.332 2.07-1.419 3.123-2.14 3.158-2.163.021-.013.048-.024.08-.024.043 0 .083.023.083.064 0 .025-.015.05-.084.126-.068.075-1.503 1.405-1.637 1.543-.109.112-.224.22-.116.327.105.106 1.48 1.002 1.944 1.32.193.133.35.242.49.336.195.132.368.248.583.226.13-.013.256-.129.324-.447.214-1.002.684-3.418.9-4.57.022-.12.008-.22-.038-.282-.047-.063-.128-.088-.236-.06z"/>
  </svg>
);

const QuickActions = ({
  onDepositClick,
  onTopUpClick,
  onWalletTransferClick,
  onWithdrawClick,
  onInstantWithdrawClick,
  onCreditToWalletClick,
  onSpinClick,
  disabled = false,
}) => {

  const actions = [
    { 
      label: "Deposit", icon: Wallet, onClick: onDepositClick, 
      color: "text-blue-400", bgHover: "group-hover:bg-blue-500/10", borderHover: "group-hover:border-blue-500/50"
    },
    { 
      label: "Top-Up", icon: ArrowUpCircle, onClick: onTopUpClick, 
      color: "text-emerald-400", bgHover: "group-hover:bg-emerald-500/10", borderHover: "group-hover:border-emerald-500/50"
    },
    { 
      label: "Wallet Transfer", icon: Send, onClick: onWalletTransferClick, 
      color: "text-purple-400", bgHover: "group-hover:bg-purple-500/10", borderHover: "group-hover:border-purple-500/50"
    },
    { 
      label: "Withdraw", icon: Download, onClick: onWithdrawClick, 
      color: "text-orange-400", bgHover: "group-hover:bg-orange-500/10", borderHover: "group-hover:border-orange-500/50"
    },
    { 
      label: "Withdraw to Wallet", icon: CreditCard, onClick: onCreditToWalletClick, 
      color: "text-cyan-400", bgHover: "group-hover:bg-cyan-500/10", borderHover: "group-hover:border-cyan-500/50"
    },
    {
      label: "Join Telegram", icon: TelegramIcon, link: "https://t.me/usdt_boomers",
      isAnimated: true 
    }
  ];

  return (
    <>
      <style>
        {`
          @keyframes telegram-pulse {
            0% { box-shadow: 0 0 5px rgba(56, 165, 225, 0.4); transform: scale(1); }
            50% { box-shadow: 0 0 15px rgba(56, 165, 225, 0.8); transform: scale(1.02); }
            100% { box-shadow: 0 0 5px rgba(56, 165, 225, 0.4); transform: scale(1); }
          }
          
          /* 🔥 Light Aane-Jane ka Smooth Animation 🔥 */
          @keyframes telegram-shine {
            0% { left: -100%; }
            50% { left: 200%; } /* Ye light ko pura aage bhejega */
            100% { left: -100%; } /* Ye wapas piche layega (aane-jane ka effect) */
          }

          .telegram-special-box {
            background-color: #38A5E1 !important; /* Pehle se lighter aur bright blue */
            border-color: #38A5E1 !important;
            animation: telegram-pulse 2.5s infinite;
            overflow: hidden;
            position: relative; /* Light ko box ke andar rakhne ke liye */
          }

          .telegram-special-box * {
            color: white !important; 
          }

          .telegram-special-box .icon-wrapper {
            background-color: rgba(255, 255, 255, 0.25) !important;
          }

          /* Light Effect (Shine Bar) */
          .telegram-special-box::after {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 80px; /* Light ki chaudai badhayi hai */
            height: 100%;
            background: linear-gradient(
              to right, 
              rgba(255,255,255,0) 0%, 
              rgba(255,255,255,0.6) 50%, /* Safed light ko thoda dark/visible kiya */
              rgba(255,255,255,0) 100%
            );
            transform: skewX(-25deg);
            animation: telegram-shine 3s ease-in-out infinite; /* Smooth chalne ke liye ease-in-out */
          }

          .telegram-special-box:hover {
            animation: none;
            background-color: #229ED9 !important; /* Hover par thoda dark hoga */
            border-color: #229ED9 !important;
          }
          
          .telegram-special-box:hover::after {
            animation: none; /* Hover karne par light ruk jayegi */
          }
        `}
      </style>

      <div className="grid grid-cols-3 md:grid-cols-4 text-white lg:grid-cols-6 gap-3">
        
        {actions.map((action, index) => {
          const isTelegram = action.isAnimated;
          
          const defaultBoxStyle = isTelegram ? "" : `bg-[#1e293b] border-slate-700 ${action.borderHover}`;
          
          const boxStyles = `relative group flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50 h-full w-full ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${defaultBoxStyle} ${isTelegram ? 'telegram-special-box' : ''}`;
          
          const defaultIconStyle = isTelegram ? "icon-wrapper" : `bg-slate-800 ${action.color} ${action.bgHover}`;

          const content = (
            <>
              <div className={`mb-2 p-2.5 rounded-full flex items-center justify-center transition-colors ${defaultIconStyle}`}>
                <action.icon size={18} />
              </div>
              <span className={`text-[11px] font-semibold tracking-wide uppercase text-center transition-colors ${isTelegram ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
                {action.label}
              </span>
            </>
          );

          if (action.link) {
            return (
              <a key={index} href={action.link} target="_blank" rel="noopener noreferrer" className={boxStyles} style={{ textDecoration: 'none' }}>
                {content}
              </a>
            );
          }

          return (
            <button key={index} onClick={() => !disabled && action.onClick && action.onClick()} disabled={disabled} className={boxStyles}>
              {content}
            </button>
          );
        })}

      </div>
    </>
  );
};

export default QuickActions;