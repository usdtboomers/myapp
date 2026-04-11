import React, { useEffect, useState } from "react";
import { 
  Wallet, ArrowUpCircle, TrendingUp, Dices, Users 
} from "lucide-react";

// ✅ Packages Data (Achieved amount calculate karne ke liye)
// ✅ EXACT SAME CONFIG AS PLAN.JS
const packagesConfig = [
  { amount: 10, levels: [ { earning: 2 }, { earning: 3 }, { earning: 5 }, { earning: 5 }, { earning: 5 } ] },
  { amount: 30, levels: [ { earning: 5 }, { earning: 10 }, { earning: 15 }, { earning: 15 }, { earning: 15 } ] },
  { amount: 60, levels: [ { earning: 10 }, { earning: 20 }, { earning: 30 }, { earning: 30 }, { earning: 30 } ] },
  { amount: 120, levels: [ { earning: 20 }, { earning: 40 }, { earning: 60 }, { earning: 60 }, { earning: 60 } ] },
  { amount: 240, levels: [ { earning: 40 }, { earning: 80 }, { earning: 120 }, { earning: 120 }, { earning: 120 } ] },
  { amount: 480, levels: [ { earning: 80 }, { earning: 160 }, { earning: 240 }, { earning: 240 }, { earning: 240 } ] },
  { amount: 960, levels: [ { earning: 160 }, { earning: 320 }, { earning: 480 }, { earning: 480 }, { earning: 480 } ] }
];

// ✅ EXACT OFFSET MATCH WITH PLAN.JS
const packageOffsets = { 10: 0, 30: 5, 60: 10, 120: 15, 240: 20, 480: 25, 960: 30 };

const IncomeSummary = ({ income = {}, user = {} }) => {
  const [globalGrowth, setGlobalGrowth] = useState(0); 

  // ✅ 1. LIFETIME INCOMES FROM BACKEND (Withdrawal ke baad kam nahi honge)
  const directIncome = Number(income.totalDirectIncome) || Number(income.directIncome) || 0;
  const levelIncome = Number(income.totalLevelIncome) || Number(income.levelIncome) || 0;
  const spinIncome = Number(income.totalSpinIncome) || Number(income.spinIncome) || 0;
  
  // ✅ 2. USDT REWARD (Backend se aayega, Total sum jo kam nahi hoga)
  const rewardIncome = Number(income.totalRewardIncome) || Number(income.rewardIncome) || Number(user.rewardIncome) || 0;
  
  const topUpAmount = Number(user.topUpAmount) || 0;

  // ✅ 3. GLOBAL GROWTH (Frontend par calculate hoga)
  useEffect(() => {
    if (!user) return;

    const userPackages = user?.packages || []; 
    const joinDate = user?.createdAt ? new Date(user.createdAt).getTime() : Date.now();
    const currentTime = Date.now();

    const daysSinceJoined = Math.max(0, Math.floor((currentTime - joinDate) / (1000 * 60 * 60 * 24)));
    const hoursSinceJoined = Math.max(0, Math.floor((currentTime - joinDate) / (1000 * 60 * 60)));

    let totalFrontendAchieved = 0;

    packagesConfig.forEach((pkg) => {
      const activePackage = userPackages.find(p => p.amount === pkg.amount);
      const pkgOffset = packageOffsets[pkg.amount];

      pkg.levels.forEach((lvl, idx) => {
        // 1️⃣ FREE LOGIC
        let isAchievedFree = false;
        if (pkg.amount === 10) {
          isAchievedFree = hoursSinceJoined >= (idx * 4);
        } else {
          const requiredGlobalDays = pkgOffset + idx;
          isAchievedFree = daysSinceJoined >= requiredGlobalDays;
        }

        // 2️⃣ PAID LOGIC
        let isAchievedPaid = false;
        if (activePackage) {
          const startDate = new Date(activePackage.startDate || activePackage.date).getTime();
          if (pkg.amount === 10) {
            const activeHours = Math.max(0, Math.floor((currentTime - startDate) / (1000 * 60 * 60)));
            isAchievedPaid = activeHours >= (idx * 4);
          } else {
            const activeDays = Math.max(0, Math.floor((currentTime - startDate) / (1000 * 60 * 60 * 24)));
            isAchievedPaid = activeDays >= idx;
          }
        }

        // 🎯 Final check (Sync with Plan.js)
        if (isAchievedFree || isAchievedPaid) {
          totalFrontendAchieved += lvl.earning;
        }
      });
    });

    setGlobalGrowth(totalFrontendAchieved);
  }, [user]);
  // ✅ TOTAL INCOME = Sabhi Incomes + Global Growth
  const totalIncome = directIncome + levelIncome + spinIncome + rewardIncome + globalGrowth;

  const cardData = [
    { 
      label: "Total Income", 
      value: `$${totalIncome.toFixed(2)}`, 
      icon: Wallet,
      color: "text-green-400",
      bg: "bg-green-500/10",
      border: "border-green-500/20"
    },
    { 
      label: "Top-Up Amount", 
      value: `$${topUpAmount.toFixed(2)}`, 
      icon: ArrowUpCircle,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/20"
    },
    { 
      label: "Global Growth", 
      value: `$${globalGrowth.toFixed(2)}`, 
      icon: TrendingUp,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20"
    },
    { 
      label: "USDT Reward", 
      value: `$${rewardIncome.toFixed(2)}`, 
      icon: Dices, 
      color: "text-pink-400",
      bg: "bg-pink-500/10",
      border: "border-pink-500/20"
    },
    // 🔥 UPDATED BOX: Sirf Direct Income
    { 
        label: "Direct Income", 
        value: `$${directIncome.toFixed(2)}`, 
        icon: Users, 
        color: "text-orange-400",
        bg: "bg-orange-500/10",
        border: "border-orange-500/20"
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 text-white gap-4 mt-6">
      {cardData.map((item, index) => (
        <div
          key={index}
          className={`
            relative overflow-hidden p-5 rounded-2xl border ${item.border}
            bg-[#1e293b] hover:bg-[#334155] transition-all duration-300
            shadow-lg group
          `}
        >
          <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${item.bg} blur-2xl group-hover:blur-3xl transition-all duration-500`}></div>

          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                {item.label}
              </p>
              <h3 className={`text-2xl font-bold ${item.color} font-mono tracking-tight`}>
                {item.value}
              </h3>
            </div>
            
            <div className={`p-3 rounded-xl ${item.bg} ${item.color}`}>
              <item.icon size={22} strokeWidth={2} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default IncomeSummary;