import React, { useEffect, useState } from "react";
import api from "api/axios";
import { getUserId } from "../../utils/authUtils";

const TransactionDetails = () => {
  const userId = getUserId();
  const [transactions, setTransactions] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

 useEffect(() => {
  if (!userId) return;
  api.get(`/transaction/transactions/${userId}`)
    .then((res) => {
      let sorted = (res.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // 🔹 Ignore TOPUP (PROMOTION)
      sorted = sorted.filter(txn => !(txn.type === "topup" && txn.description?.toUpperCase().includes("PROMOTION")));

      setTransactions(sorted);
      setFiltered(sorted);
    })
    .catch((err) => {
      console.error("Failed to fetch transactions", err);
      setTransactions([]);
      setFiltered([]);
    });
}, [userId]);


  const isCreditType = (type = "") => ["deposit","credit_to_wallet","roi_income","referral_income","topup_income",    "binary",         
"spin_income","level_income","direct_income","plan_income","transfer"].includes(type.toLowerCase());
  const isDebitType = (type = "") => ["withdrawal","buy_spin","topup","transfer"].includes(type.toLowerCase());

  useEffect(() => {
    let result = [...transactions];

    if (search.trim() !== "") {
      const value = search.toLowerCase();
      result = result.filter(
        (txn) =>
          txn.type?.toLowerCase().includes(value) ||
          txn.description?.toLowerCase().includes(value) ||
          String(txn.fromUserId || "").includes(value) ||
          String(txn.toUserId || "").includes(value)
      );
    }

    if (filterType === "credit") result = result.filter(txn => isCreditType(txn.type));
    else if (filterType === "debit") result = result.filter(txn => isDebitType(txn.type));

    setFiltered(result);
    setCurrentPage(1);
  }, [search, filterType, transactions]);

  const paginated = filtered.slice((currentPage-1)*ITEMS_PER_PAGE, currentPage*ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  const formatAmount = (txn) => {
    const type = txn.type?.toLowerCase() || "";
    const amt = txn.amount || 0;
    let color = "black";
    let display = `$${amt.toFixed(2)}`;

    if (type === "transfer") {
      if (txn.toUserId === userId) { display = `+$${amt.toFixed(2)}`; color = "green"; }
      else if (txn.fromUserId === userId) { display = `-$${amt.toFixed(2)}`; color = "red"; }
    } else if (isCreditType(type)) { display = `+$${amt.toFixed(2)}`; color = "green"; }
    else if (isDebitType(type)) { display = `-$${Math.abs(amt).toFixed(2)}`; color = "red"; }

    return { display, color };
  };

  return (
    <div style={{ padding: 12, fontFamily: "Segoe UI, sans-serif", fontSize: 13 }}>
      <h2  className="text-white font-bold" style={{ marginBottom: 12, fontSize: 16 }}>📑 Transaction Details</h2>

      {/* Filters */}
      <div  style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        <div><b className="text-white">Total Records:</b> {filtered.length}</div>
        <input
          type="text"
          placeholder="🔍 Search type, user ID, desc..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: 6, borderRadius: 4, border: "1px solid #ccc", width: 200, fontSize: 12 }}
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{ padding: 6, borderRadius: 4, border: "1px solid #ccc", fontSize: 12 }}
        >
          <option value="all">All</option>
          <option value="credit">Credit</option>
          <option value="debit">Debit</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 600 }}>
          <thead>
            <tr style={{ background: "#1976d2", color: "#fff" }}>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Time</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>From</th>
              <th style={thStyle}>To</th>
              <th style={thStyle}>Description</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? paginated.map((txn, idx) => {
              const date = new Date(txn.createdAt);
              const { display, color } = formatAmount(txn);
              return (
                <tr key={txn._id || idx} style={{ background: idx % 2 ? "#f9f9f9" : "#fff" }}>
                  <td style={tdStyle}>{(currentPage-1)*ITEMS_PER_PAGE+idx+1}</td>
                  <td style={tdStyle}>{date.toLocaleDateString()}</td>
                  <td style={tdStyle}>{date.toLocaleTimeString()}</td>
                  <td style={{ ...tdStyle, fontWeight: "bold" }}>{txn.type || "-"}</td>
                  <td style={{ ...tdStyle, fontWeight: "bold", color }}>{display}</td>
                  <td style={tdStyle}>{txn.fromUserId || "-"}</td>
                  <td style={tdStyle}>{txn.toUserId || "-"}</td>
                  <td style={tdStyle}>{txn.description || "-"}</td>
                </tr>
              );
            }) : (
              <tr>
                <td className="text-white" colSpan="8" style={emptyCellStyle}>No transaction records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ marginTop: 12, textAlign: "center" }}>
          <button disabled={currentPage===1} onClick={()=>setCurrentPage(p=>p-1)} style={pageBtnStyle(currentPage===1)}>⏮ Prev</button>
          <spanc className="text-white" style={{ margin: "0 6px" }}>Page {currentPage} of {totalPages}</spanc>
          <button disabled={currentPage===totalPages} onClick={()=>setCurrentPage(p=>p+1)} style={pageBtnStyle(currentPage===totalPages)}>Next ⏭</button>
        </div>
      )}
    </div>
  );
};

const thStyle = { textAlign: "left", padding: "6px 8px", fontWeight: "bold", borderBottom: "1px solid #ddd" };
const tdStyle = { padding: "4px 6px", borderBottom: "1px solid #eee" };
const emptyCellStyle = { textAlign: "center", padding: 12, color: "#777", fontSize: 12 };
const pageBtnStyle = (disabled) => ({
  padding: "4px 10px",
  margin: "0 2px",
  borderRadius: 4,
  backgroundColor: disabled ? "#ccc" : "#1976d2",
  color: "#fff",
  border: "none",
  cursor: disabled ? "not-allowed" : "pointer",
  fontSize: 12,
});

export default TransactionDetails;
