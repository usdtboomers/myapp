import React, { useEffect, useState } from "react";
import api from "api/axios";
import BASE_URL from "../../config";

const WalletHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [userId, setUserId] = useState(null);

  const allTypes = [
    "deposit",
    "transfer",
    "credit_to_wallet",
    "withdrawal",
    "topup",
    "buy_spin",
  ];
  const types = ["all", ...allTypes];

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) { setError("User not found."); setLoading(false); return; }
    try {
      const parsedUser = JSON.parse(userStr);
      if (!parsedUser?.userId) throw new Error("Invalid user");
      setUserId(parsedUser.userId);
      fetchWalletHistory(parsedUser.userId);
    } catch { setError("Invalid user."); setLoading(false); }
  }, []);

  const fetchWalletHistory = async (uid) => {
    try {
      const [txRes, withdrawRes, topupRes] = await Promise.all([
        api.get(`/wallet/history/${uid}`),
        api.get(`/wallet/withdrawals/${uid}`),
        api.get(`/wallet/topup-history/${uid}`),
      ]);

      const txns = Array.isArray(txRes.data) ? txRes.data : [];
      const withdrawals = Array.isArray(withdrawRes.data?.withdrawals)
        ? withdrawRes.data.withdrawals.map(w => ({
            ...w, 
            type:"withdrawal", 
            displayAmount:w.grossAmount||0, 
            deductionAmount:w.walletUsed||0, 
            description:`Withdrawal (${w.status}) - ROI Deduction: $${(w.walletUsed||0).toFixed(2)}`, 
            date:w.createdAt 
          })) 
        : [];
    const topups = Array.isArray(topupRes.data)
  ? topupRes.data
      .filter(t => t.description && !/PROMOTION/i.test(t.description)) // filter promo topups
      .map(t => ({ ...t, type: t.type || "topup", date: t.createdAt || t.date }))
  : [];



      const allHistory = [
        ...txns.filter(t => ["deposit","transfer","credit_to_wallet","buy_spin"].includes(t.type)), 
        ...withdrawals, 
        ...topups
      ];

      const uniqueHistory = Array.from(
        new Map(allHistory.map(t => [`${t._id}-${t.date || t.createdAt}-${t.type}`,t])).values()
      );

      uniqueHistory.sort((a,b) => new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date));
      setTransactions(uniqueHistory);
    } catch (err) {
      console.error(err); setError("Failed to load wallet history.");
    } finally { setLoading(false); }
  };

  const calculateBalances = () => {
    let balance = 0;
    return transactions.map(txn => {
      const amount = txn.displayAmount || txn.amount || txn.grossAmount || 0;
      switch(txn.type){
        case "deposit":
        case "credit_to_wallet": balance += Math.abs(amount); break;
        case "topup":
        case "debit_topup":
        case "buy_spin": balance -= Math.abs(amount); break;
        case "withdrawal": balance -= txn.deductionAmount || 0; break;
        case "transfer": 
          if(txn.toUserId===userId) balance+=Math.abs(amount);
          if(txn.fromUserId===userId) balance-=Math.abs(amount);
          break;
        default: break;
      }
      return {...txn, balance: balance.toFixed(2)};
    });
  };

  const filtered = calculateBalances().filter(txn => {
    const s = searchTerm.toLowerCase();
    const matchesType = typeFilter==="all" || txn.type===typeFilter;
    const matchesSearch = txn.type?.toLowerCase().includes(s) || txn.description?.toLowerCase().includes(s) || txn.fromUserId?.toString().includes(s) || txn.toUserId?.toString().includes(s);
    return matchesType && matchesSearch;
  });

  if(loading) return <p>Loading...</p>;
  if(error) return <p style={{color:"red"}}>{error}</p>;

  return (
    <div style={{ padding: 12, fontSize: 12 }}>
      <h2 className="text-white" style={{ fontSize: 16, fontWeight: "bold", marginBottom: 12 }}>Wallet History</h2>

      <div style={{
        marginBottom: 12,
        padding: "8px 10px",
        border: "1px solid #ddd",
        borderRadius: 6,
        background: "#f9f9f9",
        fontWeight: 600,
        fontSize: 14
      }}>
        Current Balance: ${filtered.length > 0 ? filtered[filtered.length - 1].balance : "0.00"}
      </div>

      <div style={{ marginBottom: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search type, user ID, or description"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: 6,
            border: "1px solid #ccc",
            borderRadius: 4,
            flex: "1 1 150px",
            minWidth: 150,
            fontSize: 12
          }}
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{
            padding: 6,
            border: "1px solid #ccc",
            borderRadius: 4,
            minWidth: 120,
            fontSize: 12
          }}
        >
          {types.map((type) => (
            <option key={type} value={type}>
              {type === "all" ? "All" : type.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ backgroundColor: "#4A90E2", color: "white" }}>
              <th style={thStyle}>Sr. No</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>From</th>
              <th style={thStyle}>To</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: 8, color: "#999" }}>
                  No wallet transactions found.
                </td>
              </tr>
            ) : (
              [...filtered].reverse().map((txn, idx) => {
                const amount = txn.displayAmount || txn.amount || txn.grossAmount || 0;
                const isCredit = ["deposit", "credit_to_wallet"].includes(txn.type) || (txn.type === "transfer" && txn.toUserId === userId);
                const colorStyle = { color: isCredit ? "green" : "red" };

                return (
                  <tr key={`${txn._id}-${txn.date || txn.createdAt}-${txn.type}-${idx}`} style={{ backgroundColor: idx % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                    <td style={tdStyle}>{idx + 1}</td>
                    <td style={tdStyle}>{(txn.type || "unknown").replace(/_/g, " ").toUpperCase()}</td>
                    <td style={{ ...tdStyle, ...colorStyle }}>${amount.toFixed(2)}</td>
                    <td style={tdStyle}>{txn.fromUserId === userId ? "You" : txn.fromUserId || "-"}</td>
                    <td style={tdStyle}>{txn.toUserId === userId ? "You" : txn.toUserId || "-"}</td>
                    <td style={tdStyle}>{txn.description || "-"}</td>
                    <td style={tdStyle}>{new Date(txn.createdAt || txn.date).toLocaleString()}</td>
                    <td style={tdStyle}>${txn.balance}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const thStyle = { padding: "6px 8px", fontWeight: 600, borderBottom: "1px solid #dee2e6" };
const tdStyle = { padding: "6px 8px", borderBottom: "1px solid #f1f3f5" };

export default WalletHistory;
