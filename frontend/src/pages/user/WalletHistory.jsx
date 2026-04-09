import React, { useEffect, useState } from "react";
import api from "../../api/axios"; 
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

  // ✅ Sirf yahi 3 types filter aur show hongi
  const allTypes = [
    "credit_to_wallet",
    "transfer",
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter]);

  const fetchWalletHistory = async (uid) => {
    try {
      const res = await api.get(`/wallet/history/${uid}`);

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
      
      let mathImpact = 0;
      let colorStyle = { color: "#333" }; 
      let operator = "";

      const fromId = String(txn.fromUserId);
      const toId = String(txn.toUserId);
      const myId = String(userId);

      // Math for running balance
      switch(txn.type) {
        case "deposit":
        case "credit_to_wallet": 
          mathImpact = amount;
          colorStyle = { color: "#16a34a", fontWeight: "bold" }; // Green
          operator = "+";
          break;

        case "transfer": 
          if (toId === myId) { // Aaya
            mathImpact = amount;
            colorStyle = { color: "#16a34a", fontWeight: "bold" }; // Green
            operator = "+";
          } else if (fromId === myId) { // Bheja
            mathImpact = -amount;
            colorStyle = { color: "#dc2626", fontWeight: "bold" }; // Red
            operator = "-";
          }
          break;

        case "topup":
        case "debit_topup":
        case "buy_spin": 
          if (fromId === myId) { // Mere wallet se kata
            mathImpact = -amount;
            colorStyle = { color: "#dc2626", fontWeight: "bold" }; // Red
            operator = "-";
          } else { // Kisi aur ne mera topup kiya
            mathImpact = 0; 
            colorStyle = { color: "#333", fontWeight: "normal" }; 
            operator = ""; 
          }
          break;

        case "withdrawal": 
          mathImpact = 0; 
          break;

        default: 
          break;
      }

      balance += mathImpact; 
      
      return {
        ...txn, 
        balance: balance.toFixed(2),
        colorStyle,
        formattedAmount: `${operator}$${amount.toFixed(2)}`
      };
    });
  };

  // ✅ Sirf required types hi table mein dikhayenge
  const allowedDisplayTypes = ["credit_to_wallet", "transfer", "topup", "debit_topup"];

  const filtered = calculateBalances().filter(txn => {
    // Agar type allowed list me nahi hai, toh use hide kar do (e.g., deposit, withdrawal)
    if (!allowedDisplayTypes.includes(txn.type)) return false;

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
        Current Wallet Balance: ${calculateBalances().length > 0 ? calculateBalances()[calculateBalances().length - 1].balance : "0.00"}
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
                  No internal wallet transactions found.
                </td>
              </tr>
            ) : (
              currentItems.map((txn, idx) => {
                const serialNumber = (currentPage - 1) * itemsPerPage + idx + 1;

                return (
                  <tr key={`${txn._id}-${txn.date}-${txn.type}-${idx}`} style={{ backgroundColor: idx % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                    <td style={tdStyle}>{serialNumber}</td>
                    <td style={tdStyle}>{(txn.type || "unknown").replace(/_/g, " ").toUpperCase()}</td>
                    
                    <td style={{ ...tdStyle, ...txn.colorStyle }}>
                      {txn.formattedAmount}
                    </td>

                    <td style={tdStyle}>{String(txn.fromUserId) === String(userId) ? "You" : txn.fromUserId || "-"}</td>
                    <td style={tdStyle}>{String(txn.toUserId) === String(userId) ? "You" : txn.toUserId || "-"}</td>
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