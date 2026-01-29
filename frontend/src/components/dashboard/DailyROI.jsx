import React, { useState } from "react";
import TopUpModal from "../modals/TopUpModalWithInput";
import { useAuth } from "../../context/AuthContext";
import { 
  CheckCircle, Zap, Lock, Layers, BarChart3, Activity, Cpu 
} from "lucide-react"; 

// ✅ Styles for Custom Animations
const customStyles = `
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }
  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes pulse-glow {
    0%, 100% { opacity: 0.5; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.05); }
  }
  @keyframes shimmer-slide {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .animate-float { animation: float 4s ease-in-out infinite; }
  .animate-spin-slow { animation: spin-slow 8s linear infinite; }
  .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
  .animate-shimmer { animation: shimmer-slide 2s infinite linear; }
`;

// ✅ 1. STATIC LIST: Ye hamesha dikhegi chahe user naya ho ya purana
const allPackages = [
  { amount: 10, name: "Bronze", color: "from-yellow-400 to-yellow-600", accent: "text-yellow-300", border: "border-yellow-400/40", shadow: "shadow-yellow-500/20" },
{
  amount: 25,
  name: "Silver",
  color: "from-gray-300 to-gray-500",
  accent: "text-gray-200",
  border: "border-gray-400/40",
  shadow: "shadow-gray-500/20",
}
,  { amount: 50, name: "Gold", color: "from-yellow-400 to-amber-600", accent: "text-yellow-400", border: "border-yellow-500/40", shadow: "shadow-yellow-500/20" },
  { amount: 100, name: "Platinum", color: "from-blue-400 to-indigo-600", accent: "text-blue-400", border: "border-blue-500/40", shadow: "shadow-blue-500/20" },
  { amount: 200, name: "Diamond", color: "from-purple-500 to-indigo-600", accent: "text-purple-400", border: "border-purple-500/40", shadow: "shadow-purple-500/20" },
  { amount: 500, name: "Elite", color: "from-pink-500 to-rose-600", accent: "text-pink-400", border: "border-pink-500/40", shadow: "shadow-pink-500/20" },
  { amount: 1000, name: "Infinity", color: "from-red-600 to-red-900", accent: "text-red-400", border: "border-red-600/50", shadow: "shadow-red-700/30" },
];

export default function DailyROI() {
  const { user, setUser, token } = useAuth();
  const [showTopUp, setShowTopUp] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(null);

  const handleTopUpSuccess = async () => {
    try {
      const res = await fetch(`/user/${user.userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUser(data.user);
    } catch (err) {
      console.error("Failed to refresh user:", err);
    }
  };

  const getROIPercentage = (amount) => {
    if (amount <= 50) return 4;
    if (amount <= 500) return 5;
    return 6;
  };

  const openTopUp = (amt) => {
    setSelectedAmount(amt);
    setShowTopUp(true);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 text-white min-h-screen relative overflow-hidden">
      <style>{customStyles}</style>
      
      {/* Background Ambient Glow */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] animate-pulse"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-600/20 rounded-full blur-[100px] animate-pulse delay-1000"></div>
      </div>

      {showTopUp && (
        <TopUpModal
          packages={allPackages} 
          initialAmount={selectedAmount}
          onClose={() => setShowTopUp(false)}
          onTopUpSuccess={handleTopUpSuccess}
        />
      )}

      {/* Grid Layout - ✅ Using 'allPackages' to ensure everything shows */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        
        {allPackages.map((pkg, idx) => {
          // ✅ 2. Active Check: Sirf yahan check karenge ki user ke paas ye hai ya nahi
          const activePlan = user?.dailyROI?.find(p => Number(p.amount) === Number(pkg.amount));
          
          const roiRate = getROIPercentage(pkg.amount);
          const dailyIncome = (pkg.amount * roiRate) / 100;
          const targetAmount = pkg.amount * 2;

          let totalEarned = 0;
          let progress = 0;
          let isCompleted = false;

          if (activePlan) {
             totalEarned = activePlan.totalEarned || (activePlan.claimedDays * dailyIncome);
             progress = Math.min(100, (totalEarned / targetAmount) * 100);
             isCompleted = progress >= 100;
          }

          return (
            <div 
              key={idx} 
              className={`group relative rounded-3xl transition-all duration-500
                ${activePlan 
                  ? "scale-105 z-10" 
                  : "hover:scale-[1.02] hover:-translate-y-2 opacity-80 hover:opacity-100"
                }
              `}
            >
              
              {/* Card Container */}
              <div className={`relative h-full overflow-hidden rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-white/5 shadow-2xl flex flex-col
                  ${activePlan ? `ring-1 ring-offset-0 ${pkg.accent.replace('text', 'ring')}/50` : 'hover:border-white/10'}
              `}>
                
                {/* Rotating Glow for Active */}
                {activePlan && (
                  <div className="absolute -top-20 -right-20 w-60 h-60 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl animate-pulse-glow"></div>
                )}

                {/* Header */}
                <div className={`p-6 relative overflow-hidden ${activePlan ? '' : 'grayscale-[0.5] group-hover:grayscale-0 transition-all duration-500'}`}>
                    <div className={`absolute top-0 left-0 w-full h-32 bg-gradient-to-b ${pkg.color} opacity-20`}></div>

                    <div className="relative z-10 flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-white/60 uppercase tracking-wider mb-1">Core Type</p>
                            <h3 className="text-2xl font-black text-white italic">{pkg.name}</h3>
                            <p className={`text-sm font-mono font-bold mt-1 ${pkg.accent}`}>${pkg.amount}</p>
                        </div>
                        <div className={`p-3 rounded-2xl bg-gradient-to-br ${pkg.color} shadow-lg shadow-black/50 animate-float`}>
                            {activePlan ? <Zap className="text-white fill-white" size={24} /> : <Lock className="text-white/80" size={24} />}
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="px-6 flex-grow space-y-6 relative z-10">
                    {/* Common Stats for Both Active & Inactive */}
                    <div className="grid grid-cols-2 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/5">
                        <div className="p-3 text-center bg-slate-950/30">
                            <span className="block text-[10px] text-white uppercase font-bold">Daily ROI</span>
                            <span className={`text-lg font-black text-white`}>{roiRate}%</span>
                        </div>
                        <div className="p-3 text-center bg-slate-950/30">
                            <span className="block text-[10px] text-white uppercase font-bold">Income</span>
                            <span className={`text-lg font-black ${pkg.accent}`}>${dailyIncome} / Day</span>
                        </div>
                    </div>

                    {/* Conditional Content */}
                    {activePlan ? (
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <span className="text-xs text-white font-semibold">Total Progress</span>
                                <span className={`text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r ${pkg.color}`}>
                                    ${totalEarned.toFixed(2)}
                                </span>
                            </div>
                            <div className="relative h-4 bg-slate-950 rounded-full overflow-hidden border border-white/10 shadow-inner">
                                <div className={`absolute top-0 left-0 h-full bg-gradient-to-r ${pkg.color} transition-all duration-1000 ease-out`} style={{ width: `${progress}%` }}>
                                    <div className="absolute inset-0 w-full h-full bg-white/20 animate-shimmer" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }}></div>
                                </div>
                            </div>
                            <div className="flex justify-between text-[10px] text-white font-mono">
                                <span>Target: ${targetAmount}</span>
                                <span>{progress.toFixed(0)}%</span>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2 py-2">
                             <div className="flex items-center gap-3 text-white text-sm">
                                <div className="p-1.5 rounded-full bg-white/5"><Layers size={14}/></div>
                                <span>200% Total Return</span>
                             </div>
                             <div className="flex items-center gap-3 text-white text-sm font-bold">
                                <div className="p-1.5 rounded-full bg-white/5"><BarChart3 size={14}/></div>
                                <span>Max Profit: <span className="text-white font-bold">${targetAmount}</span></span>
                             </div>
                         </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 mt-auto relative z-10">
                    {activePlan ? (
                        isCompleted ? (
                             <div className="w-full py-4 rounded-xl bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 font-bold flex items-center justify-center gap-2">
                                <CheckCircle size={20} /> COMPLETED
                             </div>
                        ) : (
                            <div className="relative w-full py-4 overflow-hidden rounded-xl bg-slate-950 border border-white/5 group-hover:border-white/20 transition-colors">
                                <div className={`absolute inset-0 bg-gradient-to-r ${pkg.color} opacity-10`}></div>
                                <div className="absolute top-0 bottom-0 w-1 bg-white/40 blur-[2px] animate-shimmer"></div>
                                <div className="relative flex items-center justify-center gap-3">
                                    <div className="relative">
                                        <div className={`absolute inset-0 rounded-full bg-white animate-ping opacity-75`}></div>
                                        <div className={`relative w-2 h-2 rounded-full ${pkg.accent.replace('text','bg')}`}></div>
                                    </div>
                                    <span className={`text-sm font-bold tracking-widest uppercase ${pkg.accent}`}> Earnings Active</span>
                                </div>
                            </div>
                        )
                    ) : (
                        <button 
                            onClick={() => openTopUp(pkg.amount)}
                            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-2 group-hover:shadow-${pkg.shadow}
                                bg-gradient-to-r ${pkg.color} bg-[length:200%_200%] hover:bg-[100%_100%]
                            `}
                        >
                            <Cpu size={18} className="animate-pulse" /> Unlock Earnings
                        </button>
                    )}
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}