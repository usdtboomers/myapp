import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { CheckCircle, Lock } from "lucide-react";

// ✅ Background Pattern & Glass Card Styles
const customStyles = `
  .bg-dot-pattern {
    background-color: transparent;
    background-image: radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px);
    background-size: 24px 24px;
  }
  .glass-table-wrapper {
    background: rgba(255, 255, 255, 0.02);
    backdrop-filter: blur(10px);
    box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.5);
  }
  .glass-row:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`;

// ✅ All Packages Data Configuration (Added $10 Package)
const packagesConfig = [
  { amount: 10, levels: [ { level: 1, team: 10, earning: 2 }, { level: 2, team: 20, earning: 3 }, { level: 3, team: 30, earning: 5 }, { level: 4, team: 50, earning: 5 }, { level: 5, team: 100, earning: 5 } ] },
  { amount: 30, levels: [ { level: 1, team: 10, earning: 5 }, { level: 2, team: 20, earning: 10 }, { level: 3, team: 50, earning: 15 }, { level: 4, team: 100, earning: 15 }, { level: 5, team: 200, earning: 15 } ] },
  { amount: 60, levels: [ { level: 1, team: 10, earning: 10 }, { level: 2, team: 20, earning: 20 }, { level: 3, team: 50, earning: 30 }, { level: 4, team: 100, earning: 30 }, { level: 5, team: 200, earning: 30 } ] },
  { amount: 120, levels: [ { level: 1, team: 10, earning: 20 }, { level: 2, team: 20, earning: 40 }, { level: 3, team: 50, earning: 60 }, { level: 4, team: 100, earning: 60 }, { level: 5, team: 200, earning: 60 } ] },
  { amount: 240, levels: [ { level: 1, team: 10, earning: 40 }, { level: 2, team: 20, earning: 80 }, { level: 3, team: 50, earning: 120 }, { level: 4, team: 100, earning: 120 }, { level: 5, team: 200, earning: 120 } ] },
  { amount: 480, levels: [ { level: 1, team: 10, earning: 80 }, { level: 2, team: 20, earning: 160 }, { level: 3, team: 50, earning: 240 }, { level: 4, team: 100, earning: 240 }, { level: 5, team: 200, earning: 240 } ] },
  { amount: 960, levels: [ { level: 1, team: 10, earning: 160 }, { level: 2, team: 20, earning: 320 }, { level: 3, team: 50, earning: 480 }, { level: 4, team: 100, earning: 480 }, { level: 5, team: 200, earning: 480 } ] }
];

// Sequential Days Offset for Free Users
const packageOffsets = { 10: 0, 30: 5, 60: 10, 120: 15, 240: 20, 480: 25, 960: 30 };

export default function Plan() {
  const { user } = useAuth();
  const [activeData, setActiveData] = useState([]);

  // ---------------- PROCESS DATA ----------------
  useEffect(() => {
    const userPackages = user?.packages || []; 
    
    // User Joining Date (Free Timer Base)
    const joinDate = user?.createdAt ? new Date(user.createdAt).getTime() : Date.now();
    const daysSinceJoined = Math.max(0, Math.floor((Date.now() - joinDate) / (1000 * 60 * 60 * 24)));
    const hoursSinceJoined = Math.max(0, Math.floor((Date.now() - joinDate) / (1000 * 60 * 60)));

    const processedData = packagesConfig.map((pkg) => {
      let totalEarn = 0;
      
      const activePackage = userPackages.find(p => p.amount === pkg.amount);
      const pkgOffset = packageOffsets[pkg.amount];

      const processedLevels = pkg.levels.map((staticLvl, idx) => {
        totalEarn += staticLvl.earning; // Shows maximum capacity of the package

        // 1️⃣ FREE LOGIC: Check based on Join Date
        let isAchievedFree = false;
        if (pkg.amount === 10) {
          isAchievedFree = hoursSinceJoined >= (idx * 4);
        } else {
          const requiredGlobalDays = pkgOffset + idx;
          isAchievedFree = daysSinceJoined >= requiredGlobalDays;
        }

        // 2️⃣ PAID LOGIC: Check based on Top-up Date
        let isAchievedPaid = false;
        if (activePackage) {
          const startDate = activePackage.startDate || activePackage.date; 
          if (pkg.amount === 10) {
            const activeHours = Math.max(0, Math.floor((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60)));
            isAchievedPaid = activeHours >= (idx * 4);
          } else {
            const activeDays = Math.max(0, Math.floor((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)));
            isAchievedPaid = activeDays >= idx;
          }
        }

        // 3️⃣ FINAL LOGIC: Agar pehle se Free me achieve tha, toh hamesha achieve hi rahega!
        const isAchieved = isAchievedFree || isAchievedPaid;

        return { ...staticLvl, status: isAchieved ? "achieved" : "pending" };
      });

      return { ...pkg, levels: processedLevels, totalEarn };
    });

    setActiveData(processedData);
  }, [user]);

  // ---------------- UI ----------------
  return (
    <div className="bg-dot-pattern w-full py-6 md:py-12 text-white min-h-screen relative overflow-hidden font-sans">
      <style>{customStyles}</style>

      <div className="relative z-10 max-w-5xl mx-auto px-3 sm:px-6 space-y-10 md:space-y-14">
        {activeData.map((pkg) => {
          return (
            <div key={pkg.amount} className="w-full">

              {/* ✅ PACKAGE HEADER LINE */}
              <div className="border border-white px-5 py-4 rounded-lg mb-4 md:mb-6 flex items-center">
                <h2 className="text-lg md:text-xl font-black uppercase tracking-widest text-white">
                  ${pkg.amount} Package
                </h2>
              </div>

              {/* ✅ TABLE BOX */}
              <div className="glass-table-wrapper border border-white rounded-lg overflow-hidden">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-xs md:text-sm text-left whitespace-nowrap">
                    
                    {/* COLUMNS HEADER */}
                    <thead className="text-white text-[10px] md:text-xs uppercase tracking-widest border-b border-white bg-black/20">
                      <tr>
                        <th className="py-4 px-3 md:py-5 md:px-6 font-bold text-center">Sr</th>
                        <th className="py-4 px-3 md:py-5 md:px-6 font-bold text-center">Global Team</th>
                        <th className="py-4 px-3 md:py-5 md:px-6 font-bold text-center">Earning</th>
                        <th className="py-4 px-3 md:py-5 md:px-6 font-bold text-center">Mode</th>
                      </tr>
                    </thead>

                    {/* ROWS */}
                    <tbody>
                      {pkg.levels.map((lvl) => (
                        <tr key={lvl.level} className="border-b border-white glass-row transition-colors">
                          
                          {/* SR NO */}
                          <td className="py-3 px-3 md:py-4 md:px-6">
                             <div className="w-6 h-6 md:w-8 md:h-8 mx-auto rounded-full border border-white flex items-center justify-center text-xs md:text-sm font-bold text-white">
                               {lvl.level}
                             </div>
                          </td>

                          {/* GLOBAL TEAM */}
                          <td className="py-3 px-3 md:py-4 md:px-6 text-center font-bold text-white">
                            {lvl.team}
                          </td>

                          {/* EARNING */}
                          <td className="py-3 px-3 md:py-4 md:px-6 font-bold text-center text-sm md:text-base">
                            ${lvl.earning}
                          </td>

                          {/* MODE (STATUS) */}
                          <td className="py-3 px-3 md:py-4 md:px-6 text-center">
                            {lvl.status === "achieved" && (
                              <div className="inline-flex text-green-500  items-center justify-center gap-1 text-emerald-400 font-extrabold">
                                <CheckCircle size={14} className=" md:w-4 md:h-4" /> Achieved
                              </div>
                            )}

                            {lvl.status === "pending" && (
                              <div className="inline-flex items-center justify-center gap-1 text-red-500 font-extrabold">
                                <Lock size={12} className="md:w-3 md:h-3" /> Locked
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}

                      {/* TOTAL EARNING ROW */}
                      <tr className="bg-black/20">
                        <td 
                          colSpan={2} 
                          className="py-4 px-3 md:py-6 md:px-6 text-right font-black uppercase tracking-wider text-white text-[10px] md:text-sm border-r border-white"
                        >
                          Total Earning
                        </td>
                        <td className="py-4 px-3 md:py-6 md:px-6 text-center font-black text-white text-base md:text-xl">
                          ${pkg.totalEarn}
                        </td>
                        <td className="border-l border-white"></td>
                      </tr>
                    </tbody>

                  </table>
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}