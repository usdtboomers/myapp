import React, { useEffect, useState } from "react";
import axios from "axios";
import { getUserId } from "../../utils/authUtils";

const DirectIncome = () => {
  const userId = getUserId();
  const [transactions, setTransactions] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    if (!userId) return;

    axios
      .get(`http://178.128.20.53:5000/api/transaction/transactions/${userId}?type=direct_income`)
      .then((res) => {
        const sorted = (res.data || [])
          .filter(txn => txn.fromUserId && txn.fromUserId !== userId)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setTransactions(sorted);
        setFiltered(sorted);
      })
      .catch((err) => {
        console.error("Failed to fetch direct income", err);
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
        txn.description?.toLowerCase().includes(value) ||
        String(txn.fromUserId).includes(value)
    );
    setFiltered(result);
  };

  const totalIncome = filtered.reduce((sum, t) => sum + (t.amount || 0), 0);
  const pageCount = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div style={{ padding: 12, fontFamily: "Segoe UI, sans-serif", fontSize: 13 }}>
      <h2 style={{ marginBottom: 12, fontSize: 16 }}>💸 Direct Income</h2>

      {/* Summary + Search */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        <div><b>Total Records:</b> {filtered.length}</div>
        <div><b>Total Income:</b> ${totalIncome.toFixed(2)}</div>
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={handleSearch}
          style={{ padding: 6, borderRadius: 4, border: "1px solid #ccc", maxWidth: 200, fontSize: 12 }}
        />
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500, fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f57c00", color: "#fff", fontSize: 12 }}>
              <th style={thStyle}>Sr. No</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Time</th>
              <th style={thStyle}>From User</th>
              <th style={thStyle}>Package</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Description</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? (
              paginated.map((txn, idx) => {
                const date = new Date(txn.createdAt);
                return (
                  <tr key={txn._id || idx} style={{ background: idx % 2 ? "#f9f9f9" : "#fff" }}>
                    <td style={tdStyle}>{(currentPage-1)*ITEMS_PER_PAGE + idx + 1}</td>
                    <td style={tdStyle}>{date.toLocaleDateString()}</td>
                    <td style={tdStyle}>{date.toLocaleTimeString()}</td>
                    <td style={tdStyle}>{txn.fromUserId || "N/A"}</td>
                    <td style={tdStyle}>{typeof txn.package === "number" ? `$${txn.package.toFixed(2)}` : "-"}</td>
                    <td style={tdStyle}>${txn.amount.toFixed(2)}</td>
                    <td style={tdStyle}>{txn.description || "Direct income"}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" style={emptyCellStyle}>No direct income records found.</td>
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
            onClick={() => setCurrentPage(p => p - 1)}
            style={pageBtnStyle(currentPage === 1)}
          >
            ⏮ Prev
          </button>
          <span style={{ margin: "0 6px", fontSize: 12 }}>
            Page {currentPage} of {pageCount}
          </span>
          <button
            disabled={currentPage === pageCount}
            onClick={() => setCurrentPage(p => p + 1)}
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
  backgroundColor: disabled ? "#ccc" : "#f57c00",
  color: "white",
  border: "none",
  cursor: disabled ? "not-allowed" : "pointer",
  fontSize: 12,
});

export default DirectIncome;
