import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useAuth } from '../../context/AuthContext';

const MyTransfers = () => {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState([]);
  const [view, setView] = useState("sent");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const ITEMS_PER_PAGE = 10;

  const userId = user?.userId;

  const fetchTransfers = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await axios.get(
        `http://143.198.205.94:5000/api/transaction/transactions/${userId}?type=transfer`
      );
      setTransfers(res.data || []);
    } catch (err) {
      console.error("❌ Failed to fetch transfers", err);
    }
  }, [userId]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

  const sentTransfers = transfers.filter((txn) => txn.fromUserId === userId);
  const receivedTransfers = transfers.filter((txn) => txn.toUserId === userId);
  const filtered = view === "sent" ? sentTransfers : receivedTransfers;

  const searchedTransfers = filtered.filter((txn) =>
    view === "sent"
      ? txn.toUserId?.toString().includes(searchTerm)
      : txn.fromUserId?.toString().includes(searchTerm)
  );

  const totalPages = Math.ceil(searchedTransfers.length / ITEMS_PER_PAGE);
  const paginatedTransfers = searchedTransfers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div style={{ padding: 12, fontFamily: "Segoe UI, sans-serif", fontSize: 13 }}>
      <h2 className="text-white" style={{ marginBottom: 12, fontSize: 16 }}>💸 My Wallet Transfers</h2>

      {/* Toggle View */}
      <div style={{ marginBottom: 12, display: "flex", gap: 6 }}>
        <button
          onClick={() => { setView("sent"); setSearchTerm(""); setCurrentPage(1); }}
          style={toggleBtnStyle(view === "sent", "#3f51b5")}
        >
          Sent
        </button>
        <button
          onClick={() => { setView("received"); setSearchTerm(""); setCurrentPage(1); }}
          style={toggleBtnStyle(view === "received", "#388e3c")}
        >
          Received
        </button>
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          placeholder={view === "sent" ? "Search by To User ID" : "Search by From User ID"}
          style={{ padding: 6, borderRadius: 4, border: "1px solid #ccc", width: 200, fontSize: 12 }}
        />
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 400, fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#1976d2", color: "#fff", fontSize: 12 }}>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>{view === "sent" ? "To User ID" : "From User ID"}</th>
              <th style={thStyle}>Date</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTransfers.length > 0 ? paginatedTransfers.map((txn, idx) => {
              const date = new Date(txn.createdAt);
              return (
                <tr key={txn._id || idx} style={{ background: idx % 2 ? "#f9f9f9" : "#fff" }}>
                  <td style={tdStyle}>{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                  <td style={{ ...tdStyle, fontWeight: "bold", color: view === "sent" ? "#c62828" : "#2e7d32" }}>
                    {formatCurrency(txn.amount)}
                  </td>
                  <td style={tdStyle}>{view === "sent" ? txn.toUserId : txn.fromUserId}</td>
                  <td style={tdStyle}>{date.toLocaleDateString()} {date.toLocaleTimeString()}</td>
                </tr>
              );
            }) : (
              <tr>
                <td className="text-white" colSpan="4" style={emptyCellStyle}>No {view} transfers found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ marginTop: 12, textAlign: "center" }}>
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={pageBtnStyle(currentPage === 1)}>⏮ Prev</button>
          <span style={{ margin: "0 6px", fontSize: 12 }}>Page {currentPage} of {totalPages}</span>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} style={pageBtnStyle(currentPage === totalPages)}>Next ⏭</button>
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

const toggleBtnStyle = (active, color) => ({
  padding: "4px 10px",
  background: active ? color : "#eee",
  color: active ? "#fff" : "#333",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 12,
});

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

export default MyTransfers;
