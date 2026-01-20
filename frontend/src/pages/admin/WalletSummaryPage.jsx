import React, { useEffect, useState } from "react";
import api from "api/axios";

// 🔹 Helper: Amount Normalizer (Same as before)
const normalizeAmount = (value) => {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isNaN(value) ? 0 : value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]/g, "");
    const n = Number(cleaned);
    return Number.isNaN(n) ? 0 : n;
  }
  if (typeof value === "object") {
    if (value.$numberDecimal) {
      const n = Number(value.$numberDecimal);
      return Number.isNaN(n) ? 0 : n;
    }
    if (value._bsontype === "Decimal128" && typeof value.toString === "function") {
      const n = Number(value.toString());
      return Number.isNaN(n) ? 0 : n;
    }
  }
  return 0;
};

const formatAmount = (value, digits = 2) => {
  const n = normalizeAmount(value);
  return n.toFixed(digits);
};

const AdminWalletHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 🔹 Filters & Search State
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // 🔹 Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
    fetchAllWalletHistory();
  }, []);

  const fetchAllWalletHistory = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      if (!token) {
        setError("Unauthorized. Please login as admin.");
        setLoading(false);
        return;
      }

      const res = await api.get("/admin/wallet-summary", {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Filter out income types initially
      const filteredData = Array.isArray(res.data)
        ? res.data.filter(
            (tx) =>
              ![
                "direct_income",
                "level_income",
                "plan_income",
                "spin_income",
                "roi_income",
              ].includes(tx.type)
          )
        : [];

      // Sort: Latest First
      const sortedData = filteredData.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      setTransactions(sortedData);
    } catch (err) {
      console.error("Admin wallet history fetch error:", err);
      setError("Failed to load wallet history.");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Handle Pagination Reset on Filter Change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, fromDate, toDate, itemsPerPage]);

  // 🔹 Main Filtering Logic
  const filteredTxns = transactions.filter((txn) => {
    // 1. Search Filter
    const lowerSearch = searchTerm.toLowerCase();
    const matchesSearch =
      txn.userId?.toString().includes(lowerSearch) ||
      txn.name?.toLowerCase().includes(lowerSearch) ||
      txn.type?.toLowerCase().includes(lowerSearch) ||
      txn.description?.toLowerCase().includes(lowerSearch);

    // 2. Type Filter
    const matchesType = typeFilter === "all" || txn.type === typeFilter;

    // 3. Date Range Filter
    let matchesDate = true;
    if (fromDate || toDate) {
      const txnDate = new Date(txn.createdAt).setHours(0, 0, 0, 0); // Normalize time
      const from = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : null;
      const to = toDate ? new Date(toDate).setHours(0, 0, 0, 0) : null;

      if (from && txnDate < from) matchesDate = false;
      if (to && txnDate > to) matchesDate = false;
    }

    return matchesSearch && matchesType && matchesDate;
  });

  // 🔹 Pagination Slicing
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTxns.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTxns.length / itemsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  if (loading) return <p style={{ padding: 20 }}>Loading wallet history...</p>;
  if (error) return <p style={{ padding: 20, color: "red" }}>{error}</p>;

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px", color: "#333" }}>
        📊 Admin Wallet History
      </h2>

      {/* 🔹 Filter Controls Container (Responsive) */}
      <div
        style={{
          backgroundColor: "#f8f9fa",
          padding: "15px",
          borderRadius: "8px",
          marginBottom: "20px",
          display: "flex",
          flexWrap: "wrap",
          gap: "15px",
          alignItems: "center",
          border: "1px solid #ddd",
        }}
      >
        {/* Search */}
        <input
          type="text"
          placeholder="🔍 Search User ID, Name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={inputStyle}
        />

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={inputStyle}
        >
          {types.map((type) => (
            <option key={type} value={type}>
              {type === "all"
                ? "All Types"
                : type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </option>
          ))}
        </select>

        {/* From Date */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <span style={{ fontSize: "14px", color: "#555" }}>From:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* To Date */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <span style={{ fontSize: "14px", color: "#555" }}>To:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={inputStyle}
          />
        </div>
        
        {/* Reset Button (Optional Helper) */}
        {(fromDate || toDate) && (
            <button 
                onClick={() => { setFromDate(""); setToDate(""); }}
                style={{ padding: "8px 12px", cursor: "pointer", backgroundColor: "#e74c3c", color: "#fff", border: "none", borderRadius: "4px" }}
            >
                Clear Dates
            </button>
        )}
      </div>

      {/* 🔹 Table Container (Scrollable) */}
      <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid #eee", boxShadow: "0 2px 5px rgba(0,0,0,0.05)" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "14px",
            minWidth: "1000px",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#4A90E2", color: "white", textAlign: "left" }}>
              <th style={thStyle}>#</th>
              <th style={thStyle}>User ID</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Wallet Bal</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Time</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: "center", padding: "30px", color: "#888" }}>
                  No transactions found matching your criteria.
                </td>
              </tr>
            ) : (
              currentItems.map((txn, idx) => {
                const createdAt = new Date(txn.createdAt);
                const isCredit = ["deposit", "credit_to_wallet", "topup"].includes(txn.type);
                const colorStyle = { color: isCredit ? "green" : "red", fontWeight: "bold" };
                
                // Serial Number based on pagination
                const serialNo = indexOfFirstItem + idx + 1;

                return (
                  <tr
                    key={txn._id || idx}
                    style={{
                      borderBottom: "1px solid #f1f1f1",
                      backgroundColor: idx % 2 === 0 ? "#fff" : "#fcfcfc",
                    }}
                  >
                    <td style={tdStyle}>{serialNo}</td>
                    <td style={tdStyle}>{txn.userId}</td>
                    <td style={tdStyle}>{txn.name || "-"}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          backgroundColor: "#f0f2f5",
                          fontSize: "12px",
                          fontWeight: "500"
                        }}
                      >
                         {(txn.type || "unknown").replace(/_/g, " ").toUpperCase()}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, ...colorStyle }}>
                      ${formatAmount(txn.amount)}
                    </td>
                    <td style={tdStyle}>
                      ${formatAmount(txn.walletBalance || 0)}
                    </td>
                    <td style={{ ...tdStyle, maxWidth: "200px" }}>{txn.description || "-"}</td>
                    <td style={tdStyle}>{createdAt.toLocaleDateString("en-GB")}</td>
                    <td style={tdStyle}>{createdAt.toLocaleTimeString("en-US", { hour12: true })}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 🔹 Pagination Footer */}
      {filteredTxns.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "20px",
            gap: "15px",
          }}
        >
          {/* Rows Per Page */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ color: "#555", fontSize: "14px" }}>Rows per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              style={{
                padding: "6px",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span style={{ color: "#777", fontSize: "13px" }}>
               Showing {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredTxns.length)} of {filteredTxns.length}
            </span>
          </div>

          {/* Next/Prev Buttons */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              style={{ ...btnStyle, opacity: currentPage === 1 ? 0.5 : 1 }}
            >
              Previous
            </button>
            
            <span style={{ display: "flex", alignItems: "center", padding: "0 10px", fontWeight: "bold" }}>
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{ ...btnStyle, opacity: currentPage === totalPages ? 0.5 : 1 }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// 🔹 Styles for Clean UI
const inputStyle = {
  padding: "10px",
  border: "1px solid #ccc",
  borderRadius: "6px",
  minWidth: "150px",
  flex: "1", // Makes it responsive
};

const thStyle = {
  padding: "12px 15px",
  fontWeight: "600",
  borderBottom: "2px solid #ddd",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "10px 15px",
  color: "#333",
  verticalAlign: "middle",
};

const btnStyle = {
  padding: "8px 16px",
  backgroundColor: "#4A90E2",
  color: "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "14px",
};

export default AdminWalletHistory;