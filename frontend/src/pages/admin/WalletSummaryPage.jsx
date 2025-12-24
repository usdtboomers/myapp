import React, { useEffect, useState } from "react";
import axios from "axios";

// 🔹 Helper: har type ka amount safely number me convert karo
const normalizeAmount = (value) => {
  if (value == null) return 0;

  // Already number
  if (typeof value === "number") {
    return Number.isNaN(value) ? 0 : value;
  }

  // String: "$10", "10 USDT", etc
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]/g, ""); // sirf digits, dot, minus
    const n = Number(cleaned);
    return Number.isNaN(n) ? 0 : n;
  }

  // Mongo Decimal128 JSON -> { $numberDecimal: "123.45" }
  if (typeof value === "object") {
    if (value.$numberDecimal) {
      const n = Number(value.$numberDecimal);
      return Number.isNaN(n) ? 0 : n;
    }

    // Direct Decimal128 object (agar aisa aa raha ho)
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
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // Allowed types for admin (excluding income-related types)
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

      const res = await axios.get("http://143.198.205.94:5000/api/admin/wallet-summary", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const filteredData = Array.isArray(res.data)
        ? res.data.filter(
            (tx) =>
              tx.type !== "direct_income" &&
              tx.type !== "level_income" &&
              tx.type !== "plan_income" &&
              tx.type !== "spin_income" &&
              tx.type !== "roi_income"
          )
        : [];

      // sort latest first
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

  const filteredTxns = transactions.filter((txn) => {
    const lowerSearch = searchTerm.toLowerCase();

    const matchesType = typeFilter === "all" || txn.type === typeFilter;

    // 🔎 search by userId, name, type, description (placeholder ke hisaab se)
    const matchesSearch =
      txn.userId?.toString().includes(lowerSearch) ||
      txn.name?.toLowerCase().includes(lowerSearch) ||
      txn.type?.toLowerCase().includes(lowerSearch) ||
      txn.description?.toLowerCase().includes(lowerSearch);

    return matchesType && matchesSearch;
  });

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>
        📊 Admin Wallet History
      </h2>

      {/* Filters */}
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          placeholder="🔍 Search by User ID, Name, Type or Description"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: "10px",
            border: "1px solid #ccc",
            borderRadius: "6px",
            flex: "1 1 250px",
            minWidth: "200px",
          }}
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{
            padding: "10px",
            border: "1px solid #ccc",
            borderRadius: "6px",
            minWidth: "180px",
          }}
        >
          {types.map((type) => (
            <option key={type} value={type}>
              {type === "all"
                ? "All Types"
                : type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
            fontSize: "14px",
            minWidth: "1000px",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#4A90E2", color: "white", textAlign: "left" }}>
              <th style={thStyle}>User ID</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Wallet Balance</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Time</th>
            </tr>
          </thead>
          <tbody>
            {filteredTxns.length === 0 ? (
              <tr>
                <td colSpan="13" style={{ textAlign: "center", padding: "20px", color: "#999" }}>
                  No wallet transactions found.
                </td>
              </tr>
            ) : (
              filteredTxns.map((txn, idx) => {
                const createdAt = new Date(txn.createdAt);
                const isCredit = ["deposit", "credit_to_wallet"].includes(txn.type);
                const colorStyle = { color: isCredit ? "green" : "red" };

                return (
                  <tr
                    key={txn._id || idx}
                    style={{
                      borderBottom: "1px solid #e9ecef",
                      backgroundColor: idx % 2 === 0 ? "#fff" : "#f9f9f9",
                    }}
                  >
                    <td style={tdStyle}>{txn.userId}</td>
                    <td style={tdStyle}>{txn.name || "-"}</td>
                    <td style={tdStyle}>
                      {(txn.type || "unknown").replace(/_/g, " ").toUpperCase()}
                    </td>
                    <td style={{ ...tdStyle, ...colorStyle }}>
                      ${formatAmount(txn.amount)}
                    </td>
                    <td style={tdStyle}>
                      ${formatAmount(txn.walletBalance || 0)}
                    </td>
                    <td style={tdStyle}>{txn.description || "-"}</td>
                    <td style={tdStyle}>{createdAt.toLocaleDateString("en-GB")}</td>
                    <td style={tdStyle}>{createdAt.toLocaleTimeString("en-US")}</td>
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

const thStyle = {
  padding: "12px 16px",
  fontWeight: "600",
  borderBottom: "1px solid #dee2e6",
};
const tdStyle = {
  padding: "10px 16px",
  borderBottom: "1px solid #f1f3f5",
};

export default AdminWalletHistory;
