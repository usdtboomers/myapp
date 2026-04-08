import React, { useEffect, useState } from "react";
import api from "../../api/axios"; // Path thoda check kar lena
import BASE_URL from "../../config";

const WalletHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [userId, setUserId] = useState(null);

  // --- PAGINATION STATE ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const allTypes = [
    "deposit",
    "transfer",
    "credit_to_wallet",
    "withdrawal",
    "topup",
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

  // Jab filter change ho to page 1 par wapas aajaye
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter]);

  const fetchWalletHistory = async (uid) => {
    try {
      // ✅ 404 ERROR FIX: Sirf ek API call karni hai jisme saari history (withdraw, deposit, topup) aati hai.
      const res = await api.get(`/wallet/history/${uid}`);

      // Backend array return karta hai ya object me history bhejta hai dono handle kar liya
      let txns = [];
      if (Array.isArray(res.data)) {
        txns = res.data;
      } else if (res.data && Array.isArray(res.data.history)) {
        txns = res.data.history;
      }

      const formattedHistory = txns.map(t => ({
        ...t,
        date: t.createdAt || t.date,
        displayAmount: t.amount || t.grossAmount || 0
      }));

      // Calculate running balance correctly by sorting Oldest to Newest first
      formattedHistory.sort((a,b) => new Date(a.date) - new Date(b.date));
      setTransactions(formattedHistory);

    } catch (err) {
      console.error("Wallet History Error:", err); 
      setError("Failed to load wallet history.");
    } finally { 
      setLoading(false); 
    }
  };

  const calculateBalances = () => {
    let balance = 0;
    return transactions.map(txn => {
      const amount = Number(txn.displayAmount || txn.amount || txn.grossAmount || 0);
      switch(txn.type){
        case "deposit":
        case "credit_to_wallet": 
          balance += amount; 
          break;
        case "topup":
        case "debit_topup":
        case "buy_spin": 
          balance -= amount; 
          break;
        case "transfer": 
          if(txn.toUserId === userId) balance += amount;
          if(txn.fromUserId === userId) balance -= amount;
          break;
        case "withdrawal": 
          // Withdrawal seedha main wallet se nahi kat-ta, ye alg sources (pool/reward) se kat-ta hai, 
          // toh running wallet balance math ko kharab hone se bachane ke liye deduction yaha add nahi ki hai.
          break;
        default: break;
      }
      return {...txn, balance: balance.toFixed(2)};
    });
  };

  const filtered = calculateBalances().filter(txn => {
    const s = searchTerm.toLowerCase();
    const matchesType = typeFilter === "all" || txn.type === typeFilter;
    const matchesSearch = 
      txn.type?.toLowerCase().includes(s) || 
      txn.description?.toLowerCase().includes(s) || 
      txn.fromUserId?.toString().includes(s) || 
      txn.toUserId?.toString().includes(s);
    return matchesType && matchesSearch;
  });

  // --- PAGINATION LOGIC ---
  // Data ko pehle reverse karte hain (Newest First) fir slice karte hain
  const reversedData = [...filtered].reverse();
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = reversedData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

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
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: 8, color: "#999" }}>
                  No wallet transactions found.
                </td>
              </tr>
            ) : (
              currentItems.map((txn, idx) => {
                const amount = txn.displayAmount || txn.amount || txn.grossAmount || 0;
                const isCredit = ["deposit", "credit_to_wallet"].includes(txn.type) || (txn.type === "transfer" && txn.toUserId === userId);
                const colorStyle = { color: isCredit ? "green" : "red" };
                
                // Serial Number calculation based on page
                const serialNumber = (currentPage - 1) * itemsPerPage + idx + 1;

                return (
                  <tr key={`${txn._id}-${txn.date}-${txn.type}-${idx}`} style={{ backgroundColor: idx % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                    <td style={tdStyle}>{serialNumber}</td>
                    <td style={tdStyle}>{(txn.type || "unknown").replace(/_/g, " ").toUpperCase()}</td>
                    <td style={{ ...tdStyle, ...colorStyle }}>${amount.toFixed(2)}</td>
                    <td style={tdStyle}>{txn.fromUserId === userId ? "You" : txn.fromUserId || "-"}</td>
                    <td style={tdStyle}>{txn.toUserId === userId ? "You" : txn.toUserId || "-"}</td>
                    <td style={tdStyle}>{txn.description || "-"}</td>
                    <td style={tdStyle}>{new Date(txn.date).toLocaleString()}</td>
                    <td style={tdStyle}>${txn.balance}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* --- PAGINATION CONTROLS --- */}
      {filtered.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 15, flexWrap: "wrap", gap: 10 }}>
          
          {/* Rows Per Page Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{color: "white"}}>Rows:</span>
            <select 
              value={itemsPerPage} 
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #ccc" }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {/* Next/Prev Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
              disabled={currentPage === 1}
              style={{
                padding: "5px 10px",
                border: "none",
                borderRadius: 4,
                backgroundColor: currentPage === 1 ? "#ccc" : "#4A90E2",
                color: "white",
                cursor: currentPage === 1 ? "not-allowed" : "pointer"
              }}
            >
              Prev
            </button>
            
            <span style={{ color: "white", fontWeight: "bold" }}>
              Page {currentPage} of {totalPages}
            </span>

            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
              disabled={currentPage === totalPages}
              style={{
                padding: "5px 10px",
                border: "none",
                borderRadius: 4,
                backgroundColor: currentPage === totalPages ? "#ccc" : "#4A90E2",
                color: "white",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer"
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

const thStyle = { padding: "6px 8px", fontWeight: 600, borderBottom: "1px solid #dee2e6" };
const tdStyle = { padding: "6px 8px", borderBottom: "1px solid #f1f3f5", color: "black" };

export default WalletHistory;