import React, { useEffect, useState } from "react";
import api from "api/axios";
import { getUserId } from "../../utils/authUtils";

const CreditToWalletHistory = () => {
  const userId = getUserId();
  const [transactions, setTransactions] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // State for rows
  const [errorMessage, setErrorMessage] = useState(""); // ✅ Naya state error dikhane ke liye

  useEffect(() => {
    if (!userId) {
      setErrorMessage("User ID not found. Please log in again.");
      return;
    }

    api.get(`/wallet/history/${userId}`)
      .then((res) => {
        const creditTxs = (res.data || [])
          .filter(
            (tx) =>
              tx.type === "credit_to_wallet" || tx.type === "binary_income"
          )
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        setTransactions(creditTxs);
        setFiltered(creditTxs);
        setErrorMessage(""); // ✅ Success hone par error clear kar do
      })
      .catch((err) => {
        console.error("Failed to fetch wallet transactions", err);
        // ✅ API se jo error aayega, wo seedha state mein set hoga
        setErrorMessage(
          err.response?.data?.message || "Failed to load history. Please try again later."
        );
        setTransactions([]);
        setFiltered([]);
      });
  }, [userId]);

  const handleSearch = (e) => {
    const value = e.target.value.toLowerCase();
    setSearch(value);
    setCurrentPage(1);

    if (!value) return setFiltered(transactions);

    const result = transactions.filter(
      (txn) =>
        txn.source?.toLowerCase().includes(value) ||
        String(txn.userId).includes(value) ||
        txn.type.toLowerCase().includes(value)
    );
    setFiltered(result);
  };

  const pageCount = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div
      style={{ padding: 12, fontFamily: "Segoe UI, sans-serif", fontSize: 13 }}
    >
      <h2 className="text-white font-bold" style={{ marginBottom: 12, fontSize: 16 }}>
        💰 Credit To Wallet 
      </h2>

      {/* ✅ NAYA ERROR MESSAGE BOX */}
      {errorMessage && (
        <div style={{
          backgroundColor: "#ffebee",
          color: "#c62828",
          padding: "10px",
          borderRadius: "4px",
          marginBottom: "12px",
          border: "1px solid #ffcdd2",
          fontWeight: "bold"
        }}>
          ⚠️ {errorMessage}
        </div>
      )}

      {/* ✅ TOP SECTION: Search + Rows Dropdown */}
      <div
        style={{ marginBottom: 12, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}
      >
        <input
          type="text"
          placeholder="Search by User ID, Source, or Type..."
          value={search}
          onChange={handleSearch}
          style={{
            padding: 6,
            borderRadius: 4,
            border: "1px solid #ccc",
            maxWidth: 250,
            fontSize: 12,
            flex: 1
          }}
        />

        {/* Rows Selector */}
        <select
          value={itemsPerPage}
          onChange={(e) => {
            setItemsPerPage(Number(e.target.value));
            setCurrentPage(1);
          }}
          style={{
            padding: 6,
            borderRadius: 4,
            border: "1px solid #ccc",
            fontSize: 12,
            cursor: "pointer",
            outline: "none"
          }}
        >
          <option value={10}>10 Rows</option>
          <option value={20}>20 Rows</option>
          <option value={50}>50 Rows</option>
          <option value={100}>100 Rows</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 400,
            fontSize: 12,
          }}
        >
          <thead>
            <tr style={{ background: "#1976d2", color: "#fff", fontSize: 12 }}>
              <th style={thStyle}>Sr. No</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Time</th>
              <th style={thStyle}>Source</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? (
              paginated.map((txn, idx) => {
                const date = new Date(txn.createdAt);
                return (
                  <tr
                    key={txn._id || idx}
                    style={{ background: idx % 2 ? "#f9f9f9" : "#fff" }}
                  >
                    <td style={tdStyle}>
                      {(currentPage - 1) * itemsPerPage + idx + 1}
                    </td>
                    <td style={tdStyle}>{date.toLocaleDateString()}</td>
                    <td style={tdStyle}>{date.toLocaleTimeString()}</td>
                    <td style={tdStyle}>{txn.source || "-"}</td>
                    <td style={tdStyle}>
                      {txn.type === "credit_to_wallet"
                        ? "Credit"
                        : txn.type === "binary_income"
                        ? "Binary Income"
                        : txn.type}
                    </td>
                    <td style={tdStyle}>${txn.amount?.toFixed(2) || 0}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" style={emptyCellStyle}>
                  {/* Agar error hai toh empty table me 'No transactions' ki jagah error dikhayega */}
                  {errorMessage ? "Could not load data." : "No transactions found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ✅ BOTTOM SECTION: Always Visible */}
      <div style={{ marginTop: 12, textAlign: "center" }}>
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((p) => p - 1)}
          style={pageBtnStyle(currentPage === 1)}
        >
          ⏮ Prev
        </button>
        
        <span style={{ margin: "0 6px", fontSize: 12, color: "#fff" }}>
          Page {currentPage} of {pageCount || 1}
        </span>

        <button
          disabled={currentPage >= pageCount}
          onClick={() => setCurrentPage((p) => p + 1)}
          style={pageBtnStyle(currentPage >= pageCount)}
        >
          Next ⏭
        </button>
      </div>

    </div>
  );
};

const thStyle = {
  textAlign: "left",
  padding: "6px 8px",
  fontWeight: "bold",
  borderBottom: "1px solid #ddd",
};

const tdStyle = {
  padding: "4px 6px",
  borderBottom: "1px solid #eee",
  fontSize: 12,
};

const emptyCellStyle = {
  textAlign: "center",
  padding: 12,
  color: "#777",
  fontSize: 12,
};

const pageBtnStyle = (disabled) => ({
  padding: "4px 10px",
  margin: "0 2px",
  borderRadius: 4,
  backgroundColor: disabled ? "#ccc" : "#1976d2",
  color: "white",
  border: "none",
  cursor: disabled ? "not-allowed" : "pointer",
  fontSize: 12,
});

export default CreditToWalletHistory;