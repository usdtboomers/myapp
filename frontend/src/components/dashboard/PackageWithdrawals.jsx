import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import SpinnerOverlay from "../common/SpinnerOverlay";

const API = process.env.REACT_APP_API_URL || "";

const PackageWithdrawals = () => {
  const { user, token, logout } = useAuth();

  const [pkgs, setPkgs] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");

  /* =========================
     FETCH DATA
     ========================= */
  useEffect(() => {
    if (!user?.userId || !token) return;

    const fetchAll = async () => {
      try {
        setLoading(true);
        setNote("");

        const url = (p) => (API ? `${API}${p}` : p);
        const headers = { Authorization: `Bearer ${token}` };

        const [topupRes, withdrawRes] = await Promise.all([
          axios.get(url(`/api/wallet/topup-history/${user.userId}`), { headers }),
          axios.get(url(`/api/wallet/withdrawals/${user.userId}`), { headers }),
        ]);

        /* ---------- Withdrawals ---------- */
        setWithdrawals(
          Array.isArray(withdrawRes?.data?.withdrawals)
            ? withdrawRes.data.withdrawals
            : []
        );

        /* ---------- Packages ONLY from topups ---------- */
        const pkgMap = {};
        const topups = Array.isArray(topupRes.data) ? topupRes.data : [];

        for (const t of topups) {
          const amt = Number(t.package ?? t.amount ?? 0);
          if (!amt) continue;

          const key = `amt-${amt}`;
          if (!pkgMap[key]) {
            pkgMap[key] = { amount: amt, qty: 0 };
          }
          pkgMap[key].qty += 1;
        }

        const pkgsArr = Object.values(pkgMap).map((v) => ({
          _id: `amt-${v.amount}`,
          name: `Top-up $${v.amount}` + (v.qty > 1 ? ` x${v.qty}` : ""),
          amount: v.amount,
          qty: v.qty,
          maxWithdraw: v.amount * 10 * v.qty,
        }));

        setPkgs(pkgsArr);
        if (pkgsArr.length) setNote("withdrawls are based on the packages.");

      } catch (err) {
        console.error("PackageWithdrawals error:", err);
        if (err?.response?.status === 401) logout();
        setNote("Error loading data");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [user?.userId, token, logout]);

  if (!user || !token || loading) return <SpinnerOverlay />;

  /* =========================
     WITHDRAW ATTRIBUTION (FIFO)
     ========================= */

  // Expand packages into units
  const expandedPkgs = [];
  pkgs.forEach((p) => {
    for (let i = 0; i < (p.qty || 1); i++) {
      expandedPkgs.push({
        baseId: p._id,
        amount: p.amount,
        maxWithdraw: p.amount * 10,
        withdrawn: 0,
      });
    }
  });

  const planToPackageAmount = {
    plan1: 10,
    plan2: 25,
    plan3: 50,
    plan4: 100,
    plan5: 200,
    plan6: 500,
    plan7: 1000,
  };

  // 🔥 FIXED withdrawal attribution
  for (const w of withdrawals) {
    let remaining = Number(w.grossAmount ?? w.amount ?? 0);
    if (!remaining) continue;

    const planKey =
      w.plan ??
      (typeof w.source === "string" && w.source.startsWith("plan")
        ? w.source
        : null);

    const pkgAmount =
      w.package ?? planToPackageAmount[planKey];

    if (!pkgAmount) continue;

    const eligible = expandedPkgs.filter(
      (p) => p.amount === Number(pkgAmount)
    );

    for (const pkg of eligible) {
      if (remaining <= 0) break;

      const available = pkg.maxWithdraw - pkg.withdrawn;
      if (available <= 0) continue;

      const cut = Math.min(available, remaining);
      pkg.withdrawn += cut;
      remaining -= cut;
    }
  }

  // Aggregate back
  const perPkgWithdrawn = {};
  pkgs.forEach((p) => (perPkgWithdrawn[p._id] = 0));

  expandedPkgs.forEach((p) => {
    perPkgWithdrawn[p.baseId] += p.withdrawn;
  });

  /* =========================
     TOTALS
     ========================= */
  const totalMax = pkgs.reduce((s, p) => s + p.maxWithdraw, 0);
  const totalWithdrawn = Object.values(perPkgWithdrawn).reduce(
    (s, v) => s + v,
    0
  );
  const remainingAll = Math.max(0, totalMax - totalWithdrawn);

  /* =========================
     UI
     ========================= */
return (
  <div className="max-w-6xl mx-auto px-2 ">
    <div className="bg-gray-900 text-white  rounded-2xl shadow-xl p-0">

      <div className=" rounded-2xl p-1 mb-2 border ${item.border}
            bg-[#1e293b]">

      <h2 className="text-lg sm:text-xl  font-bold text-emerald-400 mb-2 text-center">
        📦 Package Withdrawal Summary
      </h2>

      {note && (
        <p className="text-xs sm:text-sm text-yellow-400 text-center mb-3">
          {note}
        </p>
      )}
      </div>

      {/* ✅ Responsive Table Wrapper */}
     <div className="overflow-x-auto">
  <div className="rounded-2xl overflow-hidden border ${item.border}
            bg-[#1e293b]">
    <table className="w-full min-w-[520px] text-xs">
      <thead className="bg-gray-800 text-gray-300">
        <tr>
          <th className="p-2 text-center">Package</th>
          <th className="p-2 text-center">Max</th>
          <th className="p-2 text-center">Withdrawn</th>
          <th className="p-2 text-center">Remaining</th>
        </tr>
      </thead>

      <tbody>
        {pkgs.map((p) => {
          const w = perPkgWithdrawn[p._id] || 0;
          return (
            <tr
              key={p._id}
              className="border-t border-gray-700 hover:bg-gray-800 transition"
            >
              <td className="p-2 text-center whitespace-nowrap">{p.name}</td>
              <td className="p-2 text-center">${p.maxWithdraw.toFixed(2)}</td>
              <td className="p-2 text-center text-emerald-400 font-semibold">
                ${w.toFixed(2)}
              </td>
              <td className="p-2 text-center text-yellow-400 font-semibold">
                ${(p.maxWithdraw - w).toFixed(2)}
              </td>
            </tr>
          );
        })}

        <tr className="border-t border-gray-600 bg-gray-800 font-bold">
          <td className="p-2 text-center">TOTAL</td>
          <td className="p-2 text-center">${totalMax.toFixed(2)}</td>
          <td className="p-2 text-center text-emerald-400">
            ${totalWithdrawn.toFixed(2)}
          </td>
          <td className="p-2 text-center text-yellow-400">
            ${remainingAll.toFixed(2)}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

    </div>
  </div>
);

};

export default PackageWithdrawals;
