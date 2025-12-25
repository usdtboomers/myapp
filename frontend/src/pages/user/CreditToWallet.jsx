import React, { useEffect, useState } from "react";
import api from "api/axios";
import { getUserId } from "../../utils/authUtils";

const CreditToWalletHistory = () => {
  const userId = getUserId();
  const [transactions, setTransactions] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    if (!userId) return;

    api.post(`/wallet/history/${userId}`)
      .then((res) => {
        const creditTxs = (res.data || [])
          .filter(
            (tx) =>
              tx.type === "credit_to_wallet" || tx.type === "binary_income"
          )
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        setTransactions(creditTxs);
        setFiltered(creditTxs);
      })
      .catch((err) => {
        console.error("Failed to fetch wallet transactions", err);
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

  const pageCount = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div
      style={{ padding: 12, fontFamily: "Segoe UI, sans-serif", fontSize: 13 }}
    >
      <h2 className="text-white font-bold" style={{ marginBottom: 12, fontSize: 16 }}>
        💰 Credit To Wallet & Binary Income History
      </h2>

      {/* Search */}
      <div
        style={{ marginBottom: 12, display: "flex", gap: 6, flexWrap: "wrap" }}
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
          }}
        />
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
                      {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
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
                  No transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div style={{ marginTop: 12, textAlign: "center" }}>
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            style={pageBtnStyle(currentPage === 1)}
          >
            ⏮ Prev
          </button>
          <span style={{ margin: "0 6px", fontSize: 12 }}>
            Page {currentPage} of {pageCount}
          </span>
          <button
            disabled={currentPage === pageCount}
            onClick={() => setCurrentPage((p) => p + 1)}
            style={pageBtnStyle(currentPage === pageCount)}
          >
            Next ⏭
          </button>
        </div>
      )}
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
