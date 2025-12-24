import React from "react";
import { 
  Wallet, 
  ArrowUpCircle, 
  Send, 
  Download, 
  Zap, 
  CreditCard, 
  Dices 
} from "lucide-react";

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
      label: "Deposit", 
      icon: Wallet, 
      onClick: onDepositClick, 
      color: "text-blue-400",
      bgHover: "group-hover:bg-blue-500/10",
      borderHover: "group-hover:border-blue-500/50"
    },
    { 
      label: "Top-Up", 
      icon: ArrowUpCircle, 
      onClick: onTopUpClick, 
      color: "text-emerald-400",
      bgHover: "group-hover:bg-emerald-500/10",
      borderHover: "group-hover:border-emerald-500/50"
    },
    { 
      label: "Transfer", 
      icon: Send, 
      onClick: onWalletTransferClick, 
      color: "text-purple-400",
      bgHover: "group-hover:bg-purple-500/10",
      borderHover: "group-hover:border-purple-500/50"
    },
    { 
      label: "Withdraw", 
      icon: Download, 
      onClick: onWithdrawClick, 
      color: "text-orange-400",
      bgHover: "group-hover:bg-orange-500/10",
      borderHover: "group-hover:border-orange-500/50"
    },
    { 
      label: "Instant", 
      icon: Zap, 
      onClick: onInstantWithdrawClick, 
      color: "text-yellow-400",
      bgHover: "group-hover:bg-yellow-500/10",
      borderHover: "group-hover:border-yellow-500/50"
    },
    { 
      label: "Credit", 
      icon: CreditCard, 
      onClick: onCreditToWalletClick, 
      color: "text-cyan-400",
      bgHover: "group-hover:bg-cyan-500/10",
      borderHover: "group-hover:border-cyan-500/50"
    },
  ];

  return (
    <div className="grid grid-cols-3 md:grid-cols-4 text-white lg:grid-cols-7 gap-3 mb-6">
      
      {/* Standard Action Buttons */}
      {actions.map((action, index) => (
        <button
          key={index}
          onClick={() => !disabled && action.onClick && action.onClick()}
          disabled={disabled}
          className={`
            relative group flex flex-col items-center justify-center p-3 rounded-xl 
            bg-[#1e293b] border border-slate-700 
            transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50
            ${action.borderHover}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <div className={`mb-2 p-2.5 rounded-full bg-slate-800 transition-colors ${action.color} ${action.bgHover}`}>
            <action.icon size={18} />
          </div>
          <span className="text-[11px] font-semibold text-slate-400 group-hover:text-white tracking-wide uppercase">
            {action.label}
          </span>
        </button>
      ))}

      {/* 🎰 Premium Spin Button (Full Width on Mobile if needed, or fits in grid) */}
      <button
        onClick={onSpinClick}
        disabled={disabled}
        className={`
          relative group flex flex-col items-center justify-center p-3 rounded-xl 
          bg-gradient-to-br from-yellow-500 to-amber-700 border border-yellow-400/50
          transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/30
          overflow-hidden
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          col-span-3 md:col-span-1 lg:col-span-1
        `}
      >
        <div className="mb-2 p-2.5 rounded-full bg-black/20 text-yellow-100 group-hover:scale-110 transition-transform duration-300 border border-white/10">
          <Dices size={18} className="animate-spin-slow" />
        </div>
        <span className="text-[11px] font-bold text-white tracking-wider uppercase drop-shadow-sm">
          Spin & Win
        </span>
        
        {/* Shiny Effect */}
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
      </button>

      {/* Animation Style for Spin Icon */}
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default QuickActions;