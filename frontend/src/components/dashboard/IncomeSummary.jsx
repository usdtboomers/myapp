import React, { useEffect, useState } from "react";
import api from "api/axios";
import { 
  Globe, 
  Wallet, 
  ArrowUpCircle, 
  TrendingUp, 
  UserPlus, 
  Layers, 
  Dices, 
  RotateCw 
} from "lucide-react";

const IncomeSummary = ({ income = {}, user = {} }) => {
  const [backendCount, setBackendCount] = useState(null);
  const [virtualIncrement, setVirtualIncrement] = useState(
    Number(localStorage.getItem("virtualTeamIncrement")) || 0
  );

  // Income values
  // Income values
const directIncome = Number(income.directIncome) || 0;
const levelIncome = Number(income.levelIncome) || 0;

// 🔥 FIX: planIncome number + object dono handle
const planIncomeRaw = income.planIncome ?? 0;

const dailyIncome =
  typeof planIncomeRaw === "number"
    ? planIncomeRaw
    : Object.values(planIncomeRaw).reduce(
        (sum, val) => sum + Number(val || 0),
        0
      );

const spinIncome = Number(income.spinIncome) || 0;
const availableSpins = Number(income.availableSpins) || 0;
const topUpAmount = Number(user.topUpAmount) || 0;

const totalIncome =
  directIncome + levelIncome + dailyIncome + spinIncome;

  // Only display after backend count is loaded
  const globalTeamCount =
    backendCount !== null ? backendCount + virtualIncrement : "Loading...";



 
  useEffect(() => {
    if (!user?.userId) return;

    let isMounted = true;

    const fetchBackendCount = async () => {
      try {
        const res = await api.get(
          `/user/global-team-count/${user.userId}`
        );
        if (!isMounted) return;

        const realCount = res.data.count || 0;
        setBackendCount(realCount);

        // Ensure virtualIncrement >= backendCount
        setVirtualIncrement(prev => {
          const newVal = Math.max(prev, realCount);
          localStorage.setItem("virtualTeamIncrement", newVal);
          return newVal;
        });
      } catch (err) {
        console.log("Error fetching backend count:", err);
      }
    };

    fetchBackendCount();

    // Increment virtual every minute
    const interval = setInterval(() => {
      setVirtualIncrement(prev => {
        const newVal = prev + 1;
        localStorage.setItem("virtualTeamIncrement", newVal);
        return newVal;
      });
    }, 60000); // 1 min

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user?.userId]);

  const cardData = [
    { 
      label: "Elite Network", 
      value: globalTeamCount.toLocaleString?.() || globalTeamCount, 
      icon: Globe,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20"
    },
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
      label: "Plan Income", 
      value: `$${dailyIncome.toFixed(2)}`, 
      icon: TrendingUp,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20"
    },
    { 
      label: "Direct Income", 
      value: `$${directIncome.toFixed(2)}`, 
      icon: UserPlus,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20"
    },
    { 
      label: "Level Income", 
      value: `$${levelIncome.toFixed(2)}`, 
      icon: Layers,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/20"
    },
    { 
      label: "Spin Income", 
      value: `$${spinIncome.toFixed(2)}`, 
      icon: Dices,
      color: "text-pink-400",
      bg: "bg-pink-500/10",
      border: "border-pink-500/20"
    },
    { 
      label: "Available Spins", 
      value: availableSpins.toLocaleString(), 
      icon: RotateCw,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20"
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 text-white lg:grid-cols-4 gap-4 mt-6">
      {cardData.map((item, index) => (
        <div
          key={index}
          className={`
            relative overflow-hidden p-5 rounded-2xl border ${item.border}
            bg-[#1e293b] hover:bg-[#334155] transition-all duration-300
            shadow-lg group
          `}
        >
          {/* Background Glow */}
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