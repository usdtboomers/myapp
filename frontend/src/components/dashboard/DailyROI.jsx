import React, { useState } from "react";
import TopUpModal from "../modals/TopUpModalWithInput";
import { useAuth } from "../../context/AuthContext";

// Available top-up packages
const packages = [
  { amount: 10 },
  { amount: 25 },
  { amount: 50 },
  { amount: 100 },
  { amount: 200 },
  { amount: 500 },
  { amount: 1000 },
];

// ✅ Package name mapping
const packageNames = {
  10: "Bronze",
  25: "Silver",
  50: "Gold",
  100: "Platinum",
  200: "Diamond",
  500: "Elite",
  1000: "Infinity",
};

export default function DailyROI() {
  const { user, setUser, token } = useAuth();
  const [showTopUp, setShowTopUp] = useState(false);
  const [page, setPage] = useState({});
  const rowsPerPage = 10;

  // Refresh user after top-up
  const handleTopUpSuccess = async () => {
    try {
      const res = await fetch(`http://178.128.20.53/api/user/${user.userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUser(data.user);
    } catch (err) {
      console.error("Failed to refresh user after top-up:", err);
    }
  };

  // ✅ FIXED getDailyEarnings() — combines dailyDetails + claimedDays
  const getDailyEarnings = (plan) => {
    const maxDays = plan.maxDays || 10;
    const dailyAmount = plan.amount; // assuming ROI = 10x total
    const claimedDays = plan.claimedDays || 0;

    const detailsMap = {};
    if (plan.dailyDetails && plan.dailyDetails.length > 0) {
      plan.dailyDetails.forEach((d) => {
        detailsMap[d.day] = {
          day: d.day,
          earned: d.amount,
          status: d.status === "claimed" ? "✅ Claimed" : "⏳ Pending",
        };
      });
    }

    const result = [];
    for (let i = 1; i <= maxDays; i++) {
      if (detailsMap[i]) {
        result.push(detailsMap[i]);
      } else {
        const isClaimed = i <= claimedDays;
        result.push({
          day: i,
          earned: dailyAmount,
          status: isClaimed ? "✅ Claimed" : "⏳ Pending",
        });
      }
    }
    return result;
  };

  // ✅ SUM planIncome safely
  const totalPlanIncome = Object.values(user?.planIncome || {}).reduce(
    (sum, val) => sum + Number(val || 0),
    0
  );

  return (
    <div className="max-w-full mx-auto p-2 sm:p-2 text-white">
      {/* Top-up modal */}
      {showTopUp && (
        <TopUpModal
          packages={packages}
          onClose={() => setShowTopUp(false)}
          onTopUpSuccess={handleTopUpSuccess}
        />
      )}

      {/* No packages */}
      {!user?.dailyROI || user.dailyROI.length === 0 ? (
        <p className="text-center text-gray-400 text-sm sm:text-base">
          No active packages. Purchase to start earning!
        </p>
      ) : (
        <>
          {/* Loop through all active packages */}
          {user.dailyROI.map((plan, idx) => {
            const earnings = getDailyEarnings(plan);
            const currentPage = page[idx] || 1;
            const startIdx = (currentPage - 1) * rowsPerPage;
            const pageData = earnings.slice(startIdx, startIdx + rowsPerPage);

            return (
              <div key={idx} className="mb-6 sm:mb-10">
                {/* Package Info */}
                <div className="mb-2 sm:mb-4 p-3 sm:p-4 bg-gray-900 rounded-lg shadow-md border ${item.border}
            bg-[#1e293b] flex flex-col sm:flex-row sm:justify-between items-start sm:items-center">
                  <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-0">
                    <span className="text-xl sm:text-2xl">📦</span>
                    <h3 className="text-base sm:text-lg font-bold text-emerald-400">
                      {packageNames[plan.amount] || `Package $${plan.amount}`} (${plan.amount})
                    </h3>
                    <span className="text-xs sm:text-sm text-gray-400">
                      (Purchase - {idx + 1})
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-200 font-semibold">
                    Target:{" "}
                    <span className="text-emerald-400">${plan.amount * 10}</span>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-lg shadow-md">
                  <table className="w-full border ${item.border}
            bg-[#1e293b] text-xs sm:text-sm">
                    <thead className="bg-gray-900 text-gray-200">
                      <tr >
                        <th className="px-3 py-2 text-center">Day</th>
                        <th className="px-3 py-2 text-center">Earning ($)</th>
                        <th className="px-3 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageData.map((d, i) => (
                        <tr
                          key={i}
                          className={`${
                            i % 2 === 0 ? "bg-gray-800" : "bg-gray-700"
                          } hover:bg-gray-600 transition`}
                        >
                          <td className="px-3 py-2 text-center font-semibold">
                            Day {d.day}
                          </td>
                          <td className="px-3 py-2 text-center">
                            ${Number(d.earned).toFixed(2)}
                          </td>
                          <td
                            className={`px-3 py-2 text-center ${
                              d.status.includes("✅")
                                ? "text-emerald-400 font-bold"
                                : "text-yellow-400"
                            }`}
                          >
                            {d.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
