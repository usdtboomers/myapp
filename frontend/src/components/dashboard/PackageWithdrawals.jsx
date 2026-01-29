import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";
import SpinnerOverlay from "../common/SpinnerOverlay";
import { Layers, BarChart3, Lock, CheckCircle, Zap } from "lucide-react";

// ✅ Custom Styles for Dotted BG & Animations
const customStyles = `
  .bg-dot-pattern {
    background-image: radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px);
    background-size: 20px 20px;
  }
`;

const API = process.env.REACT_APP_API_URL || "";

const PackageWithdrawals = () => {
  const { user, token, logout } = useAuth();
  const [pkgs, setPkgs] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({ totalMax: 0, totalWithdrawn: 0, totalRemaining: 0 });

  // ✅ New Package Configuration
  const packageConfig = {
    10: { name: "Bronze", color: "text-orange-400", border: "border-orange-500/30" },
    25: { name: "Silver", color: "text-slate-300", border: "border-slate-400/30" },
    50: { name: "Gold", color: "text-yellow-400", border: "border-yellow-500/30" },
    100: { name: "Platinum", color: "text-cyan-400", border: "border-cyan-500/30" },
    200: { name: "Diamond", color: "text-purple-400", border: "border-purple-500/30" },
    500: { name: "Elite", color: "text-pink-400", border: "border-pink-500/30" },
    1000: { name: "Infinity", color: "text-emerald-400", border: "border-emerald-500/30" },
  };

  /* =========================
      FETCH DATA
     ========================= */
  useEffect(() => {
    if (!user?.userId || !token) return;

    const fetchAll = async () => {
      try {
        setLoading(true);

        const url = (p) => (API ? `${API}${p}` : p);
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch Topups (Packages) and Withdrawals
        const [topupRes, withdrawRes] = await Promise.all([
          api.get(url(`/wallet/topup-history/${user.userId}`), { headers }),
          api.get(url(`/wallet/withdrawals/${user.userId}`), { headers }),
        ]);

        /* ---------- 1. Process Withdrawals ---------- */
        const withdrawalList = Array.isArray(withdrawRes?.data?.withdrawals)
          ? withdrawRes.data.withdrawals
          : [];
        setWithdrawals(withdrawalList);

        /* ---------- 2. Process Packages (Topups) ---------- */
        const topups = Array.isArray(topupRes.data) ? topupRes.data : [];
        const processedPkgs = [];

        // Logic: Group by Package ID or treat each topup as unique?
        // Treating each Top-up as a unique active package for accurate tracking
        topups.forEach((t) => {
           // Skip if sent to someone else
           if (t.toUserId && String(t.toUserId) !== String(user.userId)) return;

           const amt = Number(t.package ?? t.amount ?? 0);
           if (!amt) return;

           const config = packageConfig[amt] || { name: `Plan $${amt}`, color: "text-white", border: "border-gray-700" };
           
           // Max Withdraw Limit = 2x of Package Amount
           const maxLimit = amt * 2; 

           processedPkgs.push({
             id: t._id || Math.random(), // Unique ID
             name: config.name,
             amount: amt,
             maxWithdraw: maxLimit,
             withdrawn: 0, // Will calculate below
             color: config.color,
             border: config.border,
             date: t.date || new Date().toISOString()
           });
        });

        /* ---------- 3. Attribution Logic (FIFO) ---------- */
        // Allocate withdrawals to packages sequentially
        // (Assuming old packages must fill first or pro-rata? Using FIFO here)
        
        let remainingWithdrawals = withdrawalList.reduce((sum, w) => sum + Number(w.grossAmount ?? w.amount ?? 0), 0);
        let totalMax = 0;
        let totalWithdrawn = 0;

        // Sort packages by date (Oldest first) to fill limit correctly
        processedPkgs.sort((a, b) => new Date(a.date) - new Date(b.date));

        for (let pkg of processedPkgs) {
            totalMax += pkg.maxWithdraw;
            
            if (remainingWithdrawals > 0) {
                // How much can this package absorb?
                const availableSpace = pkg.maxWithdraw;
                const cut = Math.min(availableSpace, remainingWithdrawals);
                
                pkg.withdrawn = cut;
                remainingWithdrawals -= cut;
                totalWithdrawn += cut;
            } else {
                pkg.withdrawn = 0;
            }
        }

        setPkgs(processedPkgs);
        setSummary({
            totalMax,
            totalWithdrawn,
            totalRemaining: Math.max(0, totalMax - totalWithdrawn)
        });

      } catch (err) {
        console.error("Fetch error:", err);
        if (err?.response?.status === 401) logout();
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [user?.userId, token, logout]);

  if (!user || !token || loading) return <SpinnerOverlay />;

  return (
    <div className="max-w-7xl mx-auto p-4 text-white  bg-[#0f172a] relative overflow-hidden font-sans">
      <style>{customStyles}</style>
      
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-dot-pattern pointer-events-none opacity-20"></div>

      {/* Header */}
      <div className="text-center mb-10 relative z-10">
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
           WITHDRAWAL <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">LIMITS</span>
        </h2>
        <p className="text-gray-400 mt-2 text-sm uppercase tracking-widest">
           Track your 200% Limit Usage
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8 relative z-10">
          <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl text-center">
              <span className="text-xs text-gray-400 uppercase font-bold">Total Limit (2x)</span>
              <div className="text-2xl font-black text-white">${summary.totalMax.toFixed(2)}</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl text-center">
              <span className="text-xs text-gray-400 uppercase font-bold">Withdrawn</span>
              <div className="text-2xl font-black text-emerald-400">${summary.totalWithdrawn.toFixed(2)}</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl text-center">
              <span className="text-xs text-gray-400 uppercase font-bold">Remaining</span>
              <div className="text-2xl font-black text-yellow-400">${summary.totalRemaining.toFixed(2)}</div>
          </div>
      </div>

      {/* Package List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          {pkgs.length > 0 ? (
             pkgs.map((pkg, idx) => {
                 const percentageUsed = (pkg.withdrawn / pkg.maxWithdraw) * 100;
                 const isFull = percentageUsed >= 100;

                 return (
                    <div key={idx} className={`relative group rounded-2xl p-[1px] bg-gradient-to-b from-slate-700 to-slate-800 hover:shadow-xl transition-all`}>
                        <div className="bg-[#111827] rounded-[15px] p-5 h-full border border-slate-800 relative overflow-hidden">
                             
                             {/* Top Glow */}
                             <div className={`absolute top-0 left-0 right-0 h-20 opacity-10 blur-xl bg-current ${pkg.color}`}></div>

                             {/* Header */}
                             <div className="flex justify-between items-start mb-4 relative z-10">
                                 <div>
                                     <p className="text-[10px] font-bold text-gray-500 uppercase">Package</p>
                                     <h3 className={`text-xl font-black italic ${pkg.color}`}>{pkg.name}</h3>
                                     <p className="text-white font-bold">${pkg.amount}</p>
                                 </div>
                                 <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
                                     {isFull ? <CheckCircle size={18} className="text-emerald-500"/> : <Zap size={18} className="text-yellow-500"/>}
                                 </div>
                             </div>

                             {/* Progress Bar */}
                             <div className="mb-4">
                                <div className="flex justify-between text-xs mb-1 text-gray-400 font-medium">
                                    <span>Usage</span>
                                    <span>{percentageUsed.toFixed(0)}%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-1000 ${isFull ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'}`} 
                                        style={{width: `${percentageUsed}%`}}
                                    ></div>
                                </div>
                             </div>

                             {/* Stats Grid */}
                             <div className="grid grid-cols-2 gap-2 text-sm bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
                                 <div>
                                     <span className="block text-[10px] text-gray-500 uppercase">Limit (2x)</span>
                                     <span className="font-bold text-white">${pkg.maxWithdraw}</span>
                                 </div>
                                 <div className="text-right">
                                     <span className="block text-[10px] text-gray-500 uppercase">Withdrawn</span>
                                     <span className="font-bold text-emerald-400">${pkg.withdrawn.toFixed(2)}</span>
                                 </div>
                                 <div className="col-span-2 border-t border-slate-800 pt-2 mt-1 flex justify-between items-center">
                                     <span className="text-[10px] text-gray-500 uppercase">Remaining</span>
                                     <span className="font-bold text-yellow-400">${(pkg.maxWithdraw - pkg.withdrawn).toFixed(2)}</span>
                                 </div>
                             </div>

                        </div>
                    </div>
                 )
             })
          ) : (
             <div className="col-span-full text-center p-10 bg-slate-800/50 rounded-xl border border-slate-700 text-gray-400 italic">
                 No active packages found.
             </div>
          )}
      </div>

    </div>
  );
};

export default PackageWithdrawals;